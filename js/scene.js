// 什器・店内・お客さんの3Dモデル
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
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

export function buildScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1d140d');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;

  // ---- 照明 ----
  scene.add(new THREE.HemisphereLight('#ffe9c8', '#3a2414', 0.55));
  const key = new THREE.DirectionalLight('#fff1dc', 1.6);
  key.position.set(-4, 16, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
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

  // ---- 作業台（ステンレス） ----
  const steel = new THREE.MeshStandardMaterial({ color: '#8d9093', metalness: 0.8, roughness: 0.42, envMapIntensity: 0.6 });
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
  const hinoki = new THREE.MeshStandardMaterial({ map: hinokiTex, roughness: 0.55 });
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
  const wallTex = hinokiTex.clone(); wallTex.repeat.set(4, 1);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), new THREE.MeshStandardMaterial({ map: wallTex, color: '#6e5038', roughness: 0.8 }));
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
  const oilMat = new THREE.MeshPhysicalMaterial({
    color: '#7a4808', emissive: '#2a1400', roughness: 0.06, metalness: 0, specularIntensity: 0.8,
    transparent: true, opacity: 0.93, normalMap: oilN, normalScale: new THREE.Vector2(0.15, 0.15),
    envMapIntensity: 1.1, depthWrite: false,
  });
  const oil = new THREE.Mesh(oilGeo, oilMat);
  oil.position.set(POT.x, 0, POT.z);
  oil.renderOrder = 5;
  scene.add(oil);
  // 油の奥行き（底の方を濃く）
  const deep = new THREE.Mesh(new THREE.CircleGeometry(2.6, 64), new THREE.MeshBasicMaterial({ color: '#3a1e06', transparent: true, opacity: 0.7, depthWrite: false }));
  deep.rotation.x = -Math.PI / 2;
  deep.position.set(POT.x, -0.75, POT.z);
  scene.add(deep);

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
  const plate = new THREE.Mesh(new THREE.LatheGeometry(plateProf, 48), new THREE.MeshStandardMaterial({ color: '#d8d0c0', roughness: 0.3, envMapIntensity: 0.5 }));
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
// お客さん
// ---------------------------------------------------------------
const SKIN = ['#f1c9a5', '#e8b88f', '#f5d2b3', '#d9a47c'];
const CLOTH = ['#2f3e5c', '#5a2d2d', '#3d4a35', '#6b5a3a', '#4b3b5e', '#7a6c58', '#24303a', '#8a3a2a'];
const HAIR = ['#1b1410', '#2a1f18', '#3b2d22', '#6b6663', '#141414'];

