'use strict';
/*
 * Fast checks that need no browser: syntax, page structure, the web build, release notes
 * and a scan for anything that looks like a secret. Run with `npm run check`.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildWeb, WANAKANA } = require('./build-web');

const root = path.join(__dirname, '..');
const rel = p => path.join(root, p);
const read = p => fs.readFileSync(rel(p), 'utf8');
const problems = [];
const fail = msg => problems.push(msg);

/* 1. every script parses */
const scripts = ['main.js', 'preload.js', 'app/app.js', 'app/desktop-shim.js',
  ...fs.readdirSync(rel('scripts')).filter(f => f.endsWith('.js')).map(f => 'scripts/' + f),
  ...fs.readdirSync(rel('tests')).filter(f => f.endsWith('.js')).map(f => 'tests/' + f)];
for (const f of scripts) {
  try { execFileSync(process.execPath, ['--check', rel(f)], { stdio: 'pipe' }); }
  catch (e) { fail(`${f} doesn't parse:\n${String(e.stderr || e.message).trim()}`); }
}

/* 2. the desktop page loads the right files under a strict content security policy */
const html = read('app/index.html');
for (const s of ['desktop-shim.js', 'vendor/wanakana.min.js', 'app.js']) if (!html.includes(`<script src="${s}"></script>`)) fail(`app/index.html doesn't load ${s}`);
if (html.indexOf('desktop-shim.js') > html.indexOf('src="app.js"')) fail('app/index.html must load desktop-shim.js before app.js');
if (!/http-equiv="Content-Security-Policy"[^>]*script-src 'self'/.test(html)) fail("app/index.html lost its Content-Security-Policy (script-src 'self')");
if (/<script>(?!\s*<\/script>)/.test(html)) fail('app/index.html has an inline <script>; the desktop CSP blocks those, so put code in app/app.js');

/* 3. libraries match what the web build loads from the CDN */
if (!read('app/vendor/wanakana.min.js').includes(WANAKANA)) fail(`app/vendor/wanakana.min.js isn't version ${WANAKANA} (see scripts/build-web.js)`);
const mammothCdn = (read('app/app.js').match(/mammoth@([\d.]+)/) || [])[1];
if (!mammothCdn) fail('app/app.js no longer names the mammoth version it loads on the web');
for (const f of ['wanakana-LICENSE.txt', 'mammoth-LICENSE.txt']) if (!fs.existsSync(rel('app/vendor/' + f))) fail(`app/vendor/${f} is missing`);

/* 4. the web build follows the artifact host's rules */
try {
  const page = buildWeb();
  const first8k = page.slice(0, 8192);
  if (!/<title>[^<]{2,60}<\/title>/.test(first8k)) fail('web build: <title> must be in the first 8 KB');
  if (/<!doctype|<html[\s>]|<\/?body[\s>]|<\/?head[\s>]/i.test(page)) fail('web build: must not contain its own doctype, <html>, <head> or <body>');
  if (page.length > 15 * 1024 * 1024) fail('web build is over 15 MB');
  const allowed = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net\/npm\/|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/;
  for (const m of page.matchAll(/<(?:script|link)[^>]+(?:src|href)="(https?:[^"]+)"/g)) if (!allowed.test(m[1])) fail(`web build loads ${m[1]}, which the artifact host blocks`);
  const inline = page.match(/<script>\n([\s\S]*)<\/script>\s*$/);
  if (!inline) fail('web build: inline script not found');
  else {
    const tmp = rel('dist/web/.check-inline.js');
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    fs.writeFileSync(tmp, inline[1]);
    try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); } catch (e) { fail('web build: inline script does not parse'); }
    fs.unlinkSync(tmp);
  }
} catch (e) { fail('web build failed: ' + e.message); }

/* 5. the version being released has notes */
const pkg = JSON.parse(read('package.json'));
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) fail(`package.json version "${pkg.version}" isn't x.y.z`);
if (!new RegExp(`^## ${pkg.version.replace(/\./g, '\\.')}\\b`, 'm').test(read('CHANGELOG.md'))) fail(`CHANGELOG.md has no "## ${pkg.version}" section`);
const pub = (pkg.build && pkg.build.publish && pkg.build.publish[0]) || {};
if (pub.provider !== 'github' || pub.releaseType !== 'release') fail('package.json build.publish must point at GitHub releases (releaseType: release) so installed apps can update');

/* 6. nothing that looks like a key or token is committed (the repo is public) */
const SECRET = /sk-ant-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----/;
let tracked = [];
try { tracked = execFileSync('git', ['ls-files'], { cwd: root }).toString().split('\n').filter(Boolean); } catch (e) { /* not a git checkout */ }
for (const f of tracked) {
  if (/\.(png|ico|exe|zip)$/i.test(f) || f.startsWith('app/vendor/')) continue;
  if (SECRET.test(fs.readFileSync(rel(f), 'utf8'))) fail(`${f} contains something that looks like a key or token`);
}

if (problems.length) {
  console.error(`✗ ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n- ` + problems.join('\n- '));
  process.exit(1);
}
console.log(`✓ checks passed (${scripts.length} scripts, web build, version ${pkg.version})`);
