'use strict';
/*
 * Runs the real app page in Chromium with a stand-in for Claude, then clicks through each
 * section the way a learner would. The stand-in answers each kind of request (conversation
 * turn, review, reading, lesson, word breakdown, cards) with fixed JSON in the shape the
 * prompts ask for, so these tests also catch a prompt and its parser drifting apart.
 *
 * Set CHROMIUM_PATH to use an installed Chromium instead of Playwright's download.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
const { buildWeb, WANAKANA } = require('../scripts/build-web');

const root = path.join(__dirname, '..');
const PAGE = pathToFileURL(path.join(root, 'app', 'index.html')).href;
let browser;
test.before(async () => { browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}); });
test.after(async () => { if (browser) await browser.close(); });

/* fixed answers, keyed by what the prompt asks for */
const R = {
  convo: { feedback: { ok: false, corrected: 'コーヒーを一[ひと]つください。', explanation: 'Use を to mark what you want.', natural: '' }, ja: 'いらっしゃいませ。ご注文[ちゅうもん]はお決[き]まりですか。', romaji: 'irasshaimase. gochuumon wa okimari desu ka.', en: 'Welcome. Have you decided on your order?', suggestions: [{ ja: 'ホットコーヒーをお願[ねが]いします。', en: 'A hot coffee, please.' }, { ja: 'メニューを見[み]せてください。', en: 'Please show me the menu.' }], goal_met: false, aside: '' },
  review: { score: 4, summary: 'You ordered clearly.', strengths: ['Polite requests'], fixes: [{ you: 'kohi kudasai', better: 'コーヒーをください。', why: 'Write it in kana.' }], vocab: [{ w: '注文[ちゅうもん]', m: 'order' }, { w: 'お決[き]まり', m: 'decided (polite)' }], next: 'Add a size next time.' },
  explain: { words: [{ w: 'ご注文[ちゅうもん]', base: '注文[ちゅうもん]', m: 'order (polite)' }, { w: 'は', base: '', m: 'topic marker' }], grammar: ['お〜ですか: polite question'], tip: 'Answer with 〜をお願[ねが]いします。' },
  lesson: { summary: 'Used to share an opinion with a friend.', formation: ['Plain form + じゃん'], examples: [{ ja: 'いいじゃん！', en: "That's great!" }], notes: ['Casual only.'], pitfalls: ['Not for your boss.'],
    quiz: [0, 1, 2].map(i => ({ q: `質問[しつもん]${i + 1}`, options: ['正[ただ]しい', 'b', 'c', 'd'], answer: 0, why: 'Because.' })) },
  more: [{ p: '〜っしょ', m: '…right? (casual でしょ)', ex: '明日[あした]来[く]るっしょ？', en: "You're coming tomorrow, right?" }, { p: '〜みたいな', m: 'kind of like…', ex: '「行[い]く？」みたいな感[かん]じ。', en: "Like, “are you going?”" }],
  cards: [{ w: 'マジで', m: 'seriously', ex: 'マジで？', exen: 'Seriously?' }, { w: 'めっちゃ', m: 'really, so', ex: 'めっちゃ寒[さむ]い。', exen: "It's so cold." }],
  reading: { title: '猫[ねこ]の一日[いちにち]', title_en: "A Cat's Day", paragraphs: [[{ ja: '猫[ねこ]が起[お]きました。', en: 'The cat woke up.' }, { ja: '外[そと]は雨[あめ]でした。', en: 'It was raining outside.' }], [{ ja: '猫[ねこ]はまた寝[ね]ました。', en: 'The cat went back to sleep.' }]],
    vocab: [{ w: '猫[ねこ]', m: 'cat' }, { w: '雨[あめ]', m: 'rain' }], questions: [{ q: '外[そと]の天気[てんき]は？', q_en: 'What was the weather?', options: ['雨[あめ]', '晴[は]れ', '雪[ゆき]', 'くもり'], answer: 0, why: '外は雨でした。' }] },
  meta: { title: '短[みじか]いメモ', title_en: 'A short note', vocab: [{ w: '天気[てんき]', m: 'weather' }], questions: [{ q: '何[なん]の話[はなし]？', options: ['天気[てんき]', '犬[いぬ]', '車[くるま]', '本[ほん]'], answer: 0, why: '' }] }
};

