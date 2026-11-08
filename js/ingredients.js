// 具材の定義と3Dモデル生成
import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';
import { batterBump, speckle } from './textures.js';
import { LOW } from './quality.js';

// ---------------------------------------------------------------
// 揚げ物モデル（油温は店が適温に保っている。入れすぎたときだけ下がる）
//   cook  : 中の火通り。1.0 で火が通る（cookTime 秒 @175℃）
//   brownA/brownB : 衣の両面の揚げ色。1.0 がきつね色
//     油に浸かっている面は速く、上の面はゆっくり色づく → 途中で返すと均一になる
//   grease: 油温が下がった状態で揚げると増える（ベチャッ）
// ---------------------------------------------------------------
const DEFS = {
  hotate:   { name: 'ほたて',   cookTime: 8, radius: 0.5 },
  kaki:     { name: '牡蠣',     cookTime: 9, radius: 0.6 },
  anago:    { name: '穴子',     cookTime: 14, radius: 1.15 },
  ebi:      { name: 'えび',     cookTime: 11, radius: 0.95 },
  kisu:     { name: 'きす',     cookTime: 9, radius: 0.9 },
  nasu:     { name: 'なす',     cookTime: 12, radius: 0.85 },
  shishito: { name: 'ししとう', cookTime: 6, radius: 0.55 },
  renkon:   { name: 'れんこん', cookTime: 14, radius: 0.65 },
  maitake:  { name: 'まいたけ', cookTime: 8, radius: 0.65 },
  kakiage:  { name: 'かき揚げ', cookTime: 18, radius: 0.8 },
};

for (const [key, d] of Object.entries(DEFS)) d.key = key;
export const INGREDIENTS = DEFS;
export const INGREDIENT_KEYS = Object.keys(DEFS);

export const SUBMERGED = 1.55, EXPOSED = 0.45;
export function cookRate(def, T) { return Math.max(0.15, (T - 105) / 70) / def.cookTime; }
export function brownRate(def, T) { return T < 110 ? 0 : Math.pow(2, (T - 175) / 15) / (def.cookTime * 1.1); }

// ---------------------------------------------------------------
// 評価
// ---------------------------------------------------------------
const gauss = (b) => Math.exp(-Math.pow((b - 1.0) / 0.4, 2));
export function evaluate(item) {
  const { cook: c, brownA: a, brownB: bb, grease: g } = item;
  const b = (a + bb) / 2, uneven = Math.abs(a - bb);
  const colorS = Math.sqrt(gauss(a) * gauss(bb));
  const cookS = c >= 0.95 ? 1 : Math.pow(Math.max(0, (c - 0.55) / 0.4), 2);
  const overS = c > 1.6 ? Math.max(0.5, 1 - (c - 1.6) * 0.8) : 1;
  const crispS = 1 - 0.65 * Math.min(1, g);
  const score = Math.round(100 * Math.pow(colorS, 0.8) * cookS * overS * crispS);
  const hi = Math.max(a, bb), lo = Math.min(a, bb);

  let comment;
  if (hi > 1.75) comment = uneven > 0.6 ? '片面が焦げてしまった…返すのが遅い' : '真っ黒に焦げてしまった…';
  else if (c < 0.8) comment = '中がまだ生…もう少し待とう';
  else if (uneven > 0.5) comment = lo < 0.7 ? '片面だけ白い。途中で返そう' : '片面だけ色が濃い。返すのが遅い';
  else if (g > 0.45) comment = 'ベチャッと油っぽい…入れすぎで油温が下がった';
  else if (b < 0.6) comment = '白っぽい。揚げが足りない';
  else if (score >= 92) comment = 'カラッと揚がった！見事！';
  else if (score >= 78) comment = 'いい揚げ色だ';
  else if (c > 1.6) comment = '揚げすぎて固くなった';
  else if (score >= 55) comment = 'まずまず';
  else if (b > 1.3) comment = 'ちょっと色が濃い';
  else comment = 'もうひと息';

  const color = b < 0.6 ? '白い' : b < 0.85 ? '薄いきつね色' : b < 1.2 ? 'きつね色' : b < 1.5 ? '濃いめ' : '焦げ';
  const doneness = c < 0.8 ? '生' : c < 1 ? '半生' : c <= 1.6 ? 'ちょうど' : '揚げすぎ';
  const crisp = g < 0.15 ? 'カラッ' : g < 0.45 ? 'ふつう' : 'ベチャ';
  const evenness = uneven < 0.25 ? '均一' : uneven < 0.5 ? 'ややムラ' : '片面';
  return { score, comment, color, doneness, crisp, evenness };
}

