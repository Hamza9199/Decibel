const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');
const express = require('express');

let win;
let tray;

const server = express();
server.use(express.static(path.join(__dirname, 'dist')));
const PORT = 3000;
server.listen(PORT, () => console.log(`Serving on http://localhost:${PORT}`));

function createWindow() {
  if (win) return; 

  win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: { contextIsolation: true },
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    autoHideMenuBar: true
  });

  win.setMenu(null);
  win.loadURL(`http://localhost:${PORT}`);

  win.on('close', (event) => {
    event.preventDefault();
    win.hide();
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'icon.ico'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open', click: () => { if (win) win.show(); else createWindow(); } },
    { label: 'Exit', click: () => {  win.removeAllListeners('close');  app.quit()} }
  ]);
  tray.setToolTip('Decibel');
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
