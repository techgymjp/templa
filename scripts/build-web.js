// Android アプリに同梱する Web ファイルを www/ にコピーする
//   - Web 版は three.js と Google Fonts をインターネットから読み込んでいるが、
//     アプリはオフラインで遊べるよう、どちらも www/vendor/ に同梱して読み込み先を書き換える
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const item of ['index.html', 'howto.html', 'howto.en.html', 'css', 'js']) {
  const src = path.join(root, item);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(out, item), { recursive: true });
}

// ---------- three.js（ゲームが使う部品だけをコピー） ----------
const threeDir = path.join(root, 'node_modules', 'three');
const vendorThree = path.join(out, 'vendor', 'three');
const copied = new Set();
function copyThree(rel) {
  if (copied.has(rel)) return;
  copied.add(rel);
  const src = path.join(threeDir, rel);
  const dst = path.join(vendorThree, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  // その部品が読み込むほかの部品（相対パス）もたどってコピーする
  const code = fs.readFileSync(src, 'utf8');
  for (const m of code.matchAll(/(?:import|export)\s[^'"]*?from\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
    copyThree(path.posix.join(path.posix.dirname(rel), m[1]));
  }
}
copyThree('build/three.module.js');
for (const f of fs.readdirSync(path.join(root, 'js'))) {
  if (!f.endsWith('.js')) continue;
  const code = fs.readFileSync(path.join(root, 'js', f), 'utf8');
  for (const m of code.matchAll(/from\s*['"]three\/addons\/([^'"]+)['"]/g)) copyThree('examples/jsm/' + m[1]);
}
fs.copyFileSync(path.join(threeDir, 'LICENSE'), path.join(vendorThree, 'LICENSE'));

// ---------- フォント（Google Fonts の代わりに同梱） ----------
const vendorFonts = path.join(out, 'vendor', 'fonts');
fs.mkdirSync(path.join(vendorFonts, 'files'), { recursive: true });
let fontCss = '/* Yuji Syuku / Zen Maru Gothic（SIL Open Font License 1.1。@fontsource から同梱） */\n';
for (const [pkg, weights] of [['yuji-syuku', ['400']], ['zen-maru-gothic', ['500', '700']]]) {
  const dir = path.join(root, 'node_modules', '@fontsource', pkg);
  for (const w of weights) {
    // Android の WebView は woff2 に対応しているので、古い形式（woff）は入れない（アプリを小さくする）
    const css = fs.readFileSync(path.join(dir, `${w}.css`), 'utf8').replace(/,\s*url\(\.\/files\/[^)]+\.woff\) format\('woff'\)/g, '');
    for (const m of css.matchAll(/url\(\.\/files\/([^)]+)\)/g)) {
      const dst = path.join(vendorFonts, 'files', m[1]);
      if (!fs.existsSync(dst)) fs.copyFileSync(path.join(dir, 'files', m[1]), dst);
    }
    fontCss += css + '\n';
  }
  fs.copyFileSync(path.join(dir, 'LICENSE'), path.join(vendorFonts, `${pkg}.LICENSE`));
}
fs.writeFileSync(path.join(vendorFonts, 'fonts.css'), fontCss);

// ---------- HTML の読み込み先を書き換える ----------
for (const page of ['index.html', 'howto.html', 'howto.en.html']) {
  const file = path.join(out, page);
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');
  html = html
    .replace('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js', './vendor/three/build/three.module.js')
    .replace('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/', './vendor/three/examples/jsm/')
    .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>/, '')
    .replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]*" rel="stylesheet" \/>/, '<link rel="stylesheet" href="vendor/fonts/fonts.css" />');
  if (/fonts\.googleapis|cdn\.jsdelivr/.test(html)) throw new Error(`${page}: インターネットからの読み込みが残っています`);
  fs.writeFileSync(file, html);
}

// Google Play 用のビルドでは本番の広告を使う
const mode = process.env.ADMOB_MODE === 'production' ? 'production' : 'test';
fs.writeFileSync(path.join(out, 'js', 'ads-config.js'), `// ビルド時に生成\nwindow.AD_MODE = '${mode}';\n`);
// タイトル画面に出すバージョン（CI では VERSION_NAME / VERSION_CODE を使う）
const version = process.env.VERSION_CODE
  ? `v${process.env.VERSION_NAME || require('../package.json').version} (build ${process.env.VERSION_CODE})`
  : 'dev';
fs.writeFileSync(path.join(out, 'js', 'build-info.js'), `// ビルド時に生成\nwindow.APP_VERSION = '${version}';\n`);
console.log(`built web assets into www/ (ads: ${mode}, version: ${version}, three.js files: ${copied.size})`);
