import {
  lunaFrames,
  lunaBlink,
  shadowPuff,
  batFrames,
  starSprite,
  heartSprite,
} from "./sprites";
import { Sfx } from "./audio";
import { loadScores, saveScore, qualifies } from "./leaderboard";

type State = "title" | "playing" | "gameover" | "board";

type ObstacleKind = "spike" | "puff" | "bat" | "gap";

interface Obstacle {
  kind: ObstacleKind;
  x: number;
  y: number; // top of hitbox (world coords; y grows downward)
  w: number;
  h: number;
  baseY: number;
  t: number;
  scored: boolean;
}

interface StarPickup {
  x: number;
  y: number;
  t: number;
  taken: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface BgStar {
  x: number; // 0..1 of view
  y: number; // 0..1 of sky
  phase: number;
  size: number;
}

const moonSprite = (() => {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff3c4";
  g.beginPath();
  g.arc(16, 16, 13, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = "destination-out";
  g.beginPath();
  g.arc(22, 12, 11, 0, Math.PI * 2);
  g.fill();
  return c;
})();

const GRAVITY = 900;
const JUMP_VY = -300;
const DOUBLE_JUMP_VY = -270;
const BASE_SPEED = 105;
const MAX_SPEED = 235;

export class Game {
  W = 320;
  H = 180;
  state: State = "title";

  // player (world coordinates)
  px = 0;
  py = 0;
  vy = 0;
  onGround = true;
  jumpsLeft = 2;
  jumpHeld = false;

  score = 0;
  best = Number(localStorage.getItem("luna-leap-best") || 0);
  lives = 3;
  invincible = 0;
  lastRank = -1;
  scoreSaved = false;

  obstacles: Obstacle[] = [];
  stars: StarPickup[] = [];
  particles: Particle[] = [];
  bgStars: BgStar[] = [];
  nextSpawnX = 0;

  time = 0;
  shake = 0;
  flash = 0;
  sfx = new Sfx();

  onRequestName: (score: number) => void = () => {};

  private muteBox = { x: 0, y: 0, w: 16, h: 14 };

  constructor() {
    for (let i = 0; i < 60; i++) {
      this.bgStars.push({
        x: Math.random(),
        y: Math.random() * 0.75,
        phase: Math.random() * Math.PI * 2,
        size: Math.random() < 0.2 ? 2 : 1,
      });
    }
  }

  get groundY() {
    return this.H - 30;
  }
  get screenPX() {
    return Math.max(40, Math.min(90, Math.round(this.W * 0.22)));
  }
  private get camX() {
    return this.px - this.screenPX;
  }

  resize(w: number, h: number) {
    this.W = w;
    this.H = h;
    this.muteBox.x = w - 20;
    this.muteBox.y = 4;
    if (this.state !== "playing") this.py = this.groundY - 15;
  }

  // ---------- state transitions ----------

  startRun() {
    this.state = "playing";
    this.score = 0;
    this.lives = 3;
    this.invincible = 0;
    this.px = 0;
    this.py = this.groundY - 15;
    this.vy = 0;
    this.onGround = true;
    this.jumpsLeft = 2;
    this.obstacles = [];
    this.stars = [];
    this.particles = [];
    this.nextSpawnX = this.px + this.W + 40;
    this.lastRank = -1;
    this.scoreSaved = false;
    this.sfx.start();
  }

  private endRun() {
    this.state = "gameover";
    this.flash = 0.5;
    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem("luna-leap-best", String(this.best));
    }
    this.sfx.gameOver();
  }

  submitName(name: string) {
    this.lastRank = saveScore(name, this.score);
    this.scoreSaved = true;
    this.state = "board";
  }

  // ---------- input ----------

  pointerDown(sx: number, sy: number) {
    const mb = this.muteBox;
    if (sx >= mb.x - 3 && sx <= mb.x + mb.w + 3 && sy <= mb.y + mb.h + 3) {
      this.sfx.toggle();
      return;
    }
    this.press();
  }

  press() {
    switch (this.state) {
      case "title":
        this.startRun();
        break;
      case "playing":
        this.jump();
        break;
      case "gameover":
        if (!this.scoreSaved && qualifies(this.score)) {
          this.onRequestName(this.score);
        } else {
          this.state = "board";
        }
        break;
      case "board":
        this.state = "title";
        break;
    }
  }

  release() {
    this.jumpHeld = false;
  }

  showBoard() {
    if (this.state === "title") this.state = "board";
  }

  private jump() {
    this.jumpHeld = true;
    if (this.onGround) {
      this.vy = JUMP_VY;
      this.onGround = false;
      this.jumpsLeft = 1;
      this.sfx.jump();
      this.burst(this.px, this.py + 14, 6, "#ffe9a0");
    } else if (this.jumpsLeft > 0) {
      this.vy = DOUBLE_JUMP_VY;
      this.jumpsLeft--;
      this.sfx.doubleJump();
      this.burst(this.px, this.py + 10, 10, "#a8e6ff");
    }
  }

  // ---------- world ----------

  private speed() {
    return Math.min(BASE_SPEED + this.score * 2.4, MAX_SPEED);
  }

  /** Ground height at world x, or null if over a gap. */
  private groundAt(x: number): number | null {
    for (const o of this.obstacles) {
      if (o.kind === "gap" && x > o.x && x < o.x + o.w) return null;
    }
    return this.groundY;
  }

  private spawn() {
    const s = this.score;
    const kinds: ObstacleKind[] = ["spike"];
    if (s >= 3) kinds.push("gap");
    if (s >= 8) kinds.push("puff");
    if (s >= 15) kinds.push("bat");
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const x = this.nextSpawnX;
    const gy = this.groundY;

    if (kind === "spike") {
      const count = s < 6 ? 1 : 1 + Math.floor(Math.random() * Math.min(3, 1 + s / 10));
      const w = count * 10;
      this.obstacles.push({ kind, x, y: gy - 11, w, h: 11, baseY: gy - 11, t: 0, scored: false });
    } else if (kind === "gap") {
      const w = 34 + Math.random() * Math.min(34, 14 + s);
      this.obstacles.push({ kind, x, y: gy, w, h: 40, baseY: gy, t: 0, scored: false });
    } else if (kind === "puff") {
      this.obstacles.push({ kind, x, y: gy - 16, w: 12, h: 8, baseY: gy - 12, t: Math.random() * 6, scored: false });
    } else {
      const baseY = gy - 40 - Math.random() * 14;
      this.obstacles.push({ kind, x, y: baseY, w: 12, h: 6, baseY, t: Math.random() * 6, scored: false });
    }

    // Occasionally sprinkle a star arc before the next obstacle.
    if (Math.random() < 0.45) {
      const sx = x + (kind === "gap" ? this.obstacles[this.obstacles.length - 1].w : 0) + 40;
      for (let i = 0; i < 3; i++) {
        this.stars.push({
          x: sx + i * 14,
          y: gy - 42 - Math.sin((i / 2) * Math.PI) * 14,
          t: i * 0.4,
          taken: false,
        });
      }
    }

    const spacing = Math.max(120, 230 - s * 2.2) + Math.random() * 70;
    this.nextSpawnX = x + (kind === "gap" ? this.obstacles[this.obstacles.length - 1].w : 0) + spacing;
  }

  private burst(x: number, y: number, n: number, color: string) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * 45;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 15,
        life: 0.5 + Math.random() * 0.35,
        maxLife: 0.85,
        color,
        size: Math.random() < 0.3 ? 2 : 1,
      });
    }
  }

  private loseLife(fell: boolean) {
    this.lives--;
    this.shake = 0.35;
    this.flash = 0.25;
    this.sfx.hit();
    this.burst(this.px, this.py, 14, "#ff5c8a");
    if (this.lives <= 0) {
      this.endRun();
      return;
    }
    this.invincible = 1.8;
    if (fell) {
      // Respawn just past the gap Luna fell into.
      for (const o of this.obstacles) {
        if (o.kind === "gap" && this.px > o.x - 8 && this.px < o.x + o.w + 8) {
          this.px = o.x + o.w + 14;
          break;
        }
      }
      this.py = this.groundY - 60;
      this.vy = 0;
      this.jumpsLeft = 1;
    }
  }

  // ---------- update ----------

  update(dt: number) {
    this.time += dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.flash > 0) this.flash -= dt;

    // ambient particles decay in every state
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.state !== "playing") return;

    const speed = this.speed();
    this.px += speed * dt;
    if (this.invincible > 0) this.invincible -= dt;

    // physics — hold jump for a floatier arc
    const g = this.jumpHeld && this.vy < 0 ? GRAVITY * 0.55 : GRAVITY;
    this.vy += g * dt;
    this.py += this.vy * dt;

    const gy = this.groundAt(this.px);
    if (gy !== null && this.py >= gy - 15 && this.vy >= 0) {
      this.py = gy - 15;
      this.vy = 0;
      if (!this.onGround) this.burst(this.px, this.py + 13, 3, "#7ef0c0");
      this.onGround = true;
      this.jumpsLeft = 2;
    } else {
      this.onGround = false;
    }

    // fell into a gap
    if (this.py > this.H + 40) {
      this.loseLife(true);
      return;
    }

    // running sparkle trail
    if (Math.random() < dt * 25) {
      this.particles.push({
        x: this.px - 8,
        y: this.py + 6 + Math.random() * 6,
        vx: -20 - Math.random() * 20,
        vy: -8 + Math.random() * 16,
        life: 0.4,
        maxLife: 0.4,
        color: Math.random() < 0.5 ? "#ffe9a0" : "#fff8d0",
        size: 1,
      });
    }

    // spawn ahead, cull behind
    while (this.nextSpawnX < this.camX + this.W + 60) this.spawn();
    this.obstacles = this.obstacles.filter((o) => o.x + o.w > this.camX - 40);
    this.stars = this.stars.filter((s) => s.x > this.camX - 20 && !s.taken);

    // obstacle behavior + scoring + collision
    const hbx = this.px - 6;
    const hby = this.py - 6;
    const hbw = 12;
    const hbh = 13;

    for (const o of this.obstacles) {
      o.t += dt;
      if (o.kind === "puff") {
        o.y = o.baseY - 4 + Math.sin(o.t * 3) * 4 - 4;
      } else if (o.kind === "bat") {
        o.x -= 28 * dt; // bats drift toward Luna
        o.y = o.baseY + Math.sin(o.t * 4) * 7;
      }

      if (!o.scored && o.x + o.w < this.px - 8) {
        o.scored = true;
        this.score++;
        this.sfx.score();
      }

      if (o.kind === "gap" || this.invincible > 0) continue;

      // forgiving hitboxes
      const pad = o.kind === "spike" ? 2 : 1;
      if (
        hbx < o.x + o.w - pad &&
        hbx + hbw > o.x + pad &&
        hby < o.y + o.h - pad &&
        hby + hbh > o.y + pad
      ) {
        this.loseLife(false);
        if (this.state !== "playing") return;
      }
    }

    // star pickups
    for (const s of this.stars) {
      s.t += dt;
      if (!s.taken && Math.abs(s.x - this.px) < 10 && Math.abs(s.y - this.py) < 12) {
        s.taken = true;
        this.score++;
        this.sfx.collect();
        this.burst(s.x, s.y, 6, "#ffe066");
      }
    }
  }

  // ---------- render ----------

  render(ctx: CanvasRenderingContext2D) {
    const { W, H } = this;
    const shakeX = this.shake > 0 ? (Math.random() - 0.5) * 4 : 0;
    const shakeY = this.shake > 0 ? (Math.random() - 0.5) * 4 : 0;

    ctx.save();
    ctx.translate(Math.round(shakeX), Math.round(shakeY));

    this.drawSky(ctx);
    this.drawParallax(ctx);

    if (this.state === "playing" || this.state === "gameover") {
      this.drawWorld(ctx);
      if (this.state === "playing") this.drawPlayer(ctx);
    }

    this.drawParticles(ctx);

    switch (this.state) {
      case "title":
        this.drawTitle(ctx);
        break;
      case "playing":
        this.drawHUD(ctx);
        break;
      case "gameover":
        this.drawGameOver(ctx);
        break;
      case "board":
        this.drawBoard(ctx);
        break;
    }

    this.drawMuteButton(ctx);

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,92,138,${this.flash * 0.8})`;
      ctx.fillRect(-4, -4, W + 8, H + 8);
    }
    ctx.restore();
  }

  private drawSky(ctx: CanvasRenderingContext2D) {
    const { W, H } = this;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0b0b2a");
    grad.addColorStop(0.6, "#1c1445");
    grad.addColorStop(1, "#31215e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // twinkling stars
    for (const s of this.bgStars) {
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 1.4 + s.phase));
      ctx.fillStyle = `rgba(255,244,214,${tw})`;
      const sx = ((s.x * W - this.camXFor(0.05)) % (W + 4) + W + 4) % (W + 4) - 2;
      ctx.fillRect(Math.round(sx), Math.round(s.y * H), s.size, s.size);
    }

    // crescent moon (pre-rendered with real transparency)
    const mx = W - 46;
    const my = 30;
    ctx.fillStyle = "rgba(255,243,196,0.06)";
    ctx.beginPath();
    ctx.arc(mx, my, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(moonSprite, mx - 16, my - 16);
  }

  private camXFor(factor: number) {
    return (this.state === "playing" || this.state === "gameover"
      ? this.camX
      : this.time * 12) * factor;
  }

  private drawParallax(ctx: CanvasRenderingContext2D) {
    const { H } = this;
    // distant hills (two layers)
    this.drawHillLayer(ctx, "#241a52", this.camXFor(0.18), H - 52, 34, 90);
    this.drawHillLayer(ctx, "#2d2166", this.camXFor(0.35), H - 40, 24, 60);
  }

  private drawHillLayer(
    ctx: CanvasRenderingContext2D,
    color: string,
    cam: number,
    baseY: number,
    amp: number,
    wavelength: number
  ) {
    const { W, H } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) {
      const wx = x + cam;
      const y =
        baseY -
        Math.abs(Math.sin(wx / wavelength)) * amp * 0.6 -
        Math.abs(Math.sin(wx / (wavelength * 2.7) + 1.3)) * amp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  private drawWorld(ctx: CanvasRenderingContext2D) {
    const { W } = this;
    const cam = this.camX;
    const gy = this.groundY;

    // ground tiles, skipping gaps
    const t0 = Math.floor(cam / 8) * 8;
    for (let x = t0; x < cam + W + 8; x += 8) {
      if (this.groundAt(x + 4) === null) continue;
      const sx = Math.round(x - cam);
      // glowing grass top
      ctx.fillStyle = "#5ad6a0";
      ctx.fillRect(sx, gy, 8, 3);
      ctx.fillStyle = "#8ef7c6";
      ctx.fillRect(sx + ((x / 8) % 2 === 0 ? 1 : 4), gy, 2, 1);
      // soil
      ctx.fillStyle = "#2a2050";
      ctx.fillRect(sx, gy + 3, 8, this.H - gy - 3);
      ctx.fillStyle = "#342a60";
      if ((x / 8) % 3 === 0) ctx.fillRect(sx + 2, gy + 8, 2, 2);
      if ((x / 8) % 4 === 1) ctx.fillRect(sx + 5, gy + 14, 2, 2);
    }

    // obstacles
    for (const o of this.obstacles) {
      const sx = Math.round(o.x - cam);
      if (o.kind === "spike") {
        const n = Math.round(o.w / 10);
        for (let i = 0; i < n; i++) {
          const bx = sx + i * 10;
          ctx.fillStyle = "#b8e6ff";
          ctx.beginPath();
          ctx.moveTo(bx, gy);
          ctx.lineTo(bx + 5, gy - 11);
          ctx.lineTo(bx + 10, gy);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#e8f8ff";
          ctx.fillRect(bx + 4, gy - 9, 1, 6);
        }
      } else if (o.kind === "puff") {
        ctx.drawImage(shadowPuff, sx, Math.round(o.y));
      } else if (o.kind === "bat") {
        const frame = batFrames[Math.floor(o.t * 8) % 2];
        ctx.drawImage(frame, sx - 1, Math.round(o.y) - 1);
      }
      // gaps draw nothing — the missing ground is the hazard
    }

    // star pickups
    for (const s of this.stars) {
      const sx = Math.round(s.x - cam);
      const bob = Math.sin(s.t * 3) * 2;
      const tw = 0.7 + 0.3 * Math.sin(s.t * 6);
      ctx.globalAlpha = tw;
      ctx.drawImage(starSprite, sx - 3, Math.round(s.y - 3 + bob));
      ctx.globalAlpha = 1;
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    if (this.invincible > 0 && Math.floor(this.time * 12) % 2 === 0) return;
    const sx = this.screenPX;
    const sy = Math.round(this.py);

    // soft glow
    const glow = ctx.createRadialGradient(sx, sy, 2, sx, sy, 18);
    glow.addColorStop(0, "rgba(255,233,160,0.35)");
    glow.addColorStop(1, "rgba(255,233,160,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(sx - 18, sy - 18, 36, 36);

    const frame = this.onGround
      ? lunaFrames[Math.floor(this.time * 8) % 2]
      : lunaFrames[1];
    ctx.drawImage(frame, sx - 8, sy - 7);
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    const cam =
      this.state === "playing" || this.state === "gameover" ? this.camX : 0;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - cam), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- UI screens ----------

  private text(
    ctx: CanvasRenderingContext2D,
    msg: string,
    x: number,
    y: number,
    size = 8,
    color = "#fff",
    align: CanvasTextAlign = "center"
  ) {
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#0b0b2a";
    ctx.fillText(msg, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(msg, x, y);
  }

  private drawTitle(ctx: CanvasRenderingContext2D) {
    const { W, H } = this;
    const cx = W / 2;

    // logo
    const grad = ctx.createLinearGradient(0, H * 0.16, 0, H * 0.34);
    grad.addColorStop(0, "#fff3c4");
    grad.addColorStop(1, "#8ecbff");
    ctx.font = `bold ${Math.min(30, W / 9)}px "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#0b0b2a";
    ctx.fillText("LUNA LEAP", cx + 2, H * 0.24 + 2);
    ctx.fillStyle = grad;
    ctx.fillText("LUNA LEAP", cx, H * 0.24);
    const tw = 0.5 + 0.5 * Math.sin(this.time * 3);
    ctx.globalAlpha = tw;
    ctx.drawImage(starSprite, cx + Math.min(30, W / 9) * 2.6, H * 0.24 - 12);
    ctx.globalAlpha = 1;

    this.text(ctx, "gather the lost starlight", cx, H * 0.35, 8, "#b8a8e8");

    // bobbing Luna (blinks now and then)
    const bob = Math.sin(this.time * 2.4) * 3;
    const blink = Math.sin(this.time * 0.9) > 0.96;
    const spr = blink ? lunaBlink : lunaFrames[Math.floor(this.time * 4) % 2];
    const glow = ctx.createRadialGradient(cx, H * 0.52 + bob, 2, cx, H * 0.52 + bob, 22);
    glow.addColorStop(0, "rgba(255,233,160,0.4)");
    glow.addColorStop(1, "rgba(255,233,160,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 22, H * 0.52 + bob - 22, 44, 44);
    ctx.drawImage(spr, cx - 8, H * 0.52 + bob - 7);

    if (Math.floor(this.time * 1.6) % 2 === 0) {
      this.text(ctx, "TAP OR PRESS SPACE TO START", cx, H * 0.7, 9, "#fff");
    }
    this.text(ctx, "jump obstacles · double-jump in air", cx, H * 0.79, 7, "#8a7bc8");
    this.text(ctx, "~ press L for high scores ~", cx, H * 0.88, 7, "#ffd166");
    if (this.best > 0) {
      this.text(ctx, `BEST ${this.best}`, cx, H * 0.09, 8, "#ffe066");
    }
  }

  private drawHUD(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = i < this.lives ? 1 : 0.22;
      ctx.drawImage(heartSprite, 5 + i * 11, 5);
    }
    ctx.globalAlpha = 1;
    this.text(ctx, `SCORE ${this.score}`, this.W / 2, 10, 9, "#fff");
    if (this.best > 0) {
      this.text(ctx, `BEST ${this.best}`, this.W / 2, 20, 7, "#8a7bc8");
    }
  }

  private overlay(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "rgba(11,11,42,0.82)";
    ctx.fillRect(0, 0, this.W, this.H);
  }

  private drawGameOver(ctx: CanvasRenderingContext2D) {
    const { W, H } = this;
    const cx = W / 2;
    this.overlay(ctx);
    this.text(ctx, "GAME OVER", cx, H * 0.28, 18, "#ff5c8a");
    this.text(ctx, `SCORE  ${this.score}`, cx, H * 0.45, 12, "#fff");
    this.text(ctx, `BEST   ${this.best}`, cx, H * 0.56, 9, "#ffe066");
    const isNew = qualifies(this.score) && !this.scoreSaved;
    if (Math.floor(this.time * 1.6) % 2 === 0) {
      this.text(
        ctx,
        isNew ? "★ NEW HIGH SCORE — TAP TO ENTER NAME ★" : "TAP FOR LEADERBOARD",
        cx,
        H * 0.72,
        8,
        isNew ? "#ffe066" : "#fff"
      );
    }
  }

  private drawBoard(ctx: CanvasRenderingContext2D) {
    const { W, H } = this;
    const cx = W / 2;
    this.overlay(ctx);
    this.text(ctx, "☆ TOP LUNAS ☆", cx, H * 0.14, 13, "#ffe066");
    const scores = loadScores();
    if (scores.length === 0) {
      this.text(ctx, "no scores yet — be the first!", cx, H * 0.45, 9, "#b8a8e8");
    }
    scores.forEach((e, i) => {
      const y = H * 0.27 + i * (H * 0.1);
      const mine = i === this.lastRank;
      const col = mine ? "#ffe066" : "#e8e0ff";
      this.text(ctx, `${i + 1}.`, cx - W * 0.3, y, 9, col, "left");
      this.text(ctx, e.name, cx - W * 0.2, y, 9, col, "left");
      this.text(ctx, String(e.score), cx + W * 0.3, y, 9, col, "right");
      if (mine) this.text(ctx, "★", cx - W * 0.37, y, 9, "#ffe066", "left");
    });
    if (Math.floor(this.time * 1.6) % 2 === 0) {
      this.text(ctx, "TAP TO CONTINUE", cx, H * 0.88, 8, "#fff");
    }
  }

  private drawMuteButton(ctx: CanvasRenderingContext2D) {
    const { x, y } = this.muteBox;
    ctx.globalAlpha = 0.85;
    // tiny speaker
    ctx.fillStyle = "#b8a8e8";
    ctx.fillRect(x, y + 4, 3, 4);
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 4);
    ctx.lineTo(x + 7, y);
    ctx.lineTo(x + 7, y + 12);
    ctx.lineTo(x + 3, y + 8);
    ctx.closePath();
    ctx.fill();
    if (this.sfx.muted) {
      ctx.strokeStyle = "#ff5c8a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 9, y + 2);
      ctx.lineTo(x + 14, y + 10);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "#b8a8e8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x + 8, y + 6, 3, -0.9, 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 8, y + 6, 6, -0.9, 0.9);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
