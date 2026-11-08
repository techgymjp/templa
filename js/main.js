import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { INGREDIENTS, INGREDIENT_KEYS, Tempura, cookRate, brownRate, evaluate, batterColor } from './ingredients.js';
import * as S from './scene.js';
import { softDot } from './textures.js';
import { FryAudio } from './audio.js';
import { iconSVG } from './icons.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const rand = (a, b) => a + Math.random() * (b - a);

// ---------------------------------------------------------------
// 初期化
// ---------------------------------------------------------------
const canvas = $('scene');
const renderer = S.setupRenderer(canvas);
const world = S.buildScene(renderer);
const { scene, hashi, seats } = world;
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
const CAM_TARGET = new THREE.Vector3(0, 0.8, -2.6);
const CAM_DIR = new THREE.Vector3(0, 12.5, 12.5).normalize();
const CAM_DIST = 20.5;
const controls = new OrbitControls(camera, canvas);
controls.target.copy(CAM_TARGET);
controls.enablePan = false;
controls.enableDamping = true;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = 0.95;
controls.minAzimuthAngle = -0.45;
controls.maxAzimuthAngle = 0.45;
controls.rotateSpeed = 0.5;

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  const shift = 0;
  camera.aspect = w / (h + shift);
  const need = w < h ? 0.95 : 1.55; // 横に見せたい幅の比
  const f = Math.max(1, need / (w / h));
  // 下の操作パネルの分だけ絵を上にずらす
  camera.setViewOffset(w, h + shift, 0, shift, w, h);
  camera.position.copy(CAM_TARGET).addScaledVector(CAM_DIR, CAM_DIST * f);
  controls.minDistance = CAM_DIST * f * 0.7;
  controls.maxDistance = CAM_DIST * f * 1.25;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const audio = new FryAudio();

// ---------------------------------------------------------------
// ゲーム状態
// ---------------------------------------------------------------
const SHIFT_TIME = 150;
const MAX_IN_POT = 6;
const state = {
  mode: 'demo', master: false, running: false, paused: false,
  time: SHIFT_TIME, score: 0, temp: 172, heat: 7.5, pendingDrop: 0,
  items: [], rack: [], busy: false, elapsed: 0,
  stats: null, firstAdd: false,
};
const tweens = [];
function tween(dur, fn, done) { const t = { t: 0, dur, fn, done }; tweens.push(t); fn(0); return t; }

// ---------------------------------------------------------------
// 泡
// ---------------------------------------------------------------
const BUB_N = 1800;
const bubbleMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6),
  new THREE.MeshPhysicalMaterial({ color: '#fff4d6', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.6, envMapIntensity: 2, depthWrite: false }),
  BUB_N);
bubbleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
bubbleMesh.renderOrder = 6;
bubbleMesh.frustumCulled = false;
scene.add(bubbleMesh);
const bubbles = [];
function spawnBubble(x, z, size, life, y = 0.004, vy = 0) {
  if (bubbles.length >= BUB_N) return;
  bubbles.push({ x, z, y, vy, size, life, max: life });
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function updateBubbles(dt) {
  let n = 0;
  for (let i = 0; i < bubbles.length; i++) {
    const b = bubbles[i];
    b.life -= dt;
    if (b.life <= 0) continue;
    if (b.vy) { b.y = Math.min(0.004, b.y + b.vy * dt); if (b.y >= 0.004) b.vy = 0; }
    bubbles[n++] = b;
    const k = 1 - b.life / b.max;
    const s = b.size * (k < 0.2 ? k / 0.2 : 1) * (1 + k * 0.4);
    _p.set(b.x, b.y, b.z);
    _s.set(s, s * 0.55, s);
    bubbleMesh.setMatrixAt(n - 1, _m.compose(_p, _q, _s));
  }
  bubbles.length = n;
  bubbleMesh.count = n;
  bubbleMesh.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------
// 天かす（油に散った衣）
// ---------------------------------------------------------------
const TK_N = 260;
const tkGeo = new THREE.IcosahedronGeometry(1, 0);
const tenkasuMesh = new THREE.InstancedMesh(tkGeo, new THREE.MeshStandardMaterial({ roughness: 0.7 }), TK_N);
tenkasuMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(TK_N * 3), 3);
tenkasuMesh.frustumCulled = false;
tenkasuMesh.count = 0;
scene.add(tenkasuMesh);
const tenkasu = [];
function spawnTenkasu(x, z, n, spread = 0.6) {
  for (let i = 0; i < n && tenkasu.length < TK_N; i++) {
    const a = Math.random() * 6.283, r = Math.random() * spread;
    tenkasu.push({
      x: x + Math.cos(a) * r, z: z + Math.sin(a) * r, vx: Math.cos(a) * rand(0.2, 0.8), vz: Math.sin(a) * rand(0.2, 0.8),
      brown: 0, s: rand(0.03, 0.08), rot: new THREE.Euler(rand(0, 6), rand(0, 6), rand(0, 6)), life: rand(30, 50), skim: 0,
    });
  }
}
const _c = new THREE.Color();
function updateTenkasu(dt, T, time) {
  let n = 0;
  const br = T < 110 ? 0 : Math.pow(2, (T - 175) / 15) / 4;
  for (let i = 0; i < tenkasu.length; i++) {
    const t = tenkasu[i];
    t.life -= dt;
    if (t.skim > 0) { t.skim -= dt; if (t.skim <= 0) continue; }
    if (t.life <= 0) continue;
    t.brown += br * dt;
    // 鍋の中を漂う
    t.x += t.vx * dt; t.z += t.vz * dt;
    t.vx *= 0.97; t.vz *= 0.97;
    t.vx += Math.sin(time * 0.7 + i) * 0.02; t.vz += Math.cos(time * 0.6 + i * 1.3) * 0.02;
    const dx = t.x - S.POT.x, dz = t.z - S.POT.z, d = Math.hypot(dx, dz);
    if (d > S.POT.R - 0.1) { t.x = S.POT.x + dx / d * (S.POT.R - 0.1); t.z = S.POT.z + dz / d * (S.POT.R - 0.1); t.vx *= -0.3; t.vz *= -0.3; }
    for (const it of state.items) {
      if (it.state !== 'oil') continue;
      const ex = t.x - it.group.position.x, ez = t.z - it.group.position.z, ed = Math.hypot(ex, ez);
      if (ed < it.radius && ed > 0.001) { t.vx += ex / ed * dt * 3; t.vz += ez / ed * dt * 3; }
    }
    tenkasu[n++] = t;
    const s = t.s * (t.skim > 0 ? t.skim / 0.5 : 1);
    _q.setFromEuler(t.rot);
    _p.set(t.x, 0.01 - (t.skim > 0 ? 0 : 0), t.z);
    _s.set(s, s * 0.6, s);
    tenkasuMesh.setMatrixAt(n - 1, _m.compose(_p, _q, _s));
    tenkasuMesh.setColorAt(n - 1, batterColor(t.brown * 0.9 + 0.2, _c));
  }
  tenkasu.length = n;
  tenkasuMesh.count = n;
  tenkasuMesh.instanceMatrix.needsUpdate = true;
  if (tenkasuMesh.instanceColor) tenkasuMesh.instanceColor.needsUpdate = true;
}
function skimTenkasu() {
  for (const t of tenkasu) if (t.skim <= 0) t.skim = 0.5;
}

// ---------------------------------------------------------------
// 湯気・煙
// ---------------------------------------------------------------
const ST_N = 400;
const stGeo = new THREE.BufferGeometry();
stGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ST_N * 3), 3));
stGeo.setAttribute('size', new THREE.BufferAttribute(new Float32Array(ST_N), 1));
stGeo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(ST_N), 1));
stGeo.setAttribute('tint', new THREE.BufferAttribute(new Float32Array(ST_N * 3), 3));
const stMat = new THREE.ShaderMaterial({
  uniforms: { map: { value: softDot() }, pscale: { value: 600 } },
  vertexShader: `uniform float pscale; attribute float size; attribute float alpha; attribute vec3 tint; varying float vA; varying vec3 vT;
    void main(){ vA = alpha; vT = tint; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = size * pscale / -mv.z; }`,
  fragmentShader: `uniform sampler2D map; varying float vA; varying vec3 vT;
    void main(){ vec4 c = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vT, c.a * vA); }`,
  transparent: true, depthWrite: false,
});
const steamPts = new THREE.Points(stGeo, stMat);
steamPts.frustumCulled = false;
steamPts.renderOrder = 8;
scene.add(steamPts);
const steam = [];
function spawnSteam(x, y, z, smoke = false) {
  if (steam.length >= ST_N) return;
  steam.push({ x, y, z, vx: rand(-0.15, 0.15), vy: rand(0.6, 1.1), vz: rand(-0.15, 0.15), life: rand(1.4, 2.4), max: 2.4, size: rand(0.5, 0.9), smoke });
}
function updateSteam(dt) {
  const pos = stGeo.attributes.position.array, size = stGeo.attributes.size.array, alpha = stGeo.attributes.alpha.array, tint = stGeo.attributes.tint.array;
  let n = 0;
  for (let i = 0; i < steam.length; i++) {
    const p = steam[i];
    p.life -= dt;
    if (p.life <= 0) continue;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 0.99;
    steam[n++] = p;
    const k = p.life / p.max;
    pos[(n - 1) * 3] = p.x; pos[(n - 1) * 3 + 1] = p.y; pos[(n - 1) * 3 + 2] = p.z;
    size[n - 1] = p.size * (1 + (1 - k) * 2.5);
    alpha[n - 1] = (p.smoke ? 0.35 : 0.16) * Math.min(1, (1 - k) * 5) * k;
    const c = p.smoke ? 0.45 : 1;
    tint[(n - 1) * 3] = c; tint[(n - 1) * 3 + 1] = c; tint[(n - 1) * 3 + 2] = c * (p.smoke ? 0.95 : 1);
  }
  steam.length = n;
  stGeo.setDrawRange(0, n);
  for (const k of ['position', 'size', 'alpha', 'tint']) stGeo.attributes[k].needsUpdate = true;
}

// ---------------------------------------------------------------
// 油面のゆらぎ
// ---------------------------------------------------------------
const oilPos = world.oilGeo.attributes.position;
const oilBase = Float32Array.from(oilPos.array);
function updateOil(time, T) {
  const agit = state.items.filter(i => i.state === 'oil');
  const heat = clamp((T - 120) / 80, 0, 1);
  for (let i = 0; i < oilPos.count; i++) {
    const x = oilBase[i * 3], z = oilBase[i * 3 + 2];
    let y = Math.sin(x * 2.1 + time * 1.3) * Math.cos(z * 1.7 - time) * 0.006 * (0.4 + heat);
    for (const it of agit) {
      const dx = x + S.POT.x - it.group.position.x, dz = z + S.POT.z - it.group.position.z;
      const d = Math.hypot(dx, dz) - it.radius * 0.8;
      if (d < 1.2) y += Math.sin(d * 18 - time * 22) * 0.012 * it.moisture * heat * Math.exp(-Math.max(0, d) * 3);
    }
    oilPos.array[i * 3 + 1] = y;
  }
  oilPos.needsUpdate = true;
  world.oilGeo.computeVertexNormals();
  world.oilMat.normalMap.offset.set(time * 0.012, time * 0.008);
  // 熱い油は少し明るく
  world.oilMat.color.setHSL(0.095, 0.9, 0.13 + heat * 0.03);
}