function installStub(R) {
  const text = input => (typeof input === 'string' ? input : Array.from(input).map(t => t.content).join('\n'));
  const pick = (input) => {
    const t = text(input);
    if (t.includes('Transcript:') && t.includes('"score"')) return R.review;
    if (t.includes('"formation"')) return R.lesson;
    if (t.includes('"words"')) return R.explain;
    if (t.includes('"p":"pattern"')) return R.more;
    if (t.includes('"exen"')) return R.cards;
    if (t.includes('"paragraphs"')) return R.reading;
    if (t.includes('"vocab"') && t.includes('"questions"')) return R.meta;
    if (t.includes('"feedback"')) {
      const learner = Array.isArray(input) ? input.filter(x => x.role === 'user').length - 1 : 0;
      return Object.assign({}, R.convo, { feedback: learner ? R.convo.feedback : null, goal_met: learner >= 2 });
    }
    return {};
  };
  const calls = window.__calls = [];
  const answer = async (input, opts, json) => {
    calls.push(text(input).slice(0, 200));
    await new Promise(r => setTimeout(r, 40));
    if (opts && opts.signal && opts.signal.aborted) throw { code: 'cancelled', message: 'Cancelled' };
    const value = json ? pick(input) : null;
    const out = json ? JSON.stringify(value) : 'はい、つながりました。';
    if (opts && opts.onText) opts.onText({ text: out, delta: out });
    return json ? JSON.parse(out) : { text: out, truncated: false, modelTierApplied: 'quick' };
  };
  const sample = (input, opts) => answer(input, opts, false);
  sample.json = (input, opts) => answer(input, opts, true);
  sample.limits = async () => ({ maxPromptBytes: 262144 });
  const downloads = { save: async req => { window.__saved = { filename: req.filename, data: String(req.data) }; return { status: 'saved' }; } };
  window.claude = { use: async name => (name === 'sample' ? sample : name === 'downloads' ? downloads : null) };
}

async function open(opts = {}) {
  const context = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 860 } });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await context.route(/cdn\.jsdelivr\.net\/npm\/wanakana@/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(path.join(root, 'app', 'vendor', 'wanakana.min.js'), 'utf8') }));
  if (!opts.noClaude) await context.addInitScript(installStub, R);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('page error: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  if (opts.html) {
    await context.route('https://nihongo.test/', r => r.fulfill({ status: 200, contentType: 'text/html', body: opts.html }));
    await page.goto('https://nihongo.test/');
  } else await page.goto(PAGE);
  await page.waitForSelector('#view h1');
  page.setDefaultTimeout(8000);
  return { page, context, errors };
}
const go = (page, v) => page.click(`.nav-btn[data-v="${v}"]`);
const toast = async (page, re) => { await page.waitForFunction(r => { const t = document.querySelector('#toast'); return t && !t.hidden && new RegExp(r).test(t.textContent); }, re.source); };
const nl = (page, fn) => page.evaluate(fn);

test('every section opens without errors', async () => {
  const { page, context, errors } = await open();
  assert.match(await page.textContent('#view h1'), /路線図/);
  for (const v of ['talk', 'read', 'kana', 'cards', 'grammar', 'route']) {
    await go(page, v);
    await page.waitForSelector(`.nav-btn[data-v="${v}"][aria-current="page"]`);
    assert.ok((await page.textContent('#view')).trim().length > 100, `${v} has content`);
  }
  await page.click('[data-action="settings"]');
  await page.waitForSelector('#sheetWrap:not([hidden]) #setLevel');
  await page.keyboard.press('Escape');
  await page.click('.stn[data-code="C-01"]');
  await page.waitForSelector('#sheetBody .glist .grow');
  await page.click('#sheetClose');
  assert.deepEqual(errors, []);
  await context.close();
});