// ---------------------------------------------------------------
// 衣の色
// ---------------------------------------------------------------
const STOPS = [
  [0.0, new THREE.Color('#f5f0e2')],
  [0.45, new THREE.Color('#f3e2ad')],
  [0.8, new THREE.Color('#ebc574')],
  [1.05, new THREE.Color('#dca14a')],
  [1.35, new THREE.Color('#b8722a')],
  [1.7, new THREE.Color('#6e3c14')],
  [2.3, new THREE.Color('#24150b')],
];
export function batterColor(b, out = new THREE.Color()) {
  if (b <= STOPS[0][0]) return out.copy(STOPS[0][1]);
  for (let i = 1; i < STOPS.length; i++) {
    if (b <= STOPS[i][0]) {
      const [b0, c0] = STOPS[i - 1], [b1, c1] = STOPS[i];
      return out.copy(c0).lerp(c1, (b - b0) / (b1 - b0));
    }
  }
  return out.copy(STOPS[STOPS.length - 1][1]);
}

// ---------------------------------------------------------------
// ノイズ
// ---------------------------------------------------------------
function hash3(x, y, z, s) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise3(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  let r = 0;
  for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++) {
    const wt = (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
    r += wt * hash3(xi + dx, yi + dy, zi + dz, s);
  }
  return r;
}

// 衣：元の形を細かく分割してから膨らませ、ざらざらの凹凸を加える
function makeCoat(geo, thick, bump, seed, tinted = false, edge = 0.045) {
  let g = geo.clone();
  if (g.attributes.uv) g.deleteAttribute('uv');
  g = g.index ? g.toNonIndexed() : g;
  g = new TessellateModifier(LOW ? edge * 1.7 : edge, 6).modify(g);
  g.deleteAttribute('normal');
  if (g.attributes.uv) g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-3);
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal;
  const v = new THREE.Vector3();
  const base = tinted ? g.attributes.color : null;
  const col = new Float32Array(p.count * 3), uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n1 = noise3(v.x * 5, v.y * 5, v.z * 5, seed);
    const n2 = noise3(v.x * 14, v.y * 14, v.z * 14, seed + 7);
    const n3 = noise3(v.x * 34, v.y * 34, v.z * 34, seed + 13);
    const ridge = Math.pow(n2, 3) * 2.4;
    const d = thick * (0.5 + 0.8 * n1) + bump * ridge + bump * 0.6 * (n3 - 0.5);
    p.setXYZ(i, v.x + n.getX(i) * d, v.y + n.getY(i) * d, v.z + n.getZ(i) * d);
    // 出っ張った所・薄い所は早く色づく（揚げムラ）
    const k = 1 - Math.min(0.32, ridge * 0.22) - n1 * 0.1 + (n3 - 0.5) * 0.08;
    const br = base ? base.getX(i) : 1, bg = base ? base.getY(i) : 1, bb = base ? base.getZ(i) : 1;
    col[i * 3] = k * br; col[i * 3 + 1] = k * 0.965 * bg; col[i * 3 + 2] = k * 0.92 * bb;
    uv[i * 2] = v.x * 1.3 + v.y * 0.7; uv[i * 2 + 1] = v.z * 1.3 + v.y * 0.7;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------
// 形状
// ---------------------------------------------------------------
function latheAlongX(profile, seg = 28) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  g.rotateZ(-Math.PI / 2);
  return g;
}

function extrudeFlat(shape, depth, bevel, curveSeg = 24) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: curveSeg,
  });
  g.translate(0, 0, -depth / 2);
  g.rotateX(-Math.PI / 2);
  return g;
}

