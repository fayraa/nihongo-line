(() => {
'use strict';
/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* furigana markup: 漢字[かんじ]; full-width brackets ［］ are accepted too */
const RUBY_RE = /([々〆㐀-䶿一-鿿豈-﫿]+)[\[［]([^\[\]［］]{1,24})[\]］]/g;
const STRAY_RE = /[\[［][ぁ-ゟ゠-ヿ]{1,24}[\]］]/g;
const ruby = s => esc(s).replace(RUBY_RE, '<ruby>$1<rt>$2</rt></ruby>').replace(STRAY_RE, '');
const plain = s => String(s ?? '').replace(RUBY_RE, '$1').replace(STRAY_RE, '');
const kanaOnly = s => String(s ?? '').replace(RUBY_RE, '$2').replace(STRAY_RE, '');
const WK = () => window.wanakana || null;
const toRomaji = s => { const w = WK(); if (!w) return ''; try { return w.toRomaji(kanaOnly(s)); } catch (e) { return ''; } };
const hash = s => { let h = 0x811c9dc5; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const fmt = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => fmt(new Date());
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clone = o => JSON.parse(JSON.stringify(o));
const ICON = {
  speak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 12l16-8-6 16-3-6z"/></svg>'
};

/* ---------- curriculum ---------- */
const LEVELS = [
  {id:'kana', short:'K',  name:'Kana Line', ja:'かな線[せん]', c:'var(--l-kana)'},
  {id:'N5',   short:'N5', name:'N5 Line',   ja:'入門[にゅうもん]', c:'var(--l-n5)'},
  {id:'N4',   short:'N4', name:'N4 Line',   ja:'初級[しょきゅう]', c:'var(--l-n4)'},
  {id:'N3',   short:'N3', name:'N3 Line',   ja:'中級[ちゅうきゅう]', c:'var(--l-n3)'},
  {id:'N2',   short:'N2', name:'N2 Line',   ja:'中上級[ちゅうじょうきゅう]', c:'var(--l-n2)'},
  {id:'N1',   short:'N1', name:'N1 Line',   ja:'上級[じょうきゅう]', c:'var(--l-n1)'},
  {id:'casual', short:'C', name:'Casual Line', ja:'タメ口[ぐち]線[せん]', c:'var(--l-cas)', note:'Branch line · best after N4'}
];
const LV = Object.fromEntries(LEVELS.map(l => [l.id, l]));
const LV_ORDER = ['kana','N5','N4','N3','N2','N1']; /* the Casual Line is a branch, not a level */
const lvLabel = lv => (lv === 'casual' ? 'Casual' : lv === 'kana' ? 'Kana' : lv === 'any' ? 'Any level' : lv);
const lineColor = lv => (LV[lv] ? LV[lv].c : 'var(--ai)');
const LEVEL_OPTS = [['kana','Just starting · kana'],['N5','N5 · first steps'],['N4','N4 · everyday basics'],['N3','N3 · intermediate'],['N2','N2 · upper-intermediate'],['N1','N1 · advanced']];
const levelLabel = id => (LEVEL_OPTS.find(o => o[0] === id) || [0, id])[1];

const GRAMMAR = [
 ["n5_desu","N5","〜です / 〜だ","“X is Y”: the polite (です) and plain (だ) copula","私[わたし]は学生[がくせい]です。","I'm a student."],
 ["n5_wa","N5","〜は","Topic marker: “as for X…”","これは私[わたし]の傘[かさ]です。","This is my umbrella."],
 ["n5_no","N5","〜の","Possession and linking nouns: “X's Y”","田中[たなか]さんの車[くるま]はどれですか。","Which one is Mr. Tanaka's car?"],
 ["n5_ka","N5","〜か","Turns a sentence into a question","日本人[にほんじん]ですか。","Are you Japanese?"],
 ["n5_kosoado","N5","これ・それ・あれ・どれ","this / that / that over there / which","それは何[なん]ですか。","What is that?"],
 ["n5_mo","N5","〜も","“also, too”","私[わたし]もコーヒーにします。","I'll have coffee too."],
 ["n5_janai","N5","〜じゃありません","“is not”: the negative copula","今日[きょう]は休[やす]みじゃありません。","Today isn't a day off."],
 ["n5_masu","N5","〜ます","Polite verb ending (present and future)","毎朝[まいあさ]コーヒーを飲[の]みます。","I drink coffee every morning."],
 ["n5_wo","N5","〜を","Marks the direct object","パンを買[か]います。","I'll buy bread."],
 ["n5_ni_he","N5","〜に / 〜へ","Destination: “to”","来週[らいしゅう]、京都[きょうと]へ行[い]きます。","I'm going to Kyoto next week."],
 ["n5_de","N5","〜で","Place of an action, or means: “at, by”","電車[でんしゃ]で会社[かいしゃ]に行[い]きます。","I go to work by train."],
 ["n5_mashita","N5","〜ました / 〜ませんでした","Polite past and past negative","昨日[きのう]は何[なに]も食[た]べませんでした。","I didn't eat anything yesterday."],
 ["n5_iadj","N5","い-adjectives","Describing words ending in い; past is 〜かった","このラーメンはおいしいです。","This ramen is delicious."],
 ["n5_naadj","N5","な-adjectives","Describing words that take な before a noun","静[しず]かな店[みせ]が好[す]きです。","I like quiet restaurants."],
 ["n5_aru_iru","N5","あります / います","“There is”: for things vs. living things","公園[こうえん]に犬[いぬ]がいます。","There's a dog in the park."],
 ["n5_ga","N5","〜が","Subject marker; used with 好き, 上手, 分かる","日本語[にほんご]が少[すこ]し分[わ]かります。","I understand a little Japanese."],
 ["n5_counters","N5","〜つ・〜枚・〜人","Counters for things, flat objects, and people","切符[きっぷ]を二枚[にまい]ください。","Two tickets, please."],
 ["n5_tai","N5","〜たい","“want to (do)”","富士山[ふじさん]を見[み]たいです。","I want to see Mt. Fuji."],
 ["n5_mashou","N5","〜ましょう / 〜ませんか","“Let's…” / “Won't you…?” for invitations","一緒[いっしょ]に昼[ひる]ご飯[はん]を食[た]べませんか。","Would you like to have lunch together?"],
 ["n5_kara","N5","〜から","“because, so”","時間[じかん]がないから、タクシーで行[い]きます。","I don't have time, so I'll take a taxi."],
 ["n5_tekudasai","N5","〜てください","Polite request: “please do”","もう一度[いちど]言[い]ってください。","Please say it once more."],
 ["n5_teiru","N5","〜ている","An ongoing action or a resulting state","今[いま]、雨[あめ]が降[ふ]っています。","It's raining right now."],
 ["n5_temoii","N5","〜てもいいですか","Asking permission: “may I…?”","ここで写真[しゃしん]を撮[と]ってもいいですか。","May I take photos here?"],
 ["n5_tewa","N5","〜てはいけません","Prohibition: “must not”","館内[かんない]で食[た]べてはいけません。","You must not eat inside the building."],
 ["n5_naide","N5","〜ないでください","“Please don't…”","心配[しんぱい]しないでください。","Please don't worry."],
 ["n5_yori","N5","〜より〜の方が","Comparison: “Y is more… than X”","バスより電車[でんしゃ]の方[ほう]が速[はや]いです。","The train is faster than the bus."],
 ["n5_maeni","N5","〜前に / 〜た後で","“before” / “after” doing","寝[ね]る前[まえ]に、歯[は]を磨[みが]きます。","I brush my teeth before bed."],
 ["n4_plain","N4","普通形","Plain (casual) forms: る / ない / た / なかった","明日[あした]、何[なに]する？","What are you doing tomorrow?"],
 ["n4_omou","N4","〜と思う","“I think that…”","明日[あした]は雨[あめ]が降[ふ]ると思[おも]います。","I think it'll rain tomorrow."],
 ["n4_takoto","N4","〜たことがある","Experience: “have done before”","北海道[ほっかいどう]に行[い]ったことがありますか。","Have you ever been to Hokkaido?"],
 ["n4_tari","N4","〜たり〜たりする","Listing example actions: “things like…”","週末[しゅうまつ]は映画[えいが]を見[み]たり、買[か]い物[もの]をしたりします。","On weekends I watch movies, go shopping, and so on."],
 ["n4_temiru","N4","〜てみる","“Try doing”","この靴[くつ]を履[は]いてみてもいいですか。","May I try these shoes on?"],
 ["n4_potential","N4","可能形","Potential form: “can do” (〜える / 〜られる)","漢字[かんじ]が少[すこ]し読[よ]めます。","I can read a little kanji."],
 ["n4_tsumori","N4","〜つもり","Intention: “plan to”","来年[らいねん]、日本[にほん]に住[す]むつもりです。","I plan to live in Japan next year."],
 ["n4_volitional","N4","〜よう / 〜おう","Volitional form: “let's / I think I'll” (+と思う)","今日[きょう]は早[はや]く寝[ね]ようと思[おも]います。","I think I'll go to bed early today."],
 ["n4_nakereba","N4","〜なければならない","Obligation: “have to”","明日[あした]は六時[ろくじ]に起[お]きなければなりません。","I have to get up at six tomorrow."],
 ["n4_nakutemo","N4","〜なくてもいい","“Don't have to”","靴[くつ]を脱[ぬ]がなくてもいいです。","You don't have to take off your shoes."],
 ["n4_sugiru","N4","〜すぎる","“Too much”","昨日[きのう]は飲[の]みすぎました。","I drank too much yesterday."],
 ["n4_nagara","N4","〜ながら","“While doing”","音楽[おんがく]を聞[き]きながら勉強[べんきょう]します。","I study while listening to music."],
 ["n4_tara","N4","〜たら","“If / when”","駅[えき]に着[つ]いたら、電話[でんわ]してください。","Call me when you get to the station."],
 ["n4_ba","N4","〜ば","Conditional: “if”","安[やす]ければ、買[か]います。","If it's cheap, I'll buy it."],
 ["n4_to","N4","〜と","“Whenever / if” for natural results","このボタンを押[お]すと、ドアが開[あ]きます。","When you press this button, the door opens."],
 ["n4_teshimau","N4","〜てしまう","Completion, often with regret","電車[でんしゃ]に傘[かさ]を忘[わす]れてしまいました。","I left my umbrella on the train."],
 ["n4_teoku","N4","〜ておく","Doing something in advance","旅行[りょこう]の前[まえ]にホテルを予約[よやく]しておきます。","I'll book the hotel before the trip."],
 ["n4_node","N4","〜ので","“Because” (softer, explanatory)","道[みち]が混[こ]んでいたので、遅[おく]れました。","The roads were busy, so I was late."],
 ["n4_noni","N4","〜のに","“Even though”","薬[くすり]を飲[の]んだのに、まだ頭[あたま]が痛[いた]いです。","I took medicine, but my head still hurts."],
 ["n4_juju","N4","あげる・くれる・もらう","Giving and receiving","友達[ともだち]がお土産[みやげ]をくれました。","My friend gave me a souvenir."],
 ["n4_souda","N4","〜そう","“Looks like” (from appearance)","このケーキはおいしそうですね。","This cake looks delicious."],
 ["n4_youda","N4","〜ようだ / 〜みたい","“Seems like” (judging from evidence)","誰[だれ]もいないみたいです。","It seems nobody's here."],
 ["n4_passive","N4","受身形","Passive: “be done to”","先生[せんせい]に褒[ほ]められました。","I was praised by the teacher."],
 ["n4_causative","N4","使役形","Causative: “make / let someone do”","部長[ぶちょう]は私[わたし]に資料[しりょう]を作[つく]らせました。","The manager had me prepare the documents."],
 ["n3_youni","N3","〜ように","“So that…”","忘[わす]れないように、メモしておきます。","I'll make a note so I don't forget."],
 ["n3_youninaru","N3","〜ようになる","“Come to (be able to)…”","最近[さいきん]、納豆[なっとう]が食[た]べられるようになりました。","Recently I've become able to eat natto."],
 ["n3_kotonisuru","N3","〜ことにする","“Decide to…”","毎朝[まいあさ]走[はし]ることにしました。","I've decided to run every morning."],
 ["n3_kotoninaru","N3","〜ことになる","“It has been decided that…”","来月[らいげつ]から大阪[おおさか]で働[はたら]くことになりました。","It's been decided I'll work in Osaka from next month."],
 ["n3_hazu","N3","〜はずだ","“Should be / is expected to”","荷物[にもつ]は今日[きょう]届[とど]くはずです。","The package should arrive today."],
 ["n3_rashii","N3","〜らしい","“Apparently / I hear”","あの店[みせ]、来月[らいげつ]閉[し]まるらしいよ。","Apparently that shop is closing next month."],
 ["n3_niyoruto","N3","〜によると〜そうだ","Reporting: “according to X, …”","天気予報[てんきよほう]によると、明日[あした]は雪[ゆき]だそうです。","According to the forecast, it'll snow tomorrow."],
 ["n3_wakedewa","N3","〜わけではない","“It's not that…”","嫌[きら]いなわけではないけど、あまり食[た]べません。","It's not that I dislike it, but I don't eat it much."],
 ["n3_tokoro","N3","〜ところだ","“Just about to / in the middle of / just did”","今[いま]、ちょうど出[で]かけるところです。","I'm just about to head out."],
 ["n3_uchini","N3","〜うちに","“While (before it changes)”","温[あたた]かいうちに、どうぞ。","Please eat it while it's warm."],
 ["n3_temo","N3","〜ても","“Even if”","雨[あめ]が降[ふ]っても、試合[しあい]はあります。","Even if it rains, the game is on."],
 ["n3_kadouka","N3","〜かどうか","“Whether or not”","間[ま]に合[あ]うかどうか分[わ]かりません。","I don't know whether I'll make it in time."],
 ["n3_tameni","N3","〜ために","“In order to / because of”","家[いえ]を買[か]うために、貯金[ちょきん]しています。","I'm saving money to buy a house."],
 ["n3_bakari","N3","〜ばかり","“Nothing but / only”","弟[おとうと]はゲームばかりしています。","My little brother does nothing but play games."],
 ["n3_kotogaaru","N3","〜ことがある","“Sometimes (it happens that)…”","忙[いそが]しいと、昼[ひる]ご飯[はん]を食[た]べないことがあります。","When I'm busy, I sometimes skip lunch."],
 ["n3_ppoi","N3","〜っぽい","“-ish / tends to”","最近[さいきん]、忘[わす]れっぽくなりました。","I've gotten forgetful lately."],
 ["n3_keigo","N3","尊敬語・謙譲語","Honorific and humble speech basics","資料[しりょう]はこちらでご用意[ようい]いたします。","We'll prepare the materials on our side."],
 ["n3_sasete","N3","〜させていただく","Humbly doing something (with permission)","本日[ほんじつ]はお休[やす]みさせていただきます。","I'll be taking the day off today, if I may."],
 ["n2_wakeda","N2","〜わけだ","“No wonder / that's why”","十年[じゅうねん]も住[す]んでいたなら、詳[くわ]しいわけですね。","If you lived there ten years, no wonder you know it so well."],
 ["n2_okage","N2","〜おかげで / 〜せいで","“Thanks to” / “because of” (blame)","皆[みな]さんのおかげで、無事[ぶじ]に終[お]わりました。","Thanks to everyone, it finished without a hitch."],
 ["n2_ippou","N2","〜一方だ","“Keeps on (getting more…)”","物価[ぶっか]は上[あ]がる一方[いっぽう]です。","Prices just keep rising."],
 ["n2_mono","N2","〜ものだ","“Used to” (nostalgia) / “that's how it is”","子供[こども]の頃[ころ]は、よくこの川[かわ]で泳[およ]いだものだ。","As a kid, I used to swim in this river a lot."],
 ["n2_chigainai","N2","〜に違いない","“Must be / no doubt”","あの人[ひと]は田中[たなか]さんのお兄[にい]さんに違[ちが]いない。","That must be Tanaka's older brother."],
 ["n2_kagiranai","N2","〜とは限らない","“Not necessarily”","高[たか]いものが良[よ]いとは限[かぎ]りません。","Expensive things aren't necessarily good."],
 ["n2_kotowanai","N2","〜ことはない","“There's no need to”","そんなに心配[しんぱい]することはないですよ。","There's no need to worry that much."],
 ["n2_zaruwoenai","N2","〜ざるを得ない","“Have no choice but to”","予算[よさん]が足[た]りないので、計画[けいかく]を変[か]えざるを得[え]ない。","The budget is short, so we have no choice but to change the plan."],
 ["n2_wari","N2","〜わりに","“Considering / for a…”","この店[みせ]は値段[ねだん]のわりにおいしい。","This place is tasty for the price."],
 ["n2_monono","N2","〜ものの","“Although…, (but)”","買[か]ったものの、一度[いちど]も使[つか]っていない。","I bought it, but I've never used it once."],
 ["n2_taishite","N2","〜に対して","“Toward / in contrast to”","お客様[きゃくさま]に対[たい]して失礼[しつれい]な言[い]い方[かた]だ。","That's a rude way to speak to a customer."],
 ["n2_kakawarazu","N2","〜にかかわらず","“Regardless of”","経験[けいけん]の有無[うむ]にかかわらず、応募[おうぼ]できます。","You can apply regardless of experience."],
 ["n2_shidai","N2","〜次第","“As soon as”","確認[かくにん]でき次第[しだい]、ご連絡[れんらく]いたします。","I'll contact you as soon as I've confirmed."],
 ["n2_kaneru","N2","〜かねる","“Unable to” (a polite refusal)","その件[けん]につきましては、お答[こた]えしかねます。","I'm afraid I can't answer regarding that matter."],
 ["n2_uede","N2","〜上で","“After (doing) / upon”","内容[ないよう]をご確認[かくにん]の上[うえ]、ご署名[しょめい]ください。","Please sign after confirming the contents."],
 ["n2_hajime","N2","〜をはじめ","“Starting with / including”","東京[とうきょう]をはじめ、全国[ぜんこく]で販売[はんばい]しています。","It's sold nationwide, starting with Tokyo."],
 ["n1_womotte","N1","〜をもって","“As of / by means of” (formal)","本日[ほんじつ]をもちまして、営業[えいぎょう]を終了[しゅうりょう]いたしました。","As of today, we have closed for business."],
 ["n1_yogi","N1","〜を余儀なくされる","“Be forced to”","台風[たいふう]の影響[えいきょう]で、イベントは中止[ちゅうし]を余儀[よぎ]なくされた。","Due to the typhoon, the event was forced to be cancelled."],
 ["n1_ikan","N1","〜いかんでは / 〜いかんによらず","“Depending on / regardless of”","結果[けっか]いかんでは、計画[けいかく]を見直[みなお]す必要[ひつよう]がある。","Depending on the results, we may need to revise the plan."],
 ["n1_mademonai","N1","〜までもない","“Needless to (do)”","言[い]うまでもなく、安全[あんぜん]が最優先[さいゆうせん]です。","Needless to say, safety comes first."],
 ["n1_zuniha","N1","〜ずにはいられない","“Can't help (doing)”","あの映画[えいが]を見[み]ると、泣[な]かずにはいられない。","I can't help crying when I watch that movie."],
 ["n1_naradewa","N1","〜ならでは","“Unique to”","京都[きょうと]ならではの落[お]ち着[つ]いた雰囲気[ふんいき]だ。","It's a calm atmosphere you only find in Kyoto."],
 ["n1_nbakari","N1","〜んばかり","“As if about to”","彼女[かのじょ]は泣[な]かんばかりの顔[かお]で謝[あやま]った。","She apologized, looking as if she were about to cry."],
 ["n1_woyoso","N1","〜をよそに","“In disregard of”","周囲[しゅうい]の心配[しんぱい]をよそに、彼[かれ]は一人[ひとり]で旅[たび]に出[で]た。","Ignoring everyone's worries, he set off traveling alone."],
 ["n1_nitaru","N1","〜に足る","“Worthy of”","彼[かれ]は信頼[しんらい]に足[た]る人物[じんぶつ]だ。","He is a person worthy of trust."],
 ["n1_toiedomo","N1","〜といえども","“Even though / even”","子供[こども]といえども、ルールは守[まも]るべきだ。","Even children should follow the rules."],
 ["n1_tomonaruto","N1","〜ともなると","“Once one becomes / when it comes to”","部長[ぶちょう]ともなると、責任[せきにん]も重[おも]くなる。","Once you become a department head, the responsibility gets heavier."],
 ["n1_kirai","N1","〜きらいがある","“Have a (bad) tendency to”","彼[かれ]は何[なん]でも大[おお]げさに言[い]うきらいがある。","He tends to exaggerate everything."],
 ["c_plain","casual","タメ口 (dropping です・ます)","With friends, use plain forms (る / ない / た) instead of です・ます","今日[きょう]、暇[ひま]？","Are you free today?"],
 ["c_question","casual","Questions without か","A rising tone or 〜の？ makes the question; か alone sounds blunt or old-fashioned","どこ行[い]くの？","Where are you going?"],
 ["c_da_drop","casual","Dropping だ","Nouns and な-adjectives often skip だ; a bare だ at the end can sound blunt","このカフェ、いい感[かん]じ。","This café has a nice vibe."],
 ["c_particle_drop","casual","Dropping particles","は, が, を and へ are often left out in speech","映画[えいが]見[み]に行[い]こう。","Let's go see a movie."],
 ["c_pronouns","casual","俺・僕・あたし","Casual first-person pronouns and the image each one gives","俺[おれ]、ラーメン食[た]べたい。","I want ramen."],
 ["c_yo_ne","casual","〜よ・〜ね・〜よね","よ tells, ね seeks agreement, よね checks something you both know","この店[みせ]、おいしいよね。","This place is good, right?"],
 ["c_kana","casual","〜かな・〜かも","“I wonder…” / “maybe…”","明日[あした]、雨[あめ]かな。","I wonder if it'll rain tomorrow."],
 ["c_jan","casual","〜じゃん","“…isn't it / you know”: confident, friendly emphasis","いいじゃん、それ！","That's great!"],
 ["c_kke","casual","〜っけ","“…was it again?” when trying to recall","集合[しゅうごう]って何時[なんじ]だっけ？","What time were we meeting again?"],
 ["c_teru","casual","〜てる・〜とく","Spoken contractions of 〜ている and 〜ておく","飲[の]み物[もの]、買[か]っとくね。","I'll pick up the drinks."],
 ["c_chau","casual","〜ちゃう・〜じゃう","Spoken contraction of 〜てしまう (done it / oops)","全部[ぜんぶ]食[た]べちゃった。","I ate the whole thing."],
 ["c_nakya","casual","〜なきゃ・〜なくちゃ","“Gotta…”: short for 〜なければ / 〜なくては","やばい、もう行[い]かなきゃ。","Oh no, I gotta go."],
 ["c_tte","casual","〜って","Casual quoting (“they said…”) and topic marking","田中[たなか]さん、来[こ]ないって。","Tanaka says he's not coming."],
 ["c_nda","casual","〜んだ・〜の","Explaining or giving background in a personal tone","実[じつ]は、明日[あした]休[やす]みなんだ。","Actually, I've got tomorrow off."],
 ["c_kedo","casual","〜けど…","Trailing off with けど to soften a refusal or request","行[い]きたいんだけど、ちょっと用事[ようじ]があって…。","I'd love to, but I've kind of got something on…"],
 ["c_nanka","casual","なんか・ちょっと・っていうか","Fillers and softeners that make speech sound natural","なんか、眠[ねむ]くなってきた。","I'm kinda getting sleepy."],
 ["c_te_request","casual","〜て・〜てくれる？","Casual requests between friends","ちょっと待[ま]って。塩[しお]取[と]ってくれる？","Hang on. Can you pass the salt?"],
 ["c_reactions","casual","マジで・へえ・そうそう","Reactions and back-channel words (相槌) that keep a chat flowing","えっ、マジで？それやばくない？","Wait, seriously? Isn't that crazy?"],
 ["c_yabai","casual","やばい・めっちゃ・超","Everyday intensifiers and the many meanings of やばい","このラーメン、めっちゃうまい！","This ramen is so good!"],
 ["c_sorena","casual","それな・わかる・だよね","Ways to agree like a friend","「月曜[げつよう]ってだるいよね」「それな」","“Mondays are such a drag.” “So true.”"],
 ["c_nai_q","casual","〜くない？・〜じゃない？","Rising-tone negatives that suggest or share an opinion","こっちの方[ほう]がよくない？","Isn't this one better?"],
 ["c_kansai_hen","casual","〜へん (関西弁)","Kansai negative: 〜へん for 〜ない","そんなん知[し]らへんわ。","I've got no idea about that."],
 ["c_kansai_ya","casual","〜や・ほんま (関西弁)","Kansai や for だ, and ほんま for 本当","ほんまにおもろいな。","That's really funny."],
 ["c_kansai_akan","casual","あかん・〜で (関西弁)","あかん for だめ, and the friendly emphasis で","それはあかんで。","That's no good."]
];
const GR = Object.fromEntries(GRAMMAR.map(a => [a[0], {id:a[0], lv:a[1], p:a[2], m:a[3], ex:a[4], en:a[5]}]));

const STATIONS = [
 {code:'K01', lv:'kana', en:'First rows', ja:'あ行[ぎょう]〜な行[ぎょう]', group:'hA'},
 {code:'K02', lv:'kana', en:'Second half', ja:'は行[ぎょう]〜ん', group:'hB'},
 {code:'K03', lv:'kana', en:'Voiced sounds', ja:'濁音[だくおん]', group:'hD'},
 {code:'K04', lv:'kana', en:'Combined sounds', ja:'拗音[ようおん]', group:'hY'},
 {code:'K05', lv:'kana', en:'Katakana', ja:'カタカナ', group:'kA'},
 {code:'K06', lv:'kana', en:'Katakana extras', ja:'外来音[がいらいおん]', group:'kX'},
 {code:'N5-01', lv:'N5', en:'Introductions', ja:'自己紹介[じこしょうかい]', g:['n5_desu','n5_wa','n5_no','n5_ka'], sc:'self_intro'},
 {code:'N5-02', lv:'N5', en:'Things around you', ja:'身[み]の回[まわ]り', g:['n5_kosoado','n5_mo','n5_janai'], sc:'konbini'},
 {code:'N5-03', lv:'N5', en:'Daily routine', ja:'毎日[まいにち]', g:['n5_masu','n5_wo','n5_ni_he','n5_de'], sc:'cafe'},
 {code:'N5-04', lv:'N5', en:'Past and describing', ja:'過去[かこ]と形容詞[けいようし]', g:['n5_mashita','n5_iadj','n5_naadj'], sc:'restaurant'},
 {code:'N5-05', lv:'N5', en:'Where things are', ja:'場所[ばしょ]', g:['n5_aru_iru','n5_ga','n5_counters'], sc:'shopping'},
 {code:'N5-06', lv:'N5', en:'Invitations', ja:'誘[さそ]う', g:['n5_tai','n5_mashou','n5_kara'], sc:'invite'},
 {code:'N5-07', lv:'N5', en:'Requests and rules', ja:'お願[ねが]い', g:['n5_tekudasai','n5_teiru','n5_temoii','n5_tewa','n5_naide'], sc:'hotel'},
 {code:'N5-08', lv:'N5', en:'Comparing', ja:'比[くら]べる', g:['n5_yori','n5_maeni'], sc:'station'},
 {code:'N4-01', lv:'N4', en:'Casual speech', ja:'普通形[ふつうけい]', g:['n4_plain','n4_omou'], sc:'casual_friend'},
 {code:'N4-02', lv:'N4', en:'Experiences', ja:'経験[けいけん]', g:['n4_takoto','n4_tari','n4_temiru'], sc:'travel_talk'},
 {code:'N4-03', lv:'N4', en:'Abilities and plans', ja:'予定[よてい]', g:['n4_potential','n4_tsumori','n4_volitional'], sc:'coworker'},
 {code:'N4-04', lv:'N4', en:"Musts and don't-needs", ja:'義務[ぎむ]', g:['n4_nakereba','n4_nakutemo','n4_sugiru','n4_nagara'], sc:'pharmacy'},
 {code:'N4-05', lv:'N4', en:'If and when', ja:'条件[じょうけん]', g:['n4_tara','n4_ba','n4_to'], sc:'directions'},
 {code:'N4-06', lv:'N4', en:'How it turned out', ja:'結果[けっか]', g:['n4_teshimau','n4_teoku','n4_node','n4_noni'], sc:'koban'},
 {code:'N4-07', lv:'N4', en:'Giving and appearances', ja:'やりもらい', g:['n4_juju','n4_souda','n4_youda'], sc:'omiyage'},
 {code:'N4-08', lv:'N4', en:'Passive and causative', ja:'受身[うけみ]・使役[しえき]', g:['n4_passive','n4_causative'], sc:'izakaya_chat'},
 {code:'N3-01', lv:'N3', en:'Changes and decisions', ja:'変化[へんか]', g:['n3_youni','n3_youninaru','n3_kotonisuru','n3_kotoninaru'], sc:'catch_up'},
 {code:'N3-02', lv:'N3', en:'Hearsay and judgment', ja:'推量[すいりょう]', g:['n3_hazu','n3_rashii','n3_niyoruto','n3_wakedewa'], sc:'dating'},
 {code:'N3-03', lv:'N3', en:'Timing', ja:'タイミング', g:['n3_tokoro','n3_uchini','n3_temo','n3_kadouka'], sc:'phone_reservation'},
 {code:'N3-04', lv:'N3', en:'Purpose and habits', ja:'目的[もくてき]', g:['n3_tameni','n3_bakari','n3_kotogaaru','n3_ppoi'], sc:'interview'},
 {code:'N3-05', lv:'N3', en:'Intro to keigo', ja:'敬語[けいご]入門[にゅうもん]', g:['n3_keigo','n3_sasete'], sc:'client_meeting'},
 {code:'N2-01', lv:'N2', en:'Reasons and results', ja:'因果[いんが]', g:['n2_wakeda','n2_okage','n2_ippou','n2_mono'], sc:'debate'},
 {code:'N2-02', lv:'N2', en:'Judgment calls', ja:'判断[はんだん]', g:['n2_chigainai','n2_kagiranai','n2_kotowanai','n2_zaruwoenai'], sc:'negotiation'},
 {code:'N2-03', lv:'N2', en:'Contrast', ja:'対比[たいひ]', g:['n2_wari','n2_monono','n2_taishite','n2_kakawarazu'], sc:'complaint'},
 {code:'N2-04', lv:'N2', en:'Business Japanese', ja:'ビジネス', g:['n2_shidai','n2_kaneru','n2_uede','n2_hajime'], sc:'biz_email'},
 {code:'N1-01', lv:'N1', en:'Formal register', ja:'書[か]き言葉[ことば]', g:['n1_womotte','n1_yogi','n1_ikan','n1_mademonai'], sc:'formal_apology'},
 {code:'N1-02', lv:'N1', en:'Feeling and nuance', ja:'ニュアンス', g:['n1_zuniha','n1_naradewa','n1_nbakari','n1_woyoso'], sc:'mentor'},
 {code:'N1-03', lv:'N1', en:'Evaluation', ja:'評価[ひょうか]', g:['n1_nitaru','n1_toiedomo','n1_tomonaruto','n1_kirai'], sc:'farewell_speech'},
 {code:'C-01', lv:'casual', en:'Plain talk', ja:'タメ口[ぐち]の基本[きほん]', g:['c_plain','c_question','c_da_drop','c_particle_drop','c_pronouns'], sc:'roommate'},
 {code:'C-02', lv:'casual', en:'Sentence endings', ja:'語尾[ごび]', g:['c_yo_ne','c_kana','c_jan','c_kke'], sc:'line_chat'},
 {code:'C-03', lv:'casual', en:'Contractions', ja:'縮約形[しゅくやくけい]', g:['c_teru','c_chau','c_nakya','c_tte'], sc:'gaming'},
 {code:'C-04', lv:'casual', en:'Softening', ja:'ぼかし表現[ひょうげん]', g:['c_nda','c_kedo','c_nanka','c_te_request'], sc:'decline_invite'},
 {code:'C-05', lv:'casual', en:'Reactions and slang', ja:'リアクション', g:['c_reactions','c_yabai','c_sorena','c_nai_q'], sc:'hangout'},
 {code:'C-06', lv:'casual', en:'Kansai-ben', ja:'関西弁[かんさいべん]', g:['c_kansai_hen','c_kansai_ya','c_kansai_akan'], sc:'osaka_friend'}
];
const STN = Object.fromEntries(STATIONS.map(s => [s.code, s]));
STATIONS.forEach(s => (s.g || []).forEach(id => { if (GR[id]) GR[id].st = s.code; }));

const SCENARIOS = [
 {id:'konbini',cat:'Daily life',lv:'N5',t:'Convenience store',ja:'コンビニで',who:'店員[てんいん] · Clerk',p:'a cashier at a Japanese convenience store',me:'a customer buying a bento and a drink',set:'The checkout counter of a busy konbini in Tokyo at lunchtime.',goal:'Buy your items, ask for the bento to be heated, decline a bag, and pay by card.'},
 {id:'cafe',cat:'Daily life',lv:'N5',t:'Café order',ja:'カフェで注文[ちゅうもん]',who:'店員[てんいん] · Barista',p:'a barista at a café counter',me:'a customer',set:'A small café near a train station in the morning.',goal:'Order a drink with a size and hot or iced, say whether it is for here or to go, and pay.'},
 {id:'restaurant',cat:'Daily life',lv:'N5',t:'Restaurant',ja:'レストランで',who:'店員[てんいん] · Server',p:'a server at a family restaurant',me:'a customer arriving for dinner',set:'The entrance of a casual family restaurant in the evening.',goal:'Say how many people you are, order a main dish and a drink, ask for a recommendation, and ask for the bill.'},
 {id:'shopping',cat:'Daily life',lv:'N5',t:'Clothes shopping',ja:'服[ふく]を買[か]う',who:'店員[てんいん] · Assistant',p:'a shop assistant in a clothing store',me:'a customer looking for a jacket',set:'A clothing store in a shopping mall.',goal:'Ask to try something on, ask for a different size or color, and ask the price.'},
 {id:'pharmacy',cat:'Daily life',lv:'N4',t:'Pharmacy',ja:'薬局[やっきょく]で',who:'薬剤師[やくざいし] · Pharmacist',p:'a pharmacist at a drugstore',me:'a customer who feels unwell',set:'The counter of a drugstore pharmacy.',goal:'Describe your symptoms, get a recommendation, and understand how and when to take it.'},
 {id:'koban',cat:'Daily life',lv:'N4',t:'Lost wallet',ja:'交番[こうばん]で',who:'警察官[けいさつかん] · Officer',p:'a police officer at a koban (police box)',me:'someone who has lost a wallet',set:'A small koban in front of a station.',goal:'Report your lost wallet: say when and where you last had it, and describe it.'},
 {id:'phone_reservation',cat:'Daily life',lv:'N3',t:'Booking by phone',ja:'電話[でんわ]で予約[よやく]',who:'店員[てんいん] · Staff',p:'a restaurant employee answering the phone',me:'a customer calling to book',set:'A phone call to a popular restaurant. There is no visual context; speak as on the phone.',goal:'Reserve a table: give the date, time, number of people, your name and number, and one special request.'},
 {id:'apartment',cat:'Daily life',lv:'N3',t:'Apartment hunting',ja:'部屋[へや]探[さが]し',who:'不動産屋[ふどうさんや] · Agent',p:'an agent at a real estate office',me:'someone looking for an apartment',set:'A neighborhood real estate office.',goal:'Explain what you want (area, budget, size), ask about move-in costs, and arrange a viewing.'},
 {id:'complaint',cat:'Daily life',lv:'N2',t:'Returning a product',ja:'返品[へんぴん]の相談[そうだん]',who:'担当者[たんとうしゃ] · Customer service',p:'a customer service representative at an electronics store',me:'a customer with a faulty product',set:'The service counter of an electronics store.',goal:'Explain what is wrong with the product, and politely negotiate a refund or exchange.'},
 {id:'hotel',cat:'Travel',lv:'N5',t:'Hotel check-in',ja:'ホテルのチェックイン',who:'フロント · Front desk',p:'a hotel front desk clerk',me:'a guest arriving with a reservation',set:'The front desk of a business hotel in the late afternoon.',goal:'Check in, ask what time breakfast is, and ask for one thing you need (Wi-Fi password, towels, or luggage storage).'},
 {id:'station',cat:'Travel',lv:'N5',t:'Train tickets',ja:'駅[えき]の窓口[まどぐち]',who:'駅員[えきいん] · Station staff',p:'a staff member at a JR ticket office',me:'a traveler',set:'The ticket office of a large JR station.',goal:'Buy a ticket to Kyoto: pick a departure time, a reserved seat, and window or aisle.'},
 {id:'directions',cat:'Travel',lv:'N4',t:'Asking directions',ja:'道[みち]を聞[き]く',who:'通行人[つうこうにん] · Local',p:'a friendly local passer-by',me:'a lost traveler',set:'A busy street corner in Osaka.',goal:'Find out how to get to the nearest station or a landmark, and check how long it takes to walk.'},
 {id:'self_intro',cat:'Social',lv:'N5',t:'Meeting someone new',ja:'自己紹介[じこしょうかい]',who:'さくら · New friend',p:'Sakura, a friendly Japanese woman in her twenties at a language exchange meetup',me:'yourself at the meetup',set:'A language exchange café in Tokyo.',goal:'Introduce yourself (name, where you are from, work, hobbies) and ask her two questions about herself.'},
 {id:'invite',cat:'Social',lv:'N5',t:'Inviting a friend',ja:'友達[ともだち]を誘[さそ]う',who:'けんた · Friend',p:'Kenta, a Japanese friend',me:'his friend',set:'Chatting after class on a Friday.',goal:'Invite Kenta to do something this weekend and agree on a day, time, and meeting place.'},
 {id:'casual_friend',cat:'Social',lv:'N4',reg:'casual',t:'Casual chat',ja:'タメ口[ぐち]で話[はな]す',who:'ゆうき · Close friend',p:'Yuki, a close friend the same age',me:'a close friend',set:'Eating together at a ramen shop.',goal:'Chat about your week and weekend plans using casual plain forms the whole time.'},
 {id:'travel_talk',cat:'Social',lv:'N4',t:'Travel stories',ja:'旅行[りょこう]の話[はなし]',who:'みか · Friend',p:'Mika, a friend who loves traveling',me:'a friend',set:'Coffee with a friend on a Sunday.',goal:'Talk about places you have been and want to go, and ask about her travel experiences.'},
 {id:'omiyage',cat:'Social',lv:'N4',t:'Giving a souvenir',ja:'お土産[みやげ]を渡[わた]す',who:'佐藤[さとう]さん · Neighbor',p:'Mrs. Sato, your older Japanese neighbor',me:'her neighbor back from a trip',set:"At the door of your neighbor's house.",goal:'Give her a souvenir with the right humble phrases, and chat briefly about your trip.'},
 {id:'izakaya_chat',cat:'Social',lv:'N3',t:'Drinks with coworkers',ja:'飲[の]み会[かい]',who:'山田[やまだ]さん · Coworker',p:'Yamada, a coworker a few years senior, at an after-work nomikai',me:'a junior coworker',set:'A lively izakaya after work on a Friday.',goal:'Make small talk, order another round, chat lightly about work, and respond modestly to a compliment.'},
 {id:'catch_up',cat:'Social',lv:'N3',t:'Catching up',ja:'久[ひさ]しぶりの再会[さいかい]',who:'あや · Old friend',p:'Aya, an old friend you have not seen in two years',me:'her old friend',set:'Running into each other at a station café.',goal:"Catch up on each other's news: job changes, moves, and decisions you have made for the future."},
 {id:'dating',cat:'Social',lv:'N3',t:'First date',ja:'初[はじ]めてのデート',who:'りょう · Date',p:'Ryo, someone you met through friends',me:'their date',set:'A quiet café on a first date.',goal:'Keep the conversation flowing: find shared interests, ask follow-up questions, and suggest meeting again.'},
 {id:'debate',cat:'Social',lv:'N2',t:'Sharing opinions',ja:'意見[いけん]を述[の]べる',who:'中村[なかむら]さん · Friend',p:'Nakamura, a friend who enjoys discussing social topics',me:'yourself',set:'A relaxed discussion over dinner.',goal:'Discuss a topic such as remote work or tourism in Japan: give your opinion with reasons and respond to a counterpoint.'},
 {id:'mentor',cat:'Social',lv:'N1',t:'Advice from a mentor',ja:'恩師[おんし]に相談[そうだん]',who:'森[もり]先生[せんせい] · Mentor',p:'Professor Mori, your former university mentor',me:'a former student',set:"The professor's office, visiting for the first time in years.",goal:'Ask for advice about a career decision, expressing nuance, hesitation, and gratitude with suitable respect.'},
 {id:'farewell_speech',cat:'Social',lv:'N1',reg:'keigo',t:'Farewell speech',ja:'送別会[そうべつかい]のスピーチ',who:'司会[しかい] · Host',p:'the host of your farewell party, who reacts to your speech and asks a question afterwards',me:'the colleague who is leaving',set:'Your farewell party at a restaurant with the whole team.',goal:"Give a short farewell speech thanking your colleagues, then respond gracefully to the host's remarks."},
 {id:'roommate',cat:'Casual',lv:'N4',reg:'casual',t:'Share house chat',ja:'シェアハウスで',who:'りな · Housemate',p:'Rina, your housemate in a Tokyo share house, who talks completely casually',me:'her housemate',set:'The shared kitchen in the evening.',goal:'Sort out who buys groceries and who cleans this week, and ask her one favour, all in natural タメ口.'},
 {id:'line_chat',cat:'Casual',lv:'N4',reg:'casual',t:'Texting a friend',ja:'LINEでやりとり',who:'はると · Friend',p:'Haruto, a friend your age, texting you on LINE',me:'his friend',set:'A LINE chat. Keep messages short and casual like real texts, using (笑), w, and casual abbreviations where natural.',goal:'Make weekend plans by text: what to do, what time, and where to meet.'},
 {id:'gaming',cat:'Casual',lv:'N4',reg:'casual',t:'Game voice chat',ja:'ゲームのボイチャ',who:'りく · Teammate',p:'Riku, a friendly teammate in an online co-op game',me:'his teammate',set:'Voice chat during an online co-op game late at night. Lines are short and quick.',goal:'Coordinate with short calls (wait, go, help, nice one), react to what happens, and agree to play again.'},
 {id:'decline_invite',cat:'Casual',lv:'N4',reg:'casual',t:'Turning down plans',ja:'誘[さそ]いを断[ことわ]る',who:'そうた · Friend',p:'Sota, a friend who keeps inviting you out',me:'his friend',set:'Chatting after work on a Thursday.',goal:'Decline his invitation in a friendly way without a blunt “no”, and suggest another time.'},
 {id:'hangout',cat:'Casual',lv:'N3',reg:'casual',t:'Karaoke night',ja:'カラオケで',who:'みゆ · Friend',p:'Miyu, a lively friend at karaoke who uses lots of casual slang',me:'her friend',set:'A karaoke box on a Saturday night with drinks and snacks.',goal:'React naturally, use at least two casual expressions such as マジで or めっちゃ, and decide where to go next.'},
 {id:'osaka_friend',cat:'Casual',lv:'N3',reg:'casual',t:'Chatting in Osaka',ja:'大阪[おおさか]の友達[ともだち]と',who:'こうじ · Osaka friend',p:'Koji, an outgoing friend from Osaka who speaks Kansai-ben',me:'his friend visiting Osaka',set:'Walking around Dotonbori in the evening.',goal:'Follow his Kansai-ben, ask for a food recommendation, and try a couple of Kansai expressions yourself.',
  extra:'Speak natural Kansai-ben (関西弁): 〜へん, 〜や, ほんま, めっちゃ, あかん, おもろい, 〜で, 〜やん. Keep it understandable at the learner\'s level. Give corrections in standard casual Japanese unless the learner is trying Kansai-ben, then help them get it right.'},
 {id:'coworker',cat:'Work',lv:'N4',t:'Office small talk',ja:'職場[しょくば]の雑談[ざつだん]',who:'鈴木[すずき]さん · Senior colleague',p:'Suzuki, a friendly senior colleague',me:'a newer colleague',set:'The office kitchen on a Monday morning.',goal:'Chat about your weekend and plans, mention something you can or plan to do, and agree on lunch.'},
 {id:'interview',cat:'Work',lv:'N3',reg:'keigo',t:'Job interview',ja:'面接[めんせつ]',who:'面接官[めんせつかん] · Interviewer',p:'a hiring manager at a Japanese company',me:'a job applicant',set:"A meeting room at the company's office.",goal:'Introduce yourself, explain why you want the job and how you prepared, and ask one question at the end.'},
 {id:'client_meeting',cat:'Work',lv:'N3',reg:'keigo',t:'Meeting a client',ja:'取引先[とりひきさき]との初対面[しょたいめん]',who:'高橋[たかはし]部長[ぶちょう] · Client',p:'Takahashi, a department manager at a client company',me:'a representative of your company',set:"The client's reception area, at your first meeting.",goal:'Greet the client, exchange business cards, introduce your company briefly, and set up the next meeting.'},
 {id:'biz_phone',cat:'Work',lv:'N2',reg:'keigo',t:'Business phone call',ja:'ビジネス電話[でんわ]',who:'受付[うけつけ] · Reception',p:'a receptionist at a partner company',me:'a caller from your company',set:'A phone call. The person you want to speak to is out of the office.',goal:'Ask for the person, leave a clear message, and confirm when and how they will call you back.'},
 {id:'biz_email',cat:'Work',lv:'N2',reg:'keigo',long:true,t:'Business email',ja:'ビジネスメール',who:'取引先[とりひきさき] · Business contact',p:'a Japanese business contact who replies to your emails as the recipient',me:'someone writing business emails in Japanese',set:'An email exchange. The learner writes emails; you reply as the recipient in proper business-email style.',goal:'Write an email requesting a meeting or a quote, with the correct opening, body, and closing formulas.'},
 {id:'negotiation',cat:'Work',lv:'N2',reg:'keigo',t:'Negotiating terms',ja:'価格[かかく]交渉[こうしょう]',who:'営業[えいぎょう] · Supplier',p:'a sales representative from a supplier',me:'a buyer at your company',set:'A video call about a new order.',goal:'Negotiate a better price or delivery date while keeping the relationship polite and cooperative.'},
 {id:'formal_apology',cat:'Work',lv:'N1',reg:'keigo',t:'Formal apology',ja:'お詫[わ]び',who:'取引先[とりひきさき] · Client',p:'a displeased client whose delivery was delayed',me:'the person responsible at your company',set:"A meeting at the client's office after a delayed delivery.",goal:'Apologize formally, explain the cause, propose measures to prevent it, and rebuild trust.'},
 {id:'free',cat:'Open',lv:'any',t:'Free conversation',ja:'自由[じゆう]会話[かいわ]',who:'あおい · Partner',p:'Aoi, a friendly and curious Japanese conversation partner',me:'yourself',set:'A relaxed chat about anything the learner wants to talk about.',goal:'Keep a conversation going for about ten exchanges.'},
 {id:'custom',cat:'Open',lv:'any',t:'Your own scenario',ja:'カスタム',who:'相手[あいて] · Partner',p:'the person described in the scene',me:'as described in the scene',set:'',goal:'Reach whatever outcome the scene calls for.'}
];
const SC = Object.fromEntries(SCENARIOS.map(s => [s.id, s]));
const SC_CATS = ['Daily life','Travel','Social','Casual','Work','Open'];

/* kana */
const H = {a:'あ',i:'い',u:'う',e:'え',o:'お',ka:'か',ki:'き',ku:'く',ke:'け',ko:'こ',sa:'さ',shi:'し',su:'す',se:'せ',so:'そ',ta:'た',chi:'ち',tsu:'つ',te:'て',to:'と',na:'な',ni:'に',nu:'ぬ',ne:'ね',no:'の',ha:'は',hi:'ひ',fu:'ふ',he:'へ',ho:'ほ',ma:'ま',mi:'み',mu:'む',me:'め',mo:'も',ya:'や',yu:'ゆ',yo:'よ',ra:'ら',ri:'り',ru:'る',re:'れ',ro:'ろ',wa:'わ',wo:'を',n:'ん',ga:'が',gi:'ぎ',gu:'ぐ',ge:'げ',go:'ご',za:'ざ',ji:'じ',zu:'ず',ze:'ぜ',zo:'ぞ',da:'だ',dji:'ぢ',dzu:'づ',de:'で',do:'ど',ba:'ば',bi:'び',bu:'ぶ',be:'べ',bo:'ぼ',pa:'ぱ',pi:'ぴ',pu:'ぷ',pe:'ぺ',po:'ぽ'};
const GOJUON = [['a','i','u','e','o'],['ka','ki','ku','ke','ko'],['sa','shi','su','se','so'],['ta','chi','tsu','te','to'],['na','ni','nu','ne','no'],['ha','hi','fu','he','ho'],['ma','mi','mu','me','mo'],['ya',null,'yu',null,'yo'],['ra','ri','ru','re','ro'],['wa',null,null,null,'wo'],['n',null,null,null,null]];
const DAKU = [['ga','gi','gu','ge','go'],['za','ji','zu','ze','zo'],['da','dji','dzu','de','do'],['ba','bi','bu','be','bo'],['pa','pi','pu','pe','po']];
const YOON = [['kya','kyu','kyo'],['sha','shu','sho'],['cha','chu','cho'],['nya','nyu','nyo'],['hya','hyu','hyo'],['mya','myu','myo'],['rya','ryu','ryo'],['gya','gyu','gyo'],['ja','ju','jo'],['bya','byu','byo'],['pya','pyu','pyo']];
const YB = {ky:'き',sh:'し',ch:'ち',ny:'に',hy:'ひ',my:'み',ry:'り',gy:'ぎ',j:'じ',by:'び',py:'ぴ'};
YOON.flat().forEach(id => { H[id] = YB[id.slice(0, -1)] + ({a:'ゃ',u:'ゅ',o:'ょ'})[id.slice(-1)]; });
const EXT = [['ti','ティ'],['di','ディ'],['fa','ファ'],['fi','フィ'],['fe','フェ'],['fo','フォ'],['wi','ウィ'],['we','ウェ'],['she','シェ'],['je','ジェ'],['che','チェ'],['tu','トゥ'],['du','ドゥ'],['va','ヴァ'],['vu','ヴ']];
const KX = Object.fromEntries(EXT);
const toKata = s => Array.from(s).map(c => { const p = c.codePointAt(0); return (p >= 0x3041 && p <= 0x3096) ? String.fromCodePoint(p + 0x60) : c; }).join('');
const ROM_DISP = {dji:'ji', dzu:'zu'};
const ALT = {shi:['si'],chi:['ti'],tsu:['tu'],fu:['hu'],ji:['zi'],dji:['ji','di','dzi'],dzu:['zu','du'],wo:['o'],n:['nn'],sha:['sya'],shu:['syu'],sho:['syo'],cha:['tya','cya'],chu:['tyu','cyu'],cho:['tyo','cyo'],ja:['zya','jya'],ju:['zyu','jyu'],jo:['zyo','jyo'],ti:['thi'],di:['dhi']};
const kSplit = kid => [kid.slice(0, 1), kid.slice(2)];
const kanaChar = kid => { const [s, id] = kSplit(kid); return s === 'h' ? H[id] : (KX[id] || toKata(H[id] || '')); };
const kanaRom = kid => { const id = kSplit(kid)[1]; return ROM_DISP[id] || id; };
const KANA_GROUPS = {
  hA: GOJUON.slice(0, 5).flat().filter(Boolean).map(x => 'h_' + x),
  hB: GOJUON.slice(5).flat().filter(Boolean).map(x => 'h_' + x),
  hD: DAKU.flat().map(x => 'h_' + x),
  hY: YOON.flat().map(x => 'h_' + x),
  kA: GOJUON.flat().filter(Boolean).map(x => 'k_' + x),
  kX: DAKU.flat().concat(YOON.flat()).map(x => 'k_' + x).concat(EXT.map(e => 'k_' + e[0]))
};
const GROUP_LABEL = {hA:'あ〜の', hB:'は〜ん', hD:'が〜ぽ voiced', hY:'きゃ combos', kA:'ア〜ン basic', kX:'ガ・キャ・ティ extras'};
const KANA_ALL = Object.values(KANA_GROUPS).flat();

/* vocabulary decks */
const V5 = [["私[わたし]","I, me"],["あなた","you"],["人[ひと]","person"],["友達[ともだち]","friend"],["家族[かぞく]","family"],["父[ちち]","(my) father"],["母[はは]","(my) mother"],["子供[こども]","child"],["先生[せんせい]","teacher"],["学生[がくせい]","student"],["会社員[かいしゃいん]","office worker"],["医者[いしゃ]","doctor"],["名前[なまえ]","name"],["男[おとこ]の人[ひと]","man"],["女[おんな]の人[ひと]","woman"],
["今日[きょう]","today"],["明日[あした]","tomorrow"],["昨日[きのう]","yesterday"],["今[いま]","now"],["毎日[まいにち]","every day"],["朝[あさ]","morning"],["昼[ひる]","noon, daytime"],["晩[ばん]","evening"],["夜[よる]","night"],["来週[らいしゅう]","next week"],["先週[せんしゅう]","last week"],["時間[じかん]","time, hours"],
["家[いえ]","house, home"],["学校[がっこう]","school"],["会社[かいしゃ]","company, office"],["駅[えき]","station"],["店[みせ]","shop"],["銀行[ぎんこう]","bank"],["病院[びょういん]","hospital"],["図書館[としょかん]","library"],["公園[こうえん]","park"],["部屋[へや]","room"],["トイレ","toilet"],["国[くに]","country"],
["水[みず]","water"],["お茶[ちゃ]","(green) tea"],["コーヒー","coffee"],["ご飯[はん]","rice; meal"],["パン","bread"],["肉[にく]","meat"],["魚[さかな]","fish"],["野菜[やさい]","vegetables"],["果物[くだもの]","fruit"],["卵[たまご]","egg"],
["本[ほん]","book"],["電話[でんわ]","telephone"],["傘[かさ]","umbrella"],["かばん","bag"],["靴[くつ]","shoes"],["お金[かね]","money"],["車[くるま]","car"],["電車[でんしゃ]","train"],["自転車[じてんしゃ]","bicycle"],["写真[しゃしん]","photo"],
["行[い]く","to go"],["来[く]る","to come"],["帰[かえ]る","to go home, return"],["食[た]べる","to eat"],["飲[の]む","to drink"],["見[み]る","to see, watch"],["聞[き]く","to listen; to ask"],["話[はな]す","to speak"],["読[よ]む","to read"],["書[か]く","to write"],["買[か]う","to buy"],["待[ま]つ","to wait"],["起[お]きる","to get up"],["寝[ね]る","to sleep, go to bed"],["働[はたら]く","to work"],["休[やす]む","to rest, take a day off"],["する","to do"],["分[わ]かる","to understand"],["ある","to exist (things)"],["いる","to exist (people, animals)"],["会[あ]う","to meet"],["使[つか]う","to use"],
["大[おお]きい","big"],["小[ちい]さい","small"],["高[たか]い","expensive; tall"],["安[やす]い","cheap"],["新[あたら]しい","new"],["古[ふる]い","old (things)"],["暑[あつ]い","hot (weather)"],["寒[さむ]い","cold (weather)"],["おいしい","delicious"],["楽[たの]しい","fun"],["忙[いそが]しい","busy"],["難[むずか]しい","difficult"],["易[やさ]しい","easy"],["好[す]き","liked, favorite"],["嫌[きら]い","disliked"],["元気[げんき]","well, energetic"],["静[しず]か","quiet"],["有名[ゆうめい]","famous"],["きれい","pretty; clean"],["便利[べんり]","convenient"],
["ありがとうございます","thank you"],["すみません","excuse me; sorry"],["お願[ねが]いします","please (requesting)"],["いただきます","said before eating"],["ごちそうさまでした","said after eating"],["おはようございます","good morning"],["こんにちは","hello"],["こんばんは","good evening"],["はじめまして","nice to meet you"],["よろしくお願[ねが]いします","pleased to meet you; I appreciate it"],["大丈夫[だいじょうぶ]","all right, OK"],["いくら","how much"],["どこ","where"],["いつ","when"],["何[なに]","what"],["誰[だれ]","who"]];
const V4 = [["経験[けいけん]","experience"],["旅行[りょこう]","trip, travel"],["予約[よやく]","reservation"],["準備[じゅんび]","preparation"],["説明[せつめい]","explanation"],["連絡[れんらく]","contact, getting in touch"],["約束[やくそく]","promise; appointment"],["質問[しつもん]","question"],["返事[へんじ]","reply"],["相談[そうだん]","talking something over"],["趣味[しゅみ]","hobby"],["仕事[しごと]","work, job"],["会議[かいぎ]","meeting"],["意見[いけん]","opinion"],["問題[もんだい]","problem"],["理由[りゆう]","reason"],["場合[ばあい]","case, situation"],["気持[きも]ち","feeling"],["空港[くうこう]","airport"],["地図[ちず]","map"],["近所[きんじょ]","neighborhood"],["受付[うけつけ]","reception desk"],["お土産[みやげ]","souvenir"],["財布[さいふ]","wallet"],["薬[くすり]","medicine"],["熱[ねつ]","fever"],["怪我[けが]","injury"],["運転[うんてん]","driving"],
["引[ひ]っ越[こ]す","to move house"],["届[とど]ける","to deliver"],["決[き]める","to decide"],["調[しら]べる","to look up, investigate"],["集[あつ]める","to collect"],["忘[わす]れる","to forget"],["思[おも]い出[だ]す","to recall"],["間[ま]に合[あ]う","to be in time"],["遅[おく]れる","to be late"],["手伝[てつだ]う","to help"],["頼[たの]む","to ask a favor"],["迎[むか]える","to meet, pick up"],["送[おく]る","to send"],["貸[か]す","to lend"],["借[か]りる","to borrow"],["払[はら]う","to pay"],["選[えら]ぶ","to choose"],["続[つづ]ける","to continue"],["慣[な]れる","to get used to"],["褒[ほ]める","to praise"],["怒[おこ]る","to get angry"],["笑[わら]う","to laugh"],["泣[な]く","to cry"],
["珍[めずら]しい","rare, unusual"],["恥[は]ずかしい","embarrassing"],["危[あぶ]ない","dangerous"],["厳[きび]しい","strict"],["優[やさ]しい","kind, gentle"],["十分[じゅうぶん]","enough"],["大切[たいせつ]","important, precious"],["残念[ざんねん]","unfortunate, a pity"],["丁寧[ていねい]","polite, careful"],["特[とく]に","especially"],["必[かなら]ず","without fail"],["もうすぐ","soon"],["たぶん","probably"],["なかなか","quite; (not) easily"]];
const K5 = [["一","one","イチ・イツ","ひと(つ)"],["二","two","ニ","ふた(つ)"],["三","three","サン","みっ(つ)"],["四","four","シ","よ(ん)・よっ(つ)"],["五","five","ゴ","いつ(つ)"],["六","six","ロク","むっ(つ)"],["七","seven","シチ","なな(つ)"],["八","eight","ハチ","やっ(つ)"],["九","nine","キュウ・ク","ここの(つ)"],["十","ten","ジュウ","とお"],["百","hundred","ヒャク","—"],["千","thousand","セン","ち"],["万","ten thousand","マン・バン","—"],["円","yen; circle","エン","まる(い)"],
["日","day; sun","ニチ・ジツ","ひ・か"],["月","month; moon","ゲツ・ガツ","つき"],["火","fire","カ","ひ"],["水","water","スイ","みず"],["木","tree","モク・ボク","き"],["金","gold; money","キン・コン","かね"],["土","earth, soil","ド・ト","つち"],["年","year","ネン","とし"],["時","time, hour","ジ","とき"],["分","minute; part","フン・ブン","わ(かる)"],["半","half","ハン","なか(ば)"],["今","now","コン","いま"],["何","what","カ","なに・なん"],
["人","person","ジン・ニン","ひと"],["子","child","シ・ス","こ"],["男","man","ダン・ナン","おとこ"],["女","woman","ジョ・ニョ","おんな"],["父","father","フ","ちち"],["母","mother","ボ","はは"],["友","friend","ユウ","とも"],["先","ahead; previous","セン","さき"],["生","life, birth","セイ・ショウ","い(きる)・う(まれる)"],["学","study","ガク","まな(ぶ)"],["校","school","コウ","—"],["名","name","メイ・ミョウ","な"],["本","book; origin","ホン","もと"],
["山","mountain","サン","やま"],["川","river","セン","かわ"],["天","sky, heaven","テン","あま"],["気","spirit, air","キ・ケ","—"],["雨","rain","ウ","あめ"],["花","flower","カ","はな"],["上","up, above","ジョウ","うえ・あ(がる)"],["下","down, below","カ・ゲ","した・さ(がる)"],["中","middle, inside","チュウ","なか"],["外","outside","ガイ・ゲ","そと"],["右","right","ウ・ユウ","みぎ"],["左","left","サ","ひだり"],["前","front; before","ゼン","まえ"],["後","behind; after","ゴ・コウ","あと・うし(ろ)"],["東","east","トウ","ひがし"],["西","west","セイ・サイ","にし"],["南","south","ナン","みなみ"],["北","north","ホク","きた"],
["大","big","ダイ・タイ","おお(きい)"],["小","small","ショウ","ちい(さい)・こ"],["高","tall; expensive","コウ","たか(い)"],["安","cheap; safe","アン","やす(い)"],["長","long; chief","チョウ","なが(い)"],["新","new","シン","あたら(しい)"],["古","old","コ","ふる(い)"],["多","many","タ","おお(い)"],["少","few, a little","ショウ","すく(ない)・すこ(し)"],["白","white","ハク","しろ(い)"],
["行","go","コウ・ギョウ","い(く)・おこな(う)"],["来","come","ライ","く(る)"],["食","eat","ショク","た(べる)"],["飲","drink","イン","の(む)"],["見","see","ケン","み(る)"],["聞","hear; ask","ブン","き(く)"],["読","read","ドク","よ(む)"],["書","write","ショ","か(く)"],["話","talk; story","ワ","はな(す)・はなし"],["買","buy","バイ","か(う)"],["休","rest","キュウ","やす(む)"],["出","exit, go out","シュツ","で(る)・だ(す)"],["入","enter","ニュウ","はい(る)・い(れる)"],["言","say","ゲン・ゴン","い(う)"],["語","language, word","ゴ","かた(る)"],
["国","country","コク","くに"],["店","shop","テン","みせ"],["駅","station","エキ","—"],["道","road, way","ドウ","みち"],["社","company; shrine","シャ","やしろ"],["電","electricity","デン","—"],["車","car, vehicle","シャ","くるま"],["毎","every","マイ","—"],["週","week","シュウ","—"],["午","noon","ゴ","—"],["間","interval, between","カン・ケン","あいだ・ま"],["手","hand","シュ","て"],["目","eye","モク","め"],["口","mouth","コウ・ク","くち"],["耳","ear","ジ","みみ"],["足","foot, leg","ソク","あし・た(りる)"]];
const DECK_LABEL = {v5:'N5 words', k5:'N5 kanji', v4:'N4 words', mine:'My cards'};
const TOPICS = ['JLPT core words','Casual & slang','Food & drink','Travel','Work & office','Business email','Shopping','Home & family','Health','Feelings','Pets & animals','Cars','Nature & weather','Technology'];

/* ---------- state ---------- */
function defaultState() {
  return { v:1, ts:0,
    settings:{ level:'kana', furi:true, romaji:true, en:true, ime:false, rate:0.9, autoplay:false, listen:false, voice:'', newPerDay:10, speed:'quick', deck:'v5', cardDir:'jp', customScene:'' },
    kana:{}, srs:{}, gram:{}, stamps:{}, days:[], stats:{turns:0, sessions:0, reviews:0, kana:0, reads:0}, newDay:{d:'', n:0} };
}
function mergeState(base, data) {
  if (!data || typeof data !== 'object') return base;
  const out = Object.assign(base, data);
  out.settings = Object.assign(defaultState().settings, data.settings || {});
  out.stats = Object.assign(defaultState().stats, data.stats || {});
  ['kana','srs','gram','stamps'].forEach(k => { if (!out[k] || typeof out[k] !== 'object') out[k] = {}; });
  if (!Array.isArray(out.days)) out.days = [];
  if (!out.newDay) out.newDay = {d:'', n:0};
  return out;
}
let S = defaultState();
let CUSTOM = {cards:[]};
let IDX = {}, DECKS = {};
const UI = { kanaScript:'h', drillGroups:null, drillMode:'choose', gramLv:null, gramFinding:null, inChat:false };
let VIEW = 'route';
let TALK = null, RV = null, DR = null, GEN = null, LESSON_CTL = null, WRAP_CTL = null, SHEET = null, LAST_REVIEW = null;

/* ---------- storage ---------- */
const Store = {
  cloud:false, tried:false, db:null, base:null, timers:{}, inflight:{}, again:{},
  local(key, val) {
    try {
      if (val === undefined) { const s = localStorage.getItem('nl_' + key); return s ? JSON.parse(s) : null; }
      if (val === null) { localStorage.removeItem('nl_' + key); return null; }
      localStorage.setItem('nl_' + key, JSON.stringify(val));
    } catch (e) { return null; }
  },
  async init() {
    try {
      const c = window.claude;
      if (!c || typeof c.use !== 'function') return null;
      const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
      if (!db || !user) return null;
      const uid = await user.id();
      if (!uid) return null;
      this.db = db; this.base = 'data/users/' + uid;
      const [st, cu] = await Promise.all([db.doc(this.base + '/state').get(), db.doc(this.base + '/custom').get()]);
      this.cloud = true;
      /* snapshots are frozen: clone so the app can keep mutating its state */
      return { state: st.exists ? clone(st.data()) : null, custom: cu.exists ? clone(cu.data()) : null };
    } catch (e) { console.warn('storage init', e); this.cloud = false; return null; }
    finally { this.tried = true; }
  },
  pending:{},
  save(key, getter, delay = 1000) { this.pending[key] = true; clearTimeout(this.timers[key]); this.timers[key] = setTimeout(() => this.flush(key, getter), delay); },
  flushPending(key, getter) { if (this.pending[key]) this.flush(key, getter); },
  async flush(key, getter) {
    clearTimeout(this.timers[key]); this.pending[key] = false;
    const data = getter();
    this.local(key, data);
    if (!this.cloud) return;
    if (this.inflight[key]) { this.again[key] = getter; return; }
    this.inflight[key] = true;
    try { await this.db.doc(this.base + '/' + key).set(clone(data)); }
    catch (e) {
      if (e && ['invalid_argument','revoked','not_granted','capability_disabled','quota_exceeded'].includes(e.code)) { this.cloud = false; console.warn('cloud save off', e); }
      else console.warn('save failed', e);
    } finally {
      this.inflight[key] = false;
      if (this.again[key]) { const g = this.again[key]; this.again[key] = null; this.flush(key, g); }
    }
  },
  async getLesson(id) {
    if (this.cloud) { try { const s = await this.db.doc(this.base + '/state/lessons/' + id).get(); if (s.exists) { const d = clone(s.data()); return d.lesson || null; } } catch (e) {} }
    const m = this.local('lessons') || {}; return m[id] || null;
  },
  async putLesson(id, lesson) {
    const m = this.local('lessons') || {}; m[id] = lesson; const keys = Object.keys(m); if (keys.length > 40) delete m[keys[0]]; this.local('lessons', m);
    if (this.cloud) { try { await this.db.doc(this.base + '/state/lessons/' + id).set({lesson, at:Date.now()}); } catch (e) {} }
  },
  async listTalks() {
    if (this.cloud) { try { const q = await this.db.collection(this.base + '/state/talks').orderBy('at', 'desc').limit(20).get(); return q.docs.map(d => Object.assign(clone(d.data()), {id:d.id})); } catch (e) {} }
    return this.local('talks') || [];
  },
  async listReadings() {
    if (this.cloud) { try { const q = await this.db.collection(this.base + '/state/readings').orderBy('at', 'desc').limit(50).get(); return q.docs.map(d => Object.assign(clone(d.data()), {id:d.id})); } catch (e) {} }
    return (this.local('readings') || []).sort((a, b) => b.at - a.at);
  },
  async putReading(rec) {
    const arr = (this.local('readings') || []).filter(r => r.id !== rec.id); arr.unshift(rec); this.local('readings', arr.slice(0, 30));
    if (this.cloud) { try { await this.db.doc(this.base + '/state/readings/' + rec.id).set(clone(rec)); } catch (e) { console.warn(e); } }
  },
  async deleteReading(id) {
    this.local('readings', (this.local('readings') || []).filter(r => r.id !== id));
    if (this.cloud) { try { await this.db.doc(this.base + '/state/readings/' + id).delete(); } catch (e) {} }
  },
  async clearReadings() {
    this.local('readings', null);
    if (!this.cloud) return;
    try { const q = await this.db.collection(this.base + '/state/readings').limit(100).get(); for (const d of q.docs) { try { await this.db.doc(this.base + '/state/readings/' + d.id).delete(); } catch (e) {} } } catch (e) {}
  },
  async clearTalks() {
    this.local('talks', null);
    if (!this.cloud) return;
    try { const q = await this.db.collection(this.base + '/state/talks').limit(100).get(); for (const d of q.docs) { try { await this.db.doc(this.base + '/state/talks/' + d.id).delete(); } catch (e) {} } } catch (e) {}
  },
  async putTalk(rec) {
    const arr = (this.local('talks') || []).filter(t => t.id !== rec.id); arr.unshift(rec); this.local('talks', arr.slice(0, 15));
    if (this.cloud) { try { await this.db.doc(this.base + '/state/talks/' + rec.id).set(clone(rec)); } catch (e) { console.warn(e); } }
  }
};
const saveState = (delay) => { S.ts = Date.now(); Store.save('state', () => S, delay); };
const saveCustom = () => Store.save('custom', () => CUSTOM, 600);
const saveDraft = () => {
  if (!TALK) { Store.local('talk', null); return; }
  const {sc, busy, ctl, error, ...rest} = TALK;
  Store.local('talk', rest);
};
function markDay() { const t = today(); if (!S.days.includes(t)) { S.days.push(t); if (S.days.length > 400) S.days = S.days.slice(-400); } }
function streak() {
  const set = new Set(S.days); const d = new Date(); let n = 0;
  if (!set.has(fmt(d))) d.setDate(d.getDate() - 1);
  while (set.has(fmt(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ---------- AI (Claude) ---------- */
let SAMPLE = null, AI = 'pending';
const aiReady = (async () => {
  await Promise.resolve();
  try { SAMPLE = (window.claude && typeof window.claude.use === 'function') ? await window.claude.use('sample') : null; }
  catch (e) { SAMPLE = null; }
  AI = SAMPLE ? 'ok' : 'off';
  if (!UI.inChat && (VIEW === 'talk' || VIEW === 'cards')) render();
})();
async function getSample() { if (AI === 'pending') await aiReady; return SAMPLE; }
const OFF_CODES = ['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'];
function aiError(e) {
  const code = (e && e.code) || 'upstream_error';
  if (OFF_CODES.includes(code)) { AI = 'off'; SAMPLE = null; return "Claude isn't available on this page right now. If you declined access, reload the page to be asked again."; }
  return ({
    no_key:'Add your Anthropic API key in Settings to use Claude features.',
    bad_key:'Anthropic rejected the API key. Check it in Settings.',
    rate_limited:'Too many requests right now. Wait a minute, then try again.',
    session_expired:'Your Claude session expired. Sign in again, then retry.',
    refused:"Claude couldn't answer that. Try rephrasing your message.",
    prompt_too_large:'This conversation is too long to continue. Finish it and start a new one.',
    cancelled:'Stopped.'
  })[code] || "The reply didn't come through. Try again.";
}
const AI_OFF_NOTE = '<div class="notice"><b>Claude features are unavailable here.</b> Conversation practice, full grammar lessons, and card generation need this page opened in Claude with access allowed. Kana, built-in cards, and the grammar list still work.</div>';

/* ---------- speech ---------- */
const TTS = {
  ok: ('speechSynthesis' in window) && typeof window.SpeechSynthesisUtterance === 'function',
  voice: null, voices: [],
  /* natural/neural voices first, then the well-known built-in Japanese voices */
  rank(v) { const n = v.name || ''; return /natural|neural|online|premium|enhanced/i.test(n) ? 0 : /google/i.test(n) ? 1 : /kyoko|o-ren|nanami|haruka|ayumi|sayaka|ichiro|keita|hattori/i.test(n) ? 2 : 3; },
  pick() {
    try {
      const vs = speechSynthesis.getVoices().filter(v => /^ja([-_]|$)/i.test(v.lang));
      vs.sort((a, b) => this.rank(a) - this.rank(b)); this.voices = vs;
      this.voice = vs.find(v => v.name === S.settings.voice) || vs[0] || null;
    } catch (e) {}
  },
  speak(text) {
    if (!this.ok) return;
    try {
      if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(plain(text)); u.lang = 'ja-JP'; if (this.voice) u.voice = this.voice; u.rate = S.settings.rate;
      speechSynthesis.speak(u);
    } catch (e) {}
  },
  /* one sentence, then call done (used for reading a whole text aloud) */
  speakThen(text, done) {
    if (!this.ok) { done(); return; }
    try {
      const u = new SpeechSynthesisUtterance(plain(text)); u.lang = 'ja-JP'; if (this.voice) u.voice = this.voice; u.rate = S.settings.rate;
      let fired = false; const fin = () => { if (!fired) { fired = true; done(); } };
      u.onend = fin; u.onerror = e => { if (e && (e.error === 'interrupted' || e.error === 'canceled')) return; fin(); };
      speechSynthesis.speak(u);
    } catch (e) { done(); }
  }
};
if (TTS.ok) { TTS.pick(); try { speechSynthesis.addEventListener('voiceschanged', () => TTS.pick()); } catch (e) {} }

/* ---------- SRS ---------- */
const MIN = 60000, DAY = 86400000;
function schedule(prev, g, now) {
  const c = prev ? Object.assign({}, prev) : {i:0, e:2.5, r:0, l:0, d:0};
  if (c.r === 0) {
    if (g === 1) c.d = now + MIN;
    else if (g === 2) c.d = now + 6 * MIN;
    else if (g === 3) { c.r = 1; c.i = 1; c.d = now + DAY; }
    else { c.r = 1; c.i = 4; c.e += 0.15; c.d = now + 4 * DAY; }
  } else {
    c.r++;
    if (g === 1) { c.l++; c.e = Math.max(1.3, c.e - 0.2); c.i = Math.max(1, Math.round(c.i * 0.3)); c.d = now + 10 * MIN; }
    else if (g === 2) { c.e = Math.max(1.3, c.e - 0.15); c.i = Math.max(c.i + 1, Math.round(c.i * 1.2)); c.d = now + c.i * DAY; }
    else if (g === 3) { c.i = Math.max(c.i + 1, Math.round(c.i * c.e)); c.d = now + c.i * DAY; }
    else { c.e += 0.15; c.i = Math.max(c.i + 2, Math.round(c.i * c.e * 1.3)); c.d = now + c.i * DAY; }
  }
  c.e = Math.round(c.e * 100) / 100;
  return c;
}
function fmtIvl(ms) {
  const m = ms / MIN;
  if (m < 60) return Math.max(1, Math.round(m)) + 'm';
  const h = m / 60; if (h < 24) return Math.round(h) + 'h';
  const d = h / 24; if (d < 30) return Math.round(d) + 'd';
  if (d < 365) return Math.round(d / 30) + 'mo';
  return (d / 365).toFixed(1) + 'y';
}
function buildIndex() {
  if (!CUSTOM || typeof CUSTOM !== 'object') CUSTOM = {cards:[]};
  if (!Array.isArray(CUSTOM.cards)) CUSTOM.cards = [];
  if (!Array.isArray(CUSTOM.grammar)) CUSTOM.grammar = [];
  /* grammar points added with "Find more" join the built-in ones */
  Object.keys(GR).forEach(k => { if (GR[k].extra) delete GR[k]; });
  CUSTOM.grammar.forEach(g => { if (g && g.id && g.p && !GR[g.id]) GR[g.id] = Object.assign({}, g, {extra:true}); });
  IDX = {}; DECKS = {v5:[], k5:[], v4:[], mine:[]};
  V5.forEach(([w, m]) => { const id = 'v5_' + hash(w); IDX[id] = {id, kind:'v', w, m, deck:'v5'}; DECKS.v5.push(id); });
  K5.forEach(([k, m, on, kun]) => { const id = 'k5_' + hash(k); IDX[id] = {id, kind:'k', w:k, m, on, kun, deck:'k5'}; DECKS.k5.push(id); });
  V4.forEach(([w, m]) => { const id = 'v4_' + hash(w); IDX[id] = {id, kind:'v', w, m, deck:'v4'}; DECKS.v4.push(id); });
  CUSTOM.cards.forEach(c => { if (!c || !c.id || !c.w) return; IDX[c.id] = Object.assign({}, c, {kind:'v', deck:'mine'}); DECKS.mine.push(c.id); });
}
const dueIds = (now = Date.now()) => Object.keys(S.srs).filter(id => IDX[id] && S.srs[id].d <= now).sort((a, b) => S.srs[a].d - S.srs[b].d);
const unseen = deck => (DECKS[deck] || []).filter(id => !S.srs[id]);
const newLeft = () => Math.max(0, S.settings.newPerDay - (S.newDay.d === today() ? S.newDay.n : 0));
const learnedCount = () => Object.keys(S.srs).filter(id => IDX[id] && S.srs[id].r >= 1).length;

/* ---------- progress ---------- */
/* mastery is sticky: once a character reaches three in a row it stays mastered, a later miss only resets the streak bars */
const kanaMastered = kid => { const k = S.kana[kid]; return !!k && (k.m === 1 || k.s >= 3); };
function stationProgress(st) {
  if (st.lv === 'kana') { const ids = KANA_GROUPS[st.group]; const got = ids.filter(kanaMastered).length; return {p:got / ids.length, done:got === ids.length, got, items:ids.length}; }
  const items = st.g.length + (st.sc ? 1 : 0);
  const got = st.g.filter(g => S.gram[g]).length + (st.sc && S.stamps[st.sc] ? 1 : 0);
  return {p:got / items, done:got === items, got, items};
}
function nextStation() {
  const from = Math.max(0, LV_ORDER.indexOf(S.settings.level));
  return STATIONS.find(s => LV_ORDER.indexOf(s.lv) >= from && !stationProgress(s).done) || STATIONS.find(s => !stationProgress(s).done) || STATIONS[STATIONS.length - 1];
}
const codeParts = code => { const m = code.match(/^(K|N\d)-?(\d+)$/); return m ? [m[1], m[2]] : [code, '']; };
function ringHTML(st, size) {
  const pr = stationProgress(st); const [a, b] = codeParts(st.code);
  return `<span class="ring ${size || ''} ${pr.done ? 'done' : ''}" style="--c:${lineColor(st.lv)};--p:${Math.round(pr.p * 100)}" aria-hidden="true"><span class="ring-in"><i>${a}</i><b>${b}</b></span></span>`;
}

/* ---------- render shell ---------- */
const main = $('#main'), view = $('#view');
function renderTop() {
  const n = streak();
  $('#topStreak').innerHTML = `<b>${n}</b><span lang="ja" aria-hidden="true">日</span><span class="lbl">streak</span><span class="sr"> days in a row</span>`;
  $('#topLevel').innerHTML = LEVEL_OPTS.map(([v, l]) => `<option value="${v}" ${S.settings.level === v ? 'selected' : ''}>${v === 'kana' ? 'Kana' : v} · ${esc(l.split(' · ')[1])}</option>`).join('');
  document.querySelectorAll('.nav-btn').forEach(b => { if (b.dataset.v === VIEW) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  document.body.classList.toggle('no-furi', !S.settings.furi);
}
const VIEWS = {};
function render() {
  renderTop();
  const chat = VIEW === 'talk' && UI.inChat && TALK;
  const prevInput = $('#talkInput') ? $('#talkInput').value : null;
  /* typed text in this view's fields survives a re-render */
  const keep = {}; view.querySelectorAll('textarea[id],input[type=text][id]').forEach(el => { if (el.value) keep[el.id] = el.value; });
  main.classList.toggle('chat-mode', !!chat);
  view.className = 'view' + (chat ? ' chatview' : '');
  view.innerHTML = (VIEWS[VIEW] || VIEWS.route)();
  Object.keys(keep).forEach(id => { const el = document.getElementById(id); if (el && !el.value && el.closest('#view')) el.value = keep[id]; });
  if (chat) afterChatRender(prevInput);
  if (VIEW === 'talk' && !chat) loadHistory();
  if (VIEW === 'read' && !RD.cur && RD.list === null) loadReadings();
}
function go(v) { if (VIEW === 'kana' && v !== 'kana') DR = null; if (VIEW === 'read' && v !== 'read') rdStop(); VIEW = v; render(); main.scrollTop = 0; }

/* ---------- ROUTE ---------- */
function weekHTML() {
  const set = new Set(S.days); const d = new Date(); d.setDate(d.getDate() - 6); const out = [];
  for (let k = 0; k < 7; k++) { const ds = fmt(d); out.push(`<span><i class="${set.has(ds) ? 'on' : ''}${k === 6 ? ' now' : ''}"></i>${'日月火水木金土'[d.getDay()]}</span>`); d.setDate(d.getDate() + 1); }
  return `<div class="week" aria-label="Study days this week">${out.join('')}</div>`;
}
VIEWS.route = () => {
  const due = dueCountAll(); const nl = Math.min(newLeft(), unseen(S.settings.deck).length);
  const nx = nextStation(); const npr = stationProgress(nx); const L = LV[nx.lv];
  const rec = SC[nx.sc] || SC.self_intro;
  const kanaM = KANA_ALL.filter(kanaMastered).length;
  const stampN = Object.keys(S.stamps).filter(k => SC[k]).length;
  const gramN = Object.keys(S.gram).filter(k => GR[k]).length;
  return `
  <header class="vh"><h1 class="vt"><span lang="ja">路線図</span><small>Route map</small></h1>
  <p class="lede">Ride from kana to fluency. Each line is a JLPT level, and each station pairs a few grammar points with a conversation you practise with Claude. Fill the ring to clear the station.</p></header>
  <section class="today" aria-label="Today">
    <article class="tcard"><p class="eyebrow">Card reviews</p><div class="big">${due}<small>due</small></div><p class="muted">${nl} new from ${esc(DECK_LABEL[S.settings.deck])} today</p><button class="btn" data-action="go" data-v="cards">Review cards</button></article>
    <article class="tcard"><p class="eyebrow">Next stop · ${esc(L.name)}</p><div class="nextrow">${ringHTML(nx, 'sm')}<div style="min-width:0"><h3 lang="ja">${ruby(nx.ja)}</h3><p class="muted small">${esc(nx.en)} · ${npr.got}/${npr.items} done</p></div></div><button class="btn ghost" data-action="station" data-code="${nx.code}">Open station</button></article>
    <article class="tcard"><p class="eyebrow">Conversation practice</p><h3 lang="ja">${ruby(rec.ja)}</h3><p class="muted small">${esc(rec.t)}: ${esc(rec.goal)}</p><button class="btn ghost" data-action="talk-setup" data-sc="${rec.id}">Start talking</button></article>
    <article class="tcard"><p class="eyebrow">This week</p>${weekHTML()}<div class="minis"><span><b>${learnedCount()}</b> words</span><span><b>${kanaM}</b>/${KANA_ALL.length} kana</span><span><b>${gramN}</b> grammar</span><span><b>${stampN}</b> stamps</span><span><b>${S.stats.reads || 0}</b> texts read</span><span><b>${S.stats.sessions || 0}</b> chats</span></div></article>
  </section>
  <section class="sec"><h2 class="sh"><span lang="ja">路線</span> Lines</h2><div class="rail">${LEVELS.map(lineHTML).join('')}</div></section>
  <section class="sec"><h2 class="sh"><span lang="ja">スタンプ帳</span> Stamp book <small>${stampN}/${SCENARIOS.length}</small></h2>
  <p class="muted">Reach a conversation's goal to collect its station stamp. Tap any stamp to practise that scene.</p>
  <div class="stamps">${SCENARIOS.map(stampHTML).join('')}</div></section>`;
};
function dueCountAll() { return dueIds().length; }
function lineHTML(L) {
  const sts = STATIONS.filter(s => s.lv === L.id); const done = sts.filter(s => stationProgress(s).done).length; const nx = nextStation();
  return `<div class="line" style="--c:${L.c}"><div class="line-head"><span class="lbadge">${L.short}</span><div><b>${L.name}</b><span lang="ja">${ruby(L.ja)}</span>${L.note ? `<em class="lnote">${esc(L.note)}</em>` : ''}</div><small>${done}/${sts.length}</small></div>
  <div class="track"><div class="stations">${sts.map(s => `<button class="stn" data-action="station" data-code="${s.code}" aria-label="${esc(s.code + ' ' + s.en)}">${ringHTML(s)}<span class="stn-ja" lang="ja">${ruby(s.ja)}</span><span class="stn-en">${esc(s.en)}</span>${s === nx ? '<span class="here">NEXT</span>' : ''}</button>`).join('')}</div></div></div>`;
}
function stampHTML(sc) {
  const got = S.stamps[sc.id]; const rot = (parseInt(hash(sc.id), 36) % 21) - 10;
  return `<button class="stamp ${got ? '' : 'empty'}" style="--rot:${rot}deg" data-action="talk-setup" data-sc="${sc.id}" aria-label="${esc(sc.t)}${got ? ', collected ' + got : ', not collected yet'}"><span class="s1">日本語線</span><span class="s2" lang="ja">${esc(plain(sc.ja))}</span><span class="s3">${got ? got.replace(/-/g, '.') : sc.lv === 'any' ? 'OPEN' : sc.lv}</span></button>`;
}

/* ---------- station sheet ---------- */
function openStation(code) {
  const st = STN[code]; if (!st) return; const L = LV[st.lv]; const pr = stationProgress(st);
  let body = `<div class="st-hero" style="--c:${L.c}">${ringHTML(st, 'lg')}<div><p class="eyebrow">${esc(L.name)} · ${st.code}</p><h3 lang="ja">${ruby(st.ja)}</h3><p class="muted">${esc(st.en)}</p></div></div>
  <div class="pbar" style="--c:${L.c}"><i style="width:${Math.round(pr.p * 100)}%"></i></div><p class="muted small">${pr.got} of ${pr.items} ${st.lv === 'kana' ? 'characters mastered (three correct in a row)' : 'complete'}</p>`;
  if (st.lv === 'kana') {
    const ids = KANA_GROUPS[st.group];
    body += `<div class="kgrid c6">${ids.map(kanaTile).join('')}</div><div class="row"><button class="btn" data-action="kana-drill" data-group="${st.group}">Drill these characters</button></div>`;
  } else {
    const sc = SC[st.sc];
    body += `<h4>Grammar</h4><ul class="glist" style="grid-template-columns:1fr">${st.g.map(gRow).join('')}</ul>
    <h4>Conversation</h4><button class="sccard" data-action="talk-setup" data-sc="${sc.id}">${S.stamps[sc.id] ? '<span class="minist" lang="ja">済</span>' : ''}<span class="lvtag" style="--c:${lineColor(sc.lv)}">${sc.lv}</span><span class="sc-ja" lang="ja">${ruby(sc.ja)}</span><span class="sc-en">${esc(sc.t)}</span><span class="sc-who">Goal: ${esc(sc.goal)}</span></button>`;
  }
  openSheet(esc(st.code + ' · ' + st.en), body, 'station:' + code);
}
function gRow(id) {
  const g = GR[id];
  return `<li><button class="grow" data-action="grammar" data-id="${id}"><span class="gp" lang="ja">${esc(g.p)}</span><span class="gm">${esc(g.m)}</span><span class="check ${S.gram[id] ? 'on' : ''}" aria-label="${S.gram[id] ? 'learned' : 'not learned yet'}">✓</span></button></li>`;
}

/* ---------- TALK ---------- */
VIEWS.talk = () => (UI.inChat && TALK) ? chatHTML() : talkPickerHTML();
function talkPickerHTML() {
  const resume = TALK ? `<div class="resume"><div><p class="eyebrow">In progress</p><b lang="ja">${ruby(TALK.sc.ja)}</b> <span class="muted">${esc(TALK.sc.t)} · ${TALK.msgs.filter(m => m.who === 'me').length} messages</span></div><button class="btn" data-action="talk-resume">Resume</button><button class="btn ghost" data-action="talk-wrap">Finish and review</button></div>` : '';
  return `<header class="vh"><h1 class="vt"><span lang="ja">会話</span><small>Conversation practice</small></h1>
  <p class="lede">Role-play everyday and social situations with Claude as your partner. Every message you send gets a correction or a thumbs-up, you can ask for reply ideas, and reaching the goal earns the scene's stamp.</p></header>
  ${AI === 'off' ? AI_OFF_NOTE : ''}${resume}
  ${SC_CATS.map(cat => `<section class="sec"><h2 class="sh">${cat}</h2><div class="scgrid">${SCENARIOS.filter(s => s.cat === cat).map(scCard).join('')}</div></section>`).join('')}
  <section class="sec" id="talkHistory" hidden></section>`;
}
function scCard(sc) {
  return `<button class="sccard" data-action="talk-setup" data-sc="${sc.id}">${S.stamps[sc.id] ? '<span class="minist" lang="ja" title="Stamp collected">済</span>' : ''}<span class="lvtag" style="--c:${lineColor(sc.lv)}">${sc.lv === 'any' ? 'Any level' : sc.lv}</span><span class="sc-ja" lang="ja">${ruby(sc.ja)}</span><span class="sc-en">${esc(sc.t)}</span><span class="sc-who" lang="ja">${ruby(sc.who)}</span></button>`;
}
async function loadHistory() {
  const box = $('#talkHistory'); if (!box) return;
  const list = await Store.listTalks(); if (!$('#talkHistory') || !list.length) return;
  LAST_HISTORY = list;
  box.hidden = false;
  box.innerHTML = `<h2 class="sh"><span lang="ja">履歴</span> Past sessions</h2><ul class="hist">${list.map((t, i) => `<li><button data-action="history" data-i="${i}"><span><b lang="ja">${esc(plain(t.ja || ''))}</b> <span class="muted">${esc(t.title || '')}</span></span><span class="hd">${t.review && t.review.score ? scoreText(t.review.score) + ' · ' : ''}${new Date(t.at).toLocaleDateString()}</span></button></li>`).join('')}</ul>`;
}
let LAST_HISTORY = [];
const scoreText = n => '★'.repeat(Math.max(0, Math.min(5, n | 0)));
const REG_OPTS = [['auto','Natural for the situation'],['casual','Casual (タメ口)'],['polite','Polite (です・ます)'],['keigo','Business keigo (敬語)']];
const REG_GUIDE = {
  auto:"Use whatever register is natural for this scene and relationship, kept within the learner's level.",
  casual:'Casual speech (タメ口) the way close friends really talk: plain forms, sentence-final particles (よ, ね, じゃん, かな), contractions (〜てる, 〜ちゃう, 〜なきゃ, 〜って), dropped particles, fillers (なんか, まあ) and common colloquial words. Natural, never crude.',
  polite:'Polite です・ます style throughout.',
  keigo:'Professional keigo: honorific (尊敬語) and humble (謙譲語) forms as a Japanese business person would use them.'
};
const LEVEL_GUIDE = {
  kana:'Absolute beginner still learning kana. Use very short, simple sentences (about 3–8 words), the most basic vocabulary, and です/ます. Repeat key words and keep things slow and friendly.',
  N5:'JLPT N5. Short, simple sentences with basic vocabulary and grammar (です/ます, basic particles, て-form requests). Avoid complex structures.',
  N4:'JLPT N4. Everyday vocabulary, plain and polite forms, conditionals, potential forms, giving and receiving. Moderate sentence length.',
  N3:'JLPT N3. Natural everyday Japanese with some idiomatic expressions and moderately complex sentences; speak like a real person, but clearly.',
  N2:'JLPT N2. Natural adult vocabulary and pace, including business expressions and nuanced connectors.',
  N1:'JLPT N1 / near-native. Fully natural Japanese including idioms, colloquialisms, and sophisticated keigo where it fits. Do not simplify.'
};
/* a grammar point can become its own practice conversation */
function grammarScenario(gid) {
  const g = GR[gid]; if (!g) return null;
  const cas = g.lv === 'casual';
  return {id:'g_' + gid, gram:gid, cat:'Grammar practice', lv:cas ? 'N4' : g.lv, minLv:cas ? 'N4' : g.lv, reg:cas ? 'casual' : undefined, t:'Practise ' + g.p, ja:g.p, who:cas ? 'ともだち · Friend' : '先生[せんせい] · Tutor',
    p:'a friendly Japanese tutor who chats naturally about everyday topics and keeps creating openings where the learner needs the target grammar',
    me:'a learner practising one grammar point', set:'A relaxed chat built to practise ' + g.p + ' (' + g.m + '). Model sentence: ' + plain(g.ex),
    goal:'Use ' + g.p + ' correctly in three of your own sentences.'};
}
const scenarioFor = id => SC[id] || (typeof id === 'string' && id.startsWith('g_') ? grammarScenario(id.slice(2)) : null);
const levelAtLeast = (lvl, min) => (LV_ORDER.indexOf(lvl) >= LV_ORDER.indexOf(min) ? lvl : min);
function talkRecord(T) {
  return {id:T.id, at:Date.now(), sc:T.scId, title:T.sc.t, ja:T.sc.ja, level:T.level, goalMet:T.goalMet, review:null,
    msgs:T.msgs.filter(m => m.who !== 'sys').slice(-60).map(m => m.who === 'me' ? {who:'me', text:m.text, fb:m.fb || null} : {who:'ai', ja:m.data.ja, en:m.data.en})};
}
/* starting a new chat never silently throws away the old one: it goes to Past sessions */
function archiveTalk(T) {
  if (!T || !T.msgs.some(m => m.who === 'me')) return;
  if (T.ctl) T.ctl.abort();
  Store.putTalk(talkRecord(T)); S.stats.sessions++; saveState();
}
function talkSetup(id) {
  const sc = scenarioFor(id); if (!sc) return;
  const lvl = sc.gram ? levelAtLeast(S.settings.level, sc.minLv || sc.lv) : S.settings.level; const reg = sc.reg || 'auto';
  const body = `<div><p class="eyebrow">${sc.cat} · ${sc.lv === 'any' ? 'Any level' : 'Suggested ' + sc.lv}</p><h3 lang="ja">${ruby(sc.ja)}</h3><p class="muted">${esc(sc.t)}</p></div>
  ${AI === 'off' ? AI_OFF_NOTE : ''}
  ${id === 'custom' ? `<label class="field"><span>Describe the scene</span><textarea id="customScene" placeholder="e.g. I'm at a ramen shop and can't read the ticket machine. The owner comes over to help.">${esc(S.settings.customScene || '')}</textarea></label>` : `<dl class="brief"><dt>Setting</dt><dd>${esc(sc.set)}</dd><dt>You're talking to</dt><dd>${esc(sc.p)}</dd><dt>Your goal</dt><dd>${esc(sc.goal)}</dd></dl>`}
  <label class="field"><span>Japanese level for this chat</span><select id="tsLevel">${LEVEL_OPTS.map(([v, l]) => `<option value="${v}" ${v === lvl ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
  <label class="field"><span>Speech style</span><select id="tsReg">${REG_OPTS.map(([v, l]) => `<option value="${v}" ${v === reg ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
  <p class="muted small">Type in Japanese, romaji, or English. Start a message with <b>?</b> to ask the tutor a question in English without breaking the scene.</p>
  ${TALK && TALK.msgs.some(m => m.who === 'me') ? `<p class="muted small">Your conversation in progress (${esc(TALK.sc.t)}) will be saved to Past sessions.</p>` : ''}
  <div class="row"><button class="btn" data-action="talk-start" data-sc="${id}" ${AI === 'off' ? 'disabled' : ''}>Start conversation</button>${S.stamps[id] ? `<span class="muted small">Stamp collected ${esc(S.stamps[id])}</span>` : ''}${sc.gram && S.gram[sc.gram] ? '<span class="muted small">Already marked learned</span>' : ''}</div>`;
  openSheet(sc.gram ? 'Grammar practice' : 'Conversation', body, 'setup:' + id);
}
function talkStart(id) {
  const sc = scenarioFor(id); if (!sc) return;
  let setting = sc.set;
  if (id === 'custom') {
    const txt = ($('#customScene') ? $('#customScene').value : '').trim();
    if (!txt) { toast('Describe the scene first.'); if ($('#customScene')) $('#customScene').focus(); return; }
    setting = txt; S.settings.customScene = txt; saveState();
  }
  archiveTalk(TALK);
  TALK = { id:'t' + Date.now().toString(36), scId:id, sc, level:($('#tsLevel') || {}).value || S.settings.level, reg:($('#tsReg') || {}).value || sc.reg || 'auto', setting, turns:[], msgs:[], sugs:[], goalMet:false, startedAt:Date.now(), busy:false, error:null };
  closeSheet(); UI.inChat = true; VIEW = 'talk'; render(); saveDraft(); askPartner();
}
function rulesFor(T) {
  const sc = T.sc; const beginner = T.level === 'kana' || T.level === 'N5';
  return `You are a Japanese conversation partner inside a language-learning app. Role-play the scene below naturally and help the learner improve.

SCENE: ${sc.id === 'custom' ? 'Described by the learner: ' + T.setting : sc.t + '. ' + T.setting}
YOU PLAY: ${sc.p}
THE LEARNER PLAYS: ${sc.me}
LEARNER'S GOAL: ${sc.goal}${sc.gram ? `
TARGET GRAMMAR: ${GR[sc.gram].p} (${GR[sc.gram].m}). Keep the chat natural, but steer it so the learner has reasons to use this pattern; if they avoid it, ask a question that invites it. Correct misuse of it in "feedback". Set "goal_met" once they have used it correctly in three of their own messages.` : ''}
LEARNER'S LEVEL: ${LEVEL_GUIDE[T.level] || LEVEL_GUIDE.N5}
SPEECH STYLE: ${REG_GUIDE[T.reg] || REG_GUIDE.auto}${T.reg === 'casual' ? `
CASUAL COACHING: The learner wants to sound like a local friend, not a textbook. If their message is grammatical but stiff for this relationship (です・ます with a close friend, full forms where people contract, textbook phrasing), keep "ok" true and put the natural casual version in "natural", with a few words in "explanation" on what makes it sound more natural. Suggestions should model natural casual speech.` : ''}${sc.extra ? '\nNOTE: ' + sc.extra : ''}

How to reply:
- "ja": your next line, in Japanese only, matched to the learner's level. ${sc.long ? 'When the learner sends an email, reply with a complete email (up to about 8 sentences).' : 'Keep it to 1–3 short sentences.'} Act like a real person in this setting and usually end with something the learner can respond to. Never break character in "ja".
- Furigana: write EVERY word containing kanji with its reading immediately after it in square brackets, e.g. 東京[とうきょう]に行[い]きます。 Never put brackets after kana. Use this format in "ja", "corrected", "natural", and every suggestion.
- "romaji": Hepburn romaji of "ja" with spaces between words (particles は→wa, へ→e, を→o).
- "en": a natural English translation of "ja".
- "feedback" on the learner's latest message: "ok" is true if it is correct and natural enough for their level; otherwise false, with "corrected" (their message fixed, keeping their meaning) and "explanation" (one or two plain English sentences on the most important issue). "natural" may offer a more natural phrasing, or "". ${beginner ? 'Be encouraging: only flag mistakes that change the meaning or break basic grammar.' : 'Point out grammar, word choice, and politeness-level mistakes.'} If the learner wrote in English or romaji, set ok to false, give the Japanese in "corrected", and continue as if they had said it in Japanese.
- If the learner's message starts with "?", it is an out-of-character question for you as a tutor: answer it briefly in English in "aside", set "feedback" to null, and keep "ja" as a short line that continues the scene.
- "suggestions": 3 short, different replies the learner could say next, at their level, each with English.
- "goal_met": true only once the learner has clearly achieved the goal in Japanese during this conversation.

Reply with only this JSON object:
{"feedback":{"ok":true,"corrected":"","explanation":"","natural":""},"ja":"","romaji":"","en":"","suggestions":[{"ja":"","en":""}],"goal_met":false,"aside":""}`;
}
const OPENING = '\n\nStart the scene now with your opening line. For this first reply only there is no learner message, so set "feedback" to null. Every later user message is the learner speaking to you in the scene.';
function normReply(r) {
  r = (r && typeof r === 'object' && !Array.isArray(r)) ? r : {};
  const s = v => (typeof v === 'string' ? v : '');
  let fb = null;
  if (r.feedback && typeof r.feedback === 'object') fb = {ok:!!r.feedback.ok, corrected:s(r.feedback.corrected), explanation:s(r.feedback.explanation), natural:s(r.feedback.natural)};
  const sugs = Array.isArray(r.suggestions) ? r.suggestions.filter(x => x && typeof x.ja === 'string' && x.ja.trim()).slice(0, 4).map(x => ({ja:x.ja, en:s(x.en)})) : [];
  return {feedback:fb, ja:s(r.ja), romaji:s(r.romaji), en:s(r.en), suggestions:sugs, goal_met:!!r.goal_met, aside:s(r.aside)};
}
function partialJa(raw) {
  const m = String(raw).match(/"ja"\s*:\s*"((?:[^"\\]|\\.)*)/); if (!m) return '';
  let s = m[1].replace(/\\$/, '');
  try { s = JSON.parse('"' + s + '"'); } catch (e) {}
  return s.replace(/[\[［][^\]］]*[\]］]?/g, '');
}
const trimTurns = turns => turns.length <= 31 ? turns : [turns[0]].concat(turns.slice(-30));
async function askPartner() {
  const T = TALK; if (!T || T.busy) return;
  T.error = null; T.busy = true; renderMsgs(); updateComposer();
  const sample = await getSample();
  if (TALK !== T) return;
  if (!sample) { T.busy = false; T.error = {msg:aiError({code:'not_granted'}), retry:false}; renderMsgs(); updateComposer(); return; }
  if (!T.turns.length) T.turns.push({role:'user', content:rulesFor(T) + OPENING});
  T.ctl = new AbortController();
  try {
    const r = await sample.json(trimTurns(T.turns), {
      modelTier: S.settings.speed === 'default' ? 'default' : 'quick', cache:false, signal:T.ctl.signal,
      onText: ({text}) => { const el = $('#partial'); if (el && TALK === T) { el.textContent = partialJa(text); scrollChat(); } }
    });
    if (TALK !== T) return;
    const d = normReply(r);
    if (!d.ja && !d.aside) throw {code:'invalid_json'};
    T.turns.push({role:'assistant', content:JSON.stringify(d)});
    if (d.feedback) { for (let i = T.msgs.length - 1; i >= 0; i--) { if (T.msgs[i].who === 'me') { if (!T.msgs[i].fb) T.msgs[i].fb = d.feedback; break; } } }
    T.msgs.push({who:'ai', data:{ja:d.ja, romaji:d.romaji, en:d.en, aside:d.aside}});
    T.sugs = d.suggestions;
    if (d.goal_met && !T.goalMet && T.msgs.some(m => m.who === 'me')) {
      T.goalMet = true; let first;
      if (T.sc.gram) { first = !S.gram[T.sc.gram]; if (first) S.gram[T.sc.gram] = today(); }
      else { first = !S.stamps[T.scId]; if (first) S.stamps[T.scId] = today(); }
      T.msgs.push({who:'sys', kind:'goal', first});
      updateGoalBar();
    }
    S.stats.turns++; markDay(); saveState();
    if ((S.settings.autoplay || (S.settings.listen && TTS.ok)) && d.ja) TTS.speak(d.ja);
  } catch (e) {
    if (TALK !== T) return;
    T.error = {msg:aiError(e), retry:!OFF_CODES.includes(e && e.code)};
  } finally {
    if (TALK === T) { T.busy = false; T.ctl = null; renderMsgs(); updateComposer(); saveDraft(); renderTop(); }
  }
}
function talkSend() {
  const T = TALK; const el = $('#talkInput'); if (!T || !el || T.busy) return;
  const text = el.value.trim(); if (!text) return;
  el.value = ''; autosize(el); $('#sugs').hidden = true;
  T.msgs.push({who:'me', text}); T.turns.push({role:'user', content:text}); T.sugs = [];
  saveDraft();
  askPartner();
}
/* word-by-word breakdown of one partner line, shown under the bubble */
async function explainLine(i) {
  const T = TALK; const m = T && T.msgs[i]; if (!m || m.who !== 'ai' || !m.data.ja || m.explaining) return;
  if (m.explain && !m.explain.error) { m.explainOpen = !m.explainOpen; renderMsgs(true); return; }
  const sample = await getSample(); if (!sample) { toast(aiError({code:'not_granted'})); return; }
  m.explaining = true; m.explainOpen = true; m.explain = null; renderMsgs(true);
  try { m.explain = normExplain(await sample.json(explainPrompt(m.data.ja, m.data.en, T.level, 'a reply'), {modelTier:'quick', cache:{gcTime:86400000}})); }
  catch (e) { m.explain = {error:aiError(e)}; }
  finally { m.explaining = false; if (TALK === T) { renderMsgs(true); saveDraft(); } }
}
/* shared by conversation lines and reading sentences */
function explainPrompt(ja, en, lvl, useFor) {
  return `Break down this Japanese line for an English-speaking learner at level: ${levelLabel(lvl)}.
Line: ${plain(ja)}${en ? '\nTranslation: ' + en : ''}
Write Japanese with furigana for every kanji word in this format: kanji followed immediately by its reading in square brackets, e.g. 漢字[かんじ].
Reply with only this JSON object:
{"words":[{"w":"word or particle as it appears","base":"dictionary form if different, else empty","m":"meaning or grammatical role"}],"grammar":["short notes on each grammar pattern used"],"tip":"one short tip for using this in ${useFor || 'your own sentences'}"}
List the meaningful words and particles in order (at most 14).`;
}
function normExplain(r) {
  const s = v => (typeof v === 'string' ? v : '');
  return { words:(Array.isArray(r && r.words) ? r.words : []).filter(x => x && typeof x.w === 'string').slice(0, 16).map(x => ({w:x.w, base:s(x.base), m:s(x.m)})),
    grammar:(Array.isArray(r && r.grammar) ? r.grammar : []).filter(x => typeof x === 'string').slice(0, 5), tip:s(r && r.tip) };
}
const THINKING = label => `<div class="thinking"><span class="dots"><i></i><i></i><i></i></span><span>${esc(label)}</span></div>`;
function explainBody(x, addAttrs) {
  if (x.error) return `<div class="explain"><p>${esc(x.error)}</p></div>`;
  return `<div class="explain"><ul class="xwords">${x.words.map((w, j) => `<li><span class="xw" lang="ja">${ruby(w.w)}${w.base ? ` <small>(${ruby(w.base)})</small>` : ''}</span><span class="xm">${esc(w.m)}</span><button class="mt" ${addAttrs(j)} title="Add to My cards" aria-label="Add ${esc(plain(w.base || w.w))} to My cards">+ Card</button></li>`).join('')}</ul>
  ${x.grammar.length ? `<ul class="xgram">${x.grammar.map(g => `<li>${ruby(g)}</li>`).join('')}</ul>` : ''}${x.tip ? `<p class="xtip"><b>Tip</b> ${ruby(x.tip)}</p>` : ''}</div>`;
}
function explainHTML(m, i) {
  if (!m.explainOpen) return '';
  if (m.explaining) return `<div class="explain">${THINKING('Breaking it down…')}</div>`;
  return m.explain ? explainBody(m.explain, j => `data-action="explain-add" data-i="${i}" data-j="${j}"`) : '';
}
function chatHTML() {
  const T = TALK; const sc = T.sc;
  const regL = (REG_OPTS.find(r => r[0] === T.reg) || REG_OPTS[0])[1];
  const listen = S.settings.listen && TTS.ok;
  return `<div class="chat ${S.settings.romaji ? '' : 'no-romaji'} ${S.settings.en ? '' : 'no-en'} ${listen ? 'listen' : ''}" id="chat">
    <div class="chat-head">
      <button class="icon-btn" data-action="talk-exit" aria-label="Back to scenarios">${ICON.back}</button>
      <div class="ch-title"><b lang="ja">${ruby(sc.ja)}</b><span>${esc(sc.t)} · ${esc(levelLabel(T.level))} · ${esc(regL)}</span></div>
      <button class="btn sm" data-action="talk-wrap">Finish and review</button>
      <div class="ch-tools">
        <button class="tog ${S.settings.furi ? 'on' : ''}" data-action="tog" data-k="furi" aria-pressed="${S.settings.furi}" lang="ja">ふりがな</button>
        <button class="tog ${S.settings.romaji ? 'on' : ''}" data-action="tog" data-k="romaji" aria-pressed="${S.settings.romaji}">Romaji</button>
        <button class="tog ${S.settings.en ? 'on' : ''}" data-action="tog" data-k="en" aria-pressed="${S.settings.en}">English</button>
        ${TTS.ok ? `<button class="tog ${listen ? 'on' : ''}" data-action="tog" data-k="listen" aria-pressed="${listen}" title="Replies are read aloud and their text stays hidden until you tap it">Listen first</button>` : ''}
      </div>
    </div>
    <button class="goalbar ${T.goalMet ? 'met' : ''}" id="goalbar" data-action="goal-expand" aria-label="Goal: ${esc(sc.goal)}"><b>${T.goalMet ? 'Goal ✓' : 'Goal'}</b><span>${esc(sc.goal)}</span></button>
    <div class="chat-body" id="chatBody"><div class="chat-inner" id="chatInner" role="log" aria-live="polite" aria-label="Conversation"></div></div>
    <div class="composer"><div class="comp-inner">
      <div class="sugs" id="sugs" hidden></div>
      <div class="comp-row"><label class="sr" for="talkInput">Your message</label><textarea id="talkInput" rows="1" lang="ja" placeholder="${S.settings.ime ? 'Type romaji, it becomes kana…' : 'Reply in Japanese, romaji, or English…'}"></textarea><button class="btn" id="sendBtn" data-action="talk-send" aria-label="Send">${ICON.send}<span>Send</span></button></div>
      <div class="comp-tools">
        <button class="tog ${S.settings.ime ? 'on' : ''}" data-action="tog-ime" aria-pressed="${S.settings.ime}" ${WK() ? '' : 'disabled'} title="Convert romaji to kana as you type"><span lang="ja">あ</span> Romaji → kana</button>
        <button class="tog" id="hintBtn" data-action="hints">Help me reply</button>
        <span class="hint">Start with ? to ask the tutor in English · Enter to send, Shift+Enter for a new line</span>
      </div>
    </div></div>
  </div>`;
}
function msgHTML(m, i) {
  const T = TALK;
  if (m.who === 'ai') {
    const d = m.data;
    return `<div class="msg ai ${m.shown ? 'shown' : ''}"><p class="who" lang="ja">${ruby(T.sc.who)}</p>
      ${d.ja ? `<div class="bubble"><p class="ja" lang="ja">${ruby(d.ja)}</p>${d.romaji ? `<p class="rom">${esc(d.romaji)}</p>` : ''}${d.en ? `<p class="en${m.showEn ? ' shown' : ''}">${esc(d.en)}</p>` : ''}</div>
      <div class="mtools">${TTS.ok ? `<button class="mt" data-action="say" data-i="${i}">${ICON.speak} Listen</button>` : ''}<button class="mt only-listen" data-action="show-text" data-i="${i}">Show text</button>${d.en ? `<button class="mt only-no-en" data-action="reveal-en" data-i="${i}">Show English</button>` : ''}<button class="mt" data-action="explain" data-i="${i}" aria-expanded="${!!m.explainOpen}">${m.explainOpen && m.explain && !m.explain.error ? 'Hide breakdown' : 'Explain'}</button></div>${explainHTML(m, i)}` : ''}
      ${d.aside ? `<div class="aside"><b>Tutor note</b><p>${ruby(d.aside)}</p></div>` : ''}</div>`;
  }
  if (m.who === 'me') return `<div class="msg me"><div class="bubble" lang="ja">${esc(m.text)}</div>${fbHTML(m.fb)}</div>`;
  if (m.kind === 'goal') {
    const sc = T.sc;
    if (sc.gram) return `<div class="msg sys"><div class="goalmsg"><span class="check on" aria-hidden="true">✓</span><div><b>Goal reached.</b><p>You used <span lang="ja">${esc(GR[sc.gram].p)}</span> correctly three times${m.first ? ', so it is now marked learned' : ''}. Keep going, or finish for a review.</p></div></div></div>`;
    const got = S.stamps[sc.id] || today();
    return `<div class="msg sys"><div class="goalmsg"><span class="stamp" style="--rot:-8deg"><span class="s1">日本語線</span><span class="s2" lang="ja">${esc(plain(sc.ja))}</span><span class="s3">${esc(got.replace(/-/g, '.'))}</span></span><div><b>Goal reached.</b><p>${m.first ? 'Stamp collected for this scene. ' : ''}Keep chatting, or finish for a review of your Japanese.</p></div></div></div>`;
  }
  return '';
}
function fbHTML(fb) {
  if (!fb) return '';
  if (fb.ok) return `<div class="fb ok"><b>✓ Natural</b>${fb.explanation ? ' ' + esc(fb.explanation) : ''}${fb.natural ? `<p>Also: <span class="ja" lang="ja">${ruby(fb.natural)}</span></p>` : ''}</div>`;
  return `<div class="fb fix"><b>Try this</b>${fb.corrected ? `<p class="ja" lang="ja">${ruby(fb.corrected)}</p>` : ''}${fb.explanation ? `<p>${esc(fb.explanation)}</p>` : ''}${fb.natural ? `<p>More natural: <span class="ja" lang="ja">${ruby(fb.natural)}</span></p>` : ''}</div>`;
}
function renderMsgs(keepScroll) {
  const T = TALK; const box = $('#chatInner'); if (!T || !box) return;
  const body = $('#chatBody'); const y = body ? body.scrollTop : 0;
  let html = T.msgs.map(msgHTML).join('');
  if (T.busy) html += `<div class="msg ai" id="typing"><p class="who" lang="ja">${ruby(T.sc.who)}</p><div class="bubble"><span class="dots" aria-label="Typing"><i></i><i></i><i></i></span><p class="partial" lang="ja" id="partial"></p></div><div class="mtools"><button class="mt" data-action="talk-stop">Stop</button></div></div>`;
  if (T.error) html += `<div class="msg sys err"><span>${esc(T.error.msg)}</span>${T.error.retry ? '<button class="btn sm ghost" data-action="talk-retry">Try again</button>' : ''}</div>`;
  if (!T.msgs.length && !T.busy && !T.error) html += '<div class="msg sys">Starting the scene…</div>';
  box.innerHTML = html;
  if (keepScroll && body) body.scrollTop = y; else scrollChat();
}
function scrollChat() { const b = $('#chatBody'); if (b) b.scrollTop = b.scrollHeight; }
function updateComposer() {
  const T = TALK; const btn = $('#sendBtn'); if (!btn || !T) return;
  btn.disabled = !!T.busy; const h = $('#hintBtn'); if (h) h.disabled = !T.sugs || !T.sugs.length;
}
function updateGoalBar() { const g = $('#goalbar'); if (g && TALK) { g.classList.toggle('met', TALK.goalMet); g.querySelector('b').textContent = TALK.goalMet ? 'Goal ✓' : 'Goal'; } }
function afterChatRender(prev) {
  const el = $('#talkInput'); if (!el) return;
  if (prev) { el.value = prev; autosize(el); }
  bindIME(el); renderMsgs(); updateComposer();
  if (window.matchMedia('(min-width: 860px)').matches) el.focus();
}
function bindIME(el) { const w = WK(); if (!w || !el) return; try { w.unbind(el); } catch (e) {} if (S.settings.ime) { try { w.bind(el, {IMEMode:true}); } catch (e) {} } }
function autosize(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight + 2, 150) + 'px'; }
function showSugs() {
  const T = TALK; const box = $('#sugs'); if (!T || !box) return;
  if (!box.hidden) { box.hidden = true; return; }
  if (!T.sugs || !T.sugs.length) return;
  box.innerHTML = T.sugs.map((s, i) => `<button class="sug" data-action="use-sug" data-i="${i}"><span lang="ja">${ruby(s.ja)}</span><small>${esc(s.en)}</small></button>`).join('');
  box.hidden = false; scrollChat();
}
async function talkWrap() {
  const T = TALK; if (!T) return;
  if (T.ctl) T.ctl.abort();
  const mine = T.msgs.filter(m => m.who === 'me');
  if (!mine.length) { TALK = null; saveDraft(); UI.inChat = false; render(); toast('Conversation closed.'); return; }
  const rec = talkRecord(T);
  S.stats.sessions++; saveState();
  TALK = null; saveDraft(); UI.inChat = false;
  const saved = Store.putTalk(rec);
  render();
  saved.then(() => { if (VIEW === 'talk' && !UI.inChat) loadHistory(); });
  openSheet('Session review', `<div class="thinking"><span class="dots"><i></i><i></i><i></i></span><span>Claude is reviewing your conversation. This can take up to a minute.</span></div><div class="row"><button class="btn ghost sm" data-action="wrap-stop">Skip the review</button></div>`, 'wrap');
  await runReview(rec);
}
async function runReview(rec) {
  const sample = await getSample();
  if (!sample) { renderReview(rec, aiError({code:'not_granted'})); return; }
  const sc = scenarioFor(rec.sc) || {t:rec.title, goal:''};
  const lines = rec.msgs.map(m => m.who === 'me' ? 'Learner: ' + m.text : 'Partner: ' + plain(m.ja)).join('\n').slice(-12000);
  const prompt = `Review this Japanese conversation practice session for an English-speaking learner at level: ${levelLabel(rec.level)}. Scenario: ${sc.t}. Goal: ${sc.goal} ${rec.goalMet ? '(The goal was reached.)' : '(The goal was not reached yet.)'}

Transcript:
${lines}

Write Japanese with furigana for every kanji word in this format: kanji followed immediately by its reading in square brackets, e.g. 漢字[かんじ].
Reply with only this JSON object:
{"score":3,"summary":"2-3 encouraging, specific sentences in English","strengths":["..."],"fixes":[{"you":"what the learner wrote","better":"improved Japanese","why":"short reason"}],"vocab":[{"w":"word or phrase in Japanese","m":"English meaning"}],"next":"one concrete tip for next time"}
"score" is 1-5 for how well the learner communicated at their level. Give 2-3 strengths, up to 5 fixes (most important first, or [] if none), and 4-8 useful words or phrases from this conversation worth memorizing.`;
  WRAP_CTL = new AbortController();
  try {
    const r = await sample.json(prompt, {modelTier:'default', signal:WRAP_CTL.signal});
    const rv = normReview(r); rec.review = rv; Store.putTalk(rec); renderReview(rec);
  } catch (e) {
    if (e && e.code === 'cancelled') { if (SHEET === 'wrap') closeSheet(); toast('Session saved without a review.'); return; }
    renderReview(rec, aiError(e));
  } finally { WRAP_CTL = null; }
}
function normReview(r) {
  r = (r && typeof r === 'object') ? r : {}; const s = v => (typeof v === 'string' ? v : '');
  const arr = v => (Array.isArray(v) ? v : []);
  return { score:Math.max(1, Math.min(5, Number(r.score) || 3)), summary:s(r.summary), next:s(r.next),
    strengths:arr(r.strengths).filter(x => typeof x === 'string').slice(0, 4),
    fixes:arr(r.fixes).filter(x => x && typeof x === 'object').slice(0, 6).map(x => ({you:s(x.you), better:s(x.better), why:s(x.why)})),
    vocab:arr(r.vocab).filter(x => x && typeof x.w === 'string' && x.w.trim()).slice(0, 10).map(x => ({w:x.w, m:s(x.m)})) };
}
function renderReview(rec, err) {
  if (SHEET !== 'wrap' && SHEET !== 'history') return;
  LAST_REVIEW = rec;
  const sc = scenarioFor(rec.sc);
  const rv = rec.review;
  let html = `<div><p class="eyebrow">${esc(rec.title)} · ${new Date(rec.at).toLocaleDateString()}</p><h3 lang="ja">${ruby(rec.ja || '')}</h3>${rec.goalMet ? '<p class="muted small">Goal reached in this session.</p>' : ''}</div>`;
  if (err) html += `<div class="notice">${esc(err)} Your conversation was saved.</div><div class="row">${AI === 'off' ? '' : '<button class="btn ghost sm" data-action="review-retry">Try the review again</button>'}</div>`;
  if (rv) {
    html += `<div class="score" aria-label="Score ${rv.score} of 5">${[1,2,3,4,5].map(n => `<i class="${n <= rv.score ? 'on' : ''}"></i>`).join('')}</div>
    ${rv.summary ? `<p>${esc(rv.summary)}</p>` : ''}
    ${rv.strengths.length ? `<h4>What went well</h4><ul>${rv.strengths.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${rv.fixes.length ? `<h4>Fix these</h4><ul class="fixes">${rv.fixes.map(f => `<li>${f.you ? `<span class="you">${esc(f.you)}</span>` : ''}<span class="better" lang="ja">${ruby(f.better)}</span>${f.why ? `<span class="why">${esc(f.why)}</span>` : ''}</li>`).join('')}</ul>` : ''}
    ${rv.next ? `<h4>Next time</h4><p>${esc(rv.next)}</p>` : ''}
    ${rv.vocab.length ? `<h4>Words from this chat</h4><ul class="genlist">${rv.vocab.map((v, i) => `<li><label for="rv_${i}"><input type="checkbox" id="rv_${i}" checked><span class="gw" lang="ja">${ruby(v.w)}</span><span class="gx">${esc(v.m)}</span></label></li>`).join('')}</ul><div class="row"><button class="btn" data-action="review-add">Add checked words to My cards</button></div>` : ''}`;
  }
  html += `<div class="row">${sc ? `<button class="btn ghost" data-action="talk-setup" data-sc="${sc.id}">Practise this scene again</button>` : ''}</div>`;
  if (rec.msgs && rec.msgs.length) html += `<details><summary class="muted small" style="cursor:pointer">Transcript</summary><div class="transcript">${rec.msgs.map(m => m.who === 'me' ? `<p><b>YOU</b><span lang="ja">${esc(m.text)}</span></p>` : `<p><b>THEM</b><span lang="ja">${ruby(m.ja)}</span></p>`).join('')}</div></details>`;
  $('#sheetBody').innerHTML = html;
}

/* ---------- KANA ---------- */
function kanaTile(kid) {
  const k = S.kana[kid] || {s:0}; const s = Math.min(3, k.s || 0); const m = kanaMastered(kid);
  return `<button class="kt ${m ? 'm' : ''}" data-action="kana-tap" data-id="${kid}" aria-label="${esc(kanaChar(kid))} ${esc(kanaRom(kid))}${m ? ', mastered' : ''}"><span class="kc" lang="ja">${kanaChar(kid)}</span><span class="kr">${kanaRom(kid)}</span><span class="ks"><i class="${s >= 1 ? 'on' : ''}"></i><i class="${s >= 2 ? 'on' : ''}"></i><i class="${s >= 3 ? 'on' : ''}"></i></span></button>`;
}
function gridHTML(rows, sc, cols) {
  return `<div class="kgrid ${cols === 3 ? 'c3' : ''}">${rows.map(r => r.map(id => id ? kanaTile(sc + '_' + id) : '<span class="kblank"></span>').join('')).join('')}</div>`;
}
VIEWS.kana = () => {
  const sc = UI.kanaScript;
  const extRows = []; for (let i = 0; i < EXT.length; i += 3) extRows.push(EXT.slice(i, i + 3).map(e => e[0]));
  const secs = [['Basic', '清音[せいおん]', GOJUON, 5], ['Voiced', '濁音[だくおん]', DAKU, 5], ['Combined', '拗音[ようおん]', YOON, 3]];
  if (sc === 'k') secs.push(['Loanword sounds', '外来音[がいらいおん]', extRows, 3]);
  const groups = sc === 'h' ? ['hA','hB','hD','hY'] : ['kA','kX'];
  const mastered = groups.flatMap(g => KANA_GROUPS[g]).filter(kanaMastered).length; const total = groups.flatMap(g => KANA_GROUPS[g]).length;
  return `<header class="vh"><h1 class="vt"><span lang="ja">かな</span><small>Hiragana and katakana</small></h1>
  <p class="lede">Tap a character to hear it. Drill a group until its tiles fill in: three correct answers in a row masters a character and moves the Kana Line forward.</p></header>
  <div class="row"><div class="seg" role="tablist"><button class="${sc === 'h' ? 'on' : ''}" data-action="kana-script" data-s="h" role="tab" aria-selected="${sc === 'h'}"><span lang="ja">ひらがな</span>Hiragana</button><button class="${sc === 'k' ? 'on' : ''}" data-action="kana-script" data-s="k" role="tab" aria-selected="${sc === 'k'}"><span lang="ja">カタカナ</span>Katakana</button></div><span class="muted small">${mastered}/${total} mastered</span></div>
  <div class="kana-layout"><div class="sec">${secs.map(([en, ja, rows, cols]) => `<section class="sec"><h2 class="sh"><span lang="ja">${ruby(ja)}</span> ${en}</h2>${gridHTML(rows, sc, cols)}</section>`).join('')}</div>
  <aside class="drill" id="drill">${drillHTML()}</aside></div>`;
};
function drillHTML() {
  const sc = UI.kanaScript; const groups = sc === 'h' ? ['hA','hB','hD','hY'] : ['kA','kX'];
  if (!UI.drillGroups || !UI.drillGroups.length || !UI.drillGroups.every(g => groups.includes(g))) {
    const first = groups.find(g => KANA_GROUPS[g].some(k => !kanaMastered(k))) || groups[0]; UI.drillGroups = [first];
  }
  if (!DR) {
    return `<h3>Drill</h3><p class="muted small">Pick the groups to practise.</p>
    <div class="chips">${groups.map(g => { const on = UI.drillGroups.includes(g); const m = KANA_GROUPS[g].filter(kanaMastered).length; return `<button class="tog ${on ? 'on' : ''}" data-action="drill-group" data-g="${g}" aria-pressed="${on}"><span lang="ja">${esc(GROUP_LABEL[g])}</span> · ${m}/${KANA_GROUPS[g].length}</button>`; }).join('')}</div>
    <p class="muted small">Answer by</p>
    <div class="chips"><button class="tog ${UI.drillMode === 'choose' ? 'on' : ''}" data-action="drill-mode" data-m="choose">Kana → romaji</button><button class="tog ${UI.drillMode === 'reverse' ? 'on' : ''}" data-action="drill-mode" data-m="reverse">Romaji → kana</button><button class="tog ${UI.drillMode === 'type' ? 'on' : ''}" data-action="drill-mode" data-m="type">Type the romaji</button></div>
    <p class="muted small">Keys 1–4 pick an answer; Enter moves on after a miss.</p>
    <button class="btn" data-action="drill-start">Start 20 questions</button>`;
  }
  if (DR.finished) {
    const pct = Math.round(DR.right / Math.max(1, DR.right + DR.wrong) * 100);
    return `<h3>Round complete</h3><div class="big">${pct}<small>% correct</small></div><p class="muted">${DR.right} right, ${DR.wrong} to review.${DR.missed.size ? ' Missed: <span lang="ja">' + Array.from(DR.missed).map(kanaChar).join(' ') + '</span>' : ''}</p>
    <div class="row"><button class="btn" data-action="drill-start">Go again</button><button class="btn ghost" data-action="drill-stop">Change groups</button></div>`;
  }
  const q = DR.q; const ans = DR.answered;
  let inner = '';
  const rev = DR.mode === 'reverse';
  if (DR.mode === 'choose' || rev) {
    inner = `<div class="dopts">${DR.opts.map((o, n) => { let cls = ''; if (ans) { if (o === q) cls = 'right'; else if (o === ans.pick) cls = 'wrong'; } return `<button class="dopt ${cls} ${rev ? 'kana' : ''}" data-action="drill-opt" data-k="${o}" ${ans ? 'disabled' : ''} aria-keyshortcuts="${n + 1}"${rev ? ' lang="ja"' : ''}>${rev ? kanaChar(o) : kanaRom(o)}</button>`; }).join('')}</div>`;
  } else {
    inner = `<label class="sr" for="drillInput">Romaji</label><input class="dinput" id="drillInput" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="type romaji" ${ans ? 'disabled' : ''} value="${ans ? esc(ans.val) : ''}">${ans ? '' : '<button class="btn" data-action="drill-check">Check</button>'}`;
  }
  const res = ans ? (ans.ok ? `<p class="dres ok">Correct: <span lang="ja">${kanaChar(q)}</span> = ${kanaRom(q)}</p>` : `<p class="dres no"><span lang="ja">${kanaChar(q)}</span> is “${kanaRom(q)}”</p><button class="btn" data-action="drill-next" id="drillNext">Next</button>`) : '';
  return `<div class="row" style="justify-content:space-between"><h3>Drill</h3><span class="kbd">${DR.n} / ${DR.total}</span></div>
  <div class="dprog"><i style="width:${DR.n / DR.total * 100}%"></i></div>
  ${rev ? `<div class="dk rom">${kanaRom(q)}</div>` : `<div class="dk" lang="ja">${kanaChar(q)}</div>`}${inner}${res}
  <div class="row" style="justify-content:space-between">${TTS.ok ? `<button class="mt" data-action="say-text" data-t="${esc(kanaChar(q))}">${ICON.speak} Hear it</button>` : '<span></span>'}<button class="mt" data-action="drill-stop">End round</button></div>`;
}
function renderDrill() { const el = $('#drill'); if (!el) return; el.innerHTML = drillHTML(); const inp = $('#drillInput'); if (inp && !inp.disabled) inp.focus(); const nx = $('#drillNext'); if (nx) nx.focus(); }
function drillStart() {
  const pool = UI.drillGroups.flatMap(g => KANA_GROUPS[g]);
  DR = {pool, mode:UI.drillMode, n:0, total:20, right:0, wrong:0, missed:new Set(), q:null, last:null, answered:null};
  drillNext();
}
function drillNext() {
  if (!DR) return;
  if (DR.n >= DR.total) { DR.finished = true; renderDrill(); return; }
  const cand = DR.pool.filter(k => k !== DR.last);
  const weights = cand.map(k => 4 - Math.min(3, (S.kana[k] || {s:0}).s || 0));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0); let q = cand[0];
  for (let i = 0; i < cand.length; i++) { r -= weights[i]; if (r <= 0) { q = cand[i]; break; } }
  DR.q = q; DR.last = q; DR.answered = null; DR.n++;
  if (DR.mode === 'choose' || DR.mode === 'reverse') {
    const others = shuffle(KANA_GROUPS[UI.drillGroups[0]].concat(DR.pool).filter(k => kanaRom(k) !== kanaRom(q)));
    const seen = new Set([kanaRom(q)]); const opts = [q];
    for (const k of others) { if (opts.length >= 4) break; if (!seen.has(kanaRom(k))) { seen.add(kanaRom(k)); opts.push(k); } }
    DR.opts = shuffle(opts);
  }
  renderDrill();
}
function drillAnswer(ok, extra) {
  const q = DR.q; const k = S.kana[q] || {c:0, w:0, s:0};
  if (ok) { k.c++; k.s++; if (k.s >= 3) k.m = 1; DR.right++; } else { k.w++; k.s = 0; DR.wrong++; DR.missed.add(q); }
  S.kana[q] = k; S.stats.kana++; markDay(); saveState(1800);
  DR.answered = Object.assign({ok}, extra);
  renderDrill();
  const tile = document.querySelector(`.kt[data-id="${q}"]`); if (tile) tile.outerHTML = kanaTile(q);
  if (ok) setTimeout(() => { if (DR && DR.q === q && DR.answered) drillNext(); }, 650);
}
function checkTyped() {
  const inp = $('#drillInput'); if (!inp || !DR) return;
  const v = inp.value.trim().toLowerCase(); if (!v) return;
  const id = kSplit(DR.q)[1]; const ok = v === kanaRom(DR.q) || v === id || (ALT[id] || []).includes(v);
  drillAnswer(ok, {val:inp.value});
}

/* ---------- CARDS ---------- */
VIEWS.cards = () => {
  const due = dueIds().length; const deck = S.settings.deck; const nl = Math.min(newLeft(), unseen(deck).length);
  const mature = Object.keys(S.srs).filter(id => IDX[id] && S.srs[id].i >= 21).length;
  return `<header class="vh"><h1 class="vt"><span lang="ja">単語</span><small>Spaced-repetition cards</small></h1>
  <p class="lede">Reviews come back just before you'd forget them. Grade each card honestly; easy cards drift weeks apart, missed ones return in minutes.</p></header>
  <div class="cstats"><div class="cstat"><b>${due}</b><span>Due now</span></div><div class="cstat"><b>${nl}</b><span>New today</span></div><div class="cstat"><b>${learnedCount()}</b><span>Learned</span></div><div class="cstat"><b>${mature}</b><span>Mature 21d+</span></div></div>
  <div class="deckbar"><span class="eyebrow">New cards from</span>${Object.keys(DECK_LABEL).map(d => `<button class="tog ${deck === d ? 'on' : ''}" data-action="deck" data-d="${d}" aria-pressed="${deck === d}">${DECK_LABEL[d]} <span class="muted">· ${(DECKS[d] || []).length}</span></button>`).join('')}</div>
  <div class="deckbar"><span class="eyebrow">Card front</span><button class="tog ${S.settings.cardDir !== 'en' ? 'on' : ''}" data-action="card-dir" data-d="jp" aria-pressed="${S.settings.cardDir !== 'en'}"><span lang="ja">日本語</span> → English</button><button class="tog ${S.settings.cardDir === 'en' ? 'on' : ''}" data-action="card-dir" data-d="en" aria-pressed="${S.settings.cardDir === 'en'}">English → <span lang="ja">日本語</span></button></div>
  <div class="review" id="review">${reviewHTML()}</div>
  <div class="row"><button class="btn ghost" data-action="gen-open" ${AI === 'off' ? 'disabled' : ''}>Make cards with Claude</button><button class="btn ghost" data-action="browse">Browse ${esc(DECK_LABEL[deck])}</button></div>
  ${AI === 'off' ? AI_OFF_NOTE : ''}`;
};
function reviewHTML() {
  if (!RV) {
    const due = dueIds().length; const nl = Math.min(newLeft(), unseen(S.settings.deck).length);
    if (due + nl > 0) return `<p class="eyebrow">Today's session</p><h3>${due} review${due === 1 ? '' : 's'} · ${nl} new</h3><p class="muted">Space shows the answer; 1–4 grades it.</p><button class="btn" data-action="rv-start">Start reviewing</button>`;
    const next = Object.values(S.srs).filter(c => c && c.d).map(c => c.d).sort((a, b) => a - b)[0];
    const empty = S.settings.deck === 'mine' && !DECKS.mine.length;
    return `<p class="eyebrow">All caught up</p><h3 lang="ja">お疲[つか]れ様[さま]でした</h3><p class="muted">${empty ? 'My cards is empty. Make a set with Claude, or add words from a conversation review.' : next ? 'Next review in ' + fmtIvl(next - Date.now()) + '.' : 'No reviews scheduled yet.'}${newLeft() === 0 ? ' You have used today\'s new-card allowance.' : ''}</p>`;
  }
  if (RV.cur && !IDX[RV.cur]) rvAdvance();
  if (!RV.cur) return `<p class="eyebrow">Session done</p><h3>${RV.done} card${RV.done === 1 ? '' : 's'} reviewed</h3><p class="muted">Nice work. Come back later for the next batch.</p><button class="btn ghost" data-action="rv-end">Back to overview</button>`;
  const c = IDX[RV.cur]; const prev = S.srs[c.id]; const now = Date.now();
  const recall = S.settings.cardDir === 'en';
  const top = `<div class="rvtop"><span>${prev ? 'REVIEW' : 'NEW'} · ${esc(DECK_LABEL[c.deck])}</span><span>${RV.queue.length + 1} left</span></div>`;
  if (!RV.revealed) {
    if (recall) return `${top}<div class="cprompt">${esc(c.m)}</div><p class="muted">${c.kind === 'k' ? 'Which kanji, and how is it read?' : 'Say it in Japanese, then check.'}</p><button class="btn" data-action="rv-reveal">Show answer <span class="kbd">space</span></button>`;
    return `${top}<div class="cfront" lang="ja">${esc(plain(c.w))}</div><p class="muted">${c.kind === 'k' ? 'Meaning and readings?' : 'Reading and meaning?'}</p><button class="btn" data-action="rv-reveal">Show answer <span class="kbd">space</span></button>`;
  }
  let back;
  if (c.kind === 'k') back = `<div class="cfront" lang="ja">${esc(c.w)}</div><p class="cmean">${esc(c.m)}</p><dl class="kread"><dt>On</dt><dd lang="ja">${esc(c.on)}</dd><dt>Kun</dt><dd lang="ja">${esc(c.kun)}</dd></dl>`;
  else back = `<div class="cword" lang="ja">${ruby(c.w)}</div>${S.settings.romaji && toRomaji(c.w) ? `<p class="crom">${esc(toRomaji(c.w))}</p>` : ''}<p class="cmean">${esc(c.m)}</p>${c.ex ? `<div class="cex"><p class="ja" lang="ja">${ruby(c.ex)}</p><p class="muted small">${esc(c.exen || '')}</p></div>` : ''}`;
  const grades = [[1,'Again'],[2,'Hard'],[3,'Good'],[4,'Easy']].map(([g, l]) => `<button class="grade g${g}" data-action="rv-grade" data-g="${g}">${l}<small>${fmtIvl(schedule(prev, g, now).d - now)} · ${g}</small></button>`).join('');
  return `${top}${back}${TTS.ok && c.kind === 'v' ? `<button class="mt" data-action="say-text" data-t="${esc(c.w)}">${ICON.speak} Listen</button>` : ''}<div class="grades">${grades}</div>`;
}
function renderReviewCard() { const el = $('#review'); if (el) el.innerHTML = reviewHTML(); }
function rvStart() {
  const due = dueIds(); const news = unseen(S.settings.deck).slice(0, newLeft());
  RV = {queue:due.concat(news), cur:null, revealed:false, done:0};
  rvAdvance(); render();
}
/* skip anything that left the index mid-session (e.g. My cards replaced by a sync) */
function rvAdvance() { do { RV.cur = RV.queue.shift() || null; } while (RV.cur && !IDX[RV.cur]); RV.revealed = false; }
function rvGrade(g) {
  if (!RV || !RV.cur || !RV.revealed) return;
  const id = RV.cur; const prev = S.srs[id]; const now = Date.now(); const c = schedule(prev, g, now);
  if (!prev) { if (S.newDay.d !== today()) S.newDay = {d:today(), n:0}; S.newDay.n++; }
  S.srs[id] = c; S.stats.reviews++; markDay(); saveState(1500); RV.done++;
  if (c.d - now < 20 * MIN) RV.queue.push(id);
  rvAdvance();
  if (!RV.cur) render(); else renderReviewCard();
  renderTop();
}
function openGen() {
  GEN = {topic:'', items:null};
  const lv = S.settings.level === 'kana' ? 'N5' : S.settings.level;
  openSheet('Make cards with Claude', `<p class="muted">Claude writes a set of words for your level and topic, each with an example sentence. Pick the ones you want.</p>
  <label class="field"><span>Level</span><select id="genLevel">${['N5','N4','N3','N2','N1'].map(l => `<option ${l === lv ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
  <div class="field"><span>Topic</span><div class="chips">${TOPICS.map(t => `<button class="tog" data-action="gen-topic" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
  <label class="field"><span>Or your own topic</span><input type="text" id="genTopic" placeholder="e.g. at the vet, car maintenance, emails to suppliers"></label>
  <div class="row"><button class="btn" data-action="gen-run" id="genRun">Generate 12 cards</button></div>
  <div id="genOut"></div>`, 'gen');
}
async function genRun() {
  const topic = ($('#genTopic').value || '').trim(); const lv = $('#genLevel').value; const out = $('#genOut');
  if (!topic) { toast('Pick or type a topic first.'); return; }
  const sample = await getSample(); if (!sample) { out.innerHTML = `<div class="notice">${esc(aiError({code:'not_granted'}))}</div>`; return; }
  $('#genRun').disabled = true;
  out.innerHTML = `<div class="thinking"><span class="dots"><i></i><i></i><i></i></span><span>Writing cards about ${esc(topic)}…</span></div>`;
  const core = topic === 'JLPT core words'; const casual = topic === 'Casual & slang';
  const exclude = (core ? Object.values(IDX).filter(c => c.kind === 'v').map(c => plain(c.w)).slice(-320) : CUSTOM.cards.slice(-120).map(c => plain(c.w))).join('、');
  const ask = core
    ? `Create 12 Japanese vocabulary flashcards with the next most important words from a typical JLPT ${lv} core vocabulary list: high-frequency words a ${lv} learner is expected to know.`
    : casual
    ? `Create 12 Japanese flashcards of casual spoken words and expressions that young adults in Japan really use with friends (contractions, slang, reactions, casual set phrases), suited to a learner around JLPT ${lv}. In "m", note any nuance or who uses it.`
    : `Create 12 Japanese vocabulary flashcards for a learner at JLPT ${lv} on the topic "${topic}". Choose common, useful words that suit that level${lv === 'N1' || lv === 'N2' ? ', including a few set phrases if useful' : ''}.`;
  const prompt = `${ask}${exclude ? ' Do not include any of these words: ' + exclude + '.' : ''}${casual ? ' Example sentences should be casual speech between friends.' : ''}
Write Japanese with furigana for every kanji word in this format: kanji followed immediately by its reading in square brackets, e.g. 漢字[かんじ].
Reply with only a JSON array, one object per card:
[{"w":"the word","m":"short English meaning","ex":"a short natural example sentence","exen":"its English translation"}]`;
  try {
    const r = await sample.json(prompt, {modelTier:'default', cache:false});
    if (SHEET !== 'gen' || !GEN) return;
    const items = (Array.isArray(r) ? r : []).filter(x => x && typeof x.w === 'string' && x.w.trim() && typeof x.m === 'string').slice(0, 20).map(x => ({w:x.w.trim(), m:x.m.trim(), ex:typeof x.ex === 'string' ? x.ex : '', exen:typeof x.exen === 'string' ? x.exen : '', t:topic, lv}));
    if (!items.length) throw {code:'invalid_json'};
    GEN.items = items;
    out.innerHTML = `<h4>${items.length} cards</h4><ul class="genlist">${items.map((it, i) => `<li><label for="gen_${i}"><input type="checkbox" id="gen_${i}" checked><span class="gw" lang="ja">${ruby(it.w)}</span><span class="gx">${esc(it.m)}${it.ex ? ' · <span lang="ja">' + ruby(it.ex) + '</span>' : ''}</span></label></li>`).join('')}</ul><div class="row"><button class="btn" data-action="gen-add">Add checked to My cards</button></div>`;
  } catch (e) { out.innerHTML = `<div class="notice">${esc(aiError(e))}</div>`; }
  finally { const b = $('#genRun'); if (b) b.disabled = false; }
}
function addCustom(items) {
  const have = new Set(Object.values(IDX).map(c => plain(c.w))); let n = 0;
  items.forEach(it => { const key = plain(it.w); if (!key || have.has(key)) return; have.add(key); CUSTOM.cards.push({id:'c_' + hash(key), w:it.w, m:it.m, ex:it.ex || '', exen:it.exen || '', t:it.t || ''}); n++; });
  if (CUSTOM.cards.length > 1200) CUSTOM.cards = CUSTOM.cards.slice(-1200);
  buildIndex(); saveCustom(); return n;
}
function openBrowse() {
  const deck = S.settings.deck; const ids = DECKS[deck] || []; const now = Date.now();
  const rows = ids.slice(0, 600).map(id => { const c = IDX[id]; const st = S.srs[id];
    const status = !st ? 'New' : st.r === 0 ? 'Learning' : st.d <= now ? 'Due' : 'in ' + fmtIvl(st.d - now);
    return `<li><span class="bw" lang="ja">${c.kind === 'k' ? esc(c.w) : ruby(c.w)}</span><span class="bm">${esc(c.m)}</span><span class="bs">${status}</span></li>`; }).join('');
  openSheet(esc(DECK_LABEL[deck]) + ' · ' + ids.length, ids.length ? `<ul class="blist">${rows}</ul>` : '<p class="muted">No cards here yet.</p>', 'browse');
}

/* ---------- GRAMMAR ---------- */
VIEWS.grammar = () => {
  if (!UI.gramLv) UI.gramLv = S.settings.level === 'kana' ? 'N5' : S.settings.level;
  const lv = UI.gramLv; const sts = STATIONS.filter(s => s.lv === lv);
  const extras = Object.values(GR).filter(g => g.extra && g.lv === lv);
  const builtIn = GRAMMAR.filter(a => a[1] === lv).length;
  const finding = UI.gramFinding === lv;
  const more = `<section class="gsec"><div class="gsec-head"><span class="ring sm" style="--c:${lineColor(lv)};--p:0" aria-hidden="true"><span class="ring-in"><i>+</i><b>${extras.length}</b></span></span><div><h3>More ${esc(lvLabel(lv))} ${lv === 'casual' ? 'expressions' : 'grammar'}</h3><p>${builtIn} built in${extras.length ? ` · ${extras.length} added by you` : ''}. ${lv === 'casual' ? 'Add more everyday spoken patterns and set phrases.' : 'Study lists for this level run longer than the built-in core, so add the rest a batch at a time.'}</p></div></div>
    ${extras.length ? `<ul class="glist">${extras.map(g => gRow(g.id)).join('')}</ul>` : ''}
    <div class="row">${finding ? THINKING('Finding points you don’t have yet…') : `<button class="btn ghost" data-action="gram-more" data-lv="${lv}" ${AI === 'off' ? 'disabled' : ''}>Find 8 more with Claude</button>`}</div></section>`;
  return `<header class="vh"><h1 class="vt"><span lang="ja">文法</span><small>Grammar by station</small></h1>
  <p class="lede">Every grammar point has a quick example. Open a full lesson for formation rules, nuance, common mistakes, and a three-question check; pass it and the point is marked learned.</p></header>
  <div class="lvtabs" role="tablist">${['N5','N4','N3','N2','N1','casual'].map(l => { const ids = Object.values(GR).filter(g => g.lv === l).map(g => g.id); const n = ids.filter(id => S.gram[id]).length; return `<button class="lvtab ${l === lv ? 'on' : ''}" style="--c:${lineColor(l)}" data-action="gram-lv" data-lv="${l}" role="tab" aria-selected="${l === lv}"><i></i>${lvLabel(l)}<small>${n}/${ids.length}</small></button>`; }).join('')}</div>
  ${lv === 'casual' ? '<p class="notice small"><b>When to use casual speech:</b> with friends, family, people your age who have switched to it, and in texts. Keep です・ます with staff, strangers, older people and at work until they go casual first. Switching at the right moment is what sounds local.</p>' : ''}
  ${sts.map(st => `<section class="gsec"><div class="gsec-head">${ringHTML(st, 'sm')}<div><h3 lang="ja">${ruby(st.ja)}</h3><p>${esc(st.en)} · ${st.code}</p></div></div><ul class="glist">${st.g.map(gRow).join('')}</ul></section>`).join('')}
  ${more}`;
};
/* fill the gap between the built-in core and a full study list, a batch at a time */
async function findMoreGrammar(lv) {
  if (UI.gramFinding) return;
  const sample = await getSample(); if (!sample) { toast(aiError({code:'not_granted'})); return; }
  UI.gramFinding = lv; if (VIEW === 'grammar') { const y = main.scrollTop; render(); main.scrollTop = y; }
  const have = Object.values(GR).filter(g => g.lv === lv).map(g => g.p).join(' / ');
  const ask = lv === 'casual'
    ? `List 8 common features of casual spoken Japanese (contractions, sentence-final particles, colloquial grammar, set phrases, slang that adults really use) that a learner around JLPT N4–N3 should know and that are NOT already in this list: ${have}.`
    : `List 8 important JLPT ${lv} grammar points that are NOT already in this list: ${have}. Choose points that commonly appear in ${lv} study lists, most useful first.`;
  try {
    const r = await sample.json(`${ask}
For each, give the pattern as learners write it (e.g. 〜ばかりか), a short English meaning, one natural example sentence, and its English translation.
In the example sentence only: ${FURI_RULE}
Reply with only a JSON array: [{"p":"pattern","m":"short English meaning","ex":"example sentence","en":"English translation"}]`, {modelTier:'default', cache:false});
    const norm = s => String(s || '').replace(/[〜~\s・/]/g, '');
    const seen = new Set(Object.values(GR).map(g => norm(g.p)));
    let n = 0;
    (Array.isArray(r) ? r : []).forEach(x => {
      if (!x || typeof x.p !== 'string' || !x.p.trim() || typeof x.ex !== 'string') return;
      const key = norm(x.p); if (!key || seen.has(key)) return; seen.add(key);
      CUSTOM.grammar.push({id:'x_' + hash(lv + key), lv, p:x.p.trim(), m:String(x.m || ''), ex:x.ex, en:String(x.en || '')}); n++;
    });
    if (!n) throw {code:'invalid_json'};
    saveCustom(); buildIndex(); toast(`Added ${n} ${lvLabel(lv)} point${n === 1 ? '' : 's'}.`);
  } catch (e) { toast(aiError(e)); }
  finally { UI.gramFinding = null; if (VIEW === 'grammar') { const y = main.scrollTop; render(); main.scrollTop = y; } }
}
function openGrammar(id) {
  const g = GR[id]; if (!g) return;
  const body = `<div><p class="eyebrow">${esc(lvLabel(g.lv))} · ${g.st ? 'Station ' + g.st : 'Added with Claude'}</p><h3 class="gpat" lang="ja">${esc(g.p)}</h3><p class="muted">${esc(g.m)}</p></div>
  <div class="ex"><p class="ja" lang="ja">${ruby(g.ex)}</p><p class="en">${esc(g.en)}</p>${TTS.ok ? `<button class="mt" data-action="say-text" data-t="${esc(g.ex)}">${ICON.speak} Listen</button>` : ''}</div>
  <div class="row"><button class="btn" data-action="lesson" data-id="${id}" id="lessonBtn" ${AI === 'off' ? 'disabled' : ''}>Full lesson with Claude</button><button class="btn ghost" data-action="talk-setup" data-sc="g_${id}" ${AI === 'off' ? 'disabled' : ''}>Practise in a conversation</button><button class="btn ghost" data-action="toggle-learned" data-id="${id}" id="learnBtn">${S.gram[id] ? 'Learned ✓' : 'Mark as learned'}</button></div>
  <p class="muted small">Pass the lesson's check, or use the pattern correctly three times in a practice chat, and it's marked learned automatically.</p>
  <div id="lessonArea" class="lesson"></div>`;
  openSheet(esc(g.lv + ' grammar'), body, 'grammar:' + id);
  Store.getLesson(id).then(l => { if (l && SHEET === 'grammar:' + id) showLesson(id, l); });
}
async function genLesson(id) {
  const g = GR[id]; const area = $('#lessonArea'); if (!area) return;
  const sample = await getSample(); if (!sample) { area.innerHTML = `<div class="notice">${esc(aiError({code:'not_granted'}))}</div>`; return; }
  if ($('#lessonBtn')) $('#lessonBtn').disabled = true;
  area.innerHTML = `<div class="thinking"><span class="dots"><i></i><i></i><i></i></span><span>Writing your lesson. This can take up to a minute.</span></div><div class="row"><button class="btn ghost sm" data-action="lesson-stop">Stop</button></div>`;
  const who = g.lv === 'casual' ? 'an English-speaking learner (around JLPT N4–N3) who wants to sound natural in casual conversation with friends. Cover when it is and isn’t appropriate to use' : 'an English-speaking learner at JLPT ' + g.lv;
  const prompt = `Write a compact, accurate Japanese grammar lesson for ${who}.
Grammar point: ${g.p} (${g.m})
Write every Japanese sentence with furigana for every kanji word in this exact format: kanji followed immediately by its reading in square brackets, e.g. 東京[とうきょう]に行[い]きます。 Never put brackets after kana.
Reply with only this JSON object:
{"summary":"2-3 sentences in English on what it means and when to use it","formation":["one formation rule per item, e.g. Verb ます-stem + たい"],"examples":[{"ja":"...","en":"..."}],"notes":["usage or nuance notes in English"],"pitfalls":["common learner mistakes"],"quiz":[{"q":"question, may include Japanese in the furigana format","options":["...","...","...","..."],"answer":0,"why":"short explanation"}]}
Give 2-4 formation rules, 5 natural examples using vocabulary suited to ${g.lv === 'casual' ? 'everyday conversation between friends' : g.lv}, 2-3 notes, 2 pitfalls, and 3 quiz questions with exactly 4 options each ("answer" is the 0-based index of the correct option).`;
  LESSON_CTL = new AbortController();
  try {
    const r = await sample.json(prompt, {modelTier:'default', signal:LESSON_CTL.signal, cache:false});
    const L = normLesson(r); if (!L.summary && !L.examples.length) throw {code:'invalid_json'};
    Store.putLesson(id, L); if (SHEET === 'grammar:' + id) showLesson(id, L);
  } catch (e) {
    if ($('#lessonArea') && SHEET === 'grammar:' + id) $('#lessonArea').innerHTML = e && e.code === 'cancelled' ? '' : `<div class="notice">${esc(aiError(e))}</div>`;
  } finally { LESSON_CTL = null; if ($('#lessonBtn')) $('#lessonBtn').disabled = false; }
}
function normLesson(r) {
  r = (r && typeof r === 'object') ? r : {}; const s = v => (typeof v === 'string' ? v : ''); const arr = v => (Array.isArray(v) ? v : []);
  return { summary:s(r.summary), formation:arr(r.formation).filter(x => typeof x === 'string'),
    examples:arr(r.examples).filter(x => x && typeof x.ja === 'string').map(x => ({ja:x.ja, en:s(x.en)})),
    notes:arr(r.notes).filter(x => typeof x === 'string'), pitfalls:arr(r.pitfalls).filter(x => typeof x === 'string'),
    quiz:arr(r.quiz).filter(q => q && typeof q.q === 'string' && Array.isArray(q.options) && q.options.length >= 2).slice(0, 5).map(q => ({q:q.q, options:q.options.map(o => String(o)), answer:Math.max(0, Math.min(q.options.length - 1, Number(q.answer) || 0)), why:s(q.why)})) };
}
function showLesson(id, L) {
  const area = $('#lessonArea'); if (!area) return;
  if ($('#lessonBtn')) $('#lessonBtn').textContent = 'Rewrite lesson';
  area.innerHTML = `${L.summary ? `<p>${esc(L.summary)}</p>` : ''}
  ${L.formation.length ? `<h4>How to form it</h4><ul class="form-rules">${L.formation.map(f => `<li lang="ja">${ruby(f)}</li>`).join('')}</ul>` : ''}
  ${L.examples.length ? `<h4>Examples</h4>${L.examples.map(x => `<div class="ex"><p class="ja" lang="ja">${ruby(x.ja)}</p><p class="en">${esc(x.en)}</p>${TTS.ok ? `<button class="mt" data-action="say-text" data-t="${esc(x.ja)}">${ICON.speak} Listen</button>` : ''}</div>`).join('')}` : ''}
  ${L.notes.length ? `<h4>Notes</h4><ul>${L.notes.map(n => `<li>${ruby(n)}</li>`).join('')}</ul>` : ''}
  ${L.pitfalls.length ? `<h4>Watch out for</h4><ul>${L.pitfalls.map(n => `<li>${ruby(n)}</li>`).join('')}</ul>` : ''}
  ${L.quiz.length ? `<h4>Check yourself</h4>${L.quiz.map((q, i) => `<fieldset class="quiz" data-q="${i}"><legend>${i + 1}. <span lang="ja">${ruby(q.q)}</span></legend>${q.options.map((o, j) => `<label for="q${i}_${j}"><input type="radio" name="q${i}" id="q${i}_${j}" value="${j}"><span lang="ja">${ruby(o)}</span></label>`).join('')}<p class="why" hidden></p></fieldset>`).join('')}<div class="row"><button class="btn" data-action="quiz-check" data-id="${id}">Check answers</button></div>` : ''}`;
  area._lesson = L;
}
function quizCheck(id) {
  const area = $('#lessonArea'); const L = area && area._lesson; if (!L) return;
  let right = 0;
  L.quiz.forEach((q, i) => {
    const fs = area.querySelector(`fieldset[data-q="${i}"]`); const pick = fs.querySelector('input:checked'); const why = fs.querySelector('.why');
    const ok = pick && Number(pick.value) === q.answer; if (ok) right++;
    why.hidden = false; why.className = 'why ' + (ok ? 'ok' : 'no');
    why.innerHTML = (ok ? '<b>Correct.</b> ' : `<b>${pick ? 'Not quite.' : 'No answer.'}</b> Answer: <span lang="ja">${ruby(q.options[q.answer])}</span>. `) + ruby(q.why);
  });
  if (right === L.quiz.length) { S.gram[id] = today(); markDay(); saveState(); toast('All correct. Marked as learned.'); const b = $('#learnBtn'); if (b) b.textContent = 'Learned ✓'; refreshUnderSheet(); }
  else toast(right + ' of ' + L.quiz.length + ' correct.');
}
function refreshUnderSheet() { if (!(VIEW === 'talk' && UI.inChat)) { const y = main.scrollTop; render(); main.scrollTop = y; } else renderTop(); }

/* ---------- READ ---------- */
const READ_TYPES = [['story','Short story','短編[たんぺん]'],['diary','Diary entry','日記[にっき]'],['news','News-style article','ニュース'],['dialogue','Conversation','会話文[かいわぶん]'],['letter','Letter or email','手紙[てがみ]'],['essay','Opinion piece','エッセイ'],['folktale','Folk tale retelling','昔話[むかしばなし]'],['howto','How-to guide','説明文[せつめいぶん]'],['texts','Group chat between friends','LINEのやりとり']];
const READ_STYLES = [['auto','Whatever suits the text'],['polite','Polite (です・ます)'],['casual','Casual, the way friends talk'],['plain','Plain written style (だ・である)']];
const READ_STYLE_GUIDE = {auto:'', polite:'Use polite です・ます style throughout.', casual:'Use natural casual spoken Japanese as friends talk: plain forms, sentence-final particles (よ, ね, じゃん), contractions (〜てる, 〜ちゃう, 〜なきゃ), and everyday colloquial words. Natural, never crude.', plain:'Use plain written style (だ・である) as in newspapers and essays.'};
const readStyleSelect = id => `<select id="${id}">${READ_STYLES.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select>`;
const readType = id => READ_TYPES.find(t => t[0] === id) || READ_TYPES[0];
const READ_TOPICS = ['Daily life','Food','Travel in Japan','Work','Animals','Mystery','Friendship','Seasons and festivals','History','Science','Sports','Technology'];
const READ_LEN = {short:{s:'6–8', p:'2', label:'Short'}, medium:{s:'12–16', p:'3–4', label:'Medium'}, long:{s:'22–28', p:'5–6', label:'Long'}};
const READ_GUIDE = {
  kana:'an absolute beginner who has just learned kana: very short sentences, mostly hiragana words, only the simplest kanji (such as 日, 人, 山, 大, 小), and です/ます',
  N5:'JLPT N5: short sentences, basic vocabulary and grammar, です/ます style',
  N4:'JLPT N4: everyday vocabulary, plain and polite forms, simple connectors',
  N3:'JLPT N3: natural everyday Japanese with some longer sentences and common expressions',
  N2:'JLPT N2: natural adult prose, including some formal and abstract vocabulary',
  N1:'JLPT N1: native-level prose with rich vocabulary and nuance'
};
const FURI_RULE = 'Write every word that contains kanji with its reading in square brackets immediately after it, e.g. 東京[とうきょう]に行[い]きました。 Never put brackets after kana.';
const RD = { list:null, cur:null, sel:null, gen:null, tab:'write', length:'medium', playing:null, explaining:null, fileName:'', modeTouched:false };
const jpRatio = s => { const t = String(s || '').replace(/\s/g, ''); if (!t) return 0; const m = t.match(/[぀-ヿ㐀-鿿]/g); return (m ? m.length : 0) / t.length; };

function normParas(p) {
  return (Array.isArray(p) ? p : []).map(par => (Array.isArray(par) ? par : [par]).filter(s => s && typeof s.ja === 'string' && s.ja.trim()).map(s => ({ja:s.ja.trim(), en:typeof s.en === 'string' ? s.en.trim() : ''}))).filter(par => par.length);
}
function normReading(r) {
  r = (r && typeof r === 'object' && !Array.isArray(r)) ? r : {}; const s = v => (typeof v === 'string' ? v.trim() : ''); const arr = v => (Array.isArray(v) ? v : []);
  return { title:s(r.title), title_en:s(r.title_en), paragraphs:normParas(r.paragraphs),
    vocab:arr(r.vocab).filter(x => x && typeof x.w === 'string' && x.w.trim()).slice(0, 16).map(x => ({w:x.w.trim(), m:s(x.m)})),
    questions:arr(r.questions).filter(q => q && typeof q.q === 'string' && Array.isArray(q.options) && q.options.length >= 2).slice(0, 5)
      .map(q => ({q:q.q, q_en:s(q.q_en), options:q.options.map(o => String(o)), answer:Math.max(0, Math.min(q.options.length - 1, Number(q.answer) || 0)), why:s(q.why)})) };
}
const readLevelSelect = (id, val) => `<select id="${id}">${LEVEL_OPTS.map(([v, l]) => `<option value="${v}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;

VIEWS.read = () => (RD.cur ? readerHTML() : readLibraryHTML());
function readLibraryHTML() {
  const lvl = S.settings.level; const off = AI === 'off' ? 'disabled' : '';
  const write = `<div class="rdform">
    <label class="field"><span>Level</span>${readLevelSelect('rdLevel', lvl)}</label>
    <label class="field"><span>Kind of text</span><select id="rdType">${READ_TYPES.map(t => `<option value="${t[0]}">${esc(t[1])}</option>`).join('')}</select></label>
    <label class="field"><span>Speech style</span>${readStyleSelect('rdStyle')}</label>
    <div class="field"><span>Length</span><div class="chips">${Object.entries(READ_LEN).map(([k, v]) => `<button class="tog ${RD.length === k ? 'on' : ''}" data-action="rd-length" data-l="${k}" aria-pressed="${RD.length === k}">${v.label} · ${v.s} sentences</button>`).join('')}</div></div>
    <div class="field wide"><span>Topic</span><div class="chips">${READ_TOPICS.map(t => `<button class="tog" data-action="rd-topic" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <label class="sr" for="rdTopic">Topic</label><input type="text" id="rdTopic" placeholder="Or describe anything: a lost cat in Osaka, a rainy day at the onsen, how ramen is made…"></div>
    <div class="row"><button class="btn" data-action="rd-write" ${off}>Write it</button><span class="muted small">Takes about half a minute.</span></div></div>`;
  const translate = `<div class="rdform">
    <label class="field wide"><span>Paste text in English, Japanese, or another language</span><textarea id="rdSource" placeholder="Paste an article, a story, an email, notes from work… up to about 8,000 characters."></textarea></label>
    <div class="row"><label class="btn ghost sm" for="rdFile">Upload a file…</label><input type="file" id="rdFile" class="sr" accept=".txt,.md,.srt,.vtt,.csv,.html,.htm,.docx,text/plain"><span class="muted small" id="rdFileName">${RD.fileName ? esc(RD.fileName) : 'Text, Markdown, subtitles, HTML or Word (.docx). For a PDF, copy its text and paste it here.'}</span></div>
    <label class="field"><span>Level</span>${readLevelSelect('rdLevelT', lvl)}</label>
    <label class="field"><span>How to translate</span><select id="rdMode"><option value="adapt">Rewrite at my level (easier to read)</option><option value="faithful">Faithful translation</option><option value="keep">It's already Japanese: keep it as written</option></select></label>
    <label class="field"><span>Speech style</span>${readStyleSelect('rdStyleT')}</label>
    <div class="row"><button class="btn" data-action="rd-translate" ${off}>Translate and open</button><span class="muted small">Long texts are done in parts, about half a minute each.</span></div></div>`;
  return `<header class="vh"><h1 class="vt"><span lang="ja">読む</span><small>Reading practice</small></h1>
  <p class="lede">Read Japanese pitched at your level. Claude can write a story or article on any topic, or turn your own text into Japanese. Tap any sentence for its meaning, audio, and a word-by-word breakdown, then check yourself with a few questions.</p></header>
  ${AI === 'off' ? AI_OFF_NOTE : ''}
  <section class="rdnew" aria-label="New reading">
    <div class="seg" role="tablist"><button class="${RD.tab === 'write' ? 'on' : ''}" data-action="rd-tab" data-t="write" role="tab" aria-selected="${RD.tab === 'write'}">Write me a text</button><button class="${RD.tab === 'translate' ? 'on' : ''}" data-action="rd-tab" data-t="translate" role="tab" aria-selected="${RD.tab === 'translate'}">Translate my text</button></div>
    ${RD.tab === 'write' ? write : translate}
    <div id="rdProgress">${rdProgressHTML()}</div>
  </section>
  <section class="sec"><h2 class="sh"><span lang="ja">本棚</span> Your library <small id="rdCount">${RD.list ? RD.list.length : ''}</small></h2><div id="rdList">${rdListHTML()}</div></section>`;
}
function rdProgressHTML() {
  const g = RD.gen; if (!g) return '';
  if (g.error) return `<div class="notice">${esc(g.error)}</div><div class="row"><button class="btn ghost sm" data-action="rd-dismiss">Dismiss</button></div>`;
  return `<div class="row">${THINKING(g.label + (g.n ? ` ${g.n} sentence${g.n === 1 ? '' : 's'} so far.` : ''))}<button class="btn ghost sm" data-action="rd-stop-gen">Stop</button></div>`;
}
function rdListHTML() {
  if (RD.list === null) return '<p class="muted">Loading your library…</p>';
  if (!RD.list.length) return '<p class="muted">Nothing here yet. Every text you create is saved here so you can reread it.</p>';
  return `<ul class="rdlist">${RD.list.map(r => `<li><button class="rdcard" data-action="rd-open" data-id="${esc(r.id)}"><span class="lvtag" style="--c:${lineColor(r.level)}">${r.level === 'kana' ? 'Kana' : esc(r.level)}</span><span class="rc-title" lang="ja">${ruby(r.title || '')}</span>${r.title_en ? `<span class="rc-en">${esc(r.title_en)}</span>` : ''}<span class="rc-meta">${r.kind === 'translation' ? 'Translated' + (r.sourceName ? ' · ' + esc(r.sourceName) : '') : esc(readType(r.type)[1])} · ${new Date(r.at).toLocaleDateString()}${r.done ? ` · ✓ ${r.done.score}/${r.done.of}` : ''}</span></button></li>`).join('')}</ul>`;
}
function rdShowProgress() { const el = $('#rdProgress'); if (el) el.innerHTML = rdProgressHTML(); }
async function loadReadings() {
  RD.list = await Store.listReadings();
  if (VIEW === 'read' && !RD.cur) { const el = $('#rdList'); if (el) el.innerHTML = rdListHTML(); const c = $('#rdCount'); if (c) c.textContent = RD.list.length; }
}
async function saveReading(rd) {
  const copy = clone(rd);
  if (copy.explains) Object.keys(copy.explains).forEach(k => { if (!copy.explains[k] || copy.explains[k].error) delete copy.explains[k]; });
  if (RD.list) { RD.list = [copy].concat(RD.list.filter(r => r.id !== rd.id)).sort((a, b) => b.at - a.at); }
  await Store.putReading(copy);
}
function rdCountSentences(text) { if (!RD.gen) return; const n = (String(text).match(/"ja"\s*:/g) || []).length; if (n !== RD.gen.n) { RD.gen.n = n; rdShowProgress(); } }
function rdDone(rd) {
  RD.gen = null; markDay(); saveState(); renderTop();
  if (VIEW === 'read' && !RD.cur) openReading(rd); else { rdShowProgress(); toast('Your reading is ready in Read.'); }
}
async function rdWrite() {
  if (RD.gen && !RD.gen.error) return;
  const level = ($('#rdLevel') || {}).value || S.settings.level; const type = readType(($('#rdType') || {}).value);
  const topic = (($('#rdTopic') || {}).value || '').trim() || 'something interesting from everyday life in Japan';
  const len = READ_LEN[RD.length]; const style = ($('#rdStyle') || {}).value || 'auto';
  const sample = await getSample(); if (!sample) { toast(aiError({code:'not_granted'})); return; }
  RD.gen = {ctl:new AbortController(), label:`Writing a ${type[1].toLowerCase()} about ${topic.slice(0, 60)}…`, n:0}; rdShowProgress();
  const prompt = `Write an original Japanese ${type[1].toLowerCase()} for an English-speaking learner at ${READ_GUIDE[level] || READ_GUIDE.N5}.
Topic: ${topic}
Length: about ${len.s} sentences in ${len.p} paragraphs.${type[0] === 'texts' ? ' Write it as a LINE group chat: each paragraph is a short burst of messages, and each sentence starts with the sender\'s name and a colon (e.g. ゆい：). Use casual texting style with (笑) or w where natural.' : ''}${READ_STYLE_GUIDE[style] ? '\nSpeech style: ' + READ_STYLE_GUIDE[style] : ''}
Make it genuinely interesting to read${type[0] === 'story' || type[0] === 'folktale' ? ', with a clear beginning, middle and end' : ''}. Use natural Japanese with vocabulary and grammar that suit the level; a few useful words slightly above it are fine.
${FURI_RULE}
Reply with only this JSON object:
{"title":"Japanese title","title_en":"English title","paragraphs":[[{"ja":"one sentence","en":"its natural English translation"}]],"vocab":[{"w":"word as used in the text","m":"English meaning"}],"questions":[{"q":"comprehension question in simple Japanese","q_en":"the question in English","options":["","","",""],"answer":0,"why":"short English explanation pointing to the text"}]}
"paragraphs" is a list of paragraphs, each a list of sentence objects. Give 8-12 vocab items that appear in the text and are worth learning, and 3 multiple-choice questions with 4 options each ("answer" is the 0-based index of the correct option).`;
  try {
    const r = await sample.json(prompt, {modelTier:'default', cache:false, signal:RD.gen.ctl.signal, onText:({text}) => rdCountSentences(text)});
    const rd = normReading(r); if (!rd.paragraphs.length) throw {code:'invalid_json'};
    Object.assign(rd, {id:'r' + Date.now().toString(36), at:Date.now(), level, kind:'story', type:type[0], topic, style, explains:{}});
    if (!rd.title) rd.title = plain(rd.paragraphs[0][0].ja).slice(0, 20);
    await saveReading(rd); rdDone(rd);
  } catch (e) { if (e && e.code === 'cancelled') { RD.gen = null; rdShowProgress(); return; } RD.gen = {error:aiError(e)}; rdShowProgress(); }
}
function chunkText(src, max) {
  const paras = src.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean); const out = []; let cur = '';
  const pushPiece = piece => { if (cur && (cur.length + piece.length + 2) > max) { out.push(cur); cur = ''; } cur = cur ? cur + '\n\n' + piece : piece; };
  paras.forEach(p => {
    if (p.length <= max) { pushPiece(p); return; }
    const sents = p.match(/[^。．.!?！？]+[。．.!?！？]*["'”」』)]*\s*/g) || [p]; let buf = '';
    sents.forEach(s => { if ((buf + s).length > max && buf) { pushPiece(buf.trim()); buf = ''; } buf += s; });
    if (buf.trim()) pushPiece(buf.trim());
  });
  if (cur) out.push(cur);
  return out;
}
async function rdTranslate() {
  if (RD.gen && !RD.gen.error) return;
  let src = (($('#rdSource') || {}).value || '').replace(/\r/g, '').trim();
  if (!src) { toast('Paste some text or upload a file first.'); return; }
  const level = ($('#rdLevelT') || {}).value || S.settings.level; const mode = ($('#rdMode') || {}).value || 'adapt';
  const cut = src.length > 8000; if (cut) src = src.slice(0, 8000);
  const chunks = chunkText(src, 1800); const sourceName = RD.fileName;
  const sample = await getSample(); if (!sample) { toast(aiError({code:'not_granted'})); return; }
  const verb = mode === 'keep' ? 'Preparing' : 'Translating';
  RD.gen = {ctl:new AbortController(), label:`${verb} part 1 of ${chunks.length}…`, n:0}; rdShowProgress();
  const how = mode === 'keep' ? 'The text is already Japanese. Keep it exactly as written (only fix obvious typos), split it into sentences, and add the furigana and an English translation of each sentence.'
    : mode === 'faithful' ? 'Translate it faithfully and naturally into Japanese, keeping the original structure and meaning.'
    : `Translate it into Japanese adapted for a learner at ${READ_GUIDE[level] || READ_GUIDE.N5}: keep the meaning and story, but use vocabulary and grammar that suit that level and split long sentences.`;
  const style = ($('#rdStyleT') || {}).value || 'auto';
  const styleLine = mode !== 'keep' && READ_STYLE_GUIDE[style] ? '\nSpeech style: ' + READ_STYLE_GUIDE[style] : '';
  try {
    const paragraphs = []; let count = 0;
    for (let i = 0; i < chunks.length; i++) {
      RD.gen.label = `${verb} part ${i + 1} of ${chunks.length}…`; RD.gen.n = count; rdShowProgress();
      const r = await sample.json(`${how}${styleLine}
${FURI_RULE}
Keep the paragraph breaks. "en" is a natural English rendering of each Japanese sentence.
Reply with only this JSON object:
{"paragraphs":[[{"ja":"one Japanese sentence","en":"English meaning"}]]}

Text (part ${i + 1} of ${chunks.length}):
"""
${chunks[i]}
"""`, {modelTier:'default', cache:false, signal:RD.gen.ctl.signal, onText:({text}) => { if (RD.gen) { const n = count + (String(text).match(/"ja"\s*:/g) || []).length; if (n !== RD.gen.n) { RD.gen.n = n; rdShowProgress(); } } }});
      const ps = normParas(r && r.paragraphs); paragraphs.push(...ps); count += ps.reduce((a, p) => a + p.length, 0);
    }
    if (!paragraphs.length) throw {code:'invalid_json'};
    RD.gen.label = 'Adding a title, a word list and questions…'; RD.gen.n = 0; rdShowProgress();
    let meta = {};
    try {
      const jp = paragraphs.map(p => p.map(s => plain(s.ja)).join('')).join('\n').slice(0, 6000);
      meta = await sample.json(`Here is a Japanese reading text for a learner at ${READ_GUIDE[level] || READ_GUIDE.N5}:
"""
${jp}
"""
${FURI_RULE}
Reply with only this JSON object:
{"title":"short Japanese title","title_en":"English title","vocab":[{"w":"word as used in the text","m":"English meaning"}],"questions":[{"q":"comprehension question in simple Japanese","q_en":"the question in English","options":["","","",""],"answer":0,"why":"short English explanation pointing to the text"}]}
Give 8-12 vocab items worth learning and 3 multiple-choice questions with 4 options each ("answer" is the 0-based index).`, {modelTier:'default', cache:false, signal:RD.gen.ctl.signal});
    } catch (e) { if (e && e.code === 'cancelled') throw e; meta = {}; }
    const rd = normReading(Object.assign({}, meta, {paragraphs}));
    rd.paragraphs = paragraphs;
    if (!rd.title) rd.title = plain(paragraphs[0][0].ja).slice(0, 20);
    Object.assign(rd, {id:'r' + Date.now().toString(36), at:Date.now(), level, kind:'translation', mode, source:src, sourceName, cut, explains:{}});
    await saveReading(rd); RD.fileName = ''; rdDone(rd);
  } catch (e) { if (e && e.code === 'cancelled') { RD.gen = null; rdShowProgress(); return; } RD.gen = {error:aiError(e)}; rdShowProgress(); }
}
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('could not load the Word reader')); document.head.appendChild(s); }); }
async function rdReadFile(file) {
  if (!file) return;
  const name = file.name || 'file'; const ext = (name.split('.').pop() || '').toLowerCase(); const label = $('#rdFileName');
  if (label) label.textContent = 'Reading ' + name + '…';
  try {
    let text = '';
    if (ext === 'pdf' || ext === 'doc' || ext === 'pages') throw new Error('this file type can’t be read here; open it, copy the text, and paste it in the box');
    if (ext === 'docx') {
      if (!window.mammoth) await loadScript(window.nlDesktop ? 'vendor/mammoth.browser.min.js' : 'https://cdn.jsdelivr.net/npm/mammoth@1.13.0/mammoth.browser.min.js');
      const r = await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()}); text = r.value || '';
    } else {
      text = await file.text();
      if (ext === 'html' || ext === 'htm') { const d = new DOMParser().parseFromString(text, 'text/html'); d.querySelectorAll('script,style,noscript').forEach(n => n.remove()); text = d.body ? d.body.textContent : ''; }
      if (ext === 'srt' || ext === 'vtt') text = text.replace(/^WEBVTT.*$/m, '').replace(/^\d+\s*$/gm, '').replace(/^[\d:.,]+\s*-->\s*[\d:.,]+.*$/gm, '').replace(/<[^>]+>/g, '');
    }
    text = text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!text) throw new Error('no text was found in it');
    const box = $('#rdSource'); if (box) box.value = text;
    RD.fileName = name; rdAutoMode(text);
    if (label) label.textContent = `${name} · ${text.length.toLocaleString()} characters${text.length > 8000 ? ' (the first 8,000 will be used)' : ''}`;
  } catch (e) { RD.fileName = ''; if (label) label.textContent = `Couldn't read ${name}: ${e.message || 'unreadable file'}.`; }
}
function rdAutoMode(text) { if (RD.modeTouched) return; const m = $('#rdMode'); if (m) m.value = jpRatio(text) > 0.3 ? 'keep' : 'adapt'; }

function openReading(rd) { rdStop(); RD.cur = rd; RD.sel = null; RD.explaining = null; if (!rd.explains) rd.explains = {}; VIEW = 'read'; render(); main.scrollTop = 0; }
function rdRender() { const y = main.scrollTop; render(); main.scrollTop = y; }
const rdKeys = rd => rd.paragraphs.flatMap((p, pi) => p.map((s, si) => pi + '_' + si));
function rdSentence(key) { const [pi, si] = key.split('_').map(Number); const p = RD.cur && RD.cur.paragraphs[pi]; return p && p[si]; }
function readerHTML() {
  const rd = RD.cur; const total = rd.paragraphs.reduce((a, p) => a + p.length, 0);
  const selPar = RD.sel ? Number(RD.sel.split('_')[0]) : -1;
  return `<div class="reader ${S.settings.en ? '' : 'no-en'}" id="reader">
  <div class="rd-top">
    <button class="icon-btn" data-action="rd-back" aria-label="Back to library">${ICON.back}</button>
    <div class="rd-meta"><span class="lvtag" style="--c:${lineColor(rd.level)}">${rd.level === 'kana' ? 'Kana' : esc(rd.level)}</span><span class="muted small">${rd.kind === 'translation' ? 'Translated' + (rd.sourceName ? ' from ' + esc(rd.sourceName) : '') : esc(readType(rd.type)[1])} · ${total} sentences</span></div>
    <div class="ch-tools">
      <button class="tog ${S.settings.furi ? 'on' : ''}" data-action="tog" data-k="furi" aria-pressed="${S.settings.furi}" lang="ja">ふりがな</button>
      <button class="tog ${S.settings.en ? 'on' : ''}" data-action="tog" data-k="en" aria-pressed="${S.settings.en}">English</button>
      ${TTS.ok ? `<button class="btn sm" id="rdPlay" data-action="${RD.playing ? 'rd-stop' : 'rd-play'}">${RD.playing ? '■ Stop' : `${ICON.speak} Read aloud`}</button>` : ''}
    </div>
  </div>
  <article class="sec" aria-label="Text">
    <h1 class="rd-title" lang="ja">${ruby(rd.title)}</h1>${rd.title_en ? `<p class="rd-title-en only-en">${esc(rd.title_en)}</p>` : ''}
    <p class="muted small">Tap a sentence for its meaning and audio. ← and → move between sentences.</p>
    ${rd.cut ? '<p class="notice small">Only the first 8,000 characters of your text were used.</p>' : ''}
    ${rd.paragraphs.map((par, pi) => `<div class="rd-par"><p class="rd-ja" lang="ja">${par.map((s, si) => { const k = pi + '_' + si; return `<span class="rs ${RD.sel === k ? 'on' : ''}" data-action="rd-sentence" data-k="${k}" role="button" tabindex="0" aria-pressed="${RD.sel === k}">${ruby(s.ja)}</span>`; }).join('')}</p>
      <p class="rd-en">${par.map(s => esc(s.en)).join(' ')}</p>${pi === selPar ? rdDetailHTML() : ''}</div>`).join('')}
  </article>
  ${rd.vocab.length ? `<section class="rd-sec"><h2 class="sh"><span lang="ja">単語</span> Words in this text</h2><ul class="rvlist">${rd.vocab.map((v, i) => `<li><span class="gw" lang="ja">${ruby(v.w)}</span><span class="gx">${esc(v.m)}</span><button class="mt" data-action="rd-vocab-add" data-i="${i}">+ Card</button></li>`).join('')}</ul><div class="row"><button class="btn ghost sm" data-action="rd-vocab-all">Add all to My cards</button></div></section>` : ''}
  ${rd.questions.length ? `<section class="rd-sec" id="rdQuiz"><h2 class="sh"><span lang="ja">確認</span> Check your understanding</h2>${rd.questions.map((q, i) => `<fieldset class="quiz" data-q="${i}"><legend>${i + 1}. <span lang="ja">${ruby(q.q)}</span>${q.q_en ? `<small class="muted only-en">${esc(q.q_en)}</small>` : ''}</legend>${q.options.map((o, j) => `<label for="rq${i}_${j}"><input type="radio" name="rq${i}" id="rq${i}_${j}" value="${j}"><span lang="ja">${ruby(o)}</span></label>`).join('')}<p class="why" hidden></p></fieldset>`).join('')}
    <div class="row"><button class="btn" data-action="rd-check">Check answers</button>${rd.done ? `<span class="muted small">Last time: ${rd.done.score}/${rd.done.of} on ${esc(rd.done.at)}</span>` : ''}</div></section>` : ''}
  <section class="rd-sec">
    ${rd.kind === 'translation' && rd.source ? `<details><summary class="muted small" style="cursor:pointer">Original text</summary><pre class="rd-src">${esc(rd.source)}</pre></details>` : ''}
    <div class="row"><button class="btn ghost sm" data-action="rd-back">Back to library</button><button class="btn ghost sm danger" data-action="rd-delete">Delete this text</button></div>
  </section></div>`;
}
function rdDetailHTML() {
  const s = rdSentence(RD.sel); if (!s) return '';
  const x = RD.cur.explains[RD.sel]; const rom = S.settings.romaji ? toRomaji(s.ja) : '';
  return `<div class="sdetail"><p class="sd-ja" lang="ja">${ruby(s.ja)}</p>${rom ? `<p class="sd-rom">${esc(rom)}</p>` : ''}${s.en ? `<p>${esc(s.en)}</p>` : ''}
    <div class="row">${TTS.ok ? `<button class="btn sm ghost" data-action="rd-say">${ICON.speak} Listen</button>` : ''}${!x || x.error ? `<button class="btn sm ghost" data-action="rd-explain" ${AI === 'off' || RD.explaining ? 'disabled' : ''}>Explain the words</button>` : ''}<button class="mt" data-action="rd-move" data-d="-1">← Previous</button><button class="mt" data-action="rd-move" data-d="1">Next →</button><button class="mt" data-action="rd-close">Close</button></div>
    ${RD.explaining === RD.sel ? THINKING('Breaking it down…') : x ? explainBody(x, j => `data-action="rd-word-add" data-j="${j}"`) : ''}</div>`;
}
function rdSelect(key) {
  RD.sel = RD.sel === key ? null : key; rdRender();
  const el = RD.sel && document.querySelector(`.rs[data-k="${RD.sel}"]`); if (el) el.focus({preventScroll:true});
}
function rdMove(d) {
  if (!RD.cur) return; const keys = rdKeys(RD.cur); let i = RD.sel ? keys.indexOf(RD.sel) : -1;
  i = Math.max(0, Math.min(keys.length - 1, i + d)); RD.sel = keys[i]; rdRender();
  const el = document.querySelector(`.rs[data-k="${RD.sel}"]`); if (el) { el.focus({preventScroll:true}); el.scrollIntoView({block:'nearest', behavior:'smooth'}); }
}
async function rdExplain() {
  const rd = RD.cur; const key = RD.sel; const s = key && rdSentence(key); if (!s || RD.explaining) return;
  const sample = await getSample(); if (!sample) { toast(aiError({code:'not_granted'})); return; }
  RD.explaining = key; rdRender();
  try { rd.explains[key] = normExplain(await sample.json(explainPrompt(s.ja, s.en, rd.level), {modelTier:'quick', cache:{gcTime:86400000}})); saveReading(rd); }
  catch (e) { rd.explains[key] = {error:aiError(e)}; }
  finally { RD.explaining = null; if (RD.cur === rd && VIEW === 'read') rdRender(); }
}
function rdPlay() {
  if (!TTS.ok || !RD.cur) return;
  const keys = rdKeys(RD.cur); let i = RD.sel ? Math.max(0, keys.indexOf(RD.sel)) : 0;
  const token = {}; RD.playing = token; rdPlayBtn();
  const next = () => {
    if (RD.playing !== token) return;
    if (i >= keys.length) { RD.playing = null; rdSpeaking(null); rdPlayBtn(); return; }
    const k = keys[i++]; rdSpeaking(k); TTS.speakThen(rdSentence(k).ja, next);
  };
  next();
}
function rdStop() { if (!RD.playing) return; RD.playing = null; try { speechSynthesis.cancel(); } catch (e) {} rdSpeaking(null); rdPlayBtn(); }
function rdSpeaking(k) {
  document.querySelectorAll('.rs.speaking').forEach(el => el.classList.remove('speaking'));
  const el = k && document.querySelector(`.rs[data-k="${k}"]`); if (el) { el.classList.add('speaking'); el.scrollIntoView({block:'nearest', behavior:'smooth'}); }
}
function rdPlayBtn() { const b = $('#rdPlay'); if (!b) return; b.dataset.action = RD.playing ? 'rd-stop' : 'rd-play'; b.innerHTML = RD.playing ? '■ Stop' : `${ICON.speak} Read aloud`; }
function rdCheck() {
  const rd = RD.cur; const box = $('#rdQuiz'); if (!rd || !box) return; let right = 0;
  rd.questions.forEach((q, i) => {
    const fs = box.querySelector(`fieldset[data-q="${i}"]`); const pick = fs.querySelector('input:checked'); const why = fs.querySelector('.why');
    const ok = pick && Number(pick.value) === q.answer; if (ok) right++;
    why.hidden = false; why.className = 'why ' + (ok ? 'ok' : 'no');
    why.innerHTML = (ok ? '<b>Correct.</b> ' : `<b>${pick ? 'Not quite.' : 'No answer.'}</b> Answer: <span lang="ja">${ruby(q.options[q.answer])}</span>. `) + ruby(q.why);
  });
  if (!rd.done) S.stats.reads = (S.stats.reads || 0) + 1;
  rd.done = {score:right, of:rd.questions.length, at:today()}; markDay(); saveState(); saveReading(rd); renderTop();
  toast(right === rd.questions.length ? 'All correct. Nicely read.' : `${right} of ${rd.questions.length} correct. Tap the sentences you missed to check them.`);
}

/* ---------- settings ---------- */
function openSettings() {
  const st = S.settings;
  const body = `<section class="set-sec"><h4>Your level</h4><label class="field"><span class="sr">Level</span><select id="setLevel" data-set="level">${LEVEL_OPTS.map(([v, l]) => `<option value="${v}" ${st.level === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label><p class="muted small">Sets your next stop on the route and the default difficulty for conversations.</p></section>
  <section class="set-sec"><h4>Japanese text</h4>
   <label class="check-row" for="setFuri"><input type="checkbox" id="setFuri" data-set="furi" ${st.furi ? 'checked' : ''}><span>Show furigana (readings above kanji)</span></label>
   <label class="check-row" for="setRomaji"><input type="checkbox" id="setRomaji" data-set="romaji" ${st.romaji ? 'checked' : ''}><span>Show romaji in conversations and cards</span></label>
   <label class="check-row" for="setEn"><input type="checkbox" id="setEn" data-set="en" ${st.en ? 'checked' : ''}><span>Show English translations in conversations</span></label>
   <label class="check-row" for="setIme"><input type="checkbox" id="setIme" data-set="ime" ${st.ime ? 'checked' : ''} ${WK() ? '' : 'disabled'}><span>Turn romaji into kana as I type in conversations</span></label></section>
  <section class="set-sec"><h4>Voice</h4>${TTS.ok ? `${TTS.voices.length > 1 ? `<label class="field" for="setVoice"><span>Japanese voice</span><select id="setVoice" data-set="voice">${TTS.voices.map(v => `<option value="${esc(v.name)}" ${TTS.voice && TTS.voice.name === v.name ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>` : ''}
   <label class="field" for="setRate"><span>Speaking speed · <span id="rateVal">${st.rate.toFixed(2)}×</span></span><input type="range" id="setRate" data-set="rate" min="0.6" max="1.2" step="0.05" value="${st.rate}"></label>
   <label class="check-row" for="setAuto"><input type="checkbox" id="setAuto" data-set="autoplay" ${st.autoplay ? 'checked' : ''}><span>Read partner replies aloud automatically</span></label>
   <label class="check-row" for="setListen"><input type="checkbox" id="setListen" data-set="listen" ${st.listen ? 'checked' : ''}><span>Listen first: read replies aloud and hide their text until I tap it</span></label>
   <div class="row"><button class="btn ghost sm" data-action="say-text" data-t="こんにちは。日本語[にほんご]を一緒[いっしょ]に練習[れんしゅう]しましょう。">${ICON.speak} Test voice</button>${TTS.voice ? '' : `<span class="muted small">No Japanese voice found on this device. ${window.nlDesktop ? 'On Windows, add Japanese under Settings → Time &amp; language → Speech.' : 'Your browser will use its default voice.'}</span>`}</div>` : '<p class="muted small">This browser has no text-to-speech, so listening buttons are hidden.</p>'}</section>
  <section class="set-sec"><h4>Cards</h4><label class="field" for="setNew"><span>New cards per day</span><select id="setNew" data-set="newPerDay">${[5,10,15,20,30].map(n => `<option value="${n}" ${st.newPerDay === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
   <label class="field" for="setDir"><span>Card front</span><select id="setDir" data-set="cardDir"><option value="jp" ${st.cardDir !== 'en' ? 'selected' : ''}>Japanese → English (recognize)</option><option value="en" ${st.cardDir === 'en' ? 'selected' : ''}>English → Japanese (recall)</option></select></label></section>
  <section class="set-sec"><h4>Conversation replies</h4><label class="field" for="setSpeed"><span class="sr">Reply style</span><select id="setSpeed" data-set="speed"><option value="quick" ${st.speed === 'quick' ? 'selected' : ''}>Fast replies (a few seconds)</option><option value="default" ${st.speed === 'default' ? 'selected' : ''}>Thorough feedback (slower)</option></select></label></section>
  ${window.nlDesktop ? `<section class="set-sec"><h4>Claude API key</h4><p class="muted small">The desktop app reaches Claude with your own Anthropic API key, created at console.anthropic.com. Usage is billed to that account, separately from a Claude subscription.</p>
   <p class="small" id="keyStatus">Checking…</p>
   <label class="field" for="apiKey"><span>API key</span><input type="password" id="apiKey" autocomplete="off" spellcheck="false" placeholder="sk-ant-…"></label>
   <div class="row"><button class="btn sm" data-action="key-save">Save key</button><button class="btn ghost sm" data-action="key-test">Test connection</button><button class="btn ghost sm danger" data-action="key-clear">Remove key</button></div>
   <details><summary class="muted small" style="cursor:pointer">Models</summary><div class="sec" style="margin-top:8px">
    <label class="field" for="modelQuick"><span>Fast replies</span><input type="text" id="modelQuick" spellcheck="false"></label>
    <label class="field" for="modelDefault"><span>Thorough replies, lessons, reviews</span><input type="text" id="modelDefault" spellcheck="false"></label>
    <div class="row"><button class="btn ghost sm" data-action="models-save">Save models</button></div></div></details></section>` : ''}
  <section class="set-sec"><h4>Backup</h4><p class="muted small">Save your progress, your own cards, and recent conversations to a file, or load one back. This is also how you move progress between this ${window.nlDesktop ? 'app and the web version' : 'page and the desktop app'}.</p>
   <div class="row"><button class="btn ghost sm" data-action="export">Download backup</button><label class="btn ghost sm" for="importFile">Load a backup…</label><input type="file" id="importFile" accept=".json,application/json" class="sr"></div><div id="importStatus"></div></section>
  <section class="set-sec"><h4>Your progress</h4><p class="muted small">${window.nlDesktop ? 'Saved on this computer.' : Store.cloud ? 'Saved to your Claude account, so it follows you to other devices.' : 'Saved in this browser only.'}</p><div class="row"><button class="btn ghost sm danger" data-action="reset" id="resetBtn">Erase all progress</button></div></section>
  <section class="set-sec"><h4>About</h4>${window.nlDesktop ? `<p class="small" id="updStatus">${updateStatusHTML()}</p>
   <div class="row"><button class="btn ghost sm" data-action="update-check" id="updCheckBtn">Check for updates</button></div>
   <label class="check-row" for="setAutoUpd"><input type="checkbox" id="setAutoUpd" checked><span>Download and install updates automatically</span></label>` : ''}
   <p class="muted small">Nihongo Line ${esc(APP_VERSION.v || '')}${window.nlDesktop ? '' : ' · web version'}</p></section>`;
  openSheet('Settings', body, 'settings');
  if (window.nlDesktop) {
    refreshKeyStatus();
    if (window.nlDesktop.getAutoUpdate) window.nlDesktop.getAutoUpdate().then(r => { const c = $('#setAutoUpd'); if (c && r) c.checked = r.autoUpdate !== false; }).catch(() => {});
  }
}
async function refreshKeyStatus() {
  try {
    const s = await window.nlDesktop.status(); const el = $('#keyStatus'); if (!el) return;
    el.innerHTML = s.hasKey ? `<b>Key saved</b>${s.encrypted ? ', encrypted on this computer' : ''}.` : '<b>No key yet.</b> Claude features stay off until you add one.';
    if ($('#modelQuick')) $('#modelQuick').value = s.models.quick || '';
    if ($('#modelDefault')) $('#modelDefault').value = s.models.default || '';
  } catch (e) {}
}
/* backup: one JSON file with everything a fresh install needs */
async function exportBackup() {
  const dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null;
  if (!dl) { toast("Saving files isn't available here."); return; }
  let talks = [], readings = []; try { talks = (await Store.listTalks()).slice(0, 20); readings = (await Store.listReadings()).slice(0, 30); } catch (e) {}
  const data = JSON.stringify({app:'nihongo-line', v:1, exportedAt:new Date().toISOString(), state:S, custom:CUSTOM, talks, readings}, null, 1);
  try { await dl.save({filename:'nihongo-line-backup-' + today() + '.json', data}); toast('Backup saved.'); }
  catch (e) { if (!e || e.code !== 'declined') toast("The backup couldn't be saved" + (e && e.message ? ': ' + e.message : '.')); }
}
let PENDING_IMPORT = null;
function readBackup(file) {
  const box = $('#importStatus'); if (!file || !box) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const d = JSON.parse(String(fr.result));
      if (!d || d.app !== 'nihongo-line' || !d.state || typeof d.state !== 'object') throw new Error('not a Nihongo Line backup');
      PENDING_IMPORT = d;
      const st = mergeState(defaultState(), clone(d.state));
      const words = Object.values(st.srs).filter(c => c && c.r >= 1).length;
      box.innerHTML = `<div class="notice"><b>Backup from ${esc(new Date(d.exportedAt || Date.now()).toLocaleString())}</b>: ${words} words learned, ${Object.keys(st.stamps).length} stamps, ${Object.keys(st.gram).length} grammar points, ${(d.custom && d.custom.cards || []).length} of your own cards. Loading it replaces your current progress.</div><div class="row"><button class="btn sm" data-action="import-confirm">Replace my progress</button><button class="btn ghost sm" data-action="import-cancel">Cancel</button></div>`;
    } catch (e) { PENDING_IMPORT = null; box.innerHTML = `<div class="notice">That file couldn't be loaded: ${esc(e.message || 'unreadable')}. Choose a .json backup saved from Nihongo Line.</div>`; }
  };
  fr.onerror = () => { box.innerHTML = '<div class="notice">That file couldn\'t be read. Try again.</div>'; };
  fr.readAsText(file);
}
function applyBackup() {
  const d = PENDING_IMPORT; if (!d) return;
  if (TALK && TALK.ctl) TALK.ctl.abort();
  S = mergeState(defaultState(), clone(d.state)); S.ts = Date.now();
  CUSTOM = (d.custom && Array.isArray(d.custom.cards)) ? clone(d.custom) : {cards:[]};
  TALK = null; RV = null; DR = null; UI.inChat = false; UI.gramLv = null;
  buildIndex(); TTS.pick(); saveState(10); saveCustom(); saveDraft();
  (Array.isArray(d.talks) ? d.talks.slice(0, 20).reverse() : []).forEach(t => { if (t && t.id && Array.isArray(t.msgs)) Store.putTalk(clone(t)); });
  (Array.isArray(d.readings) ? d.readings.slice(0, 30) : []).forEach(r => { if (r && r.id && Array.isArray(r.paragraphs)) Store.putReading(clone(r)); });
  rdStop(); RD.cur = null; RD.sel = null; RD.list = null;
  PENDING_IMPORT = null; closeSheet(); render(); toast('Backup loaded.');
}
function applySetting(k, v) {
  S.settings[k] = v; saveState();
  if (k === 'level') { UI.gramLv = null; if (v === 'N4' && S.settings.deck === 'v5') S.settings.deck = 'v4'; if (['N3','N2','N1'].includes(v) && ['v5','v4','k5'].includes(S.settings.deck)) S.settings.deck = 'mine'; }
  if (k === 'rate') { const rv = $('#rateVal'); if (rv) rv.textContent = Number(v).toFixed(2) + '×'; return; }
  if (k === 'ime') { bindIME($('#talkInput')); }
  if (k === 'voice') { TTS.pick(); TTS.speak('こんにちは。'); return; }
  if (['romaji','en'].includes(k)) { const c = $('#chat'); if (c) c.classList.toggle('no-' + k, !v); }
  if (k === 'listen') { const c = $('#chat'); if (c) c.classList.toggle('listen', !!v); }
  if (VIEW === 'talk' && UI.inChat) { renderTop(); const t = document.querySelector(`.tog[data-k="${k}"]`); if (t) { t.classList.toggle('on', !!v); t.setAttribute('aria-pressed', !!v); } const ti = document.querySelector('[data-action="tog-ime"]'); if (ti) { ti.classList.toggle('on', S.settings.ime); } const inp = $('#talkInput'); if (inp && k === 'ime') inp.placeholder = v ? 'Type romaji, it becomes kana…' : 'Reply in Japanese, romaji, or English…'; return; }
  if (k === 'cardDir' && RV) RV.revealed = false;
  if (!['autoplay','listen'].includes(k)) refreshUnderSheet();
}

/* ---------- sheet / toast ---------- */
function openSheet(title, html, key) {
  $('#sheetTitle').innerHTML = title; $('#sheetBody').innerHTML = html; $('#sheetWrap').hidden = false; SHEET = key || title;
  $('#sheetBody').scrollTop = 0; setTimeout(() => { const c = $('#sheetClose'); if (c) c.focus(); }, 0);
}
function closeSheet() {
  $('#sheetWrap').hidden = true; SHEET = null; GEN = null;
  if (LESSON_CTL) LESSON_CTL.abort();
  if (WRAP_CTL) WRAP_CTL.abort();
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2800); }

/* ---------- actions ---------- */
const ACT = {
  go: a => { closeSheet(); go(a.dataset.v); },
  station: a => openStation(a.dataset.code),
  settings: () => openSettings(),
  'close-sheet': () => closeSheet(),
  'talk-setup': a => talkSetup(a.dataset.sc),
  'talk-start': a => talkStart(a.dataset.sc),
  'talk-resume': () => { if (!TALK) return; UI.inChat = true; render(); const last = TALK.turns[TALK.turns.length - 1]; if (!TALK.busy && !TALK.error && (!last || last.role === 'user')) askPartner(); },
  'talk-exit': () => { UI.inChat = false; saveDraft(); render(); },
  'talk-send': () => talkSend(),
  'talk-stop': () => { if (TALK && TALK.ctl) TALK.ctl.abort(); },
  'talk-retry': () => askPartner(),
  'talk-wrap': () => talkWrap(),
  'wrap-stop': () => { if (WRAP_CTL) WRAP_CTL.abort(); else closeSheet(); },
  'review-retry': () => { if (LAST_REVIEW) { $('#sheetBody').innerHTML = '<div class="thinking"><span class="dots"><i></i><i></i><i></i></span><span>Reviewing again…</span></div>'; SHEET = 'wrap'; runReview(LAST_REVIEW); } },
  'review-add': () => { const rv = LAST_REVIEW && LAST_REVIEW.review; if (!rv) return; const items = rv.vocab.filter((v, i) => { const c = $('#rv_' + i); return c && c.checked; }).map(v => ({w:v.w, m:v.m, t:'conversation'})); const n = addCustom(items); toast(n ? `Added ${n} card${n === 1 ? '' : 's'} to My cards.` : 'Those words are already in your decks.'); },
  history: a => { const rec = LAST_HISTORY[Number(a.dataset.i)]; if (!rec) return; openSheet('Session review', '', 'history'); renderReview(rec, rec.review ? null : 'No review was saved for this session.'); },
  say: a => { const m = TALK && TALK.msgs[Number(a.dataset.i)]; if (m && m.data) TTS.speak(m.data.ja); },
  'say-text': a => TTS.speak(a.dataset.t),
  'reveal-en': a => { const m = TALK && TALK.msgs[Number(a.dataset.i)]; if (!m) return; m.showEn = true; const en = a.closest('.msg').querySelector('.en'); if (en) en.classList.add('shown'); a.remove(); },
  tog: a => applySetting(a.dataset.k, !S.settings[a.dataset.k]),
  'tog-ime': () => applySetting('ime', !S.settings.ime),
  hints: () => showSugs(),
  'use-sug': a => { const s = TALK && TALK.sugs[Number(a.dataset.i)]; const el = $('#talkInput'); if (!s || !el) return; el.value = plain(s.ja); autosize(el); el.focus(); $('#sugs').hidden = true; },
  'kana-script': a => { UI.kanaScript = a.dataset.s; DR = null; UI.drillGroups = null; render(); },
  'kana-tap': a => { TTS.speak(kanaChar(a.dataset.id)); a.classList.add('flash'); setTimeout(() => a.classList.remove('flash'), 400); },
  'kana-drill': a => { const g = a.dataset.group; closeSheet(); UI.kanaScript = g[0]; UI.drillGroups = [g]; VIEW = 'kana'; render(); main.scrollTop = 0; drillStart(); },
  'drill-group': a => { const g = a.dataset.g; const set = new Set(UI.drillGroups); if (set.has(g)) { if (set.size > 1) set.delete(g); } else set.add(g); UI.drillGroups = Array.from(set); renderDrill(); },
  'drill-mode': a => { UI.drillMode = a.dataset.m; renderDrill(); },
  'drill-start': () => drillStart(),
  'drill-opt': a => { if (!DR || DR.answered) return; drillAnswer(a.dataset.k === DR.q, {pick:a.dataset.k}); },
  'drill-check': () => checkTyped(),
  'drill-next': () => drillNext(),
  'drill-stop': () => { DR = null; renderDrill(); },
  deck: a => { S.settings.deck = a.dataset.d; saveState(); RV = null; render(); },
  'card-dir': a => applySetting('cardDir', a.dataset.d),
  'rv-start': () => rvStart(),
  'rv-reveal': () => { if (RV && RV.cur) { RV.revealed = true; renderReviewCard(); } },
  'rv-grade': a => rvGrade(Number(a.dataset.g)),
  'rv-end': () => { RV = null; render(); },
  'gen-open': () => openGen(),
  'gen-topic': a => { const i = $('#genTopic'); if (i) i.value = a.dataset.t; document.querySelectorAll('[data-action="gen-topic"]').forEach(b => b.classList.toggle('on', b === a)); },
  'gen-run': () => genRun(),
  'gen-add': () => { if (!GEN || !GEN.items) return; const items = GEN.items.filter((it, i) => { const c = $('#gen_' + i); return c && c.checked; }); const n = addCustom(items); S.settings.deck = 'mine'; saveState(); closeSheet(); RV = null; if (VIEW === 'cards') render(); toast(n ? `Added ${n} card${n === 1 ? '' : 's'} to My cards.` : 'Those words are already in your decks.'); },
  browse: () => openBrowse(),
  'gram-lv': a => { UI.gramLv = a.dataset.lv; render(); },
  'gram-more': a => findMoreGrammar(a.dataset.lv),
  grammar: a => openGrammar(a.dataset.id),
  lesson: a => genLesson(a.dataset.id),
  'lesson-stop': () => { if (LESSON_CTL) LESSON_CTL.abort(); },
  'toggle-learned': a => { const id = a.dataset.id; if (S.gram[id]) delete S.gram[id]; else { S.gram[id] = today(); markDay(); } saveState(); a.textContent = S.gram[id] ? 'Learned ✓' : 'Mark as learned'; refreshUnderSheet(); },
  'quiz-check': a => quizCheck(a.dataset.id),
  'update-check': () => { if (window.nlDesktop && window.nlDesktop.updateCheck) window.nlDesktop.updateCheck(); },
  'update-install': () => { if (window.nlDesktop && window.nlDesktop.updateInstall) window.nlDesktop.updateInstall().then(r => { if (!r || !r.ok) toast('The update isn’t ready yet.'); }).catch(() => {}); },
  'update-later': () => { UPD.later = true; updateBanner(); toast('The update will install when you close the app.'); },
  explain: a => explainLine(Number(a.dataset.i)),
  'rd-tab': a => { RD.tab = a.dataset.t; render(); },
  'rd-length': a => { RD.length = a.dataset.l; document.querySelectorAll('[data-action="rd-length"]').forEach(b => { const on = b === a; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); },
  'rd-topic': a => { const i = $('#rdTopic'); if (i) i.value = a.dataset.t; document.querySelectorAll('[data-action="rd-topic"]').forEach(b => b.classList.toggle('on', b === a)); },
  'rd-write': () => rdWrite(),
  'rd-translate': () => rdTranslate(),
  'rd-stop-gen': () => { if (RD.gen && RD.gen.ctl) RD.gen.ctl.abort(); },
  'rd-dismiss': () => { RD.gen = null; rdShowProgress(); },
  'rd-open': a => { const r = (RD.list || []).find(x => x.id === a.dataset.id); if (r) openReading(clone(r)); },
  'rd-back': () => { rdStop(); RD.cur = null; RD.sel = null; render(); main.scrollTop = 0; },
  'rd-sentence': a => rdSelect(a.dataset.k),
  'rd-move': a => rdMove(Number(a.dataset.d)),
  'rd-close': () => { const k = RD.sel; RD.sel = null; rdRender(); const el = k && document.querySelector(`.rs[data-k="${k}"]`); if (el) el.focus({preventScroll:true}); },
  'rd-say': () => { const s = RD.sel && rdSentence(RD.sel); if (s) { rdStop(); TTS.speak(s.ja); } },
  'rd-explain': () => rdExplain(),
  'rd-word-add': a => { const x = RD.cur && RD.cur.explains[RD.sel]; const w = x && x.words && x.words[Number(a.dataset.j)]; if (!w) return; const n = addCustom([{w:w.base || w.w, m:w.m, t:'reading'}]); toast(n ? 'Added to My cards.' : 'That word is already in your decks.'); if (n) { a.textContent = '✓ Added'; a.disabled = true; } },
  'rd-vocab-add': a => { const v = RD.cur && RD.cur.vocab[Number(a.dataset.i)]; if (!v) return; const n = addCustom([{w:v.w, m:v.m, t:'reading'}]); toast(n ? 'Added to My cards.' : 'That word is already in your decks.'); if (n) { a.textContent = '✓ Added'; a.disabled = true; } },
  'rd-vocab-all': () => { if (!RD.cur) return; const n = addCustom(RD.cur.vocab.map(v => ({w:v.w, m:v.m, t:'reading'}))); toast(n ? `Added ${n} card${n === 1 ? '' : 's'} to My cards.` : 'Those words are already in your decks.'); },
  'rd-play': () => rdPlay(),
  'rd-stop': () => rdStop(),
  'rd-check': () => rdCheck(),
  'rd-delete': async a => {
    if (!a.dataset.armed) { a.dataset.armed = '1'; a.textContent = 'Tap again to delete'; setTimeout(() => { if (a.isConnected) { delete a.dataset.armed; a.textContent = 'Delete this text'; } }, 4000); return; }
    const id = RD.cur && RD.cur.id; if (!id) return; rdStop();
    RD.list = (RD.list || []).filter(r => r.id !== id); RD.cur = null; RD.sel = null; render(); main.scrollTop = 0;
    await Store.deleteReading(id); toast('Deleted.');
  },
  'explain-add': a => { const m = TALK && TALK.msgs[Number(a.dataset.i)]; const w = m && m.explain && m.explain.words && m.explain.words[Number(a.dataset.j)]; if (!w) return; const n = addCustom([{w:w.base || w.w, m:w.m, t:'conversation'}]); toast(n ? 'Added to My cards.' : 'That word is already in your decks.'); if (n) { a.textContent = '✓ Added'; a.disabled = true; } },
  'show-text': a => { const m = TALK && TALK.msgs[Number(a.dataset.i)]; if (!m) return; m.shown = true; const el = a.closest('.msg'); if (el) el.classList.add('shown'); saveDraft(); },
  'goal-expand': a => a.classList.toggle('open'),
  export: () => exportBackup(),
  'import-confirm': () => applyBackup(),
  'import-cancel': () => { PENDING_IMPORT = null; const b = $('#importStatus'); if (b) b.innerHTML = ''; const f = $('#importFile'); if (f) f.value = ''; },
  'key-save': async () => { const i = $('#apiKey'); const k = i ? i.value.trim() : ''; if (!k) { toast('Paste your API key first.'); return; } await window.nlDesktop.setKey(k); i.value = ''; refreshKeyStatus(); toast('Key saved.'); },
  'key-clear': async () => { await window.nlDesktop.setKey(''); refreshKeyStatus(); toast('Key removed.'); },
  'models-save': async () => { await window.nlDesktop.setModels({quick:($('#modelQuick') || {}).value || '', default:($('#modelDefault') || {}).value || ''}); refreshKeyStatus(); toast('Models saved.'); },
  'key-test': async a => {
    const sample = await getSample(); if (!sample) { toast(aiError({code:'not_granted'})); return; }
    a.disabled = true; a.textContent = 'Testing…';
    try { const r = await sample('Reply with exactly: はい、つながりました。', {modelTier:'quick', cache:false}); toast('Connected: ' + r.text.trim().slice(0, 40)); }
    catch (e) { toast(aiError(e) + (e && e.message && window.nlDesktop ? ' (' + e.message.slice(0, 80) + ')' : '')); }
    finally { a.disabled = false; a.textContent = 'Test connection'; }
  },
  reset: a => {
    if (!a.dataset.armed) { a.dataset.armed = '1'; a.textContent = 'Tap again to erase everything'; setTimeout(() => { if (a.isConnected) { delete a.dataset.armed; a.textContent = 'Erase all progress'; } }, 5000); return; }
    if (TALK && TALK.ctl) TALK.ctl.abort();
    S = defaultState(); CUSTOM = {cards:[]}; TALK = null; RV = null; DR = null; UI.inChat = false; UI.gramLv = null; buildIndex();
    rdStop(); RD.cur = null; RD.sel = null; RD.list = [];
    saveState(10); saveCustom(); saveDraft(); Store.local('lessons', null); Store.clearTalks(); Store.clearReadings(); closeSheet(); render(); toast('Progress erased.');
  }
};
document.addEventListener('click', e => {
  const a = e.target.closest('[data-action]'); if (!a || a.disabled) return;
  const f = ACT[a.dataset.action]; if (f) { e.preventDefault(); f(a, e); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'importFile') { readBackup(el.files && el.files[0]); return; }
  if (el.id === 'setAutoUpd') { if (window.nlDesktop && window.nlDesktop.setAutoUpdate) window.nlDesktop.setAutoUpdate(el.checked); return; }
  if (el.id === 'rdFile') { rdReadFile(el.files && el.files[0]); el.value = ''; return; }
  if (el.id === 'rdMode') { RD.modeTouched = true; return; }
  const k = el.dataset && el.dataset.set; if (!k) return;
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (k === 'rate') v = Number(v); if (k === 'newPerDay') v = Number(v);
  applySetting(k, v);
  if (k === 'level' && el.id === 'setLevel') { const top = $('#topLevel'); if (top) top.value = v; }
});
document.addEventListener('input', e => {
  if (e.target.id === 'talkInput') autosize(e.target);
  if (e.target.id === 'rdSource') { RD.fileName = ''; rdAutoMode(e.target.value); }
  if (e.target.id === 'setRate') { const rv = $('#rateVal'); if (rv) rv.textContent = Number(e.target.value).toFixed(2) + '×'; }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && SHEET) { closeSheet(); return; }
  const t = e.target;
  if ((e.key === 'Enter' || e.key === ' ') && t.getAttribute && t.getAttribute('role') === 'button' && t.dataset && t.dataset.action) { e.preventDefault(); t.click(); return; }
  if (VIEW === 'read' && RD.cur && !SHEET && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); rdMove(e.key === 'ArrowRight' ? 1 : -1); return; }
  if (t.id === 'talkInput' && e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); talkSend(); return; }
  if (t.id === 'drillInput' && e.key === 'Enter') { e.preventDefault(); checkTyped(); return; }
  if (SHEET || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
  /* shortcuts only act when focus is on the page itself or inside the panel they belong to, so Enter on another button still presses that button */
  const free = panel => t === document.body || t === document.documentElement || !t.closest('button,a,label') || !!t.closest(panel);
  if (VIEW === 'kana' && DR && !DR.finished && free('#drill')) {
    if (DR.answered && !DR.answered.ok && e.key === 'Enter') { e.preventDefault(); drillNext(); return; }
    if (!DR.answered && DR.opts && /^[1-4]$/.test(e.key) && DR.mode !== 'type') { const o = DR.opts[Number(e.key) - 1]; if (o) { e.preventDefault(); drillAnswer(o === DR.q, {pick:o}); } return; }
  }
  if (VIEW === 'cards' && RV && RV.cur && free('#review')) {
    if ((e.key === ' ' || e.key === 'Enter') && !RV.revealed) { e.preventDefault(); RV.revealed = true; renderReviewCard(); }
    else if (RV.revealed && /^[1-4]$/.test(e.key)) { e.preventDefault(); rvGrade(Number(e.key)); }
  }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { Store.flushPending('state', () => S); Store.flushPending('custom', () => CUSTOM); saveDraft(); } });

/* ---------- desktop app updates (the shell downloads them; this shows the state) ---------- */
const UPD = {state:'idle', version:'', progress:0, message:'', later:false};
function updateStatusHTML() {
  const v = esc(UPD.version || '');
  switch (UPD.state) {
    case 'checking': return 'Checking for updates…';
    case 'none': return 'You have the latest version.';
    case 'available': return `Version ${v} is available. Press Check for updates to download it.`;
    case 'downloading': return `Downloading version ${v}… ${UPD.progress || 0}%`;
    case 'ready': return `<b>Version ${v} is ready.</b> <button class="btn sm" data-action="update-install">Restart and update</button>`;
    case 'error': return `Couldn’t check for updates: ${esc(UPD.message || 'no connection')}. It will try again later.`;
    case 'unsupported': return 'Updates install through the Nihongo Line installer. This copy can’t update itself.';
    default: return 'Updates are checked a few seconds after the app opens, then every few hours.';
  }
}
function updateBanner() {
  let el = $('#updBar'); const show = UPD.state === 'ready' && !UPD.later;
  if (!show) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement('div'); el.id = 'updBar'; el.className = 'updbar'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.hidden = false;
  el.innerHTML = `<span><b>Nihongo Line ${esc(UPD.version)} is ready.</b> Restart to finish updating.</span><button class="btn sm" data-action="update-install">Restart now</button><button class="btn sm ghost" data-action="update-later">Later</button>`;
}
function onUpdateState(s) {
  if (!s || typeof s !== 'object') return;
  Object.assign(UPD, {state:s.state || 'idle', version:s.version || '', progress:s.progress || 0, message:s.message || ''});
  updateBanner();
  const st = $('#updStatus'); if (st) st.innerHTML = updateStatusHTML();
  if (s.manual && SHEET !== 'settings') { if (s.state === 'none') toast('You have the latest version.'); else if (s.state === 'error') toast('Couldn’t check for updates.'); }
}
const APP_VERSION = {v:window.NL_VERSION || ''};
if (window.nlDesktop) {
  if (window.nlDesktop.info) window.nlDesktop.info().then(i => { if (i && i.version) APP_VERSION.v = i.version; }).catch(() => {});
  if (window.nlDesktop.onUpdate) window.nlDesktop.onUpdate(onUpdateState);
  if (window.nlDesktop.updateState) window.nlDesktop.updateState().then(onUpdateState).catch(() => {});
}

/* automated UI tests (tests/ui.test.js) read the app's data and state through this; real viewers never have navigator.webdriver */
if (navigator.webdriver) {
  window.__nl = { GRAMMAR, GR, STATIONS, STN, SCENARIOS, SC, LEVELS, KANA_ALL, ruby, plain, schedule, chunkText, normReading, normReply,
    get S() { return S; }, get CUSTOM() { return CUSTOM; }, get DECKS() { return DECKS; }, get TALK() { return TALK; }, get RD() { return RD; } };
}

/* ---------- boot ---------- */
S = mergeState(defaultState(), Store.local('state'));
const lc = Store.local('custom'); if (lc && Array.isArray(lc.cards)) CUSTOM = lc;
const draft = Store.local('talk');
if (draft && draft.scId && scenarioFor(draft.scId) && Array.isArray(draft.msgs) && Array.isArray(draft.turns)) TALK = Object.assign(draft, {sc:scenarioFor(draft.scId), sugs:Array.isArray(draft.sugs) ? draft.sugs : [], busy:false, ctl:null, error:null});
draft && TALK && TALK.msgs.forEach(m => { m.explaining = false; });
buildIndex();
TTS.pick();
render();
Store.init().then(r => {
  if (!r) return;
  if (r.state && (r.state.ts || 0) >= (S.ts || 0)) S = mergeState(defaultState(), r.state);
  else if (S.ts) saveState(200);
  if (r.custom && Array.isArray(r.custom.cards) && (r.custom.cards.length || !CUSTOM.cards.length)) CUSTOM = r.custom;
  else if (CUSTOM.cards.length) saveCustom();
  buildIndex(); TTS.pick();
  if (!RD.cur) RD.list = null;
  if (!(VIEW === 'talk' && UI.inChat) && !RV && !DR && !RD.cur) render(); else renderTop();
});
})();
