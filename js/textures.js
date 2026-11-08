// 手続き生成テクスチャ（外部画像なし）
import * as THREE from 'three';

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

// 周期的（タイル可能）なバリューノイズ
function hash2(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function pnoise(x, y, period, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const m = (a) => ((a % period) + period) % period;
  const a = hash2(m(xi), m(yi), s), b = hash2(m(xi + 1), m(yi), s);
  const c = hash2(m(xi), m(yi + 1), s), d = hash2(m(xi + 1), m(yi + 1), s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, base, oct, s = 0) {
  let r = 0, amp = 0.5, f = base, tot = 0;
  for (let i = 0; i < oct; i++) {
    r += amp * pnoise(x * f, y * f, f, s + i * 17);
    tot += amp; amp *= 0.5; f *= 2;
  }
  return r / tot;
}

// 高さ配列 → 法線マップ
function heightToNormal(h, size, strength) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
    const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const len = Math.hypot(dx, dy, 1);
    const i = (y * size + x) * 4;
    img.data[i] = (-dx / len * 0.5 + 0.5) * 255;
    img.data[i + 1] = (dy / len * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function tex(c, { repeat = 1, srgb = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const cache = {};
const once = (k, f) => cache[k] || (cache[k] = f());

// 檜のカウンター
export const hinoki = () => once('hinoki', () => {
  const S = 1024, c = canvas(S), ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S;
    const warp = fbm(u, v, 3, 4, 2) * 2.2;
    const ring = Math.sin((v * 34 + warp * 6 + fbm(u, v, 8, 2, 9) * 0.6) * Math.PI);
    const g = Math.pow(Math.abs(ring), 7);
    const fine = fbm(u, v * 0.2, 64, 2, 5);
    const i = (y * S + x) * 4;
    const k = 1 - g * 0.18 - fine * 0.07;
    img.data[i] = 232 * k; img.data[i + 1] = 204 * k; img.data[i + 2] = 158 * k * (1 - g * 0.1); img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return tex(c, { srgb: true });
});

// 槌目の銅（色・法線・粗さ）
export const copper = () => once('copper', () => {
  const S = 512;
  const h = new Float32Array(S * S);
  // 槌で打ったくぼみ
  for (let n = 0; n < 900; n++) {
    const cx = Math.random() * S, cy = Math.random() * S, r = 8 + Math.random() * 14;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y) / r;
      if (d >= 1) continue;
      const px = ((Math.round(cx + x) % S) + S) % S, py = ((Math.round(cy + y) % S) + S) % S;
      const dep = Math.cos(d * Math.PI / 2) ** 2;
      h[py * S + px] = Math.min(h[py * S + px], -dep);
    }
  }
  const normal = heightToNormal(h, S, 1.4);
  const c = canvas(S), ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const n = fbm(x / S, y / S, 4, 4, 3);
    const i = (y * S + x) * 4;
    const k = 0.85 + n * 0.3 + h[y * S + x] * 0.06;
    // 使い込んだ銅：ところどころ焼けた色
    const burn = Math.max(0, fbm(x / S, y / S, 2, 3, 8) - 0.55) * 2.5;
    img.data[i] = Math.min(255, 205 * k * (1 - burn * 0.35));
    img.data[i + 1] = Math.min(255, 112 * k * (1 - burn * 0.45));
    img.data[i + 2] = Math.min(255, 70 * k * (1 - burn * 0.3));
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { map: tex(c, { srgb: true }), normalMap: tex(normal) };
});

// 油面のゆらぎ法線
export const oilNormal = () => once('oil', () => {
  const S = 256, h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) h[y * S + x] = fbm(x / S, y / S, 4, 4, 11);
  return tex(heightToNormal(h, S, 6));
});

// 衣の細かいざらつき（バンプ）
export const batterBump = () => once('batter', () => {
  const S = 256, c = canvas(S), ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = fbm(x / S, y / S, 16, 3, 21);
    v = Math.pow(v, 1.6) + (hash2(x, y, 3) > 0.985 ? 0.4 : 0);
    const i = (y * S + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, v * 255); img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return tex(c);
});

// ボウルの中の衣液
export const batterLiquid = () => once('batterLiquid', () => {
  const S = 512, c = canvas(S), ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const n = fbm(x / S, y / S, 4, 5, 31);
    const lump = Math.pow(fbm(x / S, y / S, 12, 2, 41), 3);
    h[y * S + x] = n * 0.6 + lump * 1.2;
    const i = (y * S + x) * 4;
    const k = 0.93 + lump * 0.25 - n * 0.06;
    img.data[i] = Math.min(255, 240 * k); img.data[i + 1] = Math.min(255, 228 * k); img.data[i + 2] = Math.min(255, 196 * k); img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { map: tex(c, { srgb: true }), normalMap: tex(heightToNormal(h, S, 3)) };
});

// 天紙（和紙）
export const washi = () => once('washi', () => {
  const S = 512, c = canvas(S), ctx = c.getContext('2d');
  ctx.fillStyle = '#f7f4ec'; ctx.fillRect(0, 0, S, S);
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 1600; i++) {
    ctx.strokeStyle = Math.random() > 0.5 ? '#b8ad95' : '#ffffff';
    ctx.lineWidth = 0.6 + Math.random();
    const x = Math.random() * S, y = Math.random() * S, a = Math.random() * 6.28, l = 4 + Math.random() * 20;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a + 1) * l * 0.5, y + Math.sin(a + 1) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  return tex(c, { srgb: true });
});

// 油じみ（天紙に揚げ物を置いた跡）
export const oilStain = () => once('stain', () => {
  const S = 128, c = canvas(S), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(214,170,80,0.5)');
  g.addColorStop(0.6, 'rgba(214,170,80,0.28)');
  g.addColorStop(1, 'rgba(214,170,80,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
});

// 陶器の釉薬（黒飴釉）
export const glaze = () => once('glaze', () => {
  const S = 512, c = canvas(S), ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const n = fbm(x / S, y / S, 3, 5, 51);
    const drip = fbm(x / S * 0.3, y / S * 3, 4, 3, 61);
    const sp = hash2(x, y, 9) > 0.996 ? 0.6 : 0;
    const i = (y * S + x) * 4;
    const k = 0.5 + n * 0.5 + drip * 0.4 + sp;
    img.data[i] = Math.min(255, 70 * k); img.data[i + 1] = Math.min(255, 38 * k); img.data[i + 2] = Math.min(255, 20 * k); img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return tex(c, { srgb: true });
});

// やわらかい丸（湯気・煙）
export const softDot = () => once('dot', () => {
  const S = 64, c = canvas(S), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
});

// 具材の表面ムラ（色に掛ける）
export const speckle = (seed, base, spots) => once('speckle' + seed, () => {
  const S = 256, c = canvas(S), ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  const bc = new THREE.Color(base), sc = new THREE.Color(spots);
  const col = new THREE.Color();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const n = fbm(x / S, y / S, 6, 4, seed);
    col.copy(bc).lerp(sc, Math.max(0, Math.min(1, (n - 0.35) * 2)));
    const i = (y * S + x) * 4;
    img.data[i] = col.r * 255; img.data[i + 1] = col.g * 255; img.data[i + 2] = col.b * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return tex(c, { srgb: true });
});