const std = (color, roughness = 0.55, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const MAT = {
  ebi: std('#f2b8a0', 0.5),
  tail: std('#e0402a', 0.45, { side: THREE.DoubleSide }),
  hotate: std('#ffffff', 0.4, { map: speckle(71, '#f6eedc', '#e8d6b8') }),
  kaki: std('#ffffff', 0.3, { map: speckle(72, '#d8ccb2', '#9c907c') }),
  kakiFrill: std('#4a4038', 0.35),
  anago: std('#f1e8da', 0.55),
  anagoSkin: std('#3b3026', 0.35),
  kisu: std('#f6f1e6', 0.5),
  fin: std('#a8a9a4', 0.35, { side: THREE.DoubleSide, metalness: 0.3 }),
  nasu: std('#e8dcae', 0.6),
  nasuSkin: std('#3a1638', 0.18, { metalness: 0.05 }),
  shishito: std('#3f8a2c', 0.35),
  stem: std('#6d8a3a', 0.6),
  renkon: std('#efe6d2', 0.6),
  maitake: std('#ffffff', 0.75, { map: speckle(73, '#6b5440', '#3a2a1e') }),
  maitakeStem: std('#ddd0b8', 0.8),
  carrot: std('#e8762a', 0.55),
  onion: std('#f2ecd6', 0.5),
  mitsuba: std('#3f8f35', 0.5),
};

// 指定した軸にそって曲げる
function bendX(g, amp, freq = 1) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setY(i, p.getY(i) + Math.sin(x * freq) * amp);
    p.setZ(i, p.getZ(i) + Math.sin(x * freq * 0.7 + 1) * amp * 0.6);
  }
  g.computeVertexNormals();
  return g;
}

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

// 位置/回転/拡大を焼き込んだ球
function blob(r, sx, sy, sz, x = 0, y = 0, z = 0, ry = 0, rz = 0, ws = 20, hs = 12) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  g.scale(sx, sy, sz);
  g.rotateZ(rz); g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}

