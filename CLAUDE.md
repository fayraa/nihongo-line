# Nihongo Line

A Japanese learning app: a metro-style route from kana to JLPT N1 plus a casual-speech branch line, kana drills,
spaced-repetition cards, grammar lessons, graded reading, and role-play conversations with Claude.
One page runs in two places:

- **Desktop app** (Electron, Windows): `main.js` + `preload.js` load `app/index.html`. Claude features use the owner's
  Anthropic API key, which only `main.js` reads (encrypted with `safeStorage`). Updates come from GitHub Releases
  through electron-updater.
- **Web version**: a single-file claude.ai artifact built by `scripts/build-web.js` into `dist/web/nihongo-line.html`.
  There, Claude features use the viewer's Claude account through `window.claude.use('sample')`, and progress syncs
  through `window.claude.use('db')`.

## Layout
- `app/app.js` — all app code (one IIFE). Data tables (GRAMMAR, STATIONS, SCENARIOS, vocab decks) are near the top.
- `app/index.html` — markup and styles. The parts between `<!-- web:head -->` and `<!-- web:body -->` markers go into
  the web build; everything else is desktop-only.
- `app/desktop-shim.js` — gives the desktop page the same `window.claude.use()` API as the web, backed by `preload.js`.
- `app/vendor/` — wanakana (romaji → kana) and mammoth (.docx reading). The web build loads the same versions from jsDelivr.
- `scripts/` — `check.js` (fast checks), `build-web.js`, `release-notes.js`. `tests/` — `desktop.test.js` (main
  process with a fake Electron and API), `ui.test.js` (Playwright with a stand-in for Claude).

## Commands
- `npm ci`, then `npx playwright install --with-deps chromium` the first time.
- `npm run check` — syntax, page structure, web build, changelog entry, secret scan.
- `npm test` — desktop and UI tests. Set `CHROMIUM_PATH` to use an installed Chromium.
- `npm start` — run the desktop app. `npm run build:web` — build the web version.
- `npm run dist:dir` — package for Windows without an installer (works on Linux). `npm run dist` — installer (Windows).

## Rules
- The repo is public. Never commit API keys, tokens, artifact links, or anyone's learning data.
- **Stored data must stay readable.** Progress (`S`), own cards and grammar (`CUSTOM`), conversations and readings are saved
  in localStorage, in the viewer's Claude database (web) and in backup files. Only add fields with defaults
  (see `defaultState` / `mergeState`); never rename or repurpose existing ones. Built-in card ids are hashes of the word,
  so editing a built-in word resets its schedule.
- **Prompts and parsers move together.** Every Claude prompt asks for a JSON shape, and a `norm…` function reads it. If you
  change one, change the other and the matching fixed answer in `tests/ui.test.js`.
- Anything Claude returns is untrusted: render it only through `esc()` or `ruby()`.
- Japanese text uses the furigana format `漢字[かんじ]`, rendered by `ruby()`. New built-in Japanese must be natural and
  correct for its level; check readings carefully.
- The web build must follow the artifact rules that `npm run check` enforces (no own doctype/html/head/body, title in the
  first 8 KB, scripts only from the allowed CDNs). Desktop: no inline scripts (CSP), no Node in the page.
- Keep UI text plain and short, keep keyboard access and both light and dark themes working, and keep the page free of
  sideways scrolling at phone width (tested).

## Releases
Bump `version` in `package.json` and add a `## x.y.z` section to `CHANGELOG.md` in the same change. When that reaches
`main`, the Release workflow runs the tests, builds the Windows installer and publishes release `vx.y.z`. Installed apps
download it by themselves and install it on restart. The web version is republished separately from `main`.

## Weekly automated check (Claude)
Work on a branch named `weekly-check/YYYY-MM-DD` and open one pull request. In it, bump the **patch** version and add a
`CHANGELOG.md` entry written for the learner, so merging the pull request releases the fix. Never push to `main`, never
create tags or releases, never merge, and don't edit `.github/workflows/` unless a workflow itself is broken (say so in
the pull request). If a previous weekly-check pull request is still open, add to it instead of opening another. If nothing
needs fixing, don't open a pull request; just report.