test('built-in course data is consistent', async () => {
  const { page, context } = await open();
  const r = await nl(page, () => {
    const N = window.__nl; const bad = [];
    for (const st of N.STATIONS) {
      (st.g || []).forEach(id => { if (!N.GR[id]) bad.push(`${st.code}: grammar ${id} missing`); });
      if (st.sc && !N.SC[st.sc]) bad.push(`${st.code}: scene ${st.sc} missing`);
      if (!N.LEVELS.some(l => l.id === st.lv)) bad.push(`${st.code}: unknown line ${st.lv}`);
    }
    for (const g of N.GRAMMAR) {
      const [id, , , , ex] = g;
      if (!N.GR[id].st) bad.push(`${id} isn't on any station`);
      if (N.ruby(ex).includes('[') || N.plain(ex).includes('[')) bad.push(`${id}: furigana didn't parse`);
    }
    for (const s of N.SCENARIOS) if (!s.t || !s.ja || !s.goal || !s.p) bad.push(`scene ${s.id} is incomplete`);
    return { bad, grammar: N.GRAMMAR.length, stations: N.STATIONS.length, scenes: N.SCENARIOS.length, kana: N.KANA_ALL.length };
  });
  assert.deepEqual(r.bad, []);
  assert.ok(r.grammar >= 120 && r.stations >= 40 && r.scenes >= 38 && r.kana > 200, JSON.stringify(r));
  await context.close();
});

test('conversation: reply, feedback, explain, goal, review', async () => {
  const { page, context, errors } = await open();
  await go(page, 'talk');
  await page.click('.sccard[data-sc="cafe"]');
  await page.click('[data-action="talk-start"]');
  await page.waitForSelector('.msg.ai .bubble .ja ruby');
  await page.click('[data-action="hints"]');
  await page.click('.sug[data-i="0"]');
  assert.match(await page.inputValue('#talkInput'), /コーヒー/);
  await page.fill('#talkInput', 'kohi kudasai');
  await page.press('#talkInput', 'Enter');
  await page.waitForSelector('.msg.me .fb.fix');
  assert.match(await page.textContent('.msg.me .fb'), /Try this/);
  await page.click('.msg.ai [data-action="explain"]');
  await page.waitForSelector('.explain .xwords li');
  await page.click('.explain [data-action="explain-add"]');
  await toast(page, /My cards/);
  await page.fill('#talkInput', 'hai, onegaishimasu');
  await page.press('#talkInput', 'Enter');
  await page.waitForSelector('.goalmsg');
  assert.ok(await nl(page, () => !!window.__nl.S.stamps.cafe), 'stamp collected');
  await page.click('.chat-head [data-action="talk-wrap"]');
  await page.waitForSelector('#sheetBody .score');
  await page.click('[data-action="review-add"]');
  await toast(page, /Added/);
  await page.click('#sheetClose');
  await page.waitForSelector('#talkHistory:not([hidden]) .hist li');
  assert.deepEqual(errors, []);
  await context.close();
});

