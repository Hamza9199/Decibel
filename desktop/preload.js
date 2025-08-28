const { contextBridge, ipcRenderer } = require('electron');

let __tb_api = { reflow: () => {}, setOffset: () => {}, pushBelowToolbar: () => {} };

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.send('window-controls', 'minimize'),
  maximize: () => ipcRenderer.send('window-controls', 'maximize'),
  restore: () => ipcRenderer.send('window-controls', 'restore'),
  toggle: () => ipcRenderer.send('window-controls', 'toggle'),
  close: () => ipcRenderer.send('window-controls', 'close'),
  onWindowState: (cb) => ipcRenderer.on('window-state', (_evt, state) => cb(state)),
  reflowToolbar: () => { try { __tb_api.reflow(); } catch {} },
  setToolbarOffset: (px) => { try { __tb_api.setOffset(px); } catch {} },
  pushBelowToolbar: () => { try { return __tb_api.pushBelowToolbar(); } catch { return false; } },
});

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (...args) => ipcRenderer.invoke(...args),
  }
});

function setupTitlebar() {
  try {
    if (document.getElementById('titlebar')) return;

    const height = 36;
    let barHeight = height;

    try {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/assets/titlebar.css';
      document.head.appendChild(link);
    } catch {}

    const bar = document.createElement('div');
    bar.id = 'titlebar';

    const spacerEl = document.createElement('div');
    spacerEl.id = 'titlebar-spacer';

    const findRoot = () =>
      document.getElementById('root') ||
      document.getElementById('app') ||
      document.getElementById('__next') ||
      document.querySelector('main');

    const placeSpacer = () => {
      try {
        const root = findRoot();
        if (root && root.parentNode === document.body) {
          document.body.insertBefore(spacerEl, root);
        } else if (!spacerEl.parentNode) {
          document.body.insertBefore(spacerEl, document.body.firstChild);
        }
      } catch {}
    };

    const left = document.createElement('div');
    left.className = 'tb-left';

    const appIcon = document.createElement('div');
    appIcon.className = 'tb-icon';
    appIcon.innerHTML = `
    <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false">
        <g fill="#090808ff">
        <rect x="160" y="112" width="176" height="28" rx="6"></rect>
        <rect x="184" y="140" width="28" height="180" rx="6"></rect>
        <rect x="308" y="140" width="28" height="180" rx="6"></rect>
        <rect x="124" y="320" width="68" height="68" rx="10"></rect>
        <rect x="252" y="320" width="68" height="68" rx="10"></rect>
        <rect x="332" y="228" width="26" height="172" rx="6"></rect>
        <rect x="292" y="380" width="58" height="58" rx="10"></rect>
        <rect x="428" y="256" width="24" height="156" rx="6"></rect>
        <rect x="388" y="360" width="50" height="50" rx="10"></rect>
        </g>
    </svg>`;

    const title = document.createElement('div');
    title.className = 'tb-title';
    title.textContent = document.title || 'Decibel';

    left.appendChild(appIcon);
    left.appendChild(title);

    const right = document.createElement('div');
    right.className = 'tb-right';

    const btn = (cls, svgPath, viewBox = '0 0 12 12') => {
      const el = document.createElement('div');
      el.className = `tb-btn ${cls}`;
      el.innerHTML = `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false"><path d="${svgPath}"></path></svg>`;
      return el;
    };

    const minimizeBtn = btn('minimize', 'M 2 8 H 10');
    const maximizeBtn = btn('maximize', 'M 1.5 1.5 H 10.5 V 10.5 H 1.5 Z');
    const restoreBtn  = btn('restore',  'M 3.5 3.5 H 9.5 V 7.5 H 3.5 Z M 6.5 4.5 H 10.5 V 10.5 H 6.5 Z');
    const closeBtn    = btn('close',    'M 2 2 L 10 10 M 10 2 L 2 10');

    restoreBtn.style.display = 'none';

    minimizeBtn.addEventListener('click', () => { try { ipcRenderer.send('window-controls', 'minimize'); } catch {} });
    maximizeBtn.addEventListener('click', () => { try { ipcRenderer.send('window-controls', 'maximize'); } catch {} });
    restoreBtn.addEventListener('click', () => { try { ipcRenderer.send('window-controls', 'restore'); } catch {} });
    closeBtn.addEventListener('click', () => { try { ipcRenderer.send('window-controls', 'close'); } catch {} });

    ipcRenderer.on('window-state', (_evt, state) => {
      try {
        const maximized = !!(state && state.isMaximized);
        maximizeBtn.style.display = maximized ? 'none' : '';
        restoreBtn.style.display = maximized ? '' : 'none';
      } catch {}
    });

    right.appendChild(minimizeBtn);
    right.appendChild(maximizeBtn);
    right.appendChild(restoreBtn);
    right.appendChild(closeBtn);

    bar.appendChild(left);
    bar.appendChild(right);
    document.body.appendChild(bar);

    const adjustRoots = () => {
      const roots = [
        document.getElementById('root'),
        document.getElementById('app'),
        document.getElementById('__next'),
        document.querySelector('main')
      ].filter(Boolean);
      roots.forEach((el) => {
        try {
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed' || cs.position === 'sticky' || cs.position === 'absolute') {
            if (!el.classList.contains('tb-push')) {
              el.classList.add('tb-push');
            }
          }
        } catch {}
      });
    };

    const setBodyPadding = () => {
      try {
        document.documentElement.style.setProperty('--tb-height', `${barHeight}px`);
        document.documentElement.style.setProperty('--tb-offset', `${barHeight}px`);
        adjustRoots();
      } catch {}
    };

    const ensureOffsetStrategy = () => {
      try {
        const root = findRoot();
        if (!root) return;
        requestAnimationFrame(() => {
          try {
            const top = root.getBoundingClientRect().top;
            const needSpacer = top < (barHeight - 1);
            document.documentElement.classList.toggle('tb-use-spacer', !!needSpacer);
            if (needSpacer) {
              placeSpacer();
            } else if (spacerEl.parentNode) {
              try { spacerEl.remove(); } catch {}
            }
          } catch {}
        });
      } catch {}
    };

    __tb_api.reflow = () => { try { setBodyPadding(); ensureOffsetStrategy(); adjustRoots(); } catch {} };
    __tb_api.setOffset = (px) => {
      try {
        const v = Math.max(0, Number(px) || 0);
        barHeight = v || height;
      } catch {}
      __tb_api.reflow();
    };
    __tb_api.pushBelowToolbar = () => { try { document.documentElement.classList.add('tb-use-spacer'); placeSpacer(); return true; } catch { return false; } };

    setBodyPadding();
    ensureOffsetStrategy();

    const paddingObserver = new MutationObserver(() => { setBodyPadding(); ensureOffsetStrategy(); });
    try { paddingObserver.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] }); } catch {}

    const keepBar = () => {
      try {
        if (!document.body.contains(bar)) document.body.appendChild(bar);
        if (document.documentElement.classList.contains('tb-use-spacer')) placeSpacer();
      } catch {}
    };
    const barObserver = new MutationObserver(() => { keepBar(); adjustRoots(); });
    try { barObserver.observe(document.body, { childList: true, subtree: true }); } catch {}

    window.addEventListener('focus', () => setTimeout(() => { setBodyPadding(); keepBar(); adjustRoots(); ensureOffsetStrategy(); }, 0));
    window.addEventListener('resize', ensureOffsetStrategy);
  } catch {}
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => { try { setupTitlebar(); __tb_api.reflow(); ipcRenderer.send('preload-ready'); } catch { try { ipcRenderer.send('preload-ready'); } catch {} } }, { once: true });
} else {
  try { setupTitlebar(); __tb_api.reflow(); ipcRenderer.send('preload-ready'); } catch { try { ipcRenderer.send('preload-ready'); } catch {} }
}