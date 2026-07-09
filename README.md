# 🌙 Luna Leap ✦

*Gather the lost starlight.*

Luna, a tiny living light born from the last star of the evening, leaps across
glowing meadows in an endless night — dodging crystal spikes, shadow puffs,
sleepy bats and gaps in the floating ground. Every obstacle passed is a point.
You have **3 lives**. When they're gone, see if you made the **Top Lunas**
leaderboard. No login, no backend — everything runs in your browser.

Cozy pixel-art, chiptune sound effects, works on desktop **and** mobile
(portrait or landscape).

## 🎮 How to Play

| Action | Desktop | Mobile |
|---|---|---|
| Jump | `Space` / `↑` / `W` | Tap anywhere |
| Double jump | Press again mid-air | Tap again mid-air |
| Higher jump | Hold the key | Hold the tap |
| High scores | `L` (on title screen) | — |
| Mute | `M` | Tap speaker icon (top-right) |

- Every obstacle you clear = **+1 score**; star fragments also give +1.
- The game speeds up and adds new obstacle types the further you get:
  spikes → gaps → shadow puffs → bats.
- Lose all 3 hearts and it's game over. A top-5 score lets you enter your name.
- Scores are saved locally in your browser (`localStorage`).

## 🚀 Run Locally

Requires [Node.js](https://nodejs.org) 18+.

```bash
git clone https://github.com/superdooperjen/luna-leap.git
cd luna-leap
npm install
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173/luna-leap/**).

To test on your phone over the same Wi-Fi:

```bash
npm run dev -- --host
```

then open the "Network" URL Vite prints on your phone.

## 📦 Production Build

```bash
npm run build      # outputs static files to dist/
npm run preview    # serves the production build locally
```

## 🌍 Deploy (GitHub Pages — free)

This repo ships with a GitHub Actions workflow
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) that builds
and deploys automatically.

**One-time setup:**

1. On GitHub go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to the `main` branch (or run the workflow manually from the
   **Actions** tab).

Your game will be live at:

```
https://superdooperjen.github.io/luna-leap/
```

> Deploying somewhere else (Vercel, Netlify, a custom domain)? Change
> `base: "/luna-leap/"` to `"/"` in [`vite.config.ts`](vite.config.ts) —
> those platforms auto-detect Vite and need no other config.

## 🛠 Tech Stack

| Choice | Why |
|---|---|
| **Vite + TypeScript** | Instant dev server, typed code that scales as features grow, builds to plain static files |
| **HTML5 Canvas (vanilla)** | ~7 KB gzipped total — instant load on mobile, no framework lock-in |
| **localStorage leaderboard** | No login/backend needed; the [`leaderboard.ts`](src/leaderboard.ts) interface can be swapped for a real API (e.g. Supabase) later without touching game code |
| **GitHub Actions → Pages** | Free hosting, auto-deploy on every push |

## 📁 Project Structure

```
index.html          canvas shell + retro styling
src/main.ts         bootstrap: responsive scaling, input, game loop
src/game.ts         game engine: physics, spawning, difficulty, rendering, UI screens
src/sprites.ts      pixel-art sprites (Luna, enemies, hearts, stars)
src/audio.ts        WebAudio chiptune synth (no audio files)
src/leaderboard.ts  localStorage top-5 scores
```

## 🗺 Roadmap Ideas

From the original design doc — the code is structured so these slot in:

- 🎨 Unlockable glow colors (Sapphire, Amethyst, Rainbow, Galaxy Luma…)
- 🌌 More worlds: Cloud Haven, Glow Grove, Crystal Peaks, Shadow Realm
- 🎁 Power-ups: Star Shield, Feather Jump, Star Magnet, Slow Time
- 🏆 Online leaderboard + daily challenges
- 🎵 Ambient music-box background track