test('reading: write a text, tap sentences, explain, quiz, translate, upload', async () => {
  const { page, context, errors } = await open();
  await go(page, 'read');
  await page.click('[data-action="rd-write"]');
  await page.waitForSelector('.reader .rs');
  assert.equal(await page.locator('.rs').count(), 3);
  await page.click('.rs[data-k="0_0"]');
  await page.waitForSelector('.sdetail');
  await page.click('[data-action="rd-explain"]');
  await page.waitForSelector('.sdetail .xwords li');
  await page.keyboard.press('ArrowRight');
  await page.waitForSelector('.rs.on[data-k="0_1"]');
  await page.check('#rq0_0');
  await page.click('[data-action="rd-check"]');
  await toast(page, /All correct/);
  await page.click('.rd-top [data-action="rd-back"]');
  await page.waitForSelector('.rdcard');
  await page.click('[data-action="rd-tab"][data-t="translate"]');
  await page.setInputFiles('#rdFile', { name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('It rained all day.\n\nThe dog stayed inside.') });
  await page.waitForFunction(() => document.querySelector('#rdSource').value.includes('dog'));
  await page.click('[data-action="rd-translate"]');
  await page.waitForSelector('.reader .rd-title');
  assert.match(await page.textContent('.rd-title'), /メモ/);
  assert.equal(await nl(page, () => window.__nl.RD.list.length), 2);
  assert.deepEqual(errors, []);
  await context.close();
});

test('kana drill and card review', async () => {
  const { page, context, errors } = await open();
  await go(page, 'kana');
  await page.click('[data-action="drill-start"]');
  await page.click('.dopt >> nth=0');
  await page.waitForSelector('.dres');
  assert.ok(await nl(page, () => Object.keys(window.__nl.S.kana).length === 1));
  await go(page, 'cards');
  await page.click('[data-action="rv-start"]');
  await page.waitForSelector('#review .cfront');
  await page.keyboard.press('Space');
  await page.waitForSelector('#review .grades');
  await page.keyboard.press('3');
  await page.waitForFunction(() => Object.keys(window.__nl.S.srs).length === 1);
  await go(page, 'cards');
  await page.click('[data-action="gen-open"]');
  await page.click('[data-action="gen-topic"][data-t="Casual & slang"]');
  await page.click('#genRun');
  await page.waitForSelector('.genlist li');
  await page.click('[data-action="gen-add"]');
  await toast(page, /Added 2/);
  assert.equal(await nl(page, () => window.__nl.DECKS.mine.length), 2);
  assert.deepEqual(errors, []);
  await context.close();
});

test('grammar: casual line, lesson check, find more', async () => {
  const { page, context, errors } = await open();
  await go(page, 'grammar');
  await page.click('[data-action="gram-lv"][data-lv="casual"]');
  assert.ok(await page.locator('.gsec').count() >= 6);
  await page.click('.grow >> nth=0');
  await page.click('#lessonBtn');
  await page.waitForSelector('.form-rules li');
  for (const i of [0, 1, 2]) await page.check(`#q${i}_0`);
  await page.click('[data-action="quiz-check"]');
  await page.waitForFunction(() => /Learned/.test(document.querySelector('#learnBtn').textContent));
  await page.click('#sheetClose');
  await page.click('[data-action="gram-more"]');
  await toast(page, /Added 2/);
  assert.equal(await nl(page, () => window.__nl.CUSTOM.grammar.length), 2);
  assert.deepEqual(errors, []);
  await context.close();
});

test('backups save and load back', async () => {
  const a = await open();
  await go(a.page, 'kana');
  await a.page.click('[data-action="drill-start"]');
  await a.page.click('.dopt >> nth=0');
  await a.page.click('[data-action="settings"]');
  await a.page.click('[data-action="export"]');
  await toast(a.page, /Backup saved/);
  const saved = await a.page.evaluate(() => window.__saved);
  assert.match(saved.filename, /^nihongo-line-backup-\d{4}-\d\d-\d\d\.json$/);
  await a.context.close();

  const b = await open();
  await b.page.click('[data-action="settings"]');
  await b.page.setInputFiles('#importFile', { name: saved.filename, mimeType: 'application/json', buffer: Buffer.from(saved.data) });
  await b.page.click('[data-action="import-confirm"]');
  await toast(b.page, /Backup loaded/);
  assert.equal(await nl(b.page, () => Object.keys(window.__nl.S.kana).length), 1);
  await b.page.click('[data-action="settings"]');
  await b.page.setInputFiles('#importFile', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"nope":1}') });
  await b.page.waitForSelector('#importStatus .notice');
  assert.deepEqual(b.errors, []);
  await b.context.close();
});