// 各具材の (core: Mesh[], coatBase: BufferGeometry, thick, bump)
const BUILDERS = {
  hotate() {
    // 丸い貝柱
    const prof = [[0.001, -0.17], [0.3, -0.17], [0.37, -0.12], [0.38, 0.1], [0.32, 0.16], [0.001, 0.17]];
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 32);
    return { core: [new THREE.Mesh(g, MAT.hotate)], coat: g, thick: 0.05, bump: 0.035 };
  },
  kaki() {
    const body = blob(0.5, 1.2, 0.36, 0.85, 0, 0, 0, 0, 0, 28, 14);
    const frill = new THREE.TorusGeometry(0.47, 0.06, 8, 40);
    frill.rotateX(Math.PI / 2); frill.scale(1.2, 1, 0.85);
    // ひだを波打たせる
    const fp = frill.attributes.position;
    for (let i = 0; i < fp.count; i++) {
      const a = Math.atan2(fp.getZ(i), fp.getX(i));
      fp.setY(i, fp.getY(i) + Math.sin(a * 9) * 0.035);
    }
    frill.computeVertexNormals();
    return { core: [new THREE.Mesh(body, MAT.kaki), new THREE.Mesh(frill, MAT.kakiFrill)], coat: body, thick: 0.06, bump: 0.05 };
  },
  anago() {
    // 開いた穴子（一本揚げ）
    const s = roundedRect(2.3, 0.5, 0.2);
    const flesh = extrudeFlat(s, 0.06, 0.02);
    flesh.translate(0, 0.03, 0);
    const skin = extrudeFlat(s, 0.03, 0.01);
    skin.translate(0, -0.04, 0);
    bendX(flesh, 0.08, 2.2); bendX(skin, 0.08, 2.2);
    const base = extrudeFlat(s, 0.1, 0.04, 12);
    bendX(base, 0.08, 2.2);
    return { core: [new THREE.Mesh(flesh, MAT.anago), new THREE.Mesh(skin, MAT.anagoSkin)], coat: base, thick: 0.04, bump: 0.04 };
  },
  ebi() {
    const prof = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const r = 0.2 * Math.pow(Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.92 + 0.12), 0.8) * (1 - t * 0.45) + 0.005;
      prof.push([i === 0 || i === 16 ? 0.001 : r, t * 1.7]);
    }
    const body = latheAlongX(prof);
    body.translate(-0.75, 0, 0);
    const core = [new THREE.Mesh(body, MAT.ebi)];
    const tailShape = new THREE.Shape();
    tailShape.moveTo(0, 0); tailShape.lineTo(0.35, 0.22); tailShape.lineTo(0.3, 0); tailShape.lineTo(0.35, -0.22); tailShape.lineTo(0, 0);
    const tg = new THREE.ShapeGeometry(tailShape);
    tg.rotateX(-Math.PI / 2);
    const tail = new THREE.Mesh(tg, MAT.tail);
    tail.position.set(0.9, 0.03, 0);
    tail.rotation.z = 0.25;
    core.push(tail);
    return { core, coat: body, thick: 0.07, bump: 0.05 };
  },
  kisu() {
    // 開いたきす（尾付き）
    const s = new THREE.Shape();
    s.moveTo(-0.75, 0);
    s.bezierCurveTo(-0.7, 0.42, 0.3, 0.45, 0.6, 0.1);
    s.lineTo(0.6, -0.1);
    s.bezierCurveTo(0.3, -0.45, -0.7, -0.42, -0.75, 0);
    const g = extrudeFlat(s, 0.06, 0.015);
    const base = extrudeFlat(s, 0.07, 0.035, 14);
    const fs = new THREE.Shape();
    fs.moveTo(0, 0); fs.lineTo(0.32, 0.25); fs.quadraticCurveTo(0.24, 0, 0.32, -0.25); fs.lineTo(0, 0);
    const fg = new THREE.ShapeGeometry(fs);
    fg.rotateX(-Math.PI / 2);
    const fin = new THREE.Mesh(fg, MAT.fin);
    fin.position.set(0.55, 0.02, 0);
    return { core: [new THREE.Mesh(g, MAT.kisu), fin], coat: base, thick: 0.035, bump: 0.035 };
  },
  nasu() {
    // 縦半分の茄子（皮は下）
    const body = new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    body.scale(1.6, 0.42, 0.75);
    const skin = new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    skin.scale(1.6, 0.42, 0.75);
    const base = new THREE.SphereGeometry(0.5, 32, 16);
    base.scale(1.6, 0.42, 0.75);
    return { core: [new THREE.Mesh(body, MAT.nasu), new THREE.Mesh(skin, MAT.nasuSkin)], coat: base, thick: 0.05, bump: 0.04 };
  },
  shishito() {
    const prof = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const r = 0.13 * Math.pow(Math.sin(t * Math.PI), 0.55) * (1 - t * 0.35) + 0.003;
      prof.push([i === 0 || i === 14 ? 0.001 : r, t * 1.0]);
    }
    const body = latheAlongX(prof, 18);
    body.translate(-0.45, 0, 0);
    bendX(body, 0.05, 2.5);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.22, 8), MAT.stem);
    stem.rotation.z = Math.PI / 2; stem.position.x = -0.55;
    return { core: [new THREE.Mesh(body, MAT.shishito), stem], coat: body, thick: 0.03, bump: 0.025 };
  },
  renkon() {
    const s = new THREE.Shape();
    s.absarc(0, 0, 0.58, 0, Math.PI * 2, false);
    const holes = [[0, 0, 0.1]];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      holes.push([Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0.11]);
    }
    for (const [x, y, rr] of holes) {
      const h = new THREE.Path();
      h.absarc(x, y, rr, 0, Math.PI * 2, true);
      s.holes.push(h);
    }
    const g = extrudeFlat(s, 0.16, 0.02);
    const base = extrudeFlat(s, 0.16, 0.035, 16);
    return { core: [new THREE.Mesh(g, MAT.renkon)], coat: base, thick: 0.03, bump: 0.03 };
  },
  maitake() {
    // ひらひらのかさが重なった房
    const lobes = [], core = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const d = 0.18 + Math.random() * 0.2;
      const g = blob(0.25, 1.1, 0.16, 0.8, Math.cos(a) * d, 0.04 + Math.random() * 0.12, Math.sin(a) * d, -a, 0.25, 14, 8);
      lobes.push(g);
    }
    lobes.push(blob(0.25, 1, 0.2, 0.9, 0, 0.2, 0, 0, 0, 14, 8));
    const cap = mergeGeometries(lobes);
    const stem = blob(0.2, 1.4, 0.45, 0.8, -0.05, -0.06, 0, 0, 0, 12, 8);
    core.push(new THREE.Mesh(cap, MAT.maitake), new THREE.Mesh(stem, MAT.maitakeStem));
    const base = mergeGeometries([cap, stem]);
    return { core, coat: base, thick: 0.025, bump: 0.03 };
  },
  kakiage() {
    // 細切りの玉ねぎ・人参と三つ葉がふんわり絡んだ「鳥の巣」状
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pieces = { onion: [], carrot: [], mitsuba: [] };
    const tint = { onion: '#f3e6c4', carrot: '#ef7a2a', mitsuba: '#3e7f32' };
    const coatParts = [];
    const dome = (r) => 0.16 * (1 - (r / 0.75) ** 2);
    const add = (k, g) => {
      pieces[k].push(g);
      const c = new THREE.Color(tint[k]);
      const col = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < col.length; i += 3) { col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b; }
      const cg = g.clone();
      cg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      coatParts.push(cg);
    };
    // 玉ねぎ：薄い弧の帯
    for (let i = 0; i < 26; i++) {
      const R = rnd(0.18, 0.38), a0 = rnd(0, 6.28), span = rnd(1.2, 2.2);
      const cx = rnd(-0.4, 0.4), cz = rnd(-0.4, 0.4);
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const a = a0 + span * k / 6;
        const x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R;
        pts.push(new THREE.Vector3(x, dome(Math.hypot(x, z)) * rnd(0.3, 1.1) + rnd(-0.05, 0.05), z));
      }
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.024, 4, false);
      add('onion', g);
    }
    // 人参：細い千切り
    for (let i = 0; i < 24; i++) {
      const r = Math.sqrt(Math.random()) * 0.6, a = rnd(0, 6.28), dir = rnd(0, 6.28), L = rnd(0.35, 0.6);
      const x0 = Math.cos(a) * r, z0 = Math.sin(a) * r;
      const pts = [0, 0.5, 1].map(t => {
        const x = x0 + Math.cos(dir) * L * (t - 0.5), z = z0 + Math.sin(dir) * L * (t - 0.5);
        return new THREE.Vector3(x, dome(Math.min(0.75, Math.hypot(x, z))) * rnd(0.4, 1.2) + (t === 0.5 ? 0.04 : 0), z);
      });
      add('carrot', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 0.013, 4, false));
    }
    // 三つ葉：小さな葉
    for (let i = 0; i < 8; i++) {
      const r = Math.sqrt(Math.random()) * 0.5, a = rnd(0, 6.28);
      const g = new THREE.SphereGeometry(0.075, 10, 6);
      g.scale(1.3, 0.25, 0.9);
      g.rotateY(rnd(0, 6.28)); g.rotateX(rnd(-0.4, 0.4));
      g.translate(Math.cos(a) * r, dome(r) + 0.02, Math.sin(a) * r);
      add('mitsuba', g);
    }
    const core = [];
    for (const [k, arr] of Object.entries(pieces)) {
      const mat = k === 'onion' ? MAT.onion : k === 'carrot' ? MAT.carrot : MAT.mitsuba;
      core.push(new THREE.Mesh(mergeGeometries(arr), mat));
    }
    return { core, coat: mergeGeometries(coatParts), thick: 0.012, bump: 0.012, tinted: true, edge: 0.06 };
  },
};

