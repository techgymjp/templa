// 什器・店内・お客さんの3Dモデル
import * as THREE from 'three';
import * as TX from './textures.js';

export const POT = { x: 0, z: -0.4, R: 2.96 };           // 油面の中心と半径（油面 y=0）
export const BOWL = new THREE.Vector3(-5.6, 0.3, 0.0);   // 衣ボウル（台の上）
export const BATTER_Y = 1.02;                            // 衣の液面高さ
export const RACK = new THREE.Vector3(5.6, 0.3, 0.2);    // バット中心
export const RACK_Y = 0.74;                              // 天紙の高さ
export const COUNTER_Y = 1.45;                           // 付け台の天板
export const SEATS_X = [-5.4, -1.8, 1.8, 5.4];
export const PLATE_Z = -5.75;
export const CUSTOMER_Z = -8.1;
export const WORK_Y = 0.3;

export function rackSlots() {
  const s = [];
  for (const z of [-0.4, 1.1, 2.6]) for (const x of [4.85, 6.15]) s.push(new THREE.Vector3(RACK.x + (x - 5.5), RACK_Y, z + (RACK.z - 1.1)));
  return s;
}

export function setupRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

// 映り込み用の店内（天井の細長い照明、壁の木、暖色の間接光）
function makeEnvScene() {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(40, 14, 40), new THREE.MeshBasicMaterial({ color: '#4a382a', side: THREE.BackSide }));
  room.position.y = 6;
  env.add(room);
  const wallGlow = new THREE.Mesh(new THREE.PlaneGeometry(40, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#6a4426').multiplyScalar(1.2) }));
  wallGlow.position.set(0, 2, -19.5);
  env.add(wallGlow);
  const panel = (w, d, x, z, k, color = '#ffe4bd') => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.rotation.x = Math.PI / 2;
    m.position.set(x, 12.8, z);
    env.add(m);
  };
  panel(16, 1.0, 0, -3, 9);
  panel(16, 1.0, 0, 2.5, 9);
  panel(3, 3, -9, 8, 3, '#ffd7a0');
  panel(3, 3, 9, -9, 3, '#ffd7a0');
  return env;
}

