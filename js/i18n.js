// 日本語 / English
//   言語は ?lang=ja|en → 前回選んだ言語 → ブラウザの言語（日本語以外は英語）の順で決める

const KEY = 'tempura.lang';
function detect() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'ja' || q === 'en') { try { localStorage.setItem(KEY, q); } catch { /* 保存できなくても続行 */ } return q; }
  try { const s = localStorage.getItem(KEY); if (s === 'ja' || s === 'en') return s; } catch { /* 読めなくても続行 */ }
  return (navigator.language || '').toLowerCase().startsWith('ja') ? 'ja' : 'en';
}
export const LANG = detect();

export function setLang(lang) {
  try { localStorage.setItem(KEY, lang); } catch { /* 保存できなくても続行 */ }
  const u = new URL(location.href);
  u.searchParams.delete('lang');
  location.href = u.toString();
}

const DICT = {
  ja: {
    pageTitle: 'てんぷら職人',
    pageDesc: '泡と音で揚げ頃を見極め、てんぷらをカラッと揚げる3Dゲーム',
    title: 'てんぷら職人',
    tagline: '油の音を聴き、泡を見て、カラッと揚げろ。',
    start: '営業開始（2分30秒）',
    master: '職人モード：揚げ時間を隠す（得点 ×1.3）',
    bgm: 'BGM（バッハ 平均律 前奏曲 ハ長調）',
    howto: '遊び方を見る ›',
    howtoHref: 'howto.html',
    sound: '音が出ます。',
    remain: '残り',
    sales: '売上',
    pause: '一時停止',
    paused: '一時停止',
    resume: '再開',
    toTitle: 'タイトルへ',
    closed: '本日の営業終了',
    again: 'もう一度',
    loading: '読み込み中…',
    prepSound: '仕込み中…（音）',
    prepIng: '仕込み中…（{name}）',
    prepDone: '仕込み完了',
    pts: '点',
    sec: '秒',
    detail: '揚げ色:{color} ／ 両面:{even} ／ 火通り:{done} ／ 食感:{crisp}',
    leaveAngry: 'もういいよ！',
    thanks: 'ごちそうさま！',
    great: 'カラッと最高！',
    good: 'うまい！',
    ok: 'うん、悪くない',
    bad: 'これはちょっと…',
    gFlipIn: 'あと{n}秒で返す',
    gFlipNow: '今だ！タップで返す',
    gFlipLate: '返して！焦げはじめます',
    gLiftIn: 'あと{n}秒で上げる',
    gLiftNow: '上げどき！網へドラッグ',
    gLiftLate: '揚げすぎ！早く上げて',
    tickFlip: '{n}秒 返す',
    tickLift: '{n}秒 上げる',
    guideMore: 'ほか{n}品',
    warnFull: '鍋がいっぱい。揚がったものから網に上げよう',
    warnTemp: '入れすぎで油温が下がっている…ベチャッとなるぞ',
    ranks: ['見習い', '駆け出し', '一人前', '板前', '名人', '天ぷらの神'],
    res85: '泡と音がよく見えている。見事な揚げ場でした。',
    res70: 'いい腕だ。返すタイミングを揃えればもっと良くなる。',
    res50: '泡が細かくなるまで待ち、途中で一度返してみよう。',
    res0: '泡の変化をよく見て、途中で返すところから始めよう。',
    rSales: '売上', rServed: 'お出しした天ぷら', rFried: '揚げた数', rAvg: '平均の出来', rBest: '最高の一品',
    rPerfect: 'カラッと（90点以上）', rMissed: '帰ってしまったお客さん', rMaster: '職人モード',
    uPts: '点', uItems: '品', uPeople: '人',
    // 採点のコメント
    cBurntSide: '片面が焦げてしまった…返すのが遅い',
    cBurnt: '真っ黒に焦げてしまった…',
    cRaw: '中がまだ生…もう少し待とう',
    cOneWhite: '片面だけ白い。途中で返そう',
    cOneDark: '片面だけ色が濃い。返すのが遅い',
    cGreasy: 'ベチャッと油っぽい…入れすぎで油温が下がった',
    cPale: '白っぽい。揚げが足りない',
    cPerfect: 'カラッと揚がった！見事！',
    cNice: 'いい揚げ色だ',
    cOver: '揚げすぎて固くなった',
    cFair: 'まずまず',
    cDarkish: 'ちょっと色が濃い',
    cAlmost: 'もうひと息',
    colors: ['白い', '薄いきつね色', 'きつね色', '濃いめ', '焦げ'],
    donenesses: ['生', '半生', 'ちょうど', '揚げすぎ'],
    crisps: ['カラッ', 'ふつう', 'ベチャ'],
    evens: ['均一', 'ややムラ', '片面'],
    names: { hotate: 'ほたて', kaki: '牡蠣', anago: '穴子', ebi: 'えび', kisu: 'きす', nasu: 'なす', shishito: 'ししとう', renkon: 'れんこん', maitake: 'まいたけ', kakiage: 'かき揚げ' },
  },
  en: {
    pageTitle: 'Tempura Master',
    pageDesc: 'A 3D game where you read the bubbles and the sound to fry perfectly crisp tempura',
    title: 'Tempura Master',
    tagline: 'Listen to the oil, watch the bubbles, fry it crisp.',
    start: 'Open the shop (2:30)',
    master: 'Master mode: hide frying time (score ×1.3)',
    bgm: 'Music (Bach: Prelude in C major, WTC I)',
    howto: 'How to play ›',
    howtoHref: 'howto.en.html',
    sound: 'This game has sound.',
    remain: 'Time',
    sales: 'Sales',
    pause: 'Pause',
    paused: 'Paused',
    resume: 'Resume',
    toTitle: 'Title',
    closed: 'Closing time',
    again: 'Play again',
    loading: 'Loading…',
    prepSound: 'Preparing… (sounds)',
    prepIng: 'Preparing… ({name})',
    prepDone: 'Ready',
    pts: 'pts',
    sec: 's',
    detail: 'Color: {color} / Sides: {even} / Inside: {done} / Texture: {crisp}',
    leaveAngry: 'Forget it!',
    thanks: 'Thank you!',
    great: 'Perfectly crisp!',
    good: 'Delicious!',
    ok: 'Not bad.',
    bad: 'Hmm, not great…',
    gFlipIn: 'Flip in {n}s',
    gFlipNow: 'Now! Tap to flip',
    gFlipLate: 'Flip it! It’s burning',
    gLiftIn: 'Lift in {n}s',
    gLiftNow: 'Ready! Drag to the rack',
    gLiftLate: 'Overdone! Lift it now',
    tickFlip: 'flip {n}s',
    tickLift: 'lift {n}s',
    guideMore: '+{n} more',
    warnFull: 'The pot is full. Lift the finished ones first',
    warnTemp: 'Too many pieces — the oil is cooling down and they’ll turn soggy',
    ranks: ['Apprentice', 'Novice', 'Cook', 'Chef', 'Master', 'Tempura God'],
    res85: 'You read the bubbles and the sound perfectly. A superb shift.',
    res70: 'Good hands. Even out your flip timing to do even better.',
    res50: 'Wait until the bubbles get small, and flip once halfway.',
    res0: 'Start by watching the bubbles change and flipping halfway.',
    rSales: 'Sales', rServed: 'Tempura served', rFried: 'Pieces fried', rAvg: 'Average quality', rBest: 'Best piece',
    rPerfect: 'Crisp (90+ pts)', rMissed: 'Customers who left', rMaster: 'Master mode',
    uPts: 'pts', uItems: '', uPeople: '',
    cBurntSide: 'One side is burnt… flipped too late',
    cBurnt: 'Burnt black…',
    cRaw: 'Still raw inside… wait a bit longer',
    cOneWhite: 'One side is still pale. Flip it halfway',
    cOneDark: 'One side is too dark. Flipped too late',
    cGreasy: 'Soggy and oily… too many pieces cooled the oil',
    cPale: 'Too pale. Not fried enough',
    cPerfect: 'Perfectly crisp! Superb!',
    cNice: 'Nice golden color',
    cOver: 'Overcooked and tough',
    cFair: 'Not bad',
    cDarkish: 'A little too dark',
    cAlmost: 'Almost there',
    colors: ['pale', 'light golden', 'golden', 'dark', 'burnt'],
    donenesses: ['raw', 'underdone', 'just right', 'overdone'],
    crisps: ['crisp', 'okay', 'soggy'],
    evens: ['even', 'a bit uneven', 'one-sided'],
    names: { hotate: 'Scallop', kaki: 'Oyster', anago: 'Eel', ebi: 'Shrimp', kisu: 'Whiting', nasu: 'Eggplant', shishito: 'Shishito', renkon: 'Lotus', maitake: 'Maitake', kakiage: 'Kakiage' },
  },
};

const D = DICT[LANG];
export function t(key, vars) {
  let s = D[key] ?? DICT.ja[key] ?? key;
  if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return s;
}
export const ingName = (key) => D.names[key];

// HTML の data-i18n / data-i18n-title / data-i18n-href を置き換える
export function applyStatic(root = document) {
  document.documentElement.lang = LANG;
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
  for (const el of root.querySelectorAll('[data-i18n-href]')) el.href = t(el.dataset.i18nHref);
  document.title = t('pageTitle');
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.content = t('pageDesc');
}
