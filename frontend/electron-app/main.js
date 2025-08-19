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
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      contextIsolation: true
    },
    icon: path.join(__dirname, 'assets', 'icon.ico') ,
    autoHideMenuBar: true 
  });
  win.setMenu(null);
  win.loadURL(`http://localhost:${PORT}`);

   win.on('close', (event) => {
    event.preventDefault(); 
    win.hide(); 

  tray = new Tray(path.join(__dirname, 'assets', 'icon.ico'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open', click: () => win.show() },
    { label: 'Exit', click: () => app.quit() }
  ]);
  tray.setToolTip('Decibel');
  tray.setContextMenu(contextMenu);
  });
}

app.whenReady().then(() => createWindow());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
