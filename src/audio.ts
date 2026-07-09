// Tiny WebAudio chiptune synth — no audio assets needed.

const MUTE_KEY = "luna-leap-muted";

export class Sfx {
  private ctx: AudioContext | null = null;
  muted = localStorage.getItem(MUTE_KEY) === "1";

  private ensure(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  toggle() {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, this.muted ? "1" : "0");
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = "square",
    slideTo?: number,
    vol = 0.06,
    delay = 0
  ) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  jump() {
    this.tone(300, 0.14, "square", 560);
  }
  doubleJump() {
    this.tone(440, 0.14, "square", 780);
  }
  score() {
    this.tone(880, 0.07, "square", undefined, 0.045);
  }
  collect() {
    this.tone(660, 0.08, "triangle", undefined, 0.08);
    this.tone(990, 0.1, "triangle", undefined, 0.08, 0.06);
  }
  hit() {
    this.tone(220, 0.28, "sawtooth", 55, 0.09);
  }
  gameOver() {
    this.tone(392, 0.18, "square", undefined, 0.06, 0);
    this.tone(311, 0.18, "square", undefined, 0.06, 0.18);
    this.tone(233, 0.4, "square", undefined, 0.06, 0.36);
  }
  start() {
    this.tone(523, 0.1, "square", undefined, 0.05, 0);
    this.tone(659, 0.1, "square", undefined, 0.05, 0.09);
    this.tone(784, 0.16, "square", undefined, 0.05, 0.18);
  }
}
