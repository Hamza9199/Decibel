const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const express = require('express');
const fs = require('fs');

let win;
let tray;

const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
function isAutoLaunchEnabled() {
  try {
    const settings = app.getLoginItemSettings({ path: process.execPath, args: [] });
    return !!settings.openAtLogin;
  } catch {
    return false;
  }
}

const gotTheLock = app.requestSingleInstanceLock();

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
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  let trayIcon = nativeImage.createFromPath(iconPath);
  const size = isWindows ? 16 : (isMac ? 18 : 22);
  try { trayIcon = trayIcon.resize({ width: size, height: size }); } catch {}
  if (isMac) { try { trayIcon.setTemplateImage(true); } catch {} }

  const loadMenuIcon = (name) => {
    const candidates = [
      path.join(__dirname, 'assets',`${name}.png`),
      path.join(__dirname, 'assets', `${name}.ico`),
      path.join(__dirname, 'assets', `${name}.svg`),
      path.join(__dirname, 'assets', `${name}.png`),
      path.join(__dirname, 'assets',`${name}.ico`),
      path.join(__dirname, 'assets', `${name}.svg`)
    ];
    for (const p of candidates) {
      try {
        if (!fs.existsSync(p)) continue;
        let img = nativeImage.createFromPath(p);
        if (img && !img.isEmpty && img.isEmpty()) continue;
        img = img.resize({ width: size, height: size });
        if (isMac) { try { img.setTemplateImage(true); } catch {} }
        return img;
      } catch {}
    }
    return trayIcon; 
  };

  tray = new Tray(trayIcon);
  tray.setToolTip('Decibel');

  const autoLaunch = isAutoLaunchEnabled();

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Decibel', icon: trayIcon, enabled: false },
    { type: 'separator' },
    { label: 'Open', icon: loadMenuIcon('open'), click: () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } else createWindow(); } },
    { label: 'Minimize', icon: loadMenuIcon('minimize'), click: () => { if (win) { try { win.hide(); } catch {} } } },
    { label: 'Settings', icon: loadMenuIcon('settings'), submenu: [
      { label: 'Always on top', type: 'checkbox', checked: !!(win && win.isAlwaysOnTop && win.isAlwaysOnTop()), click: (menuItem) => { if (win) win.setAlwaysOnTop(menuItem.checked); } },
      { label: 'Start at login', type: 'checkbox', checked: autoLaunch, click: (menuItem) => {
        const enable = !!menuItem.checked;
        try {
          const options = { openAtLogin: enable, openAsHidden: true };
          if (isWindows) { options.path = process.execPath; options.args = []; }
          app.setLoginItemSettings(options);
        } catch {}
      } },
    ]},
    { type: 'separator' },
    { label: 'Exit', icon: loadMenuIcon('exit'), click: () => { if (win) win.removeAllListeners('close'); app.quit(); } }
  ]);

  tray.setContextMenu(contextMenu);

  const showApp = () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    } else {
      createWindow();
    }
  };

  tray.on('click', showApp);
  tray.on('double-click', showApp);
}

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
