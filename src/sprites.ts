// Pixel-art sprites drawn from character maps onto offscreen canvases.
// '.' = transparent, other chars map to palette colors.

function makeSprite(
  rows: string[],
  palette: Record<string, string>
): HTMLCanvasElement {
  const h = rows.length;
  const w = rows[0].length;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = palette[rows[y][x]];
      if (col) {
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  return c;
}

const lunaPalette = {
  o: "#e8b84b",
  b: "#ffe9a0",
  w: "#ffffff",
  B: "#3a3a5c",
  m: "#e8845c",
  r: "#ffb6c1",
  f: "#e8b84b",
};

const lunaBody = [
  "....oooooooo....",
  "..oobbbbbbbboo..",
  ".obbbbbbbbbbbbo.",
  ".obbbbbbbbbbbbo.",
  "obbbwwbbbbwwbbbo",
  "obbbwBbbbbwBbbbo",
  "obbbbbbbbbbbbbbo",
  "obrbbbbbbbbbbrbo",
  ".obbbbmmmmbbbbo.",
  ".obbbbbbbbbbbbo.",
  "..oobbbbbbbboo..",
  "....oooooooo....",
];

export const lunaFrames = [
  makeSprite([...lunaBody, "...ff......ff..."], lunaPalette),
  makeSprite([...lunaBody, "....ff....ff...."], lunaPalette),
];

// Blinking frame (eyes closed) for idle charm on the title screen.
export const lunaBlink = makeSprite(
  [
    "....oooooooo....",
    "..oobbbbbbbboo..",
    ".obbbbbbbbbbbbo.",
    ".obbbbbbbbbbbbo.",
    "obbbbbbbbbbbbbbo",
    "obbbBBbbbbBBbbbo",
    "obbbbbbbbbbbbbbo",
    "obrbbbbbbbbbbrbo",
    ".obbbbmmmmbbbbo.",
    ".obbbbbbbbbbbbo.",
    "..oobbbbbbbboo..",
    "....oooooooo....",
    "...ff......ff...",
  ],
  lunaPalette
);

export const shadowPuff = makeSprite(
  [
    "...pppppp...",
    ".pppppppppp.",
    "pppwwppwwppp",
    "pppwBppwBppp",
    "pppppppppppp",
    "pppppppppppp",
    ".pppppppppp.",
    "..pp.pp.pp..",
  ],
  { p: "#3b2e5a", w: "#ffffff", B: "#14102e" }
);

const batPalette = { k: "#4a3670", w: "#7a5fb0", e: "#ffd9f0" };

export const batFrames = [
  makeSprite(
    [
      "w............w",
      "ww...kkkk...ww",
      ".ww.kkkkkk.ww.",
      "..wwkekkekww..",
      "...kkkkkkkk...",
      "....kk..kk....",
    ],
    batPalette
  ),
  makeSprite(
    [
      "..............",
      ".....kkkk.....",
      "..w.kkkkkk.w..",
      ".wwwkekkekwww.",
      "ww.kkkkkkkk.ww",
      "....kk..kk....",
    ],
    batPalette
  ),
];

export const starSprite = makeSprite(
  [
    "...s...",
    "...s...",
    "..sSs..",
    "sSsSsSs",
    "..sSs..",
    "...s...",
    "...s...",
  ],
  { s: "#ffe066", S: "#fff8d0" }
);

export const heartSprite = makeSprite(
  [
    ".hh..hh.",
    "hHhhhhhh",
    "hhhhhhhh",
    ".hhhhhh.",
    "..hhhh..",
    "...hh...",
  ],
  { h: "#ff5c8a", H: "#ffb0c8" }
);