export function buildScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1d140d');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(makeEnvScene(), 0.02).texture;
  scene.environmentIntensity = 0.75;

  // ---- 照明 ----
  scene.add(new THREE.HemisphereLight('#ffe9c8', '#3a2414', 0.25));
  const key = new THREE.DirectionalLight('#fff1dc', 1.6);
  key.position.set(-4, 16, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 4;
  Object.assign(key.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  const potLight = new THREE.SpotLight('#ffd9a0', 14, 20, 0.5, 0.6, 1.2);
  potLight.position.set(1.5, 11, 3);
  potLight.target.position.set(POT.x, 0, POT.z);
  scene.add(potLight, potLight.target);
  const counterLight = new THREE.PointLight('#ffcf8a', 22, 18, 1.4);
  counterLight.position.set(0, 6, -7);
  scene.add(counterLight);
  // 板場側からお客さんの顔を照らす
  const faceLight = new THREE.SpotLight('#ffe2c0', 40, 22, 0.75, 0.8, 1.2);
  faceLight.position.set(0, 7, -1.5);
  faceLight.target.position.set(0, 3, -8.5);
  scene.add(faceLight, faceLight.target);

  // ---- 作業台（ステンレス） ----
  const steelRough = TX.brushedSteel().clone();
  steelRough.repeat.set(0.45, 0.45);
  steelRough.needsUpdate = true;
  const steel = new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 0.85, roughness: 1.45, roughnessMap: steelRough, envMapIntensity: 1.3 });
  // 鍋を落とし込む丸い穴を開けた天板
  const ws = new THREE.Shape();
  ws.moveTo(-11, -4.0); ws.lineTo(11, -4.0); ws.lineTo(11, 6.4); ws.lineTo(-11, 6.4); ws.lineTo(-11, -4.0);
  const wh = new THREE.Path();
  wh.absarc(POT.x, POT.z, 3.15, 0, Math.PI * 2, true);
  ws.holes.push(wh);
  const workGeo = new THREE.ExtrudeGeometry(ws, { depth: 1, bevelEnabled: false, curveSegments: 64 });
  workGeo.rotateX(Math.PI / 2); // 形状の y → z, 押し出しは下向き
  const work = new THREE.Mesh(workGeo, steel);
  work.position.set(0, WORK_Y, 0);
  work.receiveShadow = true;
  scene.add(work);
  // 鍋の下のコンロ穴（黒い縁）
  const hole = new THREE.Mesh(new THREE.RingGeometry(2.7, 3.55, 64), new THREE.MeshStandardMaterial({ color: '#1a1714', roughness: 0.6, metalness: 0.4 }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.set(POT.x, WORK_Y + 0.003, POT.z);
  scene.add(hole);

  // ---- 付け台（檜） ----
  const hinokiTex = TX.hinoki();
  const topTex = hinokiTex.clone(); topTex.repeat.set(3, 0.5); topTex.needsUpdate = true;
  const hinoki = new THREE.MeshPhysicalMaterial({ map: topTex, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5 });
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(22, 0.25, 3.1), hinoki);
  counterTop.position.set(0, COUNTER_Y - 0.125, -5.85);
  counterTop.castShadow = counterTop.receiveShadow = true;
  scene.add(counterTop);
  const frontTex = hinokiTex.clone(); frontTex.repeat.set(3, 0.3);
  const counterFront = new THREE.Mesh(new THREE.BoxGeometry(22, COUNTER_Y - WORK_Y, 0.25),
    new THREE.MeshStandardMaterial({ map: frontTex, color: '#cfb48a', roughness: 0.6 }));
  counterFront.position.set(0, (COUNTER_Y + WORK_Y) / 2 - 0.12, -4.35);
  counterFront.receiveShadow = true;
  scene.add(counterFront);
  // 客席側の床と壁
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ color: '#2a1c12', roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -1.6, -12);
  scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), new THREE.MeshStandardMaterial({ map: TX.plaster(), roughness: 0.95 }));
  wall.position.set(0, 3, -12.5);
  scene.add(wall);

  // ---- 天ぷら鍋（槌目の銅） ----
  const cu = TX.copper();
  const copperOut = new THREE.MeshStandardMaterial({ map: cu.map, normalMap: cu.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), metalness: 1, roughness: 0.32 });
  const copperIn = new THREE.MeshStandardMaterial({ color: '#5a3018', normalMap: cu.normalMap, normalScale: new THREE.Vector2(0.3, 0.3), metalness: 0.6, roughness: 0.5 });
  cu.map.repeat.set(4, 1); cu.normalMap.repeat.set(4, 1);
  const prof = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const y = -1.45 + t * 2.0;
    const r = 2.35 + Math.pow(t, 0.7) * 0.85;
    prof.push(new THREE.Vector2(i === 0 ? 0.001 : r, y));
  }
  prof.splice(1, 0, new THREE.Vector2(2.0, -1.45)); // 平らな底
  const potIn = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), copperIn);
  potIn.material.side = THREE.BackSide;
  potIn.position.set(POT.x, 0, POT.z);
  potIn.receiveShadow = true;
  scene.add(potIn);
  const outProf = prof.map(v => new THREE.Vector2(v.x === 0.001 ? 0.001 : v.x + 0.08, v.y - 0.06));
  const potOut = new THREE.Mesh(new THREE.LatheGeometry(outProf, 96), copperOut);
  potOut.position.copy(potIn.position);
  potOut.castShadow = true;
  scene.add(potOut);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(3.24, 0.075, 12, 128), copperOut);
  lip.rotation.x = Math.PI / 2;
  lip.position.set(POT.x, 0.56, POT.z);
  scene.add(lip);
  // 取っ手
  for (const sx of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 10, 24, Math.PI), copperOut);
    h.rotation.set(-Math.PI / 2, 0, sx > 0 ? -Math.PI / 2 : Math.PI / 2);
    h.position.set(POT.x + sx * 3.28, 0.4, POT.z);
    h.castShadow = true;
    scene.add(h);
  }

  // ---- 油 ----
  const oilGeo = new THREE.RingGeometry(0.001, POT.R, 80, 22);
  oilGeo.rotateX(-Math.PI / 2);
  const oilN = TX.oilNormal();
  oilN.repeat.set(2.5, 2.5);
  // 透き通った油：鍋底や沈んだ具材が琥珀色に透けて見える
  const oilMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: 0.02, metalness: 0, ior: 1.47,
    transmission: 1, thickness: 0.8, attenuationColor: new THREE.Color('#e9b048'), attenuationDistance: 1.6,
    specularIntensity: 1, normalMap: oilN, normalScale: new THREE.Vector2(0.1, 0.1), envMapIntensity: 1.2,
  });
  const oil = new THREE.Mesh(oilGeo, oilMat);
  oil.position.set(POT.x, 0, POT.z);
  oil.receiveShadow = false;
  scene.add(oil);
  // ---- 衣のボウル ----
  const glazeMat = new THREE.MeshStandardMaterial({ map: TX.glaze(), roughness: 0.22, metalness: 0.05 });
  const bowlProf = [[0.001, 0], [0.8, 0], [0.85, 0.08], [1.25, 0.4], [1.55, 0.82], [1.6, 0.9], [1.5, 0.88], [1.42, 0.78], [1.15, 0.4], [0.75, 0.14], [0.001, 0.12]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlProf, 64), glazeMat);
  bowl.position.copy(BOWL);
  bowl.castShadow = bowl.receiveShadow = true;
  scene.add(bowl);
  const bl = TX.batterLiquid();
  const batter = new THREE.Mesh(new THREE.CircleGeometry(1.4, 64), new THREE.MeshPhysicalMaterial({
    map: bl.map, normalMap: bl.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3,
  }));
  batter.rotation.x = -Math.PI / 2;
  batter.position.set(BOWL.x, BATTER_Y, BOWL.z);
  batter.receiveShadow = true;
  scene.add(batter);
  // 衣を溶く太い箸
  const mixStick = new THREE.MeshStandardMaterial({ color: '#d8bf8e', roughness: 0.6 });
  for (const off of [0, 0.12]) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 3.4, 8), mixStick);
    s.rotation.set(0, 0, -1.25);
    s.rotation.y = 0.5 + off;
    s.position.set(BOWL.x - 0.7 + off, BATTER_Y + 0.4, BOWL.z - 0.6);
    s.castShadow = true;
    scene.add(s);
  }

  // ---- 打ち粉の小皿 ----
  const flourPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.75, 0.12, 40), new THREE.MeshStandardMaterial({ color: '#efe9df', roughness: 0.35 }));
  flourPlate.position.set(-5.6, WORK_Y + 0.06, 2.9);
  flourPlate.castShadow = true;
  scene.add(flourPlate);
  const flour = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#fbf8f0', roughness: 1 }));
  flour.scale.y = 0.18;
  flour.position.set(-5.6, WORK_Y + 0.12, 2.9);
  scene.add(flour);

  // ---- バットと網と天紙 ----
  const tray = new THREE.Group();
  const trayMat = new THREE.MeshStandardMaterial({ color: '#d7d9db', metalness: 0.9, roughness: 0.25 });
  const W = 3.2, D = 4.6, H = 0.32;
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(W, 0.04, D), trayMat);
  bottom.position.y = 0.02; tray.add(bottom);
  for (const [w, d, x, z] of [[W, 0.05, 0, D / 2], [W, 0.05, 0, -D / 2], [0.05, D, W / 2, 0], [0.05, D, -W / 2, 0]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), trayMat);
    wall.position.set(x, H / 2, z); wall.castShadow = true; tray.add(wall);
  }
  // 網
  const wireMat = new THREE.MeshStandardMaterial({ color: '#e5e6e8', metalness: 1, roughness: 0.3 });
  const wireGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 5);
  const nx = 13, nz = 18;
  const wires = new THREE.InstancedMesh(wireGeo, wireMat, nx + nz);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  let wi = 0;
  for (let i = 0; i < nx; i++) {
    q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)); sc.set(1, D - 0.15, 1);
    p.set(-W / 2 + 0.12 + i * (W - 0.24) / (nx - 1), H - 0.02, 0);
    wires.setMatrixAt(wi++, m.compose(p, q, sc));
  }
  for (let i = 0; i < nz; i++) {
    q.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)); sc.set(1, W - 0.15, 1);
    p.set(0, H - 0.045, -D / 2 + 0.12 + i * (D - 0.24) / (nz - 1));
    wires.setMatrixAt(wi++, m.compose(p, q, sc));
  }
  tray.add(wires);
  // 天紙（少しくしゃっと）
  const paperGeo = new THREE.PlaneGeometry(2.9, 4.2, 24, 32);
  paperGeo.rotateX(-Math.PI / 2);
  const pp = paperGeo.attributes.position;
  for (let i = 0; i < pp.count; i++) pp.setY(i, (Math.sin(pp.getX(i) * 3.1 + pp.getZ(i) * 1.7) + Math.sin(pp.getZ(i) * 4.3)) * 0.012);
  paperGeo.computeVertexNormals();
  const paper = new THREE.Mesh(paperGeo, new THREE.MeshStandardMaterial({ map: TX.washi(), roughness: 0.95 }));
  paper.position.y = H + 0.02;
  paper.rotation.y = 0.03;
  paper.receiveShadow = true;
  tray.add(paper);
  tray.position.copy(RACK);
  scene.add(tray);
  const stainMat = new THREE.MeshBasicMaterial({ map: TX.oilStain(), transparent: true, depthWrite: false, opacity: 0 });

  // ---- 天かす入れ（網杓子） ----
  const skimmer = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 8, 40), wireMat);
  ring.rotation.x = Math.PI / 2;
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshStandardMaterial({ color: '#bfc2c4', metalness: 1, roughness: 0.4, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  mesh.rotation.x = -Math.PI / 2;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.6, 10), new THREE.MeshStandardMaterial({ color: '#a77d4c', roughness: 0.6 }));
  handle.rotation.z = Math.PI / 2; handle.position.x = 1.85;
  skimmer.add(ring, mesh, handle);
  skimmer.position.set(3.0, WORK_Y + 0.05, 3.6);
  skimmer.rotation.y = 0.35;
  skimmer.traverse(o => { o.castShadow = true; });
  scene.add(skimmer);

  // ---- 菜箸 ----
  const hashi = new THREE.Group();
  const bamboo = new THREE.MeshStandardMaterial({ color: '#d9b77e', roughness: 0.5 });
  const tipMat = new THREE.MeshStandardMaterial({ color: '#8a6a40', roughness: 0.6 });
  hashi.sticks = [];
  for (let i = 0; i < 2; i++) {
    const s = new THREE.Group();
    const L = 5.5;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.03, L, 10), bamboo);
    rod.position.y = L / 2;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.028, 0.5, 8), tipMat);
    tip.position.y = 0.25;
    s.add(rod, tip);
    s.traverse(o => { o.castShadow = true; });
    hashi.add(s);
    hashi.sticks.push(s);
  }
  hashi.position.set(3.2, 0.6, 4);
  scene.add(hashi);

  // ---- 席ごとの器 ----
  const seats = SEATS_X.map((x) => buildPlace(scene, x));

  return { scene, oil, oilGeo, oilMat, hashi, seats, stainMat, tray, key };
}

