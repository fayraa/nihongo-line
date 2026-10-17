'use strict';
/*
 * Builds the single-file web version published as a claude.ai artifact:
 *   dist/web/nihongo-line.html
 * from the same sources the desktop app runs (app/index.html and app/app.js).
 *
 * The artifact host adds its own <!doctype>, <head> and <body>, so the output is the page
 * content only: <title>, font links and <style> first, then the markup, then the scripts.
 * Libraries come from the CDN the artifact host allows; the desktop app uses app/vendor/.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const WANAKANA = '5.3.1'; /* keep in step with app/vendor/wanakana.min.js (checked by scripts/check.js) */

function between(text, start, end, file) {
  const a = text.indexOf(start), b = text.indexOf(end);
  if (a < 0 || b < 0 || b < a) throw new Error(`${file} is missing the ${start} … ${end} markers`);
  return text.slice(a + start.length, b).trim();
}

function buildWeb() {
  const html = fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'app', 'app.js'), 'utf8');
  const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (/<\/script/i.test(js)) throw new Error('app/app.js contains "</script", which would end the inline script early');
  const head = between(html, '<!-- web:head -->', '<!-- /web:head -->', 'app/index.html');
  const body = between(html, '<!-- web:body -->', '<!-- /web:body -->', 'app/index.html');
  return `${head}

${body}

<script src="https://cdn.jsdelivr.net/npm/wanakana@${WANAKANA}/wanakana.min.js"></script>
<script>
window.NL_VERSION = ${JSON.stringify(version)};
${js.trim()}
</script>
`;
}

if (require.main === module) {
  const out = path.join(root, 'dist', 'web', 'nihongo-line.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const page = buildWeb();
  fs.writeFileSync(out, page);
  console.log(`built ${path.relative(root, out)} (${Math.round(page.length / 1024)} KB)`);
}

module.exports = { buildWeb, WANAKANA };
