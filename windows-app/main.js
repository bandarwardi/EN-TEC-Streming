const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');

let mainWindow;
let server;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    icon: path.join(__dirname, 'build/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Remove the default menu
  mainWindow.setMenu(null);

  // Load the express server URL
  mainWindow.loadURL('http://localhost:1337');

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  return new Promise((resolve) => {
    const expressApp = express();
    // Serve static files from the 'app' directory (which is Expo's web export)
    expressApp.use(express.static(path.join(__dirname, 'app')));

    // Redirect all requests to index.html for client-side routing
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