function buildPlace(scene, x) {
  const g = new THREE.Group();
  // 器（白い平皿）
  const plateProf = [[0.001, 0], [0.9, 0], [1.0, 0.03], [1.25, 0.12], [1.32, 0.16], [1.28, 0.18], [0.95, 0.09], [0.001, 0.08]].map(([r, y]) => new THREE.Vector2(r, y));
  const plate = new THREE.Mesh(new THREE.LatheGeometry(plateProf, 48), new THREE.MeshPhysicalMaterial({ color: '#e6e0d4', roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 }));
  plate.castShadow = plate.receiveShadow = true;
  g.add(plate);
  // 懐紙（折った天紙）
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshStandardMaterial({ map: TX.washi(), roughness: 0.95, side: THREE.DoubleSide }));
  sheet.rotation.set(-Math.PI / 2 + 0.04, 0, Math.PI / 4 + (Math.random() - 0.5) * 0.3);
  sheet.position.y = 0.1;
  sheet.receiveShadow = true;
  g.add(sheet);
  // 天つゆ
  const tsuyuBowl = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.32, 0], [0.45, 0.3], [0.48, 0.38], [0.42, 0.36], [0.001, 0.08]].map(([r, y]) => new THREE.Vector2(r, y)), 32),
    new THREE.MeshStandardMaterial({ map: TX.glaze(), roughness: 0.25 }));
  tsuyuBowl.position.set(1.55, 0, 0.35);
  tsuyuBowl.castShadow = true;
  const tsuyu = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), new THREE.MeshStandardMaterial({ color: '#3a1d08', roughness: 0.05, metalness: 0.2 }));
  tsuyu.rotation.x = -Math.PI / 2; tsuyu.position.set(1.55, 0.3, 0.35);
  const daikon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), new THREE.MeshStandardMaterial({ color: '#f3f0e6', roughness: 0.9 }));
  daikon.scale.y = 0.6; daikon.position.set(1.6, 0.34, 0.3);
  // 塩
  const salt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.1, 20), new THREE.MeshStandardMaterial({ color: '#ece6da', roughness: 0.3 }));
  salt.position.set(-1.45, 0.05, 0.4);
  const saltPile = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }));
  saltPile.scale.y = 0.5; saltPile.position.set(-1.45, 0.12, 0.4);
  // 箸と箸置き
  const hashiMat = new THREE.MeshStandardMaterial({ color: '#f1e2c2', roughness: 0.6 });
  for (const dz of [0.92, 1.02]) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 2.2, 8), hashiMat);
    h.rotation.z = Math.PI / 2; h.position.set(0, 0.1, dz);
    h.castShadow = true; g.add(h);
  }
  g.add(tsuyuBowl, tsuyu, daikon, salt, saltPile);
  g.position.set(x, COUNTER_Y, PLATE_Z);
  scene.add(g);
  return { x, group: g, platePos: new THREE.Vector3(x, COUNTER_Y + 0.2, PLATE_Z), customer: null, cooldown: 1 + Math.random() * 3 };
}