// ---------------------------------------------------------------
// 衣のしずく（温度チェック）
// ---------------------------------------------------------------
const dropMat = new THREE.MeshStandardMaterial({ color: '#f3ecd8', roughness: 0.4 });
const drops = [];
function dropBatter() {
  if (state.paused) return;
  audio.init();
  const a = Math.random() * 6.283, r = Math.random() * 1.6;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), dropMat.clone());
  const x = S.POT.x + Math.cos(a) * r, z = S.POT.z + Math.sin(a) * r;
  mesh.position.set(x, 1.4, z);
  scene.add(mesh);
  const T = state.temp;
  // 油温によって沈み方が変わる
  let depth, delay;
  if (T < 145) { depth = 1.35; delay = 99; }
  else if (T < 160) { depth = 1.0; delay = 1.8; }
  else if (T < 172) { depth = 0.5; delay = 0.7; }
  else if (T < 185) { depth = 0.15; delay = 0.2; }
  else { depth = 0; delay = 0; }
  drops.push({ mesh, x, z, phase: 'fall', t: 0, depth, delay, T });
}
function updateDrops(dt, T) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.t += dt;
    const m = d.mesh;
    if (d.phase === 'fall') {
      m.position.y -= dt * 7;
      if (m.position.y <= 0) {
        d.phase = 'sink'; d.t = 0;
        audio.crackle(0.2, 4000);
        if (d.depth === 0) { spawnTenkasu(d.x, d.z, 14, 0.25); for (let k = 0; k < 20; k++) spawnBubble(d.x + rand(-0.2, 0.2), d.z + rand(-0.2, 0.2), rand(0.02, 0.05), rand(0.3, 0.8)); scene.remove(m); drops.splice(i, 1); continue; }
      }
    } else if (d.phase === 'sink') {
      m.position.y = lerp(m.position.y, -d.depth, 1 - Math.exp(-dt * 8));
      if (d.t > d.delay) { d.phase = 'rise'; d.t = 0; }
      if (T > 130 && Math.random() < dt * 20) spawnBubble(d.x + rand(-0.08, 0.08), d.z + rand(-0.08, 0.08), rand(0.015, 0.03), rand(0.2, 0.5), m.position.y, 1.5);
      if (d.t > 6) { scene.remove(m); drops.splice(i, 1); continue; }
    } else if (d.phase === 'rise') {
      m.position.y += dt * 1.6;
      if (m.position.y >= -0.02) {
        spawnTenkasu(d.x, d.z, 8, 0.15);
        for (let k = 0; k < 10; k++) spawnBubble(d.x + rand(-0.15, 0.15), d.z + rand(-0.15, 0.15), rand(0.02, 0.04), rand(0.3, 0.7));
        scene.remove(m); drops.splice(i, 1); continue;
      }
    }
    batterColor(Math.min(0.6, d.t * 0.2), m.material.color);
  }
}

// ---------------------------------------------------------------
// 菜箸
// ---------------------------------------------------------------
const hashiTarget = new THREE.Vector3(3.4, 0.6, 3.0);
const HASHI_REST = new THREE.Vector3(3.4, 0.6, 3.0);
let hashiOpen = 0.12, hashiOpenTarget = 0.12, hashiFollow = null;
function updateHashi(dt) {
  if (hashiFollow) hashiTarget.copy(hashiFollow.group.position).add(new THREE.Vector3(0, 0.12, 0));
  hashi.position.lerp(hashiTarget, 1 - Math.exp(-dt * (hashiFollow ? 30 : 10)));
  hashiOpen = lerp(hashiOpen, hashiOpenTarget, 1 - Math.exp(-dt * 12));
  // 手元（右手前上）に向かって伸びる
  hashi.sticks.forEach((s, i) => {
    s.rotation.set(-0.75, 0, -0.55 + (i ? hashiOpen : -hashiOpen) * 0.5);
    s.position.set(0, 0, i ? 0.05 : -0.05);
  });
}

// ---------------------------------------------------------------
// 具材の投入
// ---------------------------------------------------------------
const oilItems = () => state.items.filter(i => i.state === 'oil' || i.state === 'flying');
function findSpot(radius) {
  let best = null, bestScore = -1;
  for (let k = 0; k < 30; k++) {
    const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * (S.POT.R - radius * 0.85 - 0.15);
    const x = S.POT.x + Math.cos(a) * r, z = S.POT.z + Math.sin(a) * r;
    let md = 9;
    for (const it of state.items) {
      if (it.state !== 'oil' && it.state !== 'flying') continue;
      const p = it.target || it.group.position;
      md = Math.min(md, Math.hypot(p.x - x, p.z - z) - it.radius - radius);
    }
    if (md > bestScore) { bestScore = md; best = new THREE.Vector3(x, 0, z); }
  }
  return best;
}

function addIngredient(key) {
  if (state.busy || state.paused) return;
  if (oilItems().length >= MAX_IN_POT) { flashPotFull(); return; }
  if (state.mode !== 'demo') audio.init();
  state.busy = true;
  updateIngredientButtons();
  const it = new Tempura(key);
  state.items.push(it);
  scene.add(it.group);
  const g = it.group;
  const start = new THREE.Vector3(S.BOWL.x + 0.2, S.BATTER_Y + 1.6, S.BOWL.z + 0.4);
  const dip = new THREE.Vector3(S.BOWL.x, S.BATTER_Y - 0.08, S.BOWL.z);
  g.position.copy(start);
  g.rotation.set(0, Math.random() * 6.283, 0);
  it.state = 'coating';
  hashiFollow = it; hashiOpenTarget = 0.02;
  if (!state.firstAdd) { state.firstAdd = true; $('hint').style.opacity = 0; }
  tween(0.4, k => g.position.lerpVectors(start, dip, k * k), () => {
    it.showBatter();
    audio.crackle(0.05, 900);
    const up = new THREE.Vector3(S.BOWL.x, S.BATTER_Y + 0.9, S.BOWL.z);
    tween(0.35, k => { g.position.lerpVectors(dip, up, 1 - (1 - k) * (1 - k)); g.rotation.z = Math.sin(k * 6) * 0.08; }, () => {
      const target = findSpot(it.radius);
      it.target = target;
      it.state = 'flying';
      const from = g.position.clone();
      tween(0.6, k => {
        g.position.lerpVectors(from, target, k);
        g.position.y = lerp(from.y, 0.25, k) + Math.sin(k * Math.PI) * 1.2;
        g.rotation.z = (1 - k) * 0.1;
      }, () => enterOil(it));
    });
  });
}

