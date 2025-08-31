const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const fs = require('fs');
require('dotenv').config();

try {
  app.setAppUserModelId('com.decibel.desktop');
  app.setName('Decibel');
  app.setPath('userData', path.join(app.getPath('appData'), 'Decibel'));
} catch {}

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
server.use('/assets', express.static(path.join(__dirname, 'assets')));
const PORT = 3000;
server.listen(PORT, () => console.log(`Serving on http://localhost:${PORT}`));

function attachWinEvents(w) {
  try {
    w.setMenu(null);
    w.on('close', (event) => {
      event.preventDefault();
      try { w.hide(); } catch {}
    });
    w.on('maximize', () => { try { w.webContents.send('window-state', { isMaximized: true }); } catch {} });
    w.on('unmaximize', () => { try { w.webContents.send('window-state', { isMaximized: false }); } catch {} });
  } catch {}
}

function createWindow() {
  if (win) return;

  const commonPrefs = { contextIsolation: true, preload: path.join(__dirname, 'preload.js'), webSecurity: false };
  const commonOpts = { width: 1024, height: 768, icon: path.join(__dirname, 'assets', 'icon.ico'), autoHideMenuBar: true };

  let resolved = false;
  let timer;

  const makeFrameless = () => {
    win = new BrowserWindow({ ...commonOpts, webPreferences: commonPrefs, frame: false, show: false, ...(isMac ? { titleBarStyle: 'hiddenInset' } : {}) });
    attachWinEvents(win);
    win.loadURL(`http://localhost:${PORT}`);
  };

  const makeFramed = () => {
    if (win) { try { win.destroy(); } catch {} }
    win = new BrowserWindow({ ...commonOpts, webPreferences: commonPrefs, frame: true, show: true });
    attachWinEvents(win);
    win.loadURL(`http://localhost:${PORT}`);
  };

  ipcMain.once('preload-ready', () => {
    resolved = true;
    try { clearTimeout(timer); } catch {}
    try { if (win) win.show(); } catch {}
  });

  makeFrameless();

  timer = setTimeout(() => {
    if (resolved) return;
    makeFramed();
  }, 2500);
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

ipcMain.on('window-controls', (_evt, action) => {
  if (!win) return;
  try {
    switch (action) {
      case 'minimize': win.minimize(); break;
      case 'maximize': win.maximize(); break;
      case 'restore':
        if (win.isMaximized()) { win.unmaximize(); }
        else { win.restore(); }
        break;
      case 'toggle': win.isMaximized() ? win.unmaximize() : win.maximize(); break;
      case 'close': win.close(); break; 
      default: break;
    }
  } catch {}
});

ipcMain.handle('get-app-icon', async () => {
  try {
    const size = 16;
    const candidates = ['icon.png', 'icon.ico', 'icon.jpg', 'icon.jpeg'];
    for (const name of candidates) {
      try {
        const p = path.join(__dirname, 'assets', name);
        let img = nativeImage.createFromPath(p);
        if (!img || (img.isEmpty && img.isEmpty())) continue;
        if (img.resize) img = img.resize({ width: size, height: size });
        const dataUrl = img.toDataURL ? img.toDataURL() : null;
        if (dataUrl) return dataUrl;
      } catch {}
    }
  } catch {}
  return null;
});

const { Client, ActivityType } = require("@xhayper/discord-rpc");
const DISCORD_CLIENT_ID = process.env.DISCORD_APP_ID;

console.log("[Discord RPC] Client ID:", DISCORD_CLIENT_ID);

const rpc = new Client({ clientId: DISCORD_CLIENT_ID });

let rpcReady = false;

async function setDiscordPresence({
  state = "Decibel 🎵",
  details = "Scrolling Main Page",
  largeImageKey = "icon",
  largeImageText = "",
  smallImageKey = undefined,
  smallImageText = undefined,
  startTimestamp = Date.now(),
  endTimestamp = undefined,
  type = 2,
  buttons = [{ label: "Listen on Decibel", url: "https://deccibel.vercel.app/" }]
} = {}) {
  if (!rpcReady) {
    console.log("[Discord RPC] Not ready, skipping setActivity");
    return;
  }

  console.log("[Discord RPC] setActivity", {
    state,
    details,
    type,
    buttons
  });

  try {
    await rpc.user?.setActivity({
      state,
      details,
      largeImageKey,
      largeImageText,
      smallImageKey,
      smallImageText,
      startTimestamp,
      endTimestamp,
      type,
      buttons
    });
  } catch (err) {
    console.error("[Discord RPC] setActivity error:", err);
  }
}

rpc.on("ready", () => {
  rpcReady = true;
  console.log("[Discord RPC] Ready!");
  setDiscordPresence();
});

rpc.login().then(() => {
  console.log("[Discord RPC] Login success");
}).catch((err) => {
  console.error("[Discord RPC] Login failed:", err);
});

ipcMain.handle("update-discord-presence", async (_evt, presence) => {
  console.log("[Discord RPC] update-discord-presence", presence);
  setDiscordPresence(presence);
});

app.on("window-all-closed", () => {
  if (rpcReady) {
    try { rpc.user?.clearActivity(); } catch {}
  }
  if (process.platform !== "darwin") app.quit();
});

