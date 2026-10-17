'use strict';
/*
 * Nihongo Line desktop shell.
 * The window loads the same page as the web version (app/index.html). This process
 * holds the Anthropic API key (encrypted with the OS keychain via safeStorage), makes
 * the Claude API calls so the key never reaches the page, and installs updates
 * published as GitHub Releases (electron-updater, see build.publish in package.json).
 */
const { app, BrowserWindow, ipcMain, safeStorage, dialog, shell, Menu, nativeTheme, session } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_ID = 'app.nihongoline.desktop';
const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODELS = { quick: 'claude-haiku-4-5-20251001', default: 'claude-sonnet-5-5', complex: 'claude-sonnet-5-5' };
const userFile = name => path.join(app.getPath('userData'), name);
let win = null;

/* ---------- small JSON files in the user data folder ---------- */
function readJSON(name, fallback) {
  try { return JSON.parse(fs.readFileSync(userFile(name), 'utf8')); } catch (e) { return fallback; }
}
function writeJSON(name, data, mode) {
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  const file = userFile(name); const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data), mode ? { mode } : undefined);
  fs.renameSync(tmp, file);
}
const readPrefs = () => readJSON('settings.json', {});
const writePrefs = patch => writeJSON('settings.json', Object.assign(readPrefs(), patch));

/* ---------- API key and model settings ---------- */
function readKey() {
  const rec = readJSON('api-key.json', null);
  if (!rec || typeof rec.data !== 'string') return '';
  try {
    const buf = Buffer.from(rec.data, 'base64');
    return rec.enc ? safeStorage.decryptString(buf) : buf.toString('utf8');
  } catch (e) { return ''; }
}
function writeKey(key) {
  if (!key) { try { fs.unlinkSync(userFile('api-key.json')); } catch (e) { /* already gone */ } return; }
  const enc = safeStorage.isEncryptionAvailable();
  const buf = enc ? safeStorage.encryptString(key) : Buffer.from(key, 'utf8');
  writeJSON('api-key.json', { enc, data: buf.toString('base64') }, 0o600);
}
function readModels() { return Object.assign({}, DEFAULT_MODELS, readJSON('models.json', {})); }
function writeModels(m) {
  const clean = {};
  for (const k of ['quick', 'default', 'complex']) {
    const v = String((m && m[k]) || '').trim();
    if (/^[a-z0-9._:\-]{3,80}$/i.test(v)) clean[k] = v;
  }
  writeJSON('models.json', clean);
}

ipcMain.handle('ai:status', () => ({ hasKey: !!readKey(), models: readModels(), encrypted: safeStorage.isEncryptionAvailable() }));
ipcMain.handle('ai:setKey', (_e, key) => { writeKey(String(key || '').trim()); return { hasKey: !!readKey() }; });
ipcMain.handle('ai:setModels', (_e, models) => { writeModels(models); return readModels(); });
ipcMain.handle('app:info', () => ({ version: app.getVersion(), packaged: app.isPackaged, platform: process.platform }));

/* ---------- Claude requests (streamed) ---------- */
const active = new Map();
function cleanMessages(list) {
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const m of list) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return null;
    const text = String(m.content || '');
    if (!text.trim()) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += '\n\n' + text; /* merge same-role neighbours */
    else out.push({ role: m.role, content: text });
  }
  if (!out.length || out[0].role !== 'user' || out[out.length - 1].role !== 'user') return null;
  return out;
}

ipcMain.handle('ai:abort', (_e, id) => { const c = active.get(String(id)); if (c) c.abort(); return true; });
ipcMain.handle('ai:request', async (event, p) => {
  const id = String((p && p.id) || '');
  const messages = cleanMessages(p && p.messages);
  if (!id || !messages) return { error: { code: 'invalid_request', message: 'Malformed request' } };
  const key = readKey();
  if (!key) return { error: { code: 'no_key', message: 'No API key saved' } };
  const models = readModels();
  const model = models[p.tier] || models.default;
  const ctl = new AbortController();
  active.set(id, ctl);
  let text = '';
  const send = t => { if (!event.sender.isDestroyed()) event.sender.send('ai:delta', { id, text: t }); };
  try {
    const body = { model, max_tokens: Math.min(Number(p.maxTokens) || 4096, 16000), messages, stream: true };
    if (p.system) body.system = String(p.system);
    const res = await fetch(API_URL, {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      let msg = res.statusText;
      try { const j = await res.json(); msg = (j.error && j.error.message) || msg; } catch (e) { /* not JSON */ }
      const code = res.status === 401 || res.status === 403 ? 'bad_key'
        : res.status === 429 ? 'rate_limited'
        : res.status === 400 || res.status === 404 ? 'invalid_request' : 'upstream_error';
      return { error: { code, message: res.status + ': ' + msg } };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = ''; let stop = null;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true }).replace(/\r/g, '');
      let cut;
      while ((cut = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, cut); buf = buf.slice(cut + 2);
        const data = block.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
        if (!data) continue;
        let ev; try { ev = JSON.parse(data); } catch (e) { continue; }
        if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') { text += ev.delta.text; send(text); }
        else if (ev.type === 'message_delta' && ev.delta && ev.delta.stop_reason) stop = ev.delta.stop_reason;
        else if (ev.type === 'error') return { error: { code: 'upstream_error', message: (ev.error && ev.error.message) || 'Stream error', text } };
      }
    }
    if (stop === 'refusal') return { error: { code: 'refused', message: 'Claude declined to answer' } };
    return { text, truncated: stop === 'max_tokens', model };
  } catch (err) {
    if (err && err.name === 'AbortError') return { error: { code: 'cancelled', message: 'Stopped', text } };
    return { error: { code: 'upstream_error', message: String((err && err.message) || err), text } };
  } finally {
    active.delete(id);
  }
});

