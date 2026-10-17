'use strict';
/*
 * Tests the desktop shell without starting Electron: main.js is loaded with a stand-in
 * `electron` module, and the Anthropic API is replaced by a fake streaming response.
 * Then app/desktop-shim.js is run against those handlers, the way the page uses it.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const path = require('path');
const fs = require('fs');
const os = require('os');
const vm = require('vm');

const root = path.join(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nl-desktop-'));
const handlers = {};
const electron = {
  app: { getPath: () => dir, requestSingleInstanceLock: () => false, quit() {}, on() {}, whenReady: () => new Promise(() => {}), getVersion: () => '0.0.0', isPackaged: false },
  ipcMain: { handle: (name, fn) => { handlers[name] = fn; } },
  safeStorage: { isEncryptionAvailable: () => false, encryptString: s => Buffer.from(s), decryptString: b => b.toString() },
  BrowserWindow: { fromWebContents: () => null }, dialog: {}, shell: {}, Menu: {}, nativeTheme: {}, session: {}
};
const realLoad = Module._load;
Module._load = function (request, ...rest) { return request === 'electron' ? electron : realLoad.call(this, request, ...rest); };
require(path.join(root, 'main.js'));
Module._load = realLoad;

let lastBody = null;
let reply = '';
let status = 200;
global.fetch = async (url, opts) => {
  lastBody = JSON.parse(opts.body);
  if (status !== 200) return { ok: false, status, statusText: 'Nope', json: async () => ({ error: { message: 'invalid x-api-key' } }) };
  const enc = new TextEncoder();
  const parts = [reply.slice(0, 7), reply.slice(7, 40), reply.slice(40)];
  const events = ['event: message_start\ndata: {"type":"message_start"}\n\n']
    .concat(parts.map(t => 'event: content_block_delta\r\ndata: ' + JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } }) + '\r\n\r\n'))
    .concat(['data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n', 'data: {"type":"message_stop"}\n\n']);
  const blob = events.join('');
  const chunks = [blob.slice(0, 50), blob.slice(50, 230), blob.slice(230)]; /* split mid-event on purpose */
  return { ok: true, status: 200, body: new ReadableStream({ start(c) { chunks.forEach(x => c.enqueue(enc.encode(x))); c.close(); } }) };
};

function shim() {
  const listeners = new Map();
  const send = { isDestroyed: () => false, send: (_ch, m) => { const f = listeners.get(m.id); if (f) f(m.text); } };
  const ctx = {
    nlDesktop: {
      request: async (p, cb) => { listeners.set(p.id, cb); try { return await handlers['ai:request']({ sender: send }, p); } finally { listeners.delete(p.id); } },
      abort: id => handlers['ai:abort'](null, id),
      saveFile: async () => ({ ok: true })
    },
    console, Blob
  };
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'app', 'desktop-shim.js'), 'utf8'), ctx);
  return ctx.claude;
}

test('without a saved key, requests say so instead of calling the API', async () => {
  const r = await handlers['ai:request']({ sender: { isDestroyed: () => false, send() {} } }, { id: 'a', messages: [{ role: 'user', content: 'hi' }] });
  assert.equal(r.error.code, 'no_key');
});

test('the key is saved, reported and removed', async () => {
  await handlers['ai:setKey'](null, '  sk-ant-test  ');
  assert.equal((await handlers['ai:status']()).hasKey, true);
  await handlers['ai:setKey'](null, '');
  assert.equal((await handlers['ai:status']()).hasKey, false);
  await handlers['ai:setKey'](null, 'sk-ant-test');
});

test('streamed JSON replies are parsed, and consecutive user turns are merged', async () => {
  reply = '{"feedback":null,"ja":"いらっしゃいませ。","romaji":"irasshaimase","en":"Welcome.","suggestions":[],"goal_met":false,"aside":""}';
  const claude = shim();
  const sample = await claude.use('sample');
  const seen = [];
  const r = await sample.json([{ role: 'user', content: 'RULES' }, { role: 'user', content: 'start' }], { modelTier: 'quick', onText: ({ text }) => seen.push(text) });
  assert.equal(r.ja, 'いらっしゃいませ。');
  assert.equal(lastBody.model, 'claude-haiku-4-5-20251001');
  assert.equal(lastBody.messages.length, 1, 'same-role turns are merged into one message');
  assert.ok(lastBody.system, 'JSON calls ask for JSON only');
  assert.ok(seen.length >= 2 && seen[seen.length - 1] === reply, 'onText gets the growing text');
});

test('plain text calls return text; malformed turn lists are refused', async () => {
  reply = 'はい、つながりました。';
  const sample = await shim().use('sample');
  assert.equal((await sample('test')).text, reply);
  await assert.rejects(sample([{ role: 'assistant', content: 'x' }]), e => e.code === 'invalid_request');
});

test('a rejected key comes back as bad_key', async () => {
  status = 401;
  const sample = await shim().use('sample');
  await assert.rejects(sample('hi'), e => e.code === 'bad_key');
  status = 200;
});

test('the desktop shell offers no shared database, so progress stays on the computer', async () => {
  const claude = shim();
  assert.equal(await claude.use('db'), null);
  assert.ok(await claude.use('downloads'));
});

test('updates are off when not running from an installed build', async () => {
  const s = await handlers['update:state']();
  assert.equal(typeof s.state, 'string');
  assert.equal((await handlers['update:install']()).ok, false);
});