function enterOil(it) {
  it.state = 'oil';
  it.timeInOil = 0;
  hashiFollow = null; hashiOpenTarget = 0.12;
  hashiTarget.set(it.group.position.x + 0.8, 0.9, it.group.position.z + 0.8);
  state.busy = false;
  updateIngredientButtons();
  const T = state.temp;
  const p = it.group.position;
  state.pendingDrop += 3 + it.radius * 4;
  audio.splash(clamp((T - 110) / 70, 0.1, 1.2));
  for (let k = 0; k < 80 * clamp((T - 110) / 60, 0, 1.3); k++) {
    const a = Math.random() * 6.283, r = it.radius * rand(0.3, 1.3);
    spawnBubble(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r, rand(0.03, 0.08), rand(0.3, 1.0));
  }
  if (T > 150) spawnTenkasu(p.x, p.z, Math.round(rand(6, 12) * clamp((T - 150) / 30, 0.3, 1.2)), it.radius * 1.1);
}

function flashPotFull() {
  const c = $('pot-chip');
  c.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)', background: '#f3b0a0' }, { transform: 'scale(1)' }], { duration: 400 });
  audio.bad();
}

// ---------------------------------------------------------------
// 引き上げ
// ---------------------------------------------------------------
const RACK_SLOTS = S.rackSlots();
function freeSlot() {
  const used = new Set(state.rack.map(r => r.slot));
  for (let i = 0; i < RACK_SLOTS.length; i++) if (!used.has(i)) return i;
  // 満杯：一番古いのを捨てる
  const old = state.rack.shift();
  discard(old);
  return old.slot;
}

function liftItem(it) {
  if (state.busy || it.state !== 'oil') return;
  if (state.mode !== 'demo') audio.init();
  state.busy = true;
  it.state = 'lifted';
  const ev = evaluate(it);
  it.quality = ev.score;
  const slot = freeSlot();
  const dest = RACK_SLOTS[slot].clone();
  const from = it.group.position.clone();
  hashiFollow = it; hashiOpenTarget = 0.02;
  // 油切り
  for (let k = 0; k < 15; k++) spawnBubble(from.x + rand(-0.3, 0.3), from.z + rand(-0.3, 0.3), rand(0.02, 0.05), rand(0.2, 0.5));
  tween(0.7, k => {
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    it.group.position.lerpVectors(from, dest, e);
    it.group.position.y = lerp(from.y, dest.y, e) + Math.sin(k * Math.PI) * 1.6;
    if (k < 0.25 && Math.random() < 0.5) spawnBubble(it.group.position.x, it.group.position.z, 0.03, 0.3);
  }, () => {
    hashiFollow = null; hashiOpenTarget = 0.12; hashiTarget.copy(HASHI_REST);
    state.busy = false;
    updateIngredientButtons();
    // 天紙の油じみ
    const stain = new THREE.Mesh(new THREE.PlaneGeometry(it.radius * 2.4, it.radius * 2.4), world.stainMat.clone());
    stain.rotation.x = -Math.PI / 2;
    stain.position.set(dest.x, dest.y - 0.035, dest.z);
    scene.add(stain);
    const rec = { item: it, slot, t: 0, stain, ev };
    state.rack.push(rec);
    if (state.mode !== 'demo') showEvaluation(it, ev, dest);
    if (state.mode === 'shift' || state.mode === 'practice') {
      state.stats.fried++;
      state.stats.qualSum += ev.score;
      state.stats.best = Math.max(state.stats.best, ev.score);
      if (ev.score >= 90) state.stats.perfect++;
    }
    tryServeFromRack();
  });
}

function discard(rec) {
  if (!rec) return;
  const g = rec.item.group;
  scene.remove(g);
  rec.item.dispose();
  if (rec.stain) scene.remove(rec.stain);
  state.items = state.items.filter(i => i !== rec.item);
}

function showEvaluation(it, ev, pos) {
  const p = toScreen(pos.clone().add(new THREE.Vector3(0, 0.6, 0)));
  const el = document.createElement('div');
  el.className = 'toast' + (ev.score >= 90 ? ' great' : ev.score < 50 ? ' bad' : '');
  el.innerHTML = `<div class="s">${ev.score}<small>点</small></div><div class="c">${ev.comment}</div>
    <div class="d">揚げ色:${ev.color} ／ 火通り:${ev.doneness} ／ 食感:${ev.crisp}</div>`;
  el.style.left = clamp(p.x, 90, innerWidth - 90) + 'px';
  el.style.top = clamp(p.y, 120, innerHeight) + 'px';
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3200);
  if (ev.score >= 80) audio.good(); else if (ev.score < 45) audio.bad();
}

function toScreen(v) {
  const p = v.clone().project(camera);
  return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight, behind: p.z > 1 };
}

// ---------------------------------------------------------------
// お客さん
// ---------------------------------------------------------------
let custSeed = 1;
const bubblesLayer = $('labels');

