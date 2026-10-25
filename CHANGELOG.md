# Changelog

## 1.4.1

**Fixes**
- Web version: your own cards and the extra grammar points you found with Claude could be replaced by an older copy when you opened the page, if the last save to your Claude account hadn't gone through. The newest copy is now kept, and saved to your account again.

**Security**
- Desktop app: updated to Electron 44.9.3, which blocks certificates from a compromised certificate authority, and to the latest updater, which checks downloaded updates more strictly.

## 1.4.0

**New**
- **Automatic updates.** The app checks for a new version a few seconds after it opens and every few hours, downloads it in the background, and installs it when you restart. A banner says when an update is ready: choose **Restart now** or **Later** (it then installs when you close the app). **Help → Check for updates** and **Settings → About** check straight away. You can turn automatic downloads off in Settings.
- **Settings → About** shows which version you have.

**Behind the scenes**
- Nihongo Line now lives in a public GitHub repository. Each new version is built and published there automatically, and every change is tested first: the tests click through every section of the app with a stand-in for Claude.

## 1.3.0
- **Casual Line (タメ口線)**: a branch line of six stations and 24 points, from dropping です・ます to sentence endings, contractions, softening, reactions and slang, and Kansai-ben, each with a casual conversation scene.
- Casual conversations coach you to sound natural: a correct but stiff message is accepted, with the natural casual version shown beside it.
- Reading texts can be written in a chosen speech style (casual, polite or written), and there's a new "Group chat between friends" text type.
- **Find 8 more with Claude** in each Grammar tab adds points for that level you don't have yet. **JLPT core words** and **Casual & slang** topics in Make cards with Claude.

## 1.2.0
- **Read (読む)**: Claude writes stories, diaries, articles, conversations and more at your level, or translates text you paste or upload (.txt, .md, .html, subtitles or Word .docx). Tap a sentence for its meaning, audio and a word-by-word breakdown; read the whole text aloud; check yourself with questions. Everything is kept in your library.

## 1.1.0
- **Explain** on any conversation line, **Practise in a conversation** for every grammar point, **Listen first** mode, a choice of Japanese voice, a romaji → kana kana drill, English → Japanese cards, and backups you can download and load.
- Fixes: progress could stop saving after a reload, starting a new scene replaced an unfinished one, mastered kana were lost after one miss, and keyboard shortcuts got in the way of other buttons.

## 1.0.0
- First version: a route map from kana to N1, kana charts and drills, spaced-repetition cards, 97 grammar points, and role-play conversations with Claude.
