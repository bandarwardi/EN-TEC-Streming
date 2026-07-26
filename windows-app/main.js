const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');

// ==========================================
// GOOGLE SPEECH-TO-TEXT API KEYS
// ==========================================
// To enable webkitSpeechRecognition in Electron, place your Google API keys here:
// process.env.GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY';
// process.env.GOOGLE_DEFAULT_CLIENT_ID = 'YOUR_CLIENT_ID';
// process.env.GOOGLE_DEFAULT_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
// ==========================================

const httpAgent = new http.Agent({ maxSockets: 100 });
const httpsAgent = new https.Agent({ maxSockets: 100, rejectUnauthorized: false });

app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport,ClearKeyCdm,Widevine');
app.commandLine.appendSwitch('enable-spatial-navigation');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault();
  callback(true);
});

let mainWindow;
let server;
let serverPort = 1337;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    frame: false,
    thickFrame: true,
    autoHideMenuBar: true,
    title: 'ENTEC Streaming',
    icon: path.join(__dirname, 'build/icon.png'),
    backgroundColor: '#05070a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  mainWindow.setMenu(null);

  const isDev = process.argv.includes('--dev');
  mainWindow.loadURL(isDev ? 'http://localhost:8081' : `http://localhost:${serverPort}`);

  mainWindow.once('ready-to-show', async () => {
    await mainWindow.webContents.session.clearCache();
    mainWindow.setFullScreen(true);
    mainWindow.show();
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[FRONTEND]: ${message}`);
  });

  // Keep title even if page changes it
  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    if (permission === 'media') {
      return true;
    }
    return false;
  });

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback, details) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });
}

function startServer() {
  return new Promise((resolve) => {
    const expressApp = express();

    expressApp.use((req, res, next) => {
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type'
      });
      if (req.method === 'OPTIONS' && !req.path.startsWith('/proxy')) {
        return res.status(204).end();
      }
      next();
    });

    expressApp.get('/log_error', (req, res) => {
      console.error('\n=== CLIENT ERROR ===\n', req.query.msg, req.query.stack, '\n====================\n');
      res.send('ok');
    });

    let dictationProcess;
    function getDictationProcess() {
      if (!dictationProcess) {
        const { spawn } = require('child_process');
        dictationProcess = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', '-']);
        const initScript = `
          Add-Type -TypeDefinition @"
          using System;
          using System.Runtime.InteropServices;
          public class KeySender {
              [DllImport("user32.dll")]
              public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
              public static void SendWinH() {
                  keybd_event(0x5B, 0, 0, 0); // LWIN down
                  keybd_event(0x48, 0, 0, 0); // H down
                  keybd_event(0x48, 0, 2, 0); // H up
                  keybd_event(0x5B, 0, 2, 0); // LWIN up
              }
          }
"@
        `;
        dictationProcess.stdin.write(initScript + "\n");
        dictationProcess.on('error', (err) => console.error('Dictation PS error', err));
        dictationProcess.on('exit', () => { dictationProcess = null; });
      }
      return dictationProcess;
    }
    // Initialize it immediately so it compiles in the background
    getDictationProcess();

    expressApp.get('/api/dictate', (req, res) => {
      const ps = getDictationProcess();
      ps.stdin.write("[KeySender]::SendWinH()\n");
      res.send('ok');
    });

    expressApp.use(express.json({ limit: '200mb' }));

    const appDataPath = path.join(app.getPath('userData'), 'AppCache');
    if (!fs.existsSync(appDataPath)) fs.mkdirSync(appDataPath, { recursive: true });

    expressApp.post('/api/cache/write', (req, res) => {
      try {
        const { key, data } = req.body;
        if (!key) {
          console.log('[CACHE WRITE ERROR] Missing key. Body keys:', Object.keys(req.body));
          return res.status(400).send('No key');
        }
        const p = path.join(appDataPath, key + '.json');
        console.log(`[CACHE WRITE] Writing ${data ? data.length : 0} bytes to ${p}`);
        fs.writeFileSync(p, data);
        res.send('ok');
      } catch (e) {
        console.error('[CACHE WRITE CATCH ERROR]:', e);
        res.status(500).send(e.message);
      }
    });

    expressApp.get('/api/cache/read', (req, res) => {
      try {
        const key = req.query.key;
        if (!key) return res.status(400).send('No key');
        const p = path.join(appDataPath, key + '.json');
        console.log(`[CACHE READ] Requested key: ${key}`);
        if (fs.existsSync(p)) {
          console.log(`[CACHE READ] Found ${key}.json`);
          res.sendFile(p);
        } else {
          console.log(`[CACHE READ] NOT FOUND: ${key}.json`);
          res.status(404).send('Not found');
        }
      } catch (e) {
        console.error('[CACHE READ ERROR]:', e);
        res.status(500).send(e.message);
      }
    });

    expressApp.delete('/api/cache/delete', (req, res) => {
      try {
        const key = req.query.key;
        if (!key) return res.status(400).send('No key');
        const p = path.join(appDataPath, key + '.json');
        if (fs.existsSync(p)) fs.unlinkSync(p);
        res.send('ok');
      } catch (e) {
        console.error('Cache delete error:', e);
        res.status(500).send(e.message);
      }
    });

    const activeConnections = new Map();

    expressApp.options('/proxy*', (req, res) => {
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type'
      });
      res.status(204).end();
    });

    expressApp.all('/proxy*', async (req, res) => {
      let initialTargetUrl = req.query.url;
      if (!initialTargetUrl) return res.status(400).send('Missing url');

      // Convert live .ts streams to .m3u8 so Xtream returns HLS manifests
      // that hls.js can parse, instead of raw MPEG-TS data
      const liveTs = /\/live\/[^/]+\/[^/]+\/(\d+)\.ts$/i;
      if (liveTs.test(initialTargetUrl)) {
        initialTargetUrl = initialTargetUrl.replace(/\.ts$/i, '.m3u8');
        console.log(`[PROXY] Converted live .ts to .m3u8: ${initialTargetUrl}`);
      }

      const isOriginalPlaylist = initialTargetUrl.includes('.m3u8') || initialTargetUrl.includes('.m3u');
      const streamKey = isOriginalPlaylist ? initialTargetUrl : null;

      if (streamKey && activeConnections.has(streamKey)) {
        console.log(`[PROXY] Closing previous connection for ${streamKey} to free up IPTV slot...`);
        const oldReq = activeConnections.get(streamKey);
        try { oldReq.destroy(); } catch (e) { }
        activeConnections.delete(streamKey);
      }

      if (req.destroyed) return;

      const makeRequest = (targetUrl, redirectsLeft) => {
        if (req.destroyed) return;

        console.log(`\n[PROXY START] ${req.method} Requesting: ${targetUrl}`);
        let parsedUrl;
        try {
          parsedUrl = new URL(targetUrl);
        } catch (err) {
          if (!res.headersSent) res.status(500).send('Invalid URL');
          return;
        }

        const isHttps = parsedUrl.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: req.method,
          headers: {
            'User-Agent': 'VLC/3.0.16 LibVLC/3.0.16',
            'Accept': '*/*',
            'host': parsedUrl.host,
            ...(req.headers.range ? { 'Range': req.headers.range } : {})
          },
          agent: isHttps ? httpsAgent : httpAgent,
          rejectUnauthorized: false
        };

        const proxyReq = client.request(options, (proxyRes) => {
          console.log(`[PROXY RESPONSE] Status: ${proxyRes.statusCode}`);

          if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
            let redirectUrl = proxyRes.headers.location;
            if (!redirectUrl.startsWith('http')) {
              redirectUrl = new URL(redirectUrl, targetUrl).href;
            }

            console.log(`[PROXY REDIRECT] Translating redirect for client to: ${redirectUrl}`);
            if (!res.headersSent) {
              const corsHeaders = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
                'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type'
              };
              const newHeaders = { ...corsHeaders };
              newHeaders['Location'] = `/proxy?url=${encodeURIComponent(redirectUrl)}`;
              res.writeHead(proxyRes.statusCode, newHeaders);
              res.end();
            }
            proxyRes.on('data', () => {}); // drain
            return;
          }

          const contentType = (proxyRes.headers['content-type'] || '').toLowerCase();
          const isPlaylistResponse = contentType.includes('mpegurl') || targetUrl.includes('.m3u8') || isOriginalPlaylist;
          console.log(`[PROXY RESPONSE] Content-Type: ${contentType}, isPlaylist: ${isPlaylistResponse}`);

          const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
            'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type'
          };

          if (isPlaylistResponse && proxyRes.statusCode >= 200 && proxyRes.statusCode < 300) {
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

              const newHeaders = { ...proxyRes.headers, ...corsHeaders };
              delete newHeaders['content-length'];

              if (!res.headersSent) {
                res.writeHead(proxyRes.statusCode, newHeaders);
                res.end(rewritten.join('\n'));
                console.log(`[PROXY PLAYLIST] Rewritten and sent.`);
              }
            });
          } else {
            const newHeaders = { ...proxyRes.headers, ...corsHeaders };
            if (!res.headersSent) {
              res.writeHead(proxyRes.statusCode, newHeaders);
              proxyRes.pipe(res);
            }
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

        if (streamKey) {
          activeConnections.set(streamKey, proxyReq);
        }

        req.on('close', () => {
          if (streamKey && activeConnections.get(streamKey) === proxyReq) {
            activeConnections.delete(streamKey);
          }
          if (!res.writableEnded) {
            proxyReq.destroy();
          }
        });

        proxyReq.end();
      };

      makeRequest(initialTargetUrl, 5);
    });

    expressApp.use(express.static(path.join(__dirname, 'app')));

    expressApp.get('/exit_app', (req, res) => {
      res.send('ok');
      app.quit();
    });

    expressApp.get('/api/local-video', (req, res) => {
      const videoPath = req.query.path;
      if (!videoPath || !fs.existsSync(videoPath)) {
        return res.status(404).send('Video not found');
      }

      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      const ext = path.extname(videoPath).toLowerCase();
      let contentType = 'video/mp4';
      if (ext === '.mkv') contentType = 'video/x-matroska';
      else if (ext === '.webm') contentType = 'video/webm';

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : Math.max(0, fileSize - 1);
        const chunksize = Math.max(0, (end - start) + 1);
        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
      }
    });

    const activeDownloadsApp = new Map();

    expressApp.get('/api/download/start', (req, res) => {
      let urlStr = req.query.url;
      const id = req.query.id;
      if (!urlStr || !id) return res.status(400).send('Missing url or id');

      const downloadsDir = path.join(os.homedir(), 'Downloads', 'ENTEC');
      if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

      const destPath = path.join(downloadsDir, `${id}.mp4`);

      activeDownloadsApp.set(id, {
        progress: 0,
        status: 'downloading',
        localUri: destPath,
        request: null,
        url: urlStr,
        downloadedBytes: 0,
        totalBytes: 0
      });
      res.json({ localUri: destPath });

      let fileStream = fs.createWriteStream(destPath);

      const downloadFile = (targetUrl, redirectsLeft, isResume = false) => {
        let parsedUrl;
        try { parsedUrl = new URL(targetUrl); } catch (e) {
          const errItem = activeDownloadsApp.get(id);
          if (errItem) errItem.status = 'error';
          return;
        }

        const item = activeDownloadsApp.get(id);
        const headers = { 'User-Agent': 'VLC/3.0.16 LibVLC/3.0.16', 'Accept': '*/*' };
        if (isResume && item && item.downloadedBytes > 0) {
          headers['Range'] = `bytes=${item.downloadedBytes}-`;
        }

        const client = parsedUrl.protocol === 'https:' ? https : http;
        const request = client.get(targetUrl, {
          headers: headers,
          agent: parsedUrl.protocol === 'https:' ? httpsAgent : httpAgent,
        }, (response) => {

          if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
            let redirectUrl = response.headers.location;
            if (!redirectUrl.startsWith('http')) {
              redirectUrl = new URL(redirectUrl, targetUrl).href;
            }
            if (redirectsLeft > 0) {
              response.on('data', () => { }); // drain
              return downloadFile(redirectUrl, redirectsLeft - 1);
            }
          }

          if (!isResume) {
            const contentLength = parseInt(response.headers['content-length'] || '0', 10);
            if (item && !item.totalBytes && contentLength > 0) {
              item.totalBytes = contentLength;
            }
          }

          response.on('data', (chunk) => {
            if (item) {
              item.downloadedBytes += chunk.length;
              if (item.totalBytes > 0) {
                item.progress = item.downloadedBytes / item.totalBytes;
              }
            }
          });

          response.pipe(fileStream);

          response.on('end', () => {
            fileStream.close();
            const endItem = activeDownloadsApp.get(id);
            if (endItem) {
              endItem.status = 'completed';
              endItem.progress = 1;
            }
          });
        }).on('error', (err) => {
          const errItem = activeDownloadsApp.get(id);
          if (errItem && errItem.status === 'paused') {
            return;
          }
          fs.unlink(destPath, () => { });
          if (errItem) errItem.status = 'error';
        });

        if (item) item.request = request;
      };

      downloadFile(urlStr, 5, false);

      // Store the resume function so we can call it later
      const item = activeDownloadsApp.get(id);
      if (item) {
        item.resumeFunction = () => {
          fileStream = fs.createWriteStream(item.localUri, { flags: 'a' });
          downloadFile(item.url, 5, true);
        };
      }
    });

    expressApp.get('/api/download/status', (req, res) => {
      const result = {};
      for (const [id, data] of activeDownloadsApp.entries()) {
        result[id] = { progress: data.progress, status: data.status, localUri: data.localUri };
      }
      res.json(result);
    });

    expressApp.get('/api/download/pause', (req, res) => {
      const id = req.query.id;
      if (activeDownloadsApp.has(id)) {
        const item = activeDownloadsApp.get(id);
        item.status = 'paused';
        if (item.request) {
          item.request.abort();
          item.request = null;
        }
      }
      res.send('ok');
    });

    expressApp.get('/api/download/resume', (req, res) => {
      const id = req.query.id;
      if (activeDownloadsApp.has(id)) {
        const item = activeDownloadsApp.get(id);
        if (item.status === 'paused' && item.resumeFunction) {
          item.status = 'downloading';
          item.resumeFunction();
        }
      }
      res.send('ok');
    });

    expressApp.get('/api/download/cancel', (req, res) => {
      const id = req.query.id;
      if (activeDownloadsApp.has(id)) {
        const data = activeDownloadsApp.get(id);
        data.status = 'canceled';
        if (data.request) data.request.abort();
        fs.unlink(data.localUri, () => { });
        activeDownloadsApp.delete(id);
      }
      res.send('ok');
    });

    expressApp.get('/exit_app', (req, res) => {
      res.send('ok');
      app.quit();
    });

    expressApp.get('/minimize_app', (req, res) => {
      res.send('ok');
      if (mainWindow) mainWindow.minimize();
    });

    expressApp.get('/maximize_app', (req, res) => {
      res.send('ok');
      if (mainWindow) {
        if (mainWindow.isFullScreen()) {
          mainWindow.setFullScreen(false);
          if (!mainWindow.isMaximized()) {
            mainWindow.maximize();
          }
        } else if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
      }
    });

    expressApp.get('/is_maximized', (req, res) => {
      if (mainWindow) {
        res.json({ isMaximized: mainWindow.isMaximized() });
      } else {
        res.json({ isMaximized: false });
      }
    });

    expressApp.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'app/index.html'));
    });

    server = expressApp.listen(0, () => {
      serverPort = server.address().port;
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