function newCustomer(seat) {
  const c = S.makeCustomer(custSeed++ * 7.13 + Math.random());
  const n = Math.random() < 0.45 ? 1 : Math.random() < 0.7 ? 2 : 3;
  c.orders = Array.from({ length: n }, () => INGREDIENT_KEYS[Math.floor(Math.random() * INGREDIENT_KEYS.length)]);
  c.idx = 0;
  c.state = 'arriving';
  c.t = 0;
  c.group.position.set(seat.x, S.COUNTER_Y - 2.6, S.CUSTOMER_Z);
  scene.add(c.group);
  const el = document.createElement('div');
  el.className = 'speech hidden';
  bubblesLayer.appendChild(el);
  c.el = el;
  seat.customer = c;
  return c;
}

function patienceFor(key) {
  const base = 32 + INGREDIENTS[key].cookTime * 2.2;
  return state.mode === 'practice' ? Infinity : base;
}

function showOrder(seat) {
  const c = seat.customer;
  const key = c.orders[c.idx];
  c.state = 'waiting';
  c.patience = c.maxPatience = patienceFor(key);
  setMood(c, 'normal');
  const def = INGREDIENTS[key];
  c.el.className = 'speech';
  c.el.innerHTML = `<div class="sp-icon">${iconSVG(key, 54)}</div><div class="sp-name">${def.name}</div>
    ${c.orders.length > 1 ? `<div class="sp-count">${c.idx + 1}/${c.orders.length}</div>` : ''}
    ${isFinite(c.patience) ? '<div class="sp-bar"><div></div></div>' : ''}`;
  audio.bell();
  updateIngredientButtons();
  setTimeout(tryServeFromRack, 400);
}

function say(c, text, cls = '') {
  c.el.className = 'speech talk ' + cls;
  c.el.innerHTML = `<div class="sp-talk">${text}</div>`;
}

function setMood(c, mood) {
  if (c.mood === mood) return;
  c.mood = mood;
  c.headMat.map = c.faces[mood];
  c.headMat.needsUpdate = true;
}

function updateCustomers(dt) {
  const canSpawn = state.mode === 'shift' ? state.time > 8 : state.mode === 'practice';
  for (const seat of seats) {
    const c = seat.customer;
    if (!c) {
      seat.cooldown -= dt;
      if (canSpawn && seat.cooldown <= 0) newCustomer(seat);
      continue;
    }
    c.t += dt;
    const g = c.group;
    const baseY = S.COUNTER_Y + 0.15;
    if (c.state === 'arriving') {
      const k = clamp(c.t / 0.9, 0, 1);
      g.position.y = lerp(S.COUNTER_Y - 2.6, baseY, 1 - Math.pow(1 - k, 3));
      if (k >= 1) showOrder(seat);
    } else if (c.state === 'waiting') {
      c.patience -= dt;
      const r = c.patience / c.maxPatience;
      const bar = c.el.querySelector('.sp-bar > div');
      if (bar) { bar.style.width = (r * 100) + '%'; }
      c.el.classList.toggle('urgent', r < 0.3);
      if (r < 0.3) setMood(c, 'angry');
      if (c.patience <= 0) {
        say(c, 'もういいよ！', 'angry');
        c.state = 'leaving'; c.t = 0;
        audio.bad();
        state.stats.missed++;
        addScore(-30, seat.platePos, true);
        updateIngredientButtons();
      }
      // 待っている間の小さな動き
      g.rotation.y = Math.sin(c.t * 0.8 + seat.x) * 0.06;
      c.head.rotation.z = Math.sin(c.t * 1.3 + seat.x) * 0.05;
    } else if (c.state === 'eating') {
      c.head.rotation.x = -0.45 + Math.sin(c.t * 9) * 0.08;
      if (c.t > 2.4) {
        if (c.plateItem) { const pi = c.plateItem; c.plateItem = null; tween(0.4, k => pi.group.scale.setScalar(1 - k), () => { scene.remove(pi.group); pi.dispose(); }); }
        c.idx++;
        if (c.idx < c.orders.length) showOrder(seat);
        else { say(c, 'ごちそうさま！', 'happy'); c.state = 'leaving'; c.t = 0; setMood(c, 'happy'); }
      }
    } else if (c.state === 'leaving') {
      if (c.t > 1.4) {
        const k = clamp((c.t - 1.4) / 0.8, 0, 1);
        g.position.y = lerp(baseY, S.COUNTER_Y - 2.8, k * k);
        c.el.style.opacity = 1 - k;
        if (k >= 1) {
          scene.remove(g);
          c.el.remove();
          seat.customer = null;
          seat.cooldown = rand(2, 6);
        }
      }
    }
    // 吹き出し位置
    const p = toScreen(new THREE.Vector3(g.position.x, g.position.y + 2.25, g.position.z));
    c.el.style.left = p.x + 'px';
    c.el.style.top = p.y + 'px';
  }
}

// 揚がった天ぷらを待っているお客さんに出す
function tryServeFromRack() {
  for (const seat of seats) {
    const c = seat.customer;
    if (!c || c.state !== 'waiting') continue;
    const key = c.orders[c.idx];
    const cands = state.rack.filter(r => r.item.key === key && !r.serving);
    if (!cands.length) continue;
    cands.sort((a, b) => b.item.quality - a.item.quality);
    serve(cands[0], seat);
  }
}

