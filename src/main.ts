import { Game } from "./game";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
ctx.imageSmoothingEnabled = false;

const game = new Game();

// --- responsive internal resolution ---
// Landscape: fixed 180px tall, width follows aspect.
// Portrait: fixed 280px wide, height follows aspect (sky just gets taller).
function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let W: number, H: number;
  if (vw >= vh) {
    H = 180;
    W = Math.max(240, Math.min(420, Math.round((180 * vw) / vh)));
  } else {
    W = 280;
    H = Math.max(280, Math.min(620, Math.round((280 * vh) / vw)));
  }
  canvas.width = W;
  canvas.height = H;
  const scale = Math.min(vw / W, vh / H);
  canvas.style.width = `${Math.round(W * scale)}px`;
  canvas.style.height = `${Math.round(H * scale)}px`;
  ctx.imageSmoothingEnabled = false;
  game.resize(W, H);
}
window.addEventListener("resize", resize);
resize();

// --- input ---
function canvasCoords(e: PointerEvent): [number, number] {
  const r = canvas.getBoundingClientRect();
  return [
    ((e.clientX - r.left) / r.width) * canvas.width,
    ((e.clientY - r.top) / r.height) * canvas.height,
  ];
}

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const [x, y] = canvasCoords(e);
  game.pointerDown(x, y);
});
window.addEventListener("pointerup", () => game.release());

window.addEventListener("keydown", (e) => {
  if (nameOverlay.style.display === "flex") return; // typing a name
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    e.preventDefault();
    if (!e.repeat) game.press();
  } else if (e.code === "KeyL") {
    game.showBoard();
  } else if (e.code === "KeyM") {
    game.sfx.toggle();
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    game.release();
  }
});

// --- name entry overlay (HTML for easy mobile typing) ---
const nameOverlay = document.createElement("div");
nameOverlay.style.cssText = `
  display:none; position:fixed; inset:0; z-index:10;
  align-items:center; justify-content:center; flex-direction:column; gap:14px;
  background:rgba(11,11,42,0.9); font-family:'Courier New',monospace;
`;
nameOverlay.innerHTML = `
  <div style="color:#ffe066;font-size:20px;font-weight:bold;text-align:center">
    ★ NEW HIGH SCORE ★</div>
  <div style="color:#e8e0ff;font-size:13px">enter your name, little light:</div>
  <input id="name-input" maxlength="8" autocomplete="off" spellcheck="false"
    style="width:170px;padding:10px;text-align:center;font-size:18px;
    font-family:inherit;font-weight:bold;text-transform:uppercase;
    background:#1c1445;color:#fff;border:2px solid #8ecbff;border-radius:6px;outline:none" />
  <button id="name-save" style="padding:10px 26px;font-size:15px;font-weight:bold;
    font-family:inherit;background:#ffe066;color:#0b0b2a;border:none;
    border-radius:6px;cursor:pointer">SAVE ✦</button>
`;
document.body.appendChild(nameOverlay);
const nameInput = nameOverlay.querySelector("#name-input") as HTMLInputElement;
const nameSave = nameOverlay.querySelector("#name-save") as HTMLButtonElement;

function submitName() {
  nameOverlay.style.display = "none";
  game.submitName(nameInput.value || "LUNA");
}
nameSave.addEventListener("click", submitName);
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitName();
  e.stopPropagation();
});

game.onRequestName = () => {
  nameInput.value = "";
  nameOverlay.style.display = "flex";
  setTimeout(() => nameInput.focus(), 50);
};

// --- main loop ---
let last = performance.now();
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 1 / 20); // clamp for tab switches
  last = now;
  game.update(dt);
  game.render(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
