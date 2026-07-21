const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');

// Keep global references to avoid garbage collection
let mainWindow;
let server;

// SSL/TLS flags for older Electron versions
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
app.commandLine.appendSwitch('tls-min-version', 'tls1');
app.commandLine.appendSwitch('tls-cipher-suite-fallback', 'true');

// Accept all certificates (required for some streaming servers)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault();
  callback(true);
});

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    title: 'ENTEC Streaming',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.setMenu(null);
  mainWindow.loadURL(`http://localhost:${port}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Keep title even if page changes it
  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const expressApp = express();

  // 1. Enable CORS
  expressApp.use(cors({
    origin: '*',
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Range'],
    exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges', 'Content-Type']
  }));

  // 2. Serve static app
  const appPath = app.isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked', 'app') : path.join(__dirname, 'app');
  expressApp.use(express.static(appPath));

  const activeConnections = new Map();

  // 3. Clean Proxy
  expressApp.get(/^\/proxy/, async (req, res) => {
    req.on('error', (e) => console.error('[REQ ERROR]', e.message));

    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing url parameter');

    try {
      const parsedUrl = new URL(targetUrl);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        rejectUnauthorized: false, // Bypass SSL errors
        headers: {
          'User-Agent': req.headers['user-agent'] || 'VLC/3.0.16 LibVLC/3.0.16',
          'Accept': '*/*',
          'host': parsedUrl.host,
          ...(req.headers.range ? { 'Range': req.headers.range } : {})
        }
      };

      const client = parsedUrl.protocol === 'https:' ? https : http;

      // Handle concurrent connections to the same streamUrl
      const streamKey = targetUrl;
      if (activeConnections.has(streamKey)) {
        console.log(`[PROXY] Closing previous connection for ${streamKey} to free up IPTV slot...`);
        const oldReq = activeConnections.get(streamKey);
        try {
          oldReq.destroy();
        } catch (e) {}
        activeConnections.delete(streamKey);

        // Wait 1000ms for the IPTV server to register the disconnect
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (req.destroyed) return;

      const proxyReq = client.request(options, (proxyRes) => {
        proxyRes.on('error', (e) => {
          console.error('[PROXY RES ERROR]', e.message);
        });

        res.on('error', (e) => {
          console.error('[CLIENT RES ERROR]', e.message);
        });

        const responseHeaders = { ...proxyRes.headers };

        // Handle Redirects
        const isRedirect = [301, 302, 303, 307, 308].includes(proxyRes.statusCode);
        if (isRedirect && proxyRes.headers.location) {
          let redirectUrl = proxyRes.headers.location;
          if (!redirectUrl.startsWith('http')) {
            redirectUrl = new URL(redirectUrl, targetUrl).href;
          }
          console.log(`[PROXY REDIRECT] ${targetUrl} -> ${redirectUrl}`);
          responseHeaders.location = `/proxy?url=${encodeURIComponent(redirectUrl)}`;
          res.writeHead(proxyRes.statusCode, responseHeaders);
          proxyRes.pipe(res);
          return;
        }

        // Handle Playlists
        const contentType = (proxyRes.headers['content-type'] || '').toLowerCase();
        const isPlaylist = contentType.includes('mpegurl') || targetUrl.includes('.m3u8');

        if (isPlaylist) {
          let bodyBuffer = [];
          proxyRes.on('data', chunk => bodyBuffer.push(chunk));
          proxyRes.on('end', () => {
            const body = Buffer.concat(bodyBuffer).toString('utf-8');
            const lines = body.split('\n');
            const rewritten = lines.map(line => {
              line = line.trim();
              if (line && !line.startsWith('#')) {
                if (!line.startsWith('http')) {
                  line = new URL(line, targetUrl).href;
                }
                return `/proxy?url=${encodeURIComponent(line)}`;
              }
              return line;
            });

            const rewrittenBody = rewritten.join('\n');
            responseHeaders['content-length'] = Buffer.byteLength(rewrittenBody, 'utf-8');
            console.log(`[PROXY PLAYLIST] Rewrote ${targetUrl}`);
            res.writeHead(proxyRes.statusCode, responseHeaders);
            res.end(rewrittenBody);
          });
        } else {
          // Handle Binary Streams
          const ct = proxyRes.headers['content-type'] || 'unknown';
          console.log(`[PROXY BINARY] Target: ${targetUrl} | Content-Type: ${ct}`);
          res.writeHead(proxyRes.statusCode, responseHeaders);
          proxyRes.pipe(res);
        }
      });

      proxyReq.on('error', (err) => {
        console.error(`[PROXY ERROR] ${err.message}`);
        if (!res.headersSent && !req.destroyed && !res.writableEnded) {
          try {
            res.status(500).send('Proxy Error');
          } catch (e) {
            console.error('[RES ERROR]', e.message);
          }
        }
      });

      activeConnections.set(streamKey, proxyReq);

      req.on('close', () => {
        if (activeConnections.get(streamKey) === proxyReq) {
          activeConnections.delete(streamKey);
        }
        proxyReq.destroy();
      });

      proxyReq.end();
    } catch (e) {
      if (!res.headersSent) res.status(400).send('Invalid URL');
    }
  });

  // 4. Fallback route for Single Page Application (Expo Router)
  expressApp.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(appPath, 'index.html'));
  });

  server = expressApp.listen(0, '127.0.0.1', () => {
    createWindow(server.address().port);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.stack || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
