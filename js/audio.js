// 揚げ音（WebAudio で合成）
export class FryAudio {
  constructor() { this.ctx = null; this.level = 0; }

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

  suspend() { this.ctx?.suspend(); }
  resume() { this.ctx?.resume(); }
}