function serve(rec, seat) {
  const c = seat.customer;
  rec.serving = true;
  c.state = 'served';
  const it = rec.item;
  const quality = currentQuality(rec);
  const from = it.group.position.clone();
  const dest = seat.platePos.clone().add(new THREE.Vector3(rand(-0.15, 0.15), 0.08, rand(-0.1, 0.1)));
  tween(0.75, k => {
    const e = 1 - Math.pow(1 - k, 3);
    it.group.position.lerpVectors(from, dest, e);
    it.group.position.y = lerp(from.y, dest.y, e) + Math.sin(k * Math.PI) * 2.2;
  }, () => {
    state.rack = state.rack.filter(r => r !== rec);
    if (rec.stain) tween(1.5, k => { rec.stain.material.opacity *= 0.98; }, () => scene.remove(rec.stain));
    c.plateItem = it;
    c.state = 'eating'; c.t = 0;
    // 点数
    const speed = isFinite(c.maxPatience) ? clamp(c.patience / c.maxPatience, 0, 1) : 0.5;
    let pts = quality + Math.round(speed * 20);
    let text, cls, mood;
    if (quality >= 90) { text = 'カラッと最高！'; cls = 'happy'; mood = 'happy'; }
    else if (quality >= 75) { text = 'うまい！'; cls = 'happy'; mood = 'happy'; }
    else if (quality >= 50) { text = 'うん、悪くない'; cls = ''; mood = 'eat'; }
    else { text = 'これはちょっと…'; cls = 'angry'; mood = 'sad'; pts = Math.round(pts * 0.3); }
    if (state.master) pts = Math.round(pts * 1.3);
    say(c, `${text}<span class="sp-pts">+${pts}</span>`, cls);
    setMood(c, mood);
    if (state.stats) state.stats.served++;
    addScore(pts, dest);
    if (quality >= 75) audio.good();
    updateIngredientButtons();
  });
}

function currentQuality(rec) {
  // 時間が経つと衣がしんなり
  return Math.max(0, Math.round(rec.item.quality - Math.max(0, rec.t - 8) * 1.5));
}

function addScore(pts, pos, neg = false) {
  if (state.mode !== 'shift' && state.mode !== 'practice') return;
  state.score = Math.max(0, state.score + pts);
  $('score').textContent = state.score;
}

function updateRack(dt) {
  for (const rec of [...state.rack]) {
    rec.t += dt;
    if (rec.stain) rec.stain.material.opacity = Math.min(0.85, rec.t * 0.3);
    if (!rec.serving && rec.t > 45) {
      state.rack = state.rack.filter(r => r !== rec);
      tween(0.4, k => rec.item.group.scale.setScalar(1 - k), () => discard(rec));
    }
  }
}

// ---------------------------------------------------------------
// 揚げ物の物理
// ---------------------------------------------------------------
function updateFrying(dt, time) {
  const T = state.temp;
  const items = state.items.filter(i => i.state === 'oil');
  let level = 0, dryness = 0, wsum = 0;
  for (const it of items) {
    it.timeInOil += dt;
    const def = it.def;
    it.cook += cookRate(def, T) * dt;
    it.brown += brownRate(def, T) * dt * (0.6 + 0.4 * (1 - it.moisture));
    it.grease += Math.max(0, 163 - T) / 30 * 0.05 * dt;
    it.moisture = Math.exp(-1.6 * it.cook);
    it.updateLook();
    if (it.timeInOil < 2.5) it.setHanaGrowth(it.timeInOil / 2);

    // 泡：水分が多いほど大きく激しい。抜けると細かく少なく
    const heat = clamp((T - 105) / 75, 0, 1.4);
    const rate = (25 + 170 * Math.pow(it.moisture, 0.8)) * heat * it.radius;
    let n = rate * dt;
    const p = it.group.position;
    const ry = it.group.rotation.y;
    while (n > 0) {
      if (n < 1 && Math.random() > n) break;
      n--;
      // 楕円の外周付近
      const a = Math.random() * 6.283, r = rand(0.55, 1.15);
      const lx = Math.cos(a) * it.radius * r, lz = Math.sin(a) * it.radius * r * 0.6;
      const wx = p.x + lx * Math.cos(ry) + lz * Math.sin(ry), wz = p.z - lx * Math.sin(ry) + lz * Math.cos(ry);
      const big = it.moisture * 0.05;
      spawnBubble(wx, wz, rand(0.012, 0.03) + Math.random() * big, rand(0.15, 0.5) + it.moisture * 0.4);
    }
    if (Math.random() < dt * 10 * it.moisture * heat) spawnSteam(p.x + rand(-0.3, 0.3), 0.3, p.z + rand(-0.3, 0.3));
    level += it.moisture * heat * it.radius;
    dryness += (1 - it.moisture) * it.radius; wsum += it.radius;

    // 浮き沈み・漂い
    it.vel.multiplyScalar(Math.exp(-dt * 2));
    it.vel.x += (Math.random() - 0.5) * it.moisture * heat * dt * 2;
    it.vel.y += (Math.random() - 0.5) * it.moisture * heat * dt * 2;
    for (const o of items) {
      if (o === it) continue;
      const dx = p.x - o.group.position.x, dz = p.z - o.group.position.z, d = Math.hypot(dx, dz);
      const min = (it.radius + o.radius) * 0.85;
      if (d < min && d > 0.001) { it.vel.x += dx / d * (min - d) * dt * 6; it.vel.y += dz / d * (min - d) * dt * 6; }
    }
    p.x += it.vel.x * dt; p.z += it.vel.y * dt;
    const dx = p.x - S.POT.x, dz = p.z - S.POT.z, d = Math.hypot(dx, dz), lim = S.POT.R - it.radius * 0.8 - 0.1;
    if (d > lim) { p.x = S.POT.x + dx / d * lim; p.z = S.POT.z + dz / d * lim; it.vel.multiplyScalar(-0.3); }
    const sink = 0.3 * Math.exp(-it.timeInOil * 3) + 0.05 * it.moisture;
    p.y = 0.03 - sink + Math.sin(time * 5 + it.bobPhase) * 0.012 * heat;
    it.group.rotation.y += it.spin * dt * (0.3 + it.moisture);
    it.group.rotation.z = Math.sin(time * 3 + it.bobPhase) * 0.02 * heat;
  }
  audio.update(clamp(level / 1.8, 0, 1) * (state.paused ? 0 : 1), wsum ? dryness / wsum : 0, dt);
  return items;
}

