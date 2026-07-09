import { defineConfig } from "vite";

// Relative base works everywhere the game ships: GitHub Pages project sites
// (username.github.io/luna-leap/), the Capacitor Android app, and any static host.
export default defineConfig({
  base: "./",
});
