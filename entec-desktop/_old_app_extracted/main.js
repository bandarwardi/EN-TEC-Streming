const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const http = require('http');
const https = require('https');

app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
app.commandLine.appendSwitch('tls-min-version', 'tls1');
app.commandLine.appendSwitch('tls-cipher-suite-fallback', 'true');

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault();
  callback(true);
});

let mainWindow;
let server;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    title: 'ENTEC Streaming',
    icon: path.join(__dirname, 'build/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenu(null);
  mainWindow.loadURL('http://localhost:1337');

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

function startServer() {
  return new Promise((resolve) => {
    const expressApp = express();

    expressApp.get('/log_error', (req, res) => {
      console.error('\n=== CLIENT ERROR ===\n', req.query.msg, req.query.stack, '\n====================\n');
      res.send('ok');
    });

    expressApp.get('/proxy', (req, res) => {
      const targetUrl = req.query.url;
      if (!targetUrl) return res.status(400).send('Missing url');

      try {
        const parsedUrl = new URL(targetUrl);
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: {
            'User-Agent': req.headers['user-agent'] || 'VLC/3.0.16 LibVLC/3.0.16',
            'Accept': '*/*',
            'host': parsedUrl.host,
            ...(req.headers.range ? { 'Range': req.headers.range } : {})
          },
          rejectUnauthorized: false
        };

        const client = parsedUrl.protocol === 'https:' ? https : http;

        const proxyReq = client.request(options, (proxyRes) => {
          if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
            let redirectUrl = proxyRes.headers.location;
            if (!redirectUrl.startsWith('http')) {
              redirectUrl = new URL(redirectUrl, targetUrl).href;
            }
            proxyRes.headers.location = `/proxy?url=${encodeURIComponent(redirectUrl)}`;
          }

          const contentType = (proxyRes.headers['content-type'] || '').toLowerCase();
          const isPlaylist = contentType.includes('mpegurl') || targetUrl.includes('.m3u8');

          if (isPlaylist) {
            let bodyBuffer = [];
            proxyRes.on('data', chunk => bodyBuffer.push(chunk));
            proxyRes.on('end', () => {
              const body = Buffer.concat(bodyBuffer).toString('utf8');
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
              
              const newHeaders = { ...proxyRes.headers };
              delete newHeaders['content-length'];
              
              res.writeHead(proxyRes.statusCode, newHeaders);
              res.end(rewritten.join('\n'));
            });
          } else {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
          }
        });

        proxyReq.on('error', (e) => {
          if (!req.destroyed && !req.closed) {
            console.error('Proxy error:', e.message);
          }
          if (!res.headersSent) res.status(500).send('Proxy error');
        });

        req.on('close', () => {
          proxyReq.destroy();
        });

        proxyReq.end();
      } catch (err) {
        if (!res.headersSent) res.status(500).send('Invalid URL');
      }
    });

    expressApp.use(express.static(path.join(__dirname, 'app')));

    expressApp.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'app/index.html'));
    });

    server = expressApp.listen(1337, () => {
      resolve();
    });
  });
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (server) {
    server.close();
  }
});