function updateTemperature(dt, items) {
  const Teq = 25 + 22 * state.heat;
  let T = state.temp;
  T += (Teq - T) / 22 * dt;
  // 具材の水分が熱を奪う
  for (const it of items) T -= 1.1 * it.moisture * it.radius * clamp((T - 100) / 75, 0, 1.5) * dt;
  // 投入直後の温度降下
  const d = Math.min(state.pendingDrop, dt * 6);
  state.pendingDrop -= d; T -= d;
  state.temp = T;
  // 高温で煙
  if (T > 200 && Math.random() < dt * (T - 200) * 0.6) spawnSteam(S.POT.x + rand(-2.5, 2.5), 0.1, S.POT.z + rand(-2.5, 2.5), true);
  if (T > 230) for (const it of items) it.brown += dt * 0.15;
}

// ---------------------------------------------------------------
// UI
// ---------------------------------------------------------------
const ingBox = $('ingredients');
const ingButtons = {};
for (const key of INGREDIENT_KEYS) {
  const d = INGREDIENTS[key];
  const b = document.createElement('button');
  b.className = 'ing';
  b.innerHTML = `${iconSVG(key, 34)}<span class="i-name">${d.name}</span><span class="i-temp">${d.zone} ${d.ideal}℃</span>`;
  b.addEventListener('click', () => addIngredient(key));
  ingBox.appendChild(b);
  ingButtons[key] = b;
}
function updateIngredientButtons() {
  const wanted = new Set();
  for (const s of seats) if (s.customer && s.customer.state === 'waiting') wanted.add(s.customer.orders[s.customer.idx]);
  const full = oilItems().length >= MAX_IN_POT;
  for (const [k, b] of Object.entries(ingButtons)) {
    b.classList.toggle('wanted', wanted.has(k));
    b.disabled = state.busy || full;
  }
}

const heatInput = $('heat');
function heatLabel(h) { return h <= 0 ? '消火' : h < 3 ? 'とろ火' : h < 6 ? '弱火' : h < 8.5 ? '中火' : '強火'; }
heatInput.addEventListener('input', () => { state.heat = +heatInput.value; $('heat-value').textContent = heatLabel(state.heat); });
$('btn-drop').addEventListener('click', dropBatter);
$('btn-skim').addEventListener('click', () => { skimTenkasu(); audio.init(); audio.crackle(0.1, 1500); });

const labels = new Map();
function updateLabels() {
  const live = new Set();
  for (const it of state.items) {
    if (it.state !== 'oil' || state.mode === 'demo') continue;
    live.add(it);
    let el = labels.get(it);
    if (!el) { el = document.createElement('div'); el.className = 'lbl'; bubblesLayer.appendChild(el); labels.set(it, el); }
    el.classList.toggle('master', state.master);
    el.innerHTML = `${it.def.name}<span class="sec"> ${it.timeInOil.toFixed(0)}秒</span>`;
    const p = toScreen(it.group.position.clone().add(new THREE.Vector3(0, 0.35, -it.radius * 0.5)));
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
  }
  for (const [it, el] of labels) if (!live.has(it)) { el.remove(); labels.delete(it); }
}

function updateHUD() {
  const T = state.temp;
  $('thermo-fill').style.height = clamp((T - 100) / 130 * 100, 0, 100) + '%';
  $('temp-value').textContent = state.master ? '—' : Math.round(T) + '℃';
  $('thermo').classList.toggle('masked', state.master);
  $('potcount').textContent = `${oilItems().length}/${MAX_IN_POT}`;
  if (state.mode === 'shift') {
    const t = Math.max(0, Math.ceil(state.time));
    $('time').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  } else $('time').textContent = '∞';
  const w = $('warn');
  let msg = '';
  if (T > 205) msg = '油が煙を上げている！火を弱めて';
  else if (T < 145 && oilItems().length) msg = '油温が低すぎる…ベチャッとなるぞ';
  w.textContent = msg;
  w.classList.toggle('hidden', !msg);
}

// ---------------------------------------------------------------
// 入力（鍋の天ぷらをタップで引き上げ）
// ---------------------------------------------------------------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const oilPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let downAt = null;
function setNDC(e) { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); }
canvas.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointermove', e => {
  if (hashiFollow || state.mode === 'demo') return;
  setNDC(e);
  const hit = new THREE.Vector3();
  if (ray.ray.intersectPlane(oilPlane, hit) && Math.hypot(hit.x - S.POT.x, hit.z - S.POT.z) < S.POT.R + 0.5) hashiTarget.set(hit.x, 0.7, hit.z);
});
canvas.addEventListener('pointerup', e => {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) return;
  downAt = null;
  if (!state.running || state.paused) return;
  setNDC(e);
  const cands = state.items.filter(i => i.state === 'oil');
  const hits = ray.intersectObjects(cands.map(i => i.group), true);
  let target = null;
  if (hits.length) target = cands.find(i => { let o = hits[0].object; while (o) { if (o === i.group) return true; o = o.parent; } return false; });
  if (!target) {
    // 指で押しやすいよう、近くのものを拾う
    const hit = new THREE.Vector3();
    if (ray.ray.intersectPlane(oilPlane, hit)) {
      let best = 9;
      for (const i of cands) {
        const d = Math.hypot(i.group.position.x - hit.x, i.group.position.z - hit.z) - i.radius;
        if (d < 0.45 && d < best) { best = d; target = i; }
      }
    }
  }
  if (target) liftItem(target);
});

// ---------------------------------------------------------------
// 画面遷移
// ---------------------------------------------------------------
function clearAll() {
  for (const it of state.items) { scene.remove(it.group); it.dispose(); }
  for (const r of state.rack) if (r.stain) scene.remove(r.stain);
  state.items = []; state.rack = [];
  tweens.length = 0;
  hashiFollow = null; hashiTarget.copy(HASHI_REST);
  for (const s of seats) {
    if (s.customer) { scene.remove(s.customer.group); s.customer.el.remove(); if (s.customer.plateItem) scene.remove(s.customer.plateItem.group); }
    s.customer = null; s.cooldown = rand(0.5, 3.5);
  }
  for (const [, el] of labels) el.remove();
  labels.clear();
  state.busy = false;
}