const coatCache = new Map();
const hanaGeo = (() => {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  // いびつな粒に
  for (let i = 0; i < p.count; i++) {
    const k = 0.7 + Math.random() * 0.5;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  const c = new Float32Array(p.count * 3).fill(0.82);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
})();

// 衣のマテリアル：両面の色を別々に持つ（物体の上向き面 = A、下向き面 = B）
function coatMaterial(uTop, uBottom) {
  const m = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: 0.35, metalness: 0, vertexColors: true,
    bumpMap: batterBump(), bumpScale: 1.6,
    clearcoat: 0.8, clearcoatRoughness: 0.3, sheen: 0.4, sheenRoughness: 0.8, sheenColor: new THREE.Color('#fff2d0'),
    transparent: true, opacity: 0.75,
  });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTop = uTop;
    sh.uniforms.uBottom = uBottom;
    sh.vertexShader = 'varying float vSide;\n' + sh.vertexShader.replace('#include <beginnormal_vertex>',
      '#include <beginnormal_vertex>\n  vSide = smoothstep(-0.5, 0.5, objectNormal.y);');
    sh.fragmentShader = 'uniform vec3 uTop;\nuniform vec3 uBottom;\nvarying float vSide;\n' + sh.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\n  diffuseColor.rgb *= mix(uBottom, uTop, vSide);');
  };
  m.customProgramCacheKey = () => 'tempura-coat';
  return m;
}