// ---------------------------------------------------------------
// お客さん（立体の顔・まばたき・視線・食べる動作・表情）
// ---------------------------------------------------------------
const SKIN = ['#e9c2a0', '#dfb08a', '#f0cdb0', '#d39d76', '#e6b998'];
const CLOTH = ['#2c3546', '#4a2b2b', '#36402f', '#5b4c36', '#3d3448', '#6a5f52', '#20262c', '#7a3528', '#8b8478', '#1f2a3a'];
const HAIR = ['#16110d', '#21180f', '#2e2218', '#55504c', '#8d8883', '#0f0f10'];

const hairN = () => TX.hairNormal();

function skull() {
  const g = new THREE.SphereGeometry(0.5, 48, 36);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    y *= 1.16;
    if (y < 0) { const f = 1 - Math.min(0.34, -y * 0.55); x *= f; if (z < 0.2) z *= 1 - Math.min(0.15, -y * 0.25); }
    if (z > 0.22) z = 0.22 + (z - 0.22) * 0.72;              // 顔を少し平らに
    if (y < -0.38 && z > 0.05) z += (-y - 0.38) * 0.2;       // あご
    if (z < -0.1 && y > -0.1) z -= 0.05 * Math.cos(y * 2);   // 後頭部
    const cheek = Math.exp(-((y + 0.12) ** 2) / 0.01) * Math.max(0, z) * 0.08; // 頬
    x *= 1 + cheek;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

export function makeCustomer(seed) {
  const rnd = (n) => { const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  const pick = (arr, n) => arr[Math.floor(rnd(n) * arr.length)];
  const skinC = pick(SKIN, 1), clothC = pick(CLOTH, 2), hairC = pick(HAIR, 3);
  const style = Math.floor(rnd(4) * 4);
  const fabric = TX.fabricNormal();

  const skin = new THREE.MeshPhysicalMaterial({
    color: skinC, roughness: 0.55, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ff9478'),
    normalMap: TX.skinNormal(), normalScale: new THREE.Vector2(0.25, 0.25),
  });
  const cloth = new THREE.MeshStandardMaterial({ color: clothC, roughness: 0.92, normalMap: fabric, normalScale: new THREE.Vector2(0.5, 0.5) });
  const hair = new THREE.MeshStandardMaterial({ color: hairC, roughness: 0.48, normalMap: hairN(), normalScale: new THREE.Vector2(0.8, 0.8) });

  const g = new THREE.Group();
  // 胴体
  const body = new THREE.Group();
  g.add(body);
  const torso = new THREE.Mesh(new THREE.LatheGeometry(
    [[0.001, -1.6], [0.86, -1.6], [0.95, -0.7], [0.98, 0.15], [0.9, 0.45], [0.62, 0.66], [0.3, 0.76], [0.001, 0.78]].map(([a, b]) => new THREE.Vector2(a, b)), 40), cloth);
  torso.scale.z = 0.62;
  body.add(torso);
  // 襟（白い内襟＋上着の襟）
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 8, 24, Math.PI * 1.1), new THREE.MeshStandardMaterial({ color: '#efeae0', roughness: 0.8, normalMap: fabric }));
  inner.rotation.set(-Math.PI / 2 - 0.45, 0, Math.PI * 1.05);
  inner.position.set(0, 0.72, 0.08);
  body.add(inner);
  for (const sx of [-1, 1]) {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.04), cloth);
    lapel.position.set(sx * 0.17, 0.35, 0.56);
    lapel.rotation.set(-0.25, 0, sx * 0.45);
    body.add(lapel);
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.42, 16), skin);
  neck.position.set(0, 0.9, 0.02);
  body.add(neck);

  // 頭
  const head = new THREE.Group();
  head.position.set(0, 1.5, 0.06);
  body.add(head);
  const face = new THREE.Mesh(skull(), skin);
  head.add(face);
  // 鼻
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 14), skin);
  nose.rotation.x = Math.PI / 2 + 0.35;
  nose.position.set(0, -0.04, 0.4);
  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), skin);
  noseTip.position.set(0, -0.09, 0.47);
  head.add(nose, noseTip);
  // 耳
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), skin);
    ear.scale.set(0.35, 1, 0.65);
    ear.position.set(sx * 0.49, -0.02, -0.02);
    head.add(ear);
  }
  // 目
  const eyeWhite = new THREE.MeshPhysicalMaterial({ color: '#efe9e0', roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02 });
  const irisMat = new THREE.MeshPhysicalMaterial({ color: '#2a1a12', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02 });
  const eyes = [], lids = [], brows = [];
  for (const sx of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(sx * 0.155, 0.07, 0.33);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.058, 20, 14), eyeWhite);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), irisMat);
    iris.scale.z = 0.5;
    iris.position.z = 0.046;
    eye.add(ball, iris);
    head.add(eye);
    eyes.push(eye);
    // まぶた（上）
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.064, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), skin);
    lid.position.copy(eye.position);
    lid.rotation.x = -0.15;
    head.add(lid);
    lids.push(lid);
    // 眉
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.12, 4, 8), hair);
    brow.rotation.z = Math.PI / 2;
    brow.position.set(sx * 0.16, 0.19, 0.385);
    head.add(brow);
    brows.push(brow);
  }
  // 口
  const lipMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(skinC).lerp(new THREE.Color('#a8524a'), 0.45), roughness: 0.45 });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 8, 24, Math.PI), lipMat);
  mouth.position.set(0, -0.24, 0.37);
  head.add(mouth);
  const mouthOpen = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), new THREE.MeshStandardMaterial({ color: '#3a1512', roughness: 0.8 }));
  mouthOpen.scale.set(1.2, 0.6, 0.4);
  mouthOpen.position.set(0, -0.25, 0.36);
  mouthOpen.visible = false;
  head.add(mouthOpen);

  // 髪
  // 頭頂の髪：ふちが眉より上に来るよう少し持ち上げる
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.54, 40, 24, 0, Math.PI * 2, 0, Math.PI * (style === 3 ? 0.38 : 0.5)), hair);
  cap.scale.set(1.03, 1.1, 1.05);
  cap.rotation.x = -0.28;
  cap.position.set(0, 0.13, -0.03);
  head.add(cap);
  if (style !== 3) {
    // 後ろ髪・もみあげ
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.545, 32, 20, Math.PI * 0.8, Math.PI * 1.4, Math.PI * 0.42, Math.PI * (style === 2 ? 0.5 : 0.36)), hair);
    back.scale.set(1.02, 1.12, 1.04);
    back.position.set(0, 0.05, -0.02);
    head.add(back);
  }
  if (style === 2) {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), hair);
    bun.position.set(0, 0.42, -0.42);
    head.add(bun);
  }
  if (style === 3) {
    // 刈り上げ・白髪交じり
    const side = new THREE.Mesh(new THREE.SphereGeometry(0.53, 32, 20, Math.PI * 0.8, Math.PI * 1.4, Math.PI * 0.32, Math.PI * 0.3), new THREE.MeshStandardMaterial({ color: '#8d8883', roughness: 0.7, normalMap: hairN() }));
    side.scale.set(1.02, 1.12, 1.04);
    side.position.set(0, 0.06, -0.02);
    head.add(side);
  }

  // 腕：肩 → 肘 → 手（右手は箸を持つ）
  const arms = [];
  for (const sx of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx * 0.8, 0.42, 0.05);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.55, 6, 14), cloth);
    upper.position.y = -0.37;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.74;
    shoulder.add(elbow);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.6, 6, 14), cloth);
    fore.rotation.x = Math.PI / 2;
    fore.position.z = 0.38;
    elbow.add(fore);
    const hand = new THREE.Group();
    hand.position.z = 0.85;
    const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.12, 6, 12), skin);
    palm.rotation.x = Math.PI / 2;
    palm.scale.set(1.15, 1, 0.7);
    hand.add(palm);
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.1, 4, 8), skin);
      finger.rotation.x = Math.PI / 2 + 0.5;
      finger.position.set((f - 1.5) * 0.045 * -sx, -0.03, 0.15);
      hand.add(finger);
    }
    if (sx > 0) {
      const hashiM = new THREE.MeshStandardMaterial({ color: '#efe0bf', roughness: 0.55 });
      for (const o of [-0.02, 0.02]) {
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.85, 6), hashiM);
        h.rotation.set(Math.PI / 2 + 0.25, 0, -0.5);
        h.position.set(-0.12 + o, 0.02, 0.26);
        hand.add(h);
      }
    }
    elbow.add(hand);
    body.add(shoulder);
    arms.push({ shoulder, elbow, hand, sx });
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  const c = {
    group: g, body, head, eyes, lids, brows, mouth, mouthOpen, arms,
    mood: 'normal', blinkT: 2 + rnd(5) * 3, blink: 0, eatK: 0, eating: false,
    look: new THREE.Vector3(0, 0, 0), lookTarget: new THREE.Vector3(), t: rnd(6) * 10,
    browAngle: 0, browTarget: 0, smile: 0, smileTarget: 0,
  };
  c.setMood = (m) => {
    c.mood = m;
    c.browTarget = m === 'angry' ? 0.35 : m === 'sad' ? -0.3 : m === 'happy' ? -0.1 : 0;
    c.smileTarget = m === 'happy' ? 1 : m === 'eat' ? 0.4 : m === 'angry' || m === 'sad' ? -0.8 : 0.1;
  };
  c.setMood('normal');
  // lookAt: ワールド座標の注視点
  c.update = (dt, lookAt) => {
    c.t += dt;
    const k = 1 - Math.exp(-dt * 6);
    // 息づかい
    c.body.scale.y = 1 + Math.sin(c.t * 1.6) * 0.006;
    // まばたき
    c.blinkT -= dt;
    if (c.blinkT <= 0) { c.blink = 1; c.blinkT = 2 + Math.random() * 4; }
    c.blink = Math.max(0, c.blink - dt * 7);
    const closed = Math.max(c.blink > 0.5 ? (1 - c.blink) * 2 : c.blink * 2, c.mood === 'happy' || c.mood === 'eat' ? 0.45 : 0);
    for (const l of c.lids) l.rotation.x = -0.15 + closed * 1.45;
    // 視線と首
    if (lookAt) {
      const local = c.group.worldToLocal(lookAt.clone());
      local.sub(c.head.position);
      const yaw = Math.atan2(local.x, Math.max(0.3, local.z));
      const pitch = -Math.atan2(local.y + 0.4, Math.hypot(local.x, local.z));
      c.head.rotation.y += (THREE.MathUtils.clamp(yaw, -0.6, 0.6) - c.head.rotation.y) * k;
      c.head.rotation.x += (THREE.MathUtils.clamp(pitch * 0.4, -0.35, 0.12) - c.head.rotation.x) * k;
      for (const e of c.eyes) e.rotation.y = THREE.MathUtils.clamp(yaw - c.head.rotation.y, -0.3, 0.3);
    }
    // 表情
    c.browAngle += (c.browTarget - c.browAngle) * k;
    c.brows.forEach((b, i) => { b.rotation.z = Math.PI / 2 + c.browAngle * (i ? 1 : -1); b.position.y = 0.19 - Math.abs(c.browAngle) * 0.02 + (c.mood === 'happy' ? 0.01 : 0); });
    c.smile += (c.smileTarget - c.smile) * k;
    c.mouth.rotation.z = c.smile >= 0 ? Math.PI : 0;
    c.mouth.scale.set(1, Math.max(0.15, Math.abs(c.smile)) * 0.9, 1);
    c.mouth.position.y = -0.24 + (c.smile >= 0 ? 0.015 : -0.03) * Math.abs(c.smile);
    // 腕：待つ間は手を台に、食べるときは右手で口へ
    const target = c.eating ? (Math.sin(c.t * 3.2) * 0.5 + 0.5) : 0;
    c.eatK += (target - c.eatK) * (1 - Math.exp(-dt * 5));
    c.mouthOpen.visible = c.eating && c.eatK > 0.75;
    for (const a of c.arms) {
      const e = a.sx > 0 ? c.eatK : 0;
      a.shoulder.rotation.x = -0.42 - e * 0.55;
      a.shoulder.rotation.z = a.sx * (0.12 + e * 0.1);
      a.elbow.rotation.x = 0.42 - e * 1.75;
      a.elbow.rotation.y = -a.sx * (0.35 + e * 0.5);
    }
  };
  return c;
}