function startGame(mode) {
  audio.init();
  clearAll();
  state.mode = mode;
  state.master = $('opt-master').checked;
  state.running = true; state.paused = false;
  state.time = SHIFT_TIME; state.score = 0;
  state.temp = 168; state.pendingDrop = 0;
  state.heat = 7.5; heatInput.value = 7.5; $('heat-value').textContent = heatLabel(7.5);
  state.stats = { fried: 0, served: 0, missed: 0, qualSum: 0, best: 0, perfect: 0 };
  state.firstAdd = false; $('hint').style.opacity = 1;
  $('score').textContent = 0;
  seats[1].cooldown = 0.3;
  for (const id of ['title', 'result', 'pause']) $(id).classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('labels').classList.remove('hidden');
  updateIngredientButtons();
}

function endGame() {
  state.running = false;
  const st = state.stats;
  const avg = st.fried ? Math.round(st.qualSum / st.fried) : 0;
  const ranks = [[0, '見習い'], [700, '駆け出し'], [1500, '一人前'], [2500, '板前'], [3500, '名人'], [4600, '天ぷらの神']];
  let rank = ranks[0][1];
  for (const [s, r] of ranks) if (state.score >= s) rank = r;
  $('rank').textContent = rank;
  const comment = avg >= 85 ? '油の声がよく聴けている。見事な揚げ場でした。' : avg >= 70 ? 'いい腕だ。適温を守ればもっと良くなる。' : avg >= 50 ? '衣の色と泡の変化をよく見てみよう。' : '油温を合わせるところから始めよう。衣を一滴たらすと温度がわかる。';
  $('result-body').innerHTML = `<table>
    <tr><td>売上</td><td>${state.score} 点</td></tr>
    <tr><td>お出しした天ぷら</td><td>${st.served} 品</td></tr>
    <tr><td>揚げた数</td><td>${st.fried} 品</td></tr>
    <tr><td>平均の出来</td><td>${avg} 点</td></tr>
    <tr><td>最高の一品</td><td>${st.best} 点</td></tr>
    <tr><td>カラッと（90点以上）</td><td>${st.perfect} 品</td></tr>
    <tr><td>帰ってしまったお客さん</td><td>${st.missed} 人</td></tr>
    ${state.master ? '<tr><td>職人モード</td><td>×1.3</td></tr>' : ''}
  </table><div class="comment">${comment}</div>`;
  $('result').classList.remove('hidden');
  $('hud').classList.add('hidden');
  $('labels').classList.add('hidden');
  audio.update(0, 0, 0.1);
}

function toTitle() {
  clearAll();
  state.mode = 'demo'; state.running = false; state.paused = false;
  state.heat = 7.5; state.temp = 172;
  for (const id of ['result', 'pause', 'hud']) $(id).classList.add('hidden');
  $('title').classList.remove('hidden');
}

function setPaused(p) {
  if (!state.running) return;
  state.paused = p;
  $('pause').classList.toggle('hidden', !p);
  if (p) audio.suspend(); else audio.resume();
}

document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => startGame(b.dataset.mode)));
$('btn-pause').addEventListener('click', () => setPaused(true));
$('btn-resume').addEventListener('click', () => setPaused(false));
$('btn-quit').addEventListener('click', toTitle);
$('btn-title').addEventListener('click', toTitle);
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' || e.key === 'p') setPaused(!state.paused);
  const n = parseInt(e.key, 10);
  if (state.running && !isNaN(n)) { const k = INGREDIENT_KEYS[(n + 9) % 10]; if (k) addIngredient(k); }
});

// タイトル画面のデモ：職人が勝手に揚げている
let demoTimer = 0;
function demoTick(dt) {
  demoTimer -= dt;
  const inOil = state.items.filter(i => i.state === 'oil');
  for (const it of inOil) if (it.cook > 1.12 && !state.busy) { liftItem(it); return; }
  if (demoTimer <= 0 && !state.busy && oilItems().length < 4) {
    demoTimer = rand(2.5, 5);
    addIngredient(INGREDIENT_KEYS[Math.floor(Math.random() * INGREDIENT_KEYS.length)]);
  }
  for (const rec of [...state.rack]) if (rec.t > 6) { state.rack = state.rack.filter(r => r !== rec); discard(rec); }
}

// ---------------------------------------------------------------
// ループ
// ---------------------------------------------------------------
const clock = new THREE.Clock();
let time = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta()) * (state.timeScale || 1);
  controls.update();
  stMat.uniforms.pscale.value = renderer.domElement.height * 0.5;
  if (!state.paused) {
    time += dt;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const t = tweens[i];
      t.t += dt;
      const k = Math.min(1, t.t / t.dur);
      t.fn(k);
      if (k >= 1) { tweens.splice(i, 1); t.done && t.done(); }
    }
    const items = updateFrying(dt, time);
    updateTemperature(dt, items);
    updateTenkasu(dt, state.temp, time);
    updateDrops(dt, state.temp);
    updateBubbles(dt);
    updateSteam(dt);
    updateOil(time, state.temp);
    updateHashi(dt);
    if (state.mode === 'demo') demoTick(dt);
    else if (state.running) {
      updateCustomers(dt);
      updateRack(dt);
      if (state.mode === 'shift') {
        state.time -= dt;
        if (state.time <= 0) endGame();
      }
    }
    updateLabels();
    updateHUD();
  }
  renderer.render(scene, camera);
}

$('loading').classList.add('hidden');
frame();

// デバッグ用
window.__tempura = { state, addIngredient, liftItem, startGame, seats };
