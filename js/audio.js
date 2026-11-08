// 揚げ音（WebAudio で合成）
export class FryAudio {
  constructor() { this.ctx = null; this.level = 0; this.bgmOn = true; this.bgmTimer = null; }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    // 連続した「シュワー」
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

  // level: 0..1 泡の量, dryness: 0..1 水分が抜けると音が高く細かくなる
  update(level, dryness, dt) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sizzleGain.gain.setTargetAtTime(Math.min(0.5, level * 0.45), t, 0.08);
    this.bp.frequency.setTargetAtTime(2200 + dryness * 4500, t, 0.2);
    // パチパチ
    const n = level * dt * (40 + dryness * 60);
    let k = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
    while (k-- > 0) this.crackle(0.05 + Math.random() * 0.12 * level, 3000 + Math.random() * 5000 + dryness * 2000);
  }

  crackle(vol, freq) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 3;
    const g = ctx.createGain();
    const t = ctx.currentTime + Math.random() * 0.03;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.012 + Math.random() * 0.02);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random() * 1.5, 0.05);
  }

  // 具材を入れた「ジュワッ」
  splash(power = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.7;
    f.frequency.setValueAtTime(1500, t); f.frequency.exponentialRampToValueAtTime(4500, t + 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55 * power, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random(), 1.5);
  }

  // ちょっとした効果音
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
  // BGM：J.S.バッハ「平均律クラヴィーア曲集 第1巻 前奏曲 ハ長調 BWV 846」
  // （パブリックドメイン）をやわらかいピアノ風の音で小さく流す
  // ---------------------------------------------------------------
  startBgm() {
    if (!this.ctx || this.bgmTimer) return;
    const ctx = this.ctx;
    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.value = this.bgmOn ? 0.2 : 0;
    // 小さなホールの残響
    const conv = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    conv.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    this.bgmBus = ctx.createGain();
    this.bgmBus.connect(lp);
    lp.connect(this.bgmGain);
    lp.connect(conv).connect(wet).connect(this.bgmGain);
    this.bgmGain.connect(this.master);

    const N = (n) => {
      const m = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
      const r = n.match(/^([A-G])(#|b)?(\d)$/);
      const semi = m[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0) + (+r[3] + 1) * 12;
      return 440 * Math.pow(2, (semi - 69) / 12);
    };
    const bars = [
      'C4 E4 G4 C5 E5', 'C4 D4 A4 D5 F5', 'B3 D4 G4 D5 F5', 'C4 E4 G4 C5 E5',
      'C4 E4 A4 E5 A5', 'C4 D4 F#4 A4 D5', 'B3 D4 G4 D5 G5', 'B3 C4 E4 G4 C5',
      'A3 C4 E4 G4 C5', 'D3 A3 D4 F#4 C5', 'G3 B3 D4 G4 B4', 'G3 Bb3 E4 G4 C#5',
      'F3 A3 D4 A4 D5', 'F3 Ab3 D4 F4 B4', 'E3 G3 C4 G4 C5', 'E3 F3 A3 C4 F4',
      'D3 F3 A3 C4 F4', 'G2 D3 G3 B3 F4', 'C3 E3 G3 C4 E4', 'C3 G3 C4 E4 C5',
    ].map(b => b.split(' ').map(N));
    const step = 0.19; // 16分音符
    let bar = 0, i = 0, next = ctx.currentTime + 0.3;
    const pattern = [0, 1, 2, 3, 4, 2, 3, 4];
    const tick = () => {
      while (next < ctx.currentTime + 0.6) {
        const notes = bars[bar];
        const k = i % 8;
        const idx = pattern[k];
        // 最初の2音は長く伸ばす（原曲の書法）
        const dur = idx === 0 ? step * 16 : idx === 1 ? step * 15 : step * 3;
        this.pianoNote(notes[idx], next, dur, idx === 0 ? 0.9 : 0.7);
        next += step;
        i++;
        if (i % 16 === 0) { bar = (bar + 1) % bars.length; if (bar === 0) next += step * 4; }
      }
    };
    this.bgmTimer = setInterval(tick, 120);
    tick();
  }

  pianoNote(freq, t, dur, vel) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25 * vel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.09 * vel, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur + 0.6, 4));
    // 基音＋倍音でやわらかいピアノ風に
    [[1, 1], [2, 0.35], [3, 0.12], [4, 0.05]].forEach(([h, a]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * h * (1 + (h - 1) * 0.0007);
      const og = ctx.createGain(); og.gain.value = a;
      o.connect(og).connect(g);
      o.start(t); o.stop(t + Math.min(dur + 0.7, 4.2));
    });
    g.connect(this.bgmBus);
  }

  setBgm(on) {
    this.bgmOn = on;
    if (!this.ctx) return;
    if (!this.bgmTimer) this.startBgm();
    this.bgmGain.gain.setTargetAtTime(on ? 0.2 : 0, this.ctx.currentTime, 0.3);
  }

  suspend() { this.ctx?.suspend(); }
  resume() { this.ctx?.resume(); }
}