test('phone width: no section scrolls sideways', async () => {
  const { page, context, errors } = await open({ viewport: { width: 390, height: 844 } });
  for (const v of ['route', 'talk', 'read', 'kana', 'cards', 'grammar']) {
    await go(page, v);
    const w = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, view: document.querySelector('#view').scrollWidth, max: window.innerWidth }));
    assert.ok(w.doc <= w.max + 1 && w.view <= w.max + 1, `${v} is ${Math.max(w.doc, w.view)}px wide on a ${w.max}px screen`);
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test('without Claude, the page still works and says what is unavailable', async () => {
  const { page, context, errors } = await open({ noClaude: true });
  await go(page, 'talk');
  await page.waitForSelector('#view .notice');
  await go(page, 'kana');
  await page.click('[data-action="drill-start"]');
  await page.waitForSelector('.dopt');
  assert.deepEqual(errors, []);
  await context.close();
});

test('desktop: update banner, About section, missing API key', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await context.addInitScript(() => {
    const D = window.__desk = { installs: 0, checks: 0, cb: null };
    window.nlDesktop = {
      platform: 'win32',
      info: async () => ({ version: '1.4.0', packaged: true }),
      status: async () => ({ hasKey: false, models: { quick: 'q', default: 'd' }, encrypted: true }),
      setKey: async () => ({ hasKey: true }), setModels: async m => m,
      request: async () => ({ error: { code: 'no_key', message: 'No API key saved' } }),
      abort: async () => true, saveFile: async () => ({ ok: true }),
      updateState: async () => ({ state: 'idle' }),
      updateCheck: async () => { D.checks++; return true; },
      updateInstall: async () => { D.installs++; return { ok: true }; },
      getAutoUpdate: async () => ({ autoUpdate: true }), setAutoUpdate: async on => ({ autoUpdate: on }),
      onUpdate: cb => { D.cb = cb; }
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(PAGE);
  await page.waitForSelector('#view h1');
  await page.evaluate(() => window.__desk.cb({ state: 'ready', version: '9.9.9', progress: 100 }));
  await page.waitForSelector('#updBar:not([hidden])');
  await page.click('#updBar [data-action="update-install"]');
  assert.equal(await page.evaluate(() => window.__desk.installs), 1);
  await page.click('#updBar [data-action="update-later"]');
  await page.waitForSelector('#updBar', { state: 'hidden' });
  await page.click('[data-action="settings"]');
  await page.waitForSelector('#updStatus');
  assert.match(await page.textContent('#updStatus'), /9\.9\.9 is ready/);
  assert.match(await page.textContent('#sheetBody'), /Nihongo Line 1\.4\.0/);
  assert.match(await page.textContent('#keyStatus'), /No key yet/);
  await page.click('[data-action="update-check"]');
  assert.equal(await page.evaluate(() => window.__desk.checks), 1);
  await page.click('#sheetClose');
  await go(page, 'talk');
  await page.click('.sccard[data-sc="cafe"]');
  await page.click('[data-action="talk-start"]');
  await page.waitForSelector('.msg.sys.err');
  assert.match(await page.textContent('.msg.sys.err'), /API key/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the web build (claude.ai artifact) runs', async () => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>${buildWeb()}</body></html>`;
  const { page, context, errors } = await open({ html });
  assert.ok(await page.evaluate(v => window.NL_VERSION && window.wanakana && window.wanakana.VERSION === v, WANAKANA));
  await go(page, 'talk');
  await page.click('.sccard[data-sc="konbini"]');
  await page.click('[data-action="talk-start"]');
  await page.waitForSelector('.msg.ai .bubble .ja ruby');
  assert.deepEqual(errors, []);
  await context.close();
});