export class Tempura {
  constructor(key, seed) {
    this.def = INGREDIENTS[key];
    this.key = key;
    this.cook = 0;
    this.brownA = 0; // 物体の上側の面
    this.brownB = 0; // 物体の下側の面
    this.flipped = false; // false: B が油に浸かっている
    this.grease = 0;
    this.moisture = 1;
    this.timeInOil = 0;
    this.sheen = 1; // 揚げたての油のつや
    this.state = 'raw'; // raw → coating → flying → oil (held) → lifted → served
    this.seed = seed ?? Math.floor(Math.random() * 1000);

    const b = BUILDERS[key]();
    this.group = new THREE.Group();
    this.flipper = new THREE.Group(); // 返すときに回す
    this.inner = new THREE.Group();
    this.group.add(this.flipper);
    this.flipper.add(this.inner);
    for (const m of b.core) { m.castShadow = true; m.receiveShadow = true; this.inner.add(m); }

    const variant = this.seed % 2;
    const ck = key + variant;
    if (!coatCache.has(ck)) coatCache.set(ck, makeCoat(b.coat, b.thick, b.bump, variant * 31 + 3, b.tinted, b.edge));
    const coatGeo = coatCache.get(ck);

    this.uTop = { value: batterColor(0) };
    this.uBottom = { value: batterColor(0) };
    this.coatMat = coatMaterial(this.uTop, this.uBottom);
    this.coat = new THREE.Mesh(coatGeo, this.coatMat);
    this.coat.castShadow = true;
    this.coat.receiveShadow = true;
    this.coat.renderOrder = 2;
    this.coat.visible = false;
    this.inner.add(this.coat);

    // 花（衣のちりちり）：側面と下側に多く付く
    const pos = coatGeo.attributes.position, nor = coatGeo.attributes.normal;
    const N = Math.round(60 + this.def.radius * 90);
    this.hana = new THREE.InstancedMesh(hanaGeo, this.coatMat, N);
    this.hana.visible = false;
    this.hanaData = [];
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0, guard = 0; i < N && guard < N * 20; guard++) {
      const idx = Math.floor(Math.random() * pos.count);
      n.fromBufferAttribute(nor, idx);
      if (n.y > 0.4 && Math.random() < 0.8) continue;
      v.fromBufferAttribute(pos, idx);
      const s = 0.018 + Math.pow(Math.random(), 2) * 0.06;
      this.hanaData.push({ p: v.clone().addScaledVector(n, s * 0.5), s, rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6) });
      i++;
    }
    this.hana.count = this.hanaData.length;
    this.inner.add(this.hana);
    this.setHanaGrowth(0);

    this.radius = this.def.radius;
    this.vel = new THREE.Vector2();
    this.bobPhase = Math.random() * 10;
    this.spin = (Math.random() - 0.5) * 0.15;
  }

  get brown() { return (this.brownA + this.brownB) / 2; }
  // 今、油に浸かっている面 / 上に出ている面
  get downSide() { return this.flipped ? 'A' : 'B'; }

  setHanaGrowth(k) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    for (let i = 0; i < this.hanaData.length; i++) {
      const h = this.hanaData[i];
      const kk = Math.min(1, Math.max(0, k * 1.6 - (i / this.hanaData.length) * 0.6));
      const s = h.s * (0.15 + 0.85 * kk);
      q.setFromEuler(h.rot);
      sc.set(s, s * 0.7, s);
      m.compose(h.p, q, sc);
      this.hana.setMatrixAt(i, m);
    }
    this.hana.instanceMatrix.needsUpdate = true;
  }

  showBatter() {
    this.coat.visible = true;
    this.hana.visible = true;
  }

  updateLook() {
    batterColor(this.brownA, this.uTop.value);
    batterColor(this.brownB, this.uBottom.value);
    const b = this.brown;
    const dry = Math.min(1, this.cook * 0.9 + b * 0.3);
    const m = this.coatMat;
    m.roughness = 0.3 + 0.45 * dry;
    m.opacity = Math.min(1, 0.75 + 0.35 * dry + b * 0.2);
    if (m.opacity >= 0.999 && m.transparent) { m.transparent = false; m.needsUpdate = true; }
    m.bumpScale = 1.2 + dry * 2.2;
    // 生の衣は濡れたつや、揚げたては油のつや、油を切ると落ち着く
    m.clearcoat = 0.25 + 0.6 * this.sheen;
    m.clearcoatRoughness = 0.15 + 0.4 * (1 - this.sheen);
    m.sheen = 0.5 * (1 - dry);
  }

  dispose() {
    this.coatMat.dispose();
    this.hana.dispose();
  }
}
