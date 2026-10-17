'use strict';
/* Writes dist/release-notes.md from this version's section of CHANGELOG.md (used by the release workflow). */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const log = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
const m = log.match(new RegExp(`^## ${version.replace(/\./g, '\\.')}[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
const notes = m ? m[1].trim() : `Version ${version}`;
const file = `NihongoLine-Setup-${version}.exe`;
const out = `${notes}

**New install:** download \`${file}\` below and run it. Windows may say it protected your PC because the installer isn't code-signed: choose **More info → Run anyway**.
**Already installed?** The app downloads this update by itself and installs it when you restart.
`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'release-notes.md'), out);
console.log(out);