function faceTexture(skin, mood) {
  const W = 512, H = 256;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = skin; x.fillRect(0, 0, W, H);
  const cx = W * 0.25, ey = H * 0.5, my = H * 0.63;
  x.strokeStyle = '#2a1a10'; x.fillStyle = '#2a1a10'; x.lineWidth = 5; x.lineCap = 'round';
  // 頬
  x.fillStyle = mood === 'happy' || mood === 'eat' ? 'rgba(230,110,100,0.45)' : 'rgba(230,140,120,0.18)';
  x.beginPath(); x.ellipse(cx - 34, my - 6, 12, 7, 0, 0, 7); x.fill();
  x.beginPath(); x.ellipse(cx + 34, my - 6, 12, 7, 0, 0, 7); x.fill();
  x.fillStyle = '#2a1a10';
  const eye = (ex) => {
    if (mood === 'happy' || mood === 'eat') {
      x.beginPath(); x.arc(ex, ey + 4, 8, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    } else {
      x.beginPath(); x.ellipse(ex, ey, 4.5, 6.5, 0, 0, 7); x.fill();
    }
  };
  eye(cx - 20); eye(cx + 20);
  // 眉
  x.lineWidth = 4;
  if (mood === 'angry') {
    x.beginPath(); x.moveTo(cx - 32, ey - 22); x.lineTo(cx - 10, ey - 14); x.stroke();
    x.beginPath(); x.moveTo(cx + 32, ey - 22); x.lineTo(cx + 10, ey - 14); x.stroke();
  } else if (mood === 'sad') {
    x.beginPath(); x.moveTo(cx - 30, ey - 14); x.lineTo(cx - 10, ey - 20); x.stroke();
    x.beginPath(); x.moveTo(cx + 30, ey - 14); x.lineTo(cx + 10, ey - 20); x.stroke();
  } else {
    x.beginPath(); x.moveTo(cx - 30, ey - 18); x.quadraticCurveTo(cx - 20, ey - 23, cx - 10, ey - 18); x.stroke();
    x.beginPath(); x.moveTo(cx + 30, ey - 18); x.quadraticCurveTo(cx + 20, ey - 23, cx + 10, ey - 18); x.stroke();
  }
  // 口
  x.lineWidth = 4;
  x.beginPath();
  if (mood === 'happy') { x.fillStyle = '#7a2a20'; x.arc(cx, my - 2, 11, 0.1, Math.PI - 0.1); x.closePath(); x.fill(); }
  else if (mood === 'eat') { x.ellipse(cx, my, 7, 5, 0, 0, 7); x.fillStyle = '#7a2a20'; x.fill(); }
  else if (mood === 'angry' || mood === 'sad') { x.arc(cx, my + 10, 10, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); }
  else { x.moveTo(cx - 8, my); x.quadraticCurveTo(cx, my + 4, cx + 8, my); x.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeCustomer(seed) {
  const r = (n) => Math.floor(Math.abs(Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 * 1000);
  const skin = SKIN[r(1) % SKIN.length], cloth = CLOTH[r(2) % CLOTH.length], hair = HAIR[r(3) % HAIR.length];
  const g = new THREE.Group();
  const clothMat = new THREE.MeshStandardMaterial({ color: cloth, roughness: 0.9 });
  const torso = new THREE.Mesh(new THREE.LatheGeometry(
    [[0.001, -1.5], [0.95, -1.5], [1.05, -0.5], [1.0, 0.3], [0.85, 0.62], [0.4, 0.8], [0.001, 0.82]].map(([a, b]) => new THREE.Vector2(a, b)), 32), clothMat);
  torso.scale.z = 0.7;
  g.add(torso);
  // 襟（白）
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.07, 8, 24, Math.PI), new THREE.MeshStandardMaterial({ color: '#f3efe6', roughness: 0.8 }));
  collar.rotation.set(-Math.PI / 2 - 0.5, 0, Math.PI);
  collar.position.set(0, 0.76, 0.12);
  g.add(collar);
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.75 });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.4, 12), skinMat);
  neck.position.y = 0.95;
  g.add(neck);
  const faces = {};
  for (const mood of ['normal', 'happy', 'angry', 'sad', 'eat']) faces[mood] = faceTexture(skin, mood);
  const headMat = new THREE.MeshStandardMaterial({ map: faces.normal, roughness: 0.7 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 20), headMat);
  head.scale.set(1, 1.1, 0.95);
  head.position.y = 1.55;
  head.rotation.x = -0.45; // 顔を少し上げて板場を見る
  g.add(head);
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.65 });
  const style = r(4) % 3;
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.58, 32, 16, 0, Math.PI * 2, 0, style === 1 ? Math.PI * 0.62 : Math.PI * 0.42), hairMat);
  hairCap.scale.set(1, 1, 1.03);
  hairCap.position.set(0, 0.03, -0.04);
  hairCap.rotation.x = -0.35;
  head.add(hairCap); // 頭と一緒に動く
  if (style === 2) {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), hairMat);
    bun.position.set(0, 0.5, -0.3);
    head.add(bun);
  }
  // 腕（カウンターに置く）
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.1, 6, 12), clothMat);
    arm.position.set(sx * 0.95, 0.05, 0.6);
    arm.rotation.set(1.2, 0, sx * 0.35);
    g.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), skinMat);
    hand.scale.set(1, 0.6, 1.3);
    hand.position.set(sx * 0.62, -0.2, 1.35);
    g.add(hand);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return { group: g, head, headMat, faces };
}