/* ---------- backups ---------- */
ipcMain.handle('file:save', async (event, req) => {
  const owner = BrowserWindow.fromWebContents(event.sender);
  const name = String((req && req.name) || 'nihongo-line-backup.json').replace(/[\\/:*?"<>|]+/g, '-');
  const r = await dialog.showSaveDialog(owner, { defaultPath: path.join(app.getPath('documents'), name), filters: [{ name: 'Nihongo Line backup', extensions: ['json'] }] });
  if (r.canceled || !r.filePath) return { ok: false, canceled: true };
  await fs.promises.writeFile(r.filePath, String(req.data), 'utf8');
  return { ok: true, path: r.filePath };
});

/* ---------- automatic updates from GitHub Releases ---------- */
const UP = { state: 'idle', version: '', progress: 0, message: '', manual: false };
let updater = null;
let lastPct = -1;
function sendUp(extra) {
  Object.assign(UP, extra);
  if (win && !win.isDestroyed()) win.webContents.send('update:state', Object.assign({}, UP));
}
const autoUpdate = () => readPrefs().autoUpdate !== false;
function setupUpdater() {
  /* only an installed Windows build can update itself; `npm start` and the portable exe can't */
  if (!app.isPackaged || process.platform !== 'win32' || process.env.PORTABLE_EXECUTABLE_FILE) { UP.state = 'unsupported'; return; }
  try { updater = require('electron-updater').autoUpdater; } catch (e) { UP.state = 'unsupported'; return; }
  updater.autoDownload = autoUpdate();
  updater.autoInstallOnAppQuit = true;
  updater.on('checking-for-update', () => sendUp({ state: 'checking', message: '' }));
  updater.on('update-not-available', () => sendUp({ state: 'none', version: app.getVersion() }));
  updater.on('update-available', info => { lastPct = -1; sendUp({ state: updater.autoDownload ? 'downloading' : 'available', version: info.version, progress: 0 }); });
  updater.on('download-progress', p => {
    const pct = Math.floor(p.percent || 0);
    if (pct >= lastPct + 5) { lastPct = pct; sendUp({ state: 'downloading', progress: pct }); }
  });
  updater.on('update-downloaded', info => sendUp({ state: 'ready', version: info.version, progress: 100 }));
  updater.on('error', err => sendUp({ state: 'error', message: String((err && err.message) || err).split('\n')[0].slice(0, 200) }));
  setTimeout(() => checkUpdates(false), 15000);
  setInterval(() => checkUpdates(false), 4 * 3600 * 1000);
}
function checkUpdates(manual) {
  if (!updater) return sendUp({ manual });
  if (UP.state === 'checking' || UP.state === 'downloading' || UP.state === 'ready') return sendUp({ manual });
  if (UP.state === 'available' && manual) { sendUp({ state: 'downloading', progress: 0, manual }); updater.downloadUpdate().catch(() => { /* reported by the error event */ }); return; }
  sendUp({ manual });
  updater.autoDownload = manual || autoUpdate();
  updater.checkForUpdates().catch(() => { /* reported by the error event */ });
}
ipcMain.handle('update:state', () => Object.assign({}, UP));
ipcMain.handle('update:check', () => { checkUpdates(true); return true; });
ipcMain.handle('update:install', () => {
  if (!updater || UP.state !== 'ready') return { ok: false };
  setImmediate(() => updater.quitAndInstall(true, true)); /* silent install, then reopen the app */
  return { ok: true };
});
ipcMain.handle('update:setAuto', (_e, on) => { writePrefs({ autoUpdate: !!on }); if (updater) updater.autoDownload = !!on; return { autoUpdate: !!on }; });
ipcMain.handle('update:getAuto', () => ({ autoUpdate: autoUpdate() }));

/* ---------- window ---------- */
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 380, minHeight: 560,
    title: 'Nihongo Line',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0E131A' : '#F2F4F7',
    icon: path.join(__dirname, 'app', 'icon.png'),
    autoHideMenuBar: true, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false }
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); if (/^https:\/\//.test(url)) shell.openExternal(url); } });
  win.webContents.on('will-attach-webview', e => e.preventDefault());
  win.on('closed', () => { win = null; });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { role: 'windowMenu' },
    { label: 'Help', submenu: [
      { label: 'Check for updates', click: () => checkUpdates(true) },
      { label: 'Release notes', click: () => shell.openExternal('https://github.com/fayraa/nihongo-line/releases') },
      { type: 'separator' },
      { label: 'Get an Anthropic API key', click: () => shell.openExternal('https://console.anthropic.com/settings/keys') },
      { label: `Version ${app.getVersion()}`, enabled: false }
    ] }
  ]));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId(APP_ID);
    session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
    buildMenu();
    createWindow();
    setupUpdater();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
