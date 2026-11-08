// 揚げ音と BGM（WebAudio）
//
// スマホで音が割れないように：
//  - 「パチパチ」「ジュワッ」「ピアノの各音」は、開始前の読み込み（prepare）で
//    録音済みの音（AudioBuffer）として作っておき、ゲーム中は再生するだけにする
//  - 同時に鳴る数に上限を設ける
//  - 最後にリミッター（コンプレッサー）を通して、音量の合計が上限を超えないようにする
//  - タッチ端末は途切れにくい設定（latencyHint: 'playback'）で音声を開く

const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

// バッハ「平均律クラヴィーア曲集 第1巻 前奏曲 ハ長調 BWV 846」（パブリックドメイン）の冒頭
const BARS = [
  'C4 E4 G4 C5 E5', 'C4 D4 A4 D5 F5', 'B3 D4 G4 D5 F5', 'C4 E4 G4 C5 E5',
  'C4 E4 A4 E5 A5', 'C4 D4 F#4 A4 D5', 'B3 D4 G4 D5 G5', 'B3 C4 E4 G4 C5',
  'A3 C4 E4 G4 C5', 'D3 A3 D4 F#4 C5', 'G3 B3 D4 G4 B4', 'G3 Bb3 E4 G4 C#5',
  'F3 A3 D4 A4 D5', 'F3 Ab3 D4 F4 B4', 'E3 G3 C4 G4 C5', 'E3 F3 A3 C4 F4',
  'D3 F3 A3 C4 F4', 'G2 D3 G3 B3 F4', 'C3 E3 G3 C4 E4', 'C3 G3 C4 E4 C5',
].map(b => b.split(' '));
function noteFreq(n) {
  const m = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const r = n.match(/^([A-G])(#|b)?(\d)$/);
  const semi = m[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0) + (+r[3] + 1) * 12;
  return 440 * Math.pow(2, (semi - 69) / 12);
}

export class FryAudio {
  constructor() {
    this.ctx = null; this.bgmOn = true; this.bgmTimer = null;
    this.prepared = false; this.preparing = null;
    this.crackles = []; this.piano = new Map(); this.active = { fx: 0, bgm: 0, splash: 0 };
  }

  // ユーザー操作（タップ）の中で呼ぶ
  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    let ctx;
    try { ctx = new AC({ latencyHint: TOUCH ? 'playback' : 'interactive' }); } catch { ctx = new AC(); }
    this.ctx = ctx;

    // マスター → リミッター → 出力
    this.master = ctx.createGain();
    this.master.gain.value = 0.6;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12; limiter.knee.value = 6; limiter.ratio.value = 12;
    limiter.attack.value = 0.003; limiter.release.value = 0.25;
    this.master.connect(limiter).connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    // 連続した「シュワー」（常に1本だけ）
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    this.bp = ctx.createBiquadFilter();
    this.bp.type = 'bandpass'; this.bp.frequency.value = 3000; this.bp.Q.value = 0.6;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 900;
    this.sizzleGain = ctx.createGain(); this.sizzleGain.gain.value = 0;
    src.connect(this.bp).connect(hp).connect(this.sizzleGain).connect(this.master);
    src.start();
  }

  // 効果音と BGM の各音を、あらかじめ録音済みの音として作る（OfflineAudioContext）
  prepare(onProgress = () => {}) {
    if (this.prepared) return Promise.resolve();
    if (this.preparing) return this.preparing;
    this.preparing = (async () => {
      if (!this.ctx) return;
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OAC) { this.prepared = true; return; }
      const sr = this.ctx.sampleRate;
      const render = (sec, build, ch = 1) => {
        const oc = new OAC(ch, Math.ceil(sr * sec), sr);
        build(oc);
        return oc.startRendering();
      };
      // パチパチ（周波数と長さの違う 12 種類）
      const jobs = [];
      for (let i = 0; i < 12; i++) {
        const freq = 2600 + i * 520, len = 0.014 + (i % 4) * 0.008;
        jobs.push(() => render(0.08, (oc) => {
          const s = oc.createBufferSource(); s.buffer = this.noise;
          const f = oc.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 3;
          const g = oc.createGain();
          g.gain.setValueAtTime(1, 0); g.gain.exponentialRampToValueAtTime(0.0001, len);
          s.connect(f).connect(g).connect(oc.destination);
          s.start(0, Math.random() * 1.5, 0.08);
        }).then(b => this.crackles.push(b)));
      }
      // 具材を入れた「ジュワッ」
      jobs.push(() => render(1.5, (oc) => {
        const s = oc.createBufferSource(); s.buffer = this.noise;
        const f = oc.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.7;
        f.frequency.setValueAtTime(1500, 0); f.frequency.exponentialRampToValueAtTime(4500, 0.8);
        const g = oc.createGain();
        g.gain.setValueAtTime(0.0001, 0); g.gain.exponentialRampToValueAtTime(0.55, 0.04); g.gain.exponentialRampToValueAtTime(0.0001, 1.4);
        s.connect(f).connect(g).connect(oc.destination);
        s.start(0, 0.3, 1.5);
      }).then(b => { this.splashBuf = b; }));
      // ピアノの各音（曲で使う音だけ）
      const names = [...new Set(BARS.flat())];
      for (const n of names) {
        const freq = noteFreq(n);
        jobs.push(() => render(4, (oc) => {
          const g = oc.createGain();
          g.gain.setValueAtTime(0.0001, 0);
          g.gain.exponentialRampToValueAtTime(1, 0.008);
          g.gain.exponentialRampToValueAtTime(0.36, 0.35);
          g.gain.exponentialRampToValueAtTime(0.0001, 3.9);
          [[1, 1], [2, 0.35], [3, 0.12], [4, 0.05]].forEach(([h, a]) => {
            const o = oc.createOscillator(); o.type = 'sine';
            o.frequency.value = freq * h * (1 + (h - 1) * 0.0007);
            const og = oc.createGain(); og.gain.value = a;
            o.connect(og).connect(g);
            o.start(0); o.stop(4);
          });
          g.connect(oc.destination);
        }).then(b => this.piano.set(n, b)));
      }
      // 残響
      jobs.push(() => {
        const len = Math.floor(sr * (TOUCH ? 1.2 : 2.2)), ir = this.ctx.createBuffer(2, len, sr);
        for (let c = 0; c < 2; c++) {
          const d = ir.getChannelData(c);
          for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
        }
        this.ir = ir;
        return Promise.resolve();
      });
      // まとめて並列に作る
      let done = 0;
      await Promise.all(jobs.map(j => j().then(() => onProgress(++done / jobs.length))));
      this.prepared = true;
    })();
    return this.preparing;
  }

  // 録音済みの音を鳴らす（同時に鳴る数に上限）
  play(buf, vol, when = 0, out = this.master, limit = TOUCH ? 10 : 24, pool = 'fx') {
    if (!this.ctx || !buf || this.active[pool] >= limit) return null;
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    s.connect(g).connect(out);
    this.active[pool]++;
    s.onended = () => { this.active[pool]--; g.disconnect(); };
    s.start(when || this.ctx.currentTime);
    return { s, g };
  }

  // level: 0..1 泡の量, dryness: 0..1 水分が抜けると音が高く細かくなる
  update(level, dryness, dt) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sizzleGain.gain.setTargetAtTime(Math.min(0.4, level * 0.38), t, 0.08);
    this.bp.frequency.setTargetAtTime(2200 + dryness * 4500, t, 0.2);
    if (!this.prepared || !this.crackles.length) return;
    // パチパチ：水分が抜けると高い音が増える
    const n = level * dt * (30 + dryness * 45) * (TOUCH ? 0.6 : 1);
    let k = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
    while (k-- > 0) {
      const hi = Math.min(this.crackles.length - 1, Math.floor(Math.random() * this.crackles.length * (0.55 + dryness * 0.45)));
      this.play(this.crackles[hi], 0.05 + Math.random() * 0.1 * level, t + Math.random() * 0.03);
    }
  }

  crackle(vol) {
    if (!this.prepared || !this.crackles.length) return;
    this.play(this.crackles[Math.floor(Math.random() * this.crackles.length)], vol);
  }

  // 具材を入れた「ジュワッ」
  splash(power = 1) {
    if (this.prepared) this.play(this.splashBuf, Math.min(1, power), 0, this.master, 8, 'splash');
  }

  // ちょっとした効果音（まれにしか鳴らない）
  tone(freqs, dur = 0.12, type = 'triangle', vol = 0.18) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    freqs.forEach((fq, i) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = fq;
      const g = ctx.createGain();
      const t = ctx.currentTime + i * dur;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.8);
      o.connect(g).connect(this.master);
      o.start(t); o.stop(t + dur * 2);
    });
  }
  good() { this.tone([880, 1175, 1568], 0.09); }
  bad() { this.tone([330, 262], 0.14, 'sine'); }
  bell() { this.tone([1318], 0.4, 'sine', 0.12); }

  // ---------------------------------------------------------------
  // BGM：前奏曲 ハ長調 をやわらかいピアノ風の音で
  // ---------------------------------------------------------------
  startBgm() {
    if (!this.ctx || this.bgmTimer || !this.prepared) return;
    const ctx = this.ctx;
    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.value = this.bgmOn ? 0.2 : 0;
    const conv = ctx.createConvolver();
    conv.buffer = this.ir;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    this.bgmBus = ctx.createGain();
    this.bgmBus.connect(lp);
    lp.connect(this.bgmGain);
    lp.connect(conv).connect(wet).connect(this.bgmGain);
    this.bgmGain.connect(this.master);

    const step = 0.19; // 16分音符
    const pattern = [0, 1, 2, 3, 4, 2, 3, 4];
    let bar = 0, i = 0, next = ctx.currentTime + 0.3;
    const tick = () => {
      while (next < ctx.currentTime + 0.6) {
        const notes = BARS[bar];
        const idx = pattern[i % 8];
        // 最初の2音は長く伸ばす（原曲の書法）
        const dur = idx === 0 ? step * 16 : idx === 1 ? step * 15 : step * 3;
        this.pianoNote(notes[idx], next, dur, idx === 0 ? 0.9 : 0.7);
        next += step;
        i++;
        if (i % 16 === 0) { bar = (bar + 1) % BARS.length; if (bar === 0) next += step * 4; }
      }
    };
    this.bgmTimer = setInterval(tick, 120);
    tick();
  }

  pianoNote(name, t, dur, vel) {
    const buf = this.piano.get(name);
    if (!buf) return;
    const v = this.play(buf, 0.25 * vel, t, this.bgmBus, 24, 'bgm');
    if (!v) return;
    const end = t + Math.min(dur, 3.4);
    v.g.gain.setValueAtTime(0.25 * vel, end);
    v.g.gain.exponentialRampToValueAtTime(0.0001, end + 0.4);
    v.s.stop(end + 0.45);
  }

  setBgm(on) {
    this.bgmOn = on;
    if (!this.ctx) return;
    if (!this.bgmTimer) this.startBgm();
    if (this.bgmGain) this.bgmGain.gain.setTargetAtTime(on ? 0.2 : 0, this.ctx.currentTime, 0.3);
  }

  suspend() { this.ctx?.suspend(); }
  resume() { this.ctx?.resume(); }
}
