# Nihongo Line 日本語線

Learn Japanese from kana to fluency, laid out like a Tokyo metro map. Each JLPT level from kana to N1 is a line, and
each station pairs a few grammar points with a role-play conversation you practise with Claude. A Casual Line teaches
how friends really talk.

**Download (Windows):** get `NihongoLine-Setup-x.y.z.exe` from the
[latest release](https://github.com/fayraa/nihongo-line/releases/latest) and run it. Windows may say it protected your
PC because the installer isn't code-signed: choose **More info → Run anyway**. After that, the app updates itself.

## What's in it
- **Route map**: kana, N5 to N1 and the Casual Line, with a ring on each station that fills as you learn it, and a stamp
  book for the conversation scenes you complete.
- **Talk (会話)**: 36 everyday, social, casual and work scenes, plus free talk and your own scene. Every message you
  send is corrected or confirmed, **Explain** breaks down any line word by word, and **Finish and review** scores the
  conversation and suggests words to learn.
- **Read (読む)**: stories, diaries, articles and group chats written at your level, or your own text (paste it or
  upload .txt, .md, .html, subtitles or Word .docx) translated into Japanese. Tap a sentence for meaning, audio and a
  breakdown; check yourself with questions.
- **Kana**: hiragana and katakana charts with audio and drills.
- **Cards (単語)**: spaced-repetition review of built-in N5/N4 words and kanji, plus cards Claude makes on any topic.
- **Grammar (文法)**: 121 built-in points with full lessons, quizzes and practice chats, and more added on request.

## Claude features need an API key (desktop)
Conversations, reading, lessons and card making call Claude with your own Anthropic API key:

1. Sign in at <https://console.anthropic.com>, add credits, and create a key under **Settings → API keys**.
2. In Nihongo Line, open **Settings** (top right), paste the key under **Claude API key**, press **Save key**, then
   **Test connection**.

The key is encrypted with your Windows account and stays on your computer. Usage is billed by Anthropic per token,
separately from a Claude subscription. Kana, cards and the grammar list work without a key.

## Updates
The app checks for updates when it opens and every few hours, downloads them in the background, and installs them
when you restart. **Help → Check for updates** checks straight away; **Settings → About** shows your version and lets
you turn automatic downloads off.

## Moving your progress
Settings → Backup → **Download backup** saves everything to a file; **Load a backup…** reads it back, on this app or
the web version.

## For developers
See [CLAUDE.md](CLAUDE.md) for the layout, commands and rules. In short:

```
npm ci
npx playwright install --with-deps chromium
npm run check      # syntax, structure, web build
npm test           # desktop and UI tests
npm start          # run the app
npm run dist       # Windows installer (run on Windows)
```

Third-party code: [WanaKana](https://github.com/WaniKani/WanaKana) (MIT) and
[mammoth.js](https://github.com/mwilliamson/mammoth.js) (BSD-2-Clause); licences in `app/vendor/`.
