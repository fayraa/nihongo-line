'use strict';
/* The only bridge between the page and the desktop shell. The page never sees the API key. */
const { contextBridge, ipcRenderer } = require('electron');

const listeners = new Map();
ipcRenderer.on('ai:delta', (_e, msg) => { const f = msg && listeners.get(msg.id); if (f) f(msg.text); });

contextBridge.exposeInMainWorld('nlDesktop', {
  platform: process.platform,
  info: () => ipcRenderer.invoke('app:info'),
  status: () => ipcRenderer.invoke('ai:status'),
  setKey: key => ipcRenderer.invoke('ai:setKey', String(key || '')),
  setModels: models => ipcRenderer.invoke('ai:setModels', models),
  request: async (payload, onDelta) => {
    if (typeof onDelta === 'function') listeners.set(payload.id, onDelta);
    try { return await ipcRenderer.invoke('ai:request', payload); }
    finally { listeners.delete(payload.id); }
  },
  abort: id => ipcRenderer.invoke('ai:abort', id),
  saveFile: (name, data) => ipcRenderer.invoke('file:save', { name, data }),
  updateState: () => ipcRenderer.invoke('update:state'),
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateInstall: () => ipcRenderer.invoke('update:install'),
  getAutoUpdate: () => ipcRenderer.invoke('update:getAuto'),
  setAutoUpdate: on => ipcRenderer.invoke('update:setAuto', !!on),
  onUpdate: cb => { ipcRenderer.on('update:state', (_e, state) => cb(state)); }
});
