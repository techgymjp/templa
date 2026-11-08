import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { INGREDIENTS, INGREDIENT_KEYS, Tempura, cookRate, brownRate, evaluate, batterColor, SUBMERGED, EXPOSED } from './ingredients.js';
import * as S from './scene.js';
import { softDot } from './textures.js';
import { FryAudio } from './audio.js';
import { iconSVG } from './icons.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const rand = (a, b) => a + Math.random() * (b - a);
const store = {
  get(k, d) { try { const v = localStorage.getItem('tempura.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('tempura.' + k, JSON.stringify(v)); } catch { /* 保存できなくても続行 */ } },
};

// ---------------------------------------------------------------
// 初期化
// ---------------------------------------------------------------
const canvas = $('scene');
const renderer = S.setupRenderer(canvas);
const world = S.buildScene(renderer);
const { scene, hashi, seats } = world;
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
const CAM_TARGET = new THREE.Vector3(0, 0.8, -3.2);
const CAM_DIR = new THREE.Vector3(0, 12.5, 12.5).normalize();
const CAM_DIST = 23;
const controls = new OrbitControls(camera, canvas);
controls.target.copy(CAM_TARGET);
controls.enablePan = false;
controls.enableDamping = true;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = 0.95;
controls.minAzimuthAngle = -0.45;
controls.maxAzimuthAngle = 0.45;
controls.rotateSpeed = 0.5;

// 写真らしさのための後処理：環境遮蔽（接地感）・光のにじみ・周辺減光と粒子感
const QUERY = new URLSearchParams(location.search);
const LOW = QUERY.get('q') === 'low' || Math.min(window.innerWidth, window.innerHeight) < 700;
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: LOW ? 0 : 4 }));
composer.addPass(new RenderPass(scene, camera));
let gtao = null;
if (!LOW) {
  try {
    gtao = new GTAOPass(scene, camera, 1, 1);
    gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.5, thickness: 1.2, scale: 1.1, samples: 12 });
    gtao.blendIntensity = 0.85;
    composer.addPass(gtao);
  } catch (e) { gtao = null; }
}
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.18, 0.5, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const finish = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.85, 0.25, length(d * vec2(1.0, 1.15)));
      c.rgb *= mix(0.72, 1.0, v);
      c.rgb += (h(vUv * 1000.0 + uTime) - 0.5) * 0.025;
      gl_FragColor = c;
    }`,
});
composer.addPass(finish);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  if (gtao) gtao.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  // 上の吹き出しの分だけ絵を下にずらす
  const shift = Math.round(h * 0.06);
  camera.aspect = w / (h + shift);
  camera.setViewOffset(w, h + shift, 0, 0, w, h);
  const need = w < h ? 0.95 : 1.55; // 横に見せたい幅の比
  const f = Math.max(1, need / (w / h));
  camera.position.copy(CAM_TARGET).addScaledVector(CAM_DIR, CAM_DIST * f);
  controls.minDistance = CAM_DIST * f * 0.7;
  controls.maxDistance = CAM_DIST * f * 1.25;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const audio = new FryAudio();
audio.bgmOn = store.get('bgm', true);

// ---------------------------------------------------------------
// ゲーム状態
// ---------------------------------------------------------------
const SHIFT_TIME = 150;
const MAX_IN_POT = 6;
const OIL_SET = 180; // 店が保っている油温
const state = {
  mode: 'demo', master: false, running: false, paused: false,
  time: SHIFT_TIME, score: 0, temp: OIL_SET, pendingDrop: 0,
  items: [], rack: [], busy: false,
  stats: null, firstAdd: false,
};
const tweens = [];
function tween(dur, fn, done) { const t = { t: 0, dur, fn, done }; tweens.push(t); fn(0); return t; }

// ---------------------------------------------------------------
// 泡：具材のまわりの細かい泡の層と、はじける大きめの泡
// ---------------------------------------------------------------
const BUB_N = 3200;
const bubbleMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6),
  new THREE.MeshPhysicalMaterial({ color: '#fff3d2', roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.55, envMapIntensity: 2.2, depthWrite: false }),
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
    const s = b.size * (k < 0.15 ? k / 0.15 : 1) * (1 + k * 0.35);
    _p.set(b.x, b.y, b.z);
    _s.set(s, s * 0.5, s);
    bubbleMesh.setMatrixAt(n - 1, _m.compose(_p, _q, _s));
  }
  bubbles.length = n;
  bubbleMesh.count = n;
  bubbleMesh.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------
// 天かす（油に散った衣。しばらく漂って沈む）
// ---------------------------------------------------------------
const TK_N = 220;
const tenkasuMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.7 }), TK_N);
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
      brown: 0, s: rand(0.02, 0.06), rot: new THREE.Euler(rand(0, 6), rand(0, 6), rand(0, 6)), life: rand(12, 22),
    });
  }
}
const _c = new THREE.Color();
function updateTenkasu(dt, T, time) {
  let n = 0;
  const br = Math.pow(2, (T - 175) / 15) / 5;
  for (let i = 0; i < tenkasu.length; i++) {
    const t = tenkasu[i];
    t.life -= dt;
    if (t.life <= 0) continue;
    t.brown += br * dt;
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
    const sink = t.life < 2 ? (2 - t.life) * 0.15 : 0;
    _q.setFromEuler(t.rot);
    _p.set(t.x, 0.008 - sink, t.z);
    _s.set(t.s, t.s * 0.6, t.s);
    tenkasuMesh.setMatrixAt(n - 1, _m.compose(_p, _q, _s));
    tenkasuMesh.setColorAt(n - 1, batterColor(t.brown * 0.9 + 0.2, _c));
  }
  tenkasu.length = n;
  tenkasuMesh.count = n;
  tenkasuMesh.instanceMatrix.needsUpdate = true;
  tenkasuMesh.instanceColor.needsUpdate = true;
}

// ---------------------------------------------------------------
// 湯気
// ---------------------------------------------------------------
const ST_N = 400;
const stGeo = new THREE.BufferGeometry();
stGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ST_N * 3), 3));
stGeo.setAttribute('size', new THREE.BufferAttribute(new Float32Array(ST_N), 1));
stGeo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(ST_N), 1));
const stMat = new THREE.ShaderMaterial({
  uniforms: { map: { value: softDot() }, pscale: { value: 600 } },
  vertexShader: `uniform float pscale; attribute float size; attribute float alpha; varying float vA;
    void main(){ vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = size * pscale / -mv.z; }`,
  fragmentShader: `uniform sampler2D map; varying float vA;
    void main(){ vec4 c = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vec3(1.0), c.a * vA); }`,
  transparent: true, depthWrite: false,
});
const steamPts = new THREE.Points(stGeo, stMat);
steamPts.frustumCulled = false;
steamPts.renderOrder = 8;
scene.add(steamPts);
const steam = [];
function spawnSteam(x, y, z) {
  if (steam.length >= ST_N) return;
  steam.push({ x, y, z, vx: rand(-0.15, 0.15), vy: rand(0.6, 1.1), vz: rand(-0.15, 0.15), life: rand(1.4, 2.4), max: 2.4, size: rand(0.5, 0.9) });
}
function updateSteam(dt) {
  const pos = stGeo.attributes.position.array, size = stGeo.attributes.size.array, alpha = stGeo.attributes.alpha.array;
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
    alpha[n - 1] = 0.12 * Math.min(1, (1 - k) * 5) * k;
  }
  steam.length = n;
  stGeo.setDrawRange(0, n);
  for (const k of ['position', 'size', 'alpha']) stGeo.attributes[k].needsUpdate = true;
}

// ---------------------------------------------------------------
// 油面のゆらぎ
// ---------------------------------------------------------------
const oilPos = world.oilGeo.attributes.position;
const oilBase = Float32Array.from(oilPos.array);
function updateOil(time) {
  const agit = state.items.filter(i => i.state === 'oil');
  for (let i = 0; i < oilPos.count; i++) {
    const x = oilBase[i * 3], z = oilBase[i * 3 + 2];
    let y = Math.sin(x * 2.1 + time * 1.3) * Math.cos(z * 1.7 - time) * 0.006;
    for (const it of agit) {
      const dx = x + S.POT.x - it.group.position.x, dz = z + S.POT.z - it.group.position.z;
      const d = Math.hypot(dx, dz) - it.radius * 0.8;
      if (d < 1.2) y += Math.sin(d * 18 - time * 22) * 0.012 * it.moisture * Math.exp(-Math.max(0, d) * 3);
    }
    oilPos.array[i * 3 + 1] = y;
  }
  oilPos.needsUpdate = true;
  world.oilGeo.computeVertexNormals();
  world.oilMat.normalMap.offset.set(time * 0.012, time * 0.008);
}

// ---------------------------------------------------------------
// 菜箸
// ---------------------------------------------------------------
const HASHI_REST = new THREE.Vector3(3.4, 0.6, 3.0);
const hashiTarget = HASHI_REST.clone();
let hashiOpen = 0.12, hashiOpenTarget = 0.12, hashiFollow = null;
function updateHashi(dt) {
  if (hashiFollow) hashiTarget.copy(hashiFollow.group.position).add(new THREE.Vector3(0, 0.12, 0));
  hashi.position.lerp(hashiTarget, 1 - Math.exp(-dt * (hashiFollow ? 30 : 10)));
  hashiOpen = lerp(hashiOpen, hashiOpenTarget, 1 - Math.exp(-dt * 12));
  hashi.sticks.forEach((s, i) => {
    s.rotation.set(-0.75, 0, -0.55 + (i ? hashiOpen : -hashiOpen) * 0.5);
    s.position.set(0, 0, i ? 0.05 : -0.05);
  });
}

// ---------------------------------------------------------------
// 具材の投入
// ---------------------------------------------------------------
const oilItems = () => state.items.filter(i => i.state === 'oil' || i.state === 'flying' || i.state === 'held');
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
  if (!state.firstAdd && state.mode !== 'demo') { state.firstAdd = true; $('hint').style.opacity = 0; }
  tween(0.4, k => g.position.lerpVectors(start, dip, k * k), () => {
    it.showBatter();
    it.updateLook();
    audio.crackle(0.05, 900);
    const up = new THREE.Vector3(S.BOWL.x, S.BATTER_Y + 0.9, S.BOWL.z);
    tween(0.4, k => { g.position.lerpVectors(dip, up, 1 - (1 - k) * (1 - k)); g.rotation.z = Math.sin(k * 6) * 0.08; }, () => {
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

function splashAt(p, radius, power = 1) {
  for (let k = 0; k < 90 * power; k++) {
    const a = Math.random() * 6.283, r = radius * rand(0.3, 1.3);
    spawnBubble(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r, rand(0.02, 0.07), rand(0.3, 1.0));
  }
}

function enterOil(it) {
  it.state = 'oil';
  it.timeInOil = 0;
  hashiFollow = null; hashiOpenTarget = 0.12;
  hashiTarget.set(it.group.position.x + 0.8, 0.9, it.group.position.z + 0.8);
  state.busy = false;
  updateIngredientButtons();
  const p = it.group.position;
  state.pendingDrop += 1.5 + it.radius * 2.5;
  audio.splash(1);
  splashAt(p, it.radius, 1);
  spawnTenkasu(p.x, p.z, Math.round(rand(6, 12)), it.radius * 1.1);
}

function flashPotFull() {
  const c = $('pot-chip');
  c.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)', background: '#f3b0a0' }, { transform: 'scale(1)' }], { duration: 400 });
  audio.bad();
}

// ---------------------------------------------------------------
// 裏返す
// ---------------------------------------------------------------
function flipItem(it) {
  if (it.state !== 'oil' || it.flipping) return;
  it.flipping = true;
  const r0 = it.flipper.rotation.x;
  const axisFlip = Math.random() < 0.5 ? 1 : -1;
  hashiFollow = it; hashiOpenTarget = 0.03;
  audio.crackle(0.15, 3000);
  tween(0.42, k => {
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    it.flipper.rotation.x = r0 + Math.PI * e * axisFlip;
    it.flipper.position.y = Math.sin(k * Math.PI) * 0.35;
  }, () => {
    it.flipper.rotation.x = r0 + Math.PI * axisFlip;
    it.flipper.position.y = 0;
    it.flipped = !it.flipped;
    it.flipCount = (it.flipCount || 0) + 1;
    it.flipping = false;
    if (hashiFollow === it) { hashiFollow = null; hashiOpenTarget = 0.12; }
    splashAt(it.group.position, it.radius, 0.35);
    audio.splash(0.35);
  });
}

// ---------------------------------------------------------------
// 引き上げ（網の上で油を切る）
// ---------------------------------------------------------------
const RACK_SLOTS = S.rackSlots();
function freeSlot() {
  const used = new Set(state.rack.map(r => r.slot));
  for (let i = 0; i < RACK_SLOTS.length; i++) if (!used.has(i)) return i;
  const old = state.rack.find(r => !r.serving) || state.rack[0];
  state.rack = state.rack.filter(r => r !== old);
  discard(old);
  return old.slot;
}

function liftItem(it) {
  if (it.state !== 'oil' && it.state !== 'held') return;
  if (it.flipping) return;
  if (state.mode !== 'demo') audio.init();
  it.state = 'lifted';
  const ev = evaluate(it);
  it.quality = ev.score;
  const slot = freeSlot();
  const dest = RACK_SLOTS[slot].clone();
  const from = it.group.position.clone();
  hashiFollow = it; hashiOpenTarget = 0.02;
  tween(0.65, k => {
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    it.group.position.lerpVectors(from, dest, e);
    it.group.position.y = lerp(from.y, dest.y, e) + Math.sin(k * Math.PI) * 1.2;
    if (k < 0.3 && Math.random() < 0.6) spawnBubble(it.group.position.x, it.group.position.z, 0.03, 0.3);
  }, () => {
    if (hashiFollow === it) { hashiFollow = null; hashiOpenTarget = 0.12; hashiTarget.copy(HASHI_REST); }
    updateIngredientButtons();
    const stain = new THREE.Mesh(new THREE.PlaneGeometry(it.radius * 2.4, it.radius * 2.4), world.stainMat.clone());
    stain.rotation.x = -Math.PI / 2;
    stain.position.set(dest.x, dest.y - 0.035, dest.z);
    scene.add(stain);
    const rec = { item: it, slot, t: 0, stain, ev };
    state.rack.push(rec);
    if (state.mode !== 'demo') showEvaluation(it, ev, dest);
    if (state.stats) {
      state.stats.fried++;
      state.stats.qualSum += ev.score;
      state.stats.best = Math.max(state.stats.best, ev.score);
      if (ev.score >= 90) state.stats.perfect++;
    }
  });
}

function discard(rec) {
  if (!rec) return;
  scene.remove(rec.item.group);
  rec.item.dispose();
  if (rec.stain) scene.remove(rec.stain);
  state.items = state.items.filter(i => i !== rec.item);
}

function showEvaluation(it, ev, pos) {
  const p = toScreen(pos.clone().add(new THREE.Vector3(0, 0.6, 0)));
  const el = document.createElement('div');
  el.className = 'toast' + (ev.score >= 90 ? ' great' : ev.score < 50 ? ' bad' : '');
  el.innerHTML = `<div class="s">${ev.score}<small>点</small></div><div class="c">${ev.comment}</div>
    <div class="d">揚げ色:${ev.color} ／ 両面:${ev.evenness} ／ 火通り:${ev.doneness} ／ 食感:${ev.crisp}</div>`;
  el.style.left = clamp(p.x, 110, innerWidth - 110) + 'px';
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
const SEAT_Y = S.COUNTER_Y + 0.3;
const SEAT_LOW = S.COUNTER_Y - 2.8;

function newCustomer(seat) {
  const c = S.makeCustomer(custSeed++ * 7.13 + Math.random() * 100);
  const n = Math.random() < 0.45 ? 1 : Math.random() < 0.7 ? 2 : 3;
  c.orders = Array.from({ length: n }, () => INGREDIENT_KEYS[Math.floor(Math.random() * INGREDIENT_KEYS.length)]);
  c.idx = 0;
  c.state = 'arriving';
  c.st = 0;
  c.group.position.set(seat.x, SEAT_LOW, S.CUSTOMER_Z);
  scene.add(c.group);
  const el = document.createElement('div');
  el.className = 'speech hidden';
  bubblesLayer.appendChild(el);
  c.el = el;
  seat.customer = c;
  return c;
}

function patienceFor(key) {
  return state.mode === 'practice' ? Infinity : 40 + INGREDIENTS[key].cookTime * 2.5;
}

function showOrder(seat) {
  const c = seat.customer;
  const key = c.orders[c.idx];
  c.state = 'waiting';
  c.patience = c.maxPatience = patienceFor(key);
  c.setMood('normal');
  c.eating = false;
  // 注文は具材のイラストだけ
  c.el.className = 'speech';
  c.el.innerHTML = `<div class="sp-icon" title="${INGREDIENTS[key].name}">${iconSVG(key, 58)}</div>`;
  audio.bell();
  updateIngredientButtons();
}

function say(c, text, cls = '') {
  c.el.className = 'speech talk ' + cls;
  c.el.innerHTML = `<div class="sp-talk">${text}</div>`;
}

const _look = new THREE.Vector3();
function updateCustomers(dt) {
  const canSpawn = state.mode === 'shift' ? state.time > 8 : state.mode === 'practice';
  for (const seat of seats) {
    const c = seat.customer;
    if (!c) {
      seat.cooldown -= dt;
      if (canSpawn && seat.cooldown <= 0) newCustomer(seat);
      continue;
    }
    c.st += dt;
    const g = c.group;
    // 視線：待っている間は鍋と菜箸、食べるときは器
    if (c.state === 'eating') _look.copy(seat.platePos);
    else if (hashiFollow && hashiFollow.state !== 'served') _look.copy(hashiFollow.group.position);
    else _look.set(S.POT.x + Math.sin(c.t * 0.3 + seat.x) * 1.5, 0, S.POT.z);
    c.update(dt, _look);

    if (c.state === 'arriving') {
      const k = clamp(c.st / 0.9, 0, 1);
      g.position.y = lerp(SEAT_LOW, SEAT_Y, 1 - Math.pow(1 - k, 3));
      if (k >= 1) showOrder(seat);
    } else if (c.state === 'waiting') {
      c.patience -= dt;
      const r = c.patience / c.maxPatience;
      c.el.classList.toggle('urgent', r < 0.3);
      if (r < 0.3 && c.mood !== 'angry') c.setMood('angry');
      if (c.patience <= 0) {
        say(c, 'もういいよ！', 'angry');
        c.state = 'leaving'; c.st = 0;
        audio.bad();
        state.stats.missed++;
        addScore(-30);
        updateIngredientButtons();
      }
    } else if (c.state === 'eating') {
      if (c.plateItem) c.plateItem.group.scale.setScalar(Math.max(0.05, 1 - c.st / 3.2));
      if (c.st > 3.2) {
        if (c.plateItem) { const pi = c.plateItem; c.plateItem = null; scene.remove(pi.group); pi.dispose(); state.items = state.items.filter(i => i !== pi); }
        c.eating = false;
        c.idx++;
        if (c.idx < c.orders.length) showOrder(seat);
        else { say(c, 'ごちそうさま！', 'happy'); c.state = 'leaving'; c.st = 0; c.setMood('happy'); }
      }
    } else if (c.state === 'leaving') {
      if (c.st > 1.4) {
        const k = clamp((c.st - 1.4) / 0.8, 0, 1);
        g.position.y = lerp(SEAT_Y, SEAT_LOW, k * k);
        c.el.style.opacity = 1 - k;
        if (k >= 1) {
          scene.remove(g);
          c.el.remove();
          seat.customer = null;
          seat.cooldown = rand(2, 6);
        }
      }
    }
    const p = toScreen(new THREE.Vector3(g.position.x, g.position.y + 2.15, g.position.z));
    c.el.style.left = p.x + 'px';
    c.el.style.top = p.y + 'px';
  }
}

// 油が切れたものから、待っているお客さんへ
function tryServeFromRack() {
  for (const seat of seats) {
    const c = seat.customer;
    if (!c || c.state !== 'waiting') continue;
    const key = c.orders[c.idx];
    const cands = state.rack.filter(r => r.item.key === key && !r.serving && r.t >= 1.8);
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
    it.state = 'served';
    state.rack = state.rack.filter(r => r !== rec);
    if (rec.stain) scene.remove(rec.stain);
    c.plateItem = it;
    c.state = 'eating'; c.st = 0; c.eating = true;
    const speed = isFinite(c.maxPatience) ? clamp(c.patience / c.maxPatience, 0, 1) : 0.5;
    let pts = quality + Math.round(speed * 20);
    let text, cls, mood;
    if (quality >= 90) { text = 'カラッと最高！'; cls = 'happy'; mood = 'happy'; }
    else if (quality >= 75) { text = 'うまい！'; cls = 'happy'; mood = 'happy'; }
    else if (quality >= 50) { text = 'うん、悪くない'; cls = ''; mood = 'eat'; }
    else { text = 'これはちょっと…'; cls = 'angry'; mood = 'sad'; pts = Math.round(pts * 0.3); }
    if (state.master) pts = Math.round(pts * 1.3);
    say(c, `${text}<span class="sp-pts">+${pts}</span>`, cls);
    c.setMood(mood);
    if (state.stats) state.stats.served++;
    addScore(pts);
    if (quality >= 75) audio.good();
    updateIngredientButtons();
  });
}

function currentQuality(rec) {
  // 時間が経つと衣がしんなり
  return Math.max(0, Math.round(rec.item.quality - Math.max(0, rec.t - 10) * 1.5));
}

function addScore(pts) {
  if (state.mode !== 'shift' && state.mode !== 'practice') return;
  state.score = Math.max(0, state.score + pts);
  $('score').textContent = state.score;
}

function updateRack(dt) {
  for (const rec of [...state.rack]) {
    rec.t += dt;
    const it = rec.item;
    if (rec.stain) rec.stain.material.opacity = Math.min(0.85, rec.t * 0.3);
    // 油を切ると表面のつやが落ち着く
    it.sheen = Math.max(0.15, 1 - rec.t * 0.35);
    it.updateLook();
    if (!rec.serving && rec.t < 1.5 && Math.random() < dt * 8) spawnDrip(it.group.position);
    if (!rec.serving && rec.t > 45) {
      state.rack = state.rack.filter(r => r !== rec);
      tween(0.4, k => it.group.scale.setScalar(1 - k), () => discard(rec));
    }
  }
  if (state.mode !== 'demo') tryServeFromRack();
}

// 油のしずく
const dripMat = new THREE.MeshPhysicalMaterial({ color: '#d29a3a', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.8 });
const dripGeo = new THREE.SphereGeometry(0.025, 8, 6);
const drips = [];
function spawnDrip(p) {
  const m = new THREE.Mesh(dripGeo, dripMat);
  m.position.set(p.x + rand(-0.3, 0.3), p.y - 0.05, p.z + rand(-0.3, 0.3));
  m.scale.set(1, 1.6, 1);
  scene.add(m);
  drips.push({ m, vy: 0, floor: p.y < 0.5 ? -0.02 : S.RACK_Y - 0.06 });
}
function updateDrips(dt) {
  for (let i = drips.length - 1; i >= 0; i--) {
    const d = drips[i];
    d.vy -= 9.8 * dt;
    d.m.position.y += d.vy * dt;
    if (d.m.position.y < d.floor) {
      if (d.floor < 0) spawnBubble(d.m.position.x, d.m.position.z, 0.03, 0.4);
      scene.remove(d.m); drips.splice(i, 1);
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
    const br = brownRate(def, T) * dt * (0.6 + 0.4 * (1 - it.moisture));
    if (it.flipped) { it.brownA += br * SUBMERGED; it.brownB += br * EXPOSED; }
    else { it.brownB += br * SUBMERGED; it.brownA += br * EXPOSED; }
    it.grease += Math.max(0, 163 - T) / 30 * 0.06 * dt;
    it.moisture = Math.exp(-1.6 * it.cook);
    it.sheen = 1;
    it.updateLook();
    if (it.timeInOil < 2.5) it.setHanaGrowth(it.timeInOil / 2);

    // 泡：水分が多いほど大きく激しい。抜けると細かく少なく
    const heat = clamp((T - 105) / 75, 0, 1.4);
    const rate = (40 + 260 * Math.pow(it.moisture, 0.8)) * heat * it.radius;
    let n = rate * dt;
    const p = it.group.position;
    const ry = it.group.rotation.y;
    while (n > 0) {
      if (n < 1 && Math.random() > n) break;
      n--;
      const a = Math.random() * 6.283, r = rand(0.55, 1.12);
      const lx = Math.cos(a) * it.radius * r, lz = Math.sin(a) * it.radius * r * 0.6;
      const wx = p.x + lx * Math.cos(ry) + lz * Math.sin(ry), wz = p.z - lx * Math.sin(ry) + lz * Math.cos(ry);
      spawnBubble(wx, wz, rand(0.008, 0.022) + Math.random() * it.moisture * 0.04, rand(0.15, 0.45) + it.moisture * 0.35);
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
  audio.update(clamp(level / 1.8, 0, 1), wsum ? dryness / wsum : 0, dt);
  return items;
}

// 油温は店が一定に保つ。入れすぎると一時的に下がる（表示はしない）
function updateTemperature(dt, items) {
  let T = state.temp;
  T += (OIL_SET - T) / 14 * dt;
  for (const it of items) T -= 1.0 * it.moisture * it.radius * dt;
  const d = Math.min(state.pendingDrop, dt * 6);
  state.pendingDrop -= d; T -= d;
  state.temp = T;
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
  b.innerHTML = `${iconSVG(key, 34)}<span class="i-name">${d.name}</span>`;
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

function updateBgmButton() {
  $('btn-bgm').textContent = audio.bgmOn ? '♪ BGM' : '♪ off';
  $('btn-bgm').classList.toggle('off', !audio.bgmOn);
  $('opt-bgm').checked = audio.bgmOn;
}
$('btn-bgm').addEventListener('click', () => { audio.init(); audio.setBgm(!audio.bgmOn); store.set('bgm', audio.bgmOn); updateBgmButton(); });
$('opt-bgm').addEventListener('change', e => { audio.bgmOn = e.target.checked; store.set('bgm', audio.bgmOn); updateBgmButton(); });
updateBgmButton();

const labels = new Map();
function updateLabels() {
  const live = new Set();
  for (const it of state.items) {
    if ((it.state !== 'oil' && it.state !== 'held') || state.mode === 'demo') continue;
    live.add(it);
    let el = labels.get(it);
    if (!el) { el = document.createElement('div'); el.className = 'lbl'; bubblesLayer.appendChild(el); labels.set(it, el); }
    el.classList.toggle('master', state.master);
    el.innerHTML = `${it.def.name}<span class="sec"> ${it.timeInOil.toFixed(0)}秒</span>${it.flipCount ? ' <span class="flip">↻</span>' : ''}`;
    const p = toScreen(it.group.position.clone().add(new THREE.Vector3(0, 0.35, -it.radius * 0.5)));
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
  }
  for (const [it, el] of labels) if (!live.has(it)) { el.remove(); labels.delete(it); }
}

function updateHUD() {
  $('potcount').textContent = `${oilItems().length}/${MAX_IN_POT}`;
  if (state.mode === 'shift') {
    const t = Math.max(0, Math.ceil(state.time));
    $('time').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  } else $('time').textContent = '∞';
  const w = $('warn');
  const msg = state.temp < 155 && oilItems().length ? '入れすぎで油温が下がっている…ベチャッとなるぞ' : '';
  w.textContent = msg;
  w.classList.toggle('hidden', !msg);
}

// ---------------------------------------------------------------
// 入力：タップで裏返す／網までドラッグで引き上げ
// ---------------------------------------------------------------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const oilPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const holdPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.9);
let press = null; // { x, y, item, dragging }
function setNDC(e) { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); }
function pickItem() {
  const cands = state.items.filter(i => i.state === 'oil' && !i.flipping);
  const hits = ray.intersectObjects(cands.map(i => i.group), true);
  if (hits.length) {
    const hit = cands.find(i => { let o = hits[0].object; while (o) { if (o === i.group) return true; o = o.parent; } return false; });
    if (hit) return hit;
  }
  const p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(oilPlane, p)) return null;
  let best = null, bd = 0.5;
  for (const i of cands) {
    const d = Math.hypot(i.group.position.x - p.x, i.group.position.z - p.z) - i.radius;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
function overRack(p) { return Math.abs(p.x - S.RACK.x) < 1.9 && Math.abs(p.z - S.RACK.z) < 2.6; }

// OrbitControls より先に受け取る
window.addEventListener('pointerdown', e => {
  if (e.target !== canvas || !state.running || state.paused) return;
  setNDC(e);
  const it = pickItem();
  if (it) { press = { x: e.clientX, y: e.clientY, item: it, dragging: false }; controls.enabled = false; }
}, true);
window.addEventListener('pointermove', e => {
  if (state.mode === 'demo') return;
  setNDC(e);
  if (press) {
    const it = press.item;
    if (!press.dragging && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10 && it.state === 'oil' && !it.flipping) {
      press.dragging = true;
      it.state = 'held';
      hashiFollow = it; hashiOpenTarget = 0.02;
      audio.crackle(0.2, 2500);
    }
    if (press.dragging) {
      const p = new THREE.Vector3();
      if (ray.ray.intersectPlane(holdPlane, p)) it.group.position.lerp(p, 0.6);
      if (Math.random() < 0.4) spawnDrip(it.group.position);
      $('rack-hint').classList.toggle('on', overRack(it.group.position));
    }
    return;
  }
  if (hashiFollow || e.target !== canvas) return;
  const hit = new THREE.Vector3();
  if (ray.ray.intersectPlane(oilPlane, hit) && Math.hypot(hit.x - S.POT.x, hit.z - S.POT.z) < S.POT.R + 0.5) hashiTarget.set(hit.x, 0.7, hit.z);
});
window.addEventListener('pointerup', () => {
  controls.enabled = true;
  if (!press) return;
  const { item: it, dragging } = press;
  press = null;
  $('rack-hint').classList.remove('on');
  if (!dragging) { flipItem(it); return; }
  const p = it.group.position;
  const inPot = Math.hypot(p.x - S.POT.x, p.z - S.POT.z) < S.POT.R - 0.2;
  if (inPot && !overRack(p)) {
    // 鍋に戻す
    const from = p.clone();
    tween(0.25, k => { it.group.position.lerpVectors(from, new THREE.Vector3(from.x, 0, from.z), k * k); }, () => {
      it.state = 'oil';
      if (hashiFollow === it) { hashiFollow = null; hashiOpenTarget = 0.12; }
      splashAt(it.group.position, it.radius, 0.3);
      audio.splash(0.3);
    });
  } else {
    liftItem(it);
  }
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
    if (s.customer) { scene.remove(s.customer.group); s.customer.el.remove(); }
    s.customer = null; s.cooldown = rand(0.5, 3.5);
  }
  for (const [, el] of labels) el.remove();
  labels.clear();
  state.busy = false;
  press = null;
}

function startGame(mode) {
  audio.init();
  audio.startBgm();
  clearAll();
  state.mode = mode;
  state.master = $('opt-master').checked;
  state.running = true; state.paused = false;
  state.time = SHIFT_TIME; state.score = 0;
  state.temp = OIL_SET; state.pendingDrop = 0;
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
  const comment = avg >= 85 ? '泡と音がよく見えている。見事な揚げ場でした。' : avg >= 70 ? 'いい腕だ。返すタイミングを揃えればもっと良くなる。' : avg >= 50 ? '泡が細かくなるまで待ち、途中で一度返してみよう。' : '泡の変化をよく見て、途中で返すところから始めよう。';
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
  state.temp = OIL_SET; state.stats = null;
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

// タイトル画面のデモ：職人が揚げている
let demoTimer = 0;
function demoTick(dt) {
  demoTimer -= dt;
  const inOil = state.items.filter(i => i.state === 'oil');
  for (const it of inOil) {
    if (!it.flipCount && it.cook > 0.5 && !it.flipping) { flipItem(it); return; }
    if (it.cook > 1.12 && !it.flipping) { liftItem(it); return; }
  }
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
// 描画が重い端末では自動で画質を下げる
let perfFrames = 0, perfSum = 0, perfLevel = 0;
function adaptQuality(rawDt) {
  if (perfLevel >= 2) return;
  perfFrames++; perfSum += rawDt;
  if (perfFrames < 60) return;
  const avg = perfSum / perfFrames;
  perfFrames = 0; perfSum = 0;
  if (avg > 0.034) {
    perfLevel++;
    if (perfLevel === 1 && gtao) gtao.enabled = false;
    if (perfLevel === 2) { renderer.setPixelRatio(1); resize(); bloom.enabled = false; }
  }
}
function frame() {
  requestAnimationFrame(frame);
  const rawDt = clock.getDelta();
  if (!state.timeScale) adaptQuality(rawDt);
  const dt = Math.min(0.05, rawDt) * (state.timeScale || 1);
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
    updateBubbles(dt);
    updateSteam(dt);
    updateDrips(dt);
    updateOil(time);
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
    if (state.mode === 'demo') updateRack(dt);
    updateLabels();
    updateHUD();
  }
  finish.uniforms.uTime.value = time;
  composer.render();
}

$('loading').classList.add('hidden');
frame();

// デバッグ用
window.__tempura = { state, addIngredient, liftItem, flipItem, startGame, seats, toScreen, RACK: S.RACK.clone().setY(S.RACK_Y) };
