const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'store', 'images');
fs.mkdirSync(OUT, { recursive: true });

// === Color palette (matches game) ===
const BG = [26, 26, 46];
const BLOCK_COLORS = [
  [233, 69, 96],   // red
  [245, 197, 24],  // yellow/gold
  [83, 52, 131],   // purple
  [0, 180, 216],   // cyan
  [6, 214, 160],   // green
  [255, 107, 107], // salmon
  [255, 159, 67],  // orange
  [46, 213, 115],  // lime
];
const GRID_BG = [15, 52, 96];
const GRID_LINE = [22, 33, 62];
const TEXT_WHITE = [238, 238, 238];
const TEXT_GOLD = [245, 197, 24];
const TEXT_RED = [233, 69, 96];

// === Helpers ===
function setPixel(img, x, y, r, g, b, a) {
  const idx = (y * img.width + x) << 2;
  if (idx >= 0 && idx < img.data.length) {
    img.data[idx] = r;
    img.data[idx+1] = g;
    img.data[idx+2] = b;
    img.data[idx+3] = a !== undefined ? a : 255;
  }
}

function fillRect(img, x, y, w, h, r, g, b) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(img, x+dx, y+dy, r, g, b);
}

function fillRoundedRect(img, x, y, w, h, radius, r, g, b) {
  radius = Math.min(radius, w/2, h/2);
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      // Check corners
      let inCorner = false;
      if (dx < radius && dy < radius) {
        inCorner = (radius - dx)**2 + (radius - dy)**2 > radius**2;
      } else if (dx >= w - radius && dy < radius) {
        inCorner = (dx - (w - radius - 1))**2 + (radius - dy)**2 > radius**2;
      } else if (dx < radius && dy >= h - radius) {
        inCorner = (radius - dx)**2 + (dy - (h - radius - 1))**2 > radius**2;
      } else if (dx >= w - radius && dy >= h - radius) {
        inCorner = (dx - (w - radius - 1))**2 + (dy - (h - radius - 1))**2 > radius**2;
      }
      if (!inCorner) setPixel(img, x+dx, y+dy, r, g, b);
    }
  }
}

function drawBlock(img, x, y, size, colorIdx, shadow) {
  const c = BLOCK_COLORS[colorIdx % BLOCK_COLORS.length];
  // Shadow
  if (shadow) fillRoundedRect(img, x+2, y+2, size, size, 3, 0, 0, 0);
  // Main block
  fillRoundedRect(img, x, y, size, size, 3, c[0], c[1], c[2]);
  // Highlight (top-left shine)
  fillRoundedRect(img, x+2, y+1, size-6, 3, 2, Math.min(255,c[0]+60), Math.min(255,c[1]+60), Math.min(255,c[2]+60));
}

function drawGrid(img, ox, oy, size, cells, grid) {
  const cellSz = Math.floor(size / 8);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const x = ox + c * cellSz;
      const y = oy + r * cellSz;
      if (grid && grid[r] && grid[r][c]) {
        drawBlock(img, x+1, y+1, cellSz-2, (r * 7 + c * 13), true);
      } else {
        fillRect(img, x+1, y+1, cellSz-2, cellSz-2, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
      }
      // Grid line
      setPixel(img, x, y, GRID_LINE[0], GRID_LINE[1], GRID_LINE[2]);
    }
  }
}

function drawText(img, x, y, text, size, r, g, b, bold) {
  // Very simple bitmap text rendering using a minimal font
  // Since we can't do true text, we'll draw it as a "label rectangle" with the text in the filename
  // For actual store submission, we'll rely on the store listing text
  // This function draws a colored underline "label" visual
  const w = text.length * (size * 0.7);
  fillRect(img, x, y - 5, Math.min(w, img.width - x - 5), Math.max(3, Math.floor(size * 0.15)), r, g, b);
}

function drawTextArea(img, x, y, text, size, r, g, b) {
  // Simple pixel font for numbers and basic characters
  // Only renders digits 0-9 and some letters
  const font = {
    '0': [0x7E, 0x81, 0x81, 0x81, 0x81, 0x81, 0x7E],
    '1': [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
    '2': [0x7E, 0x01, 0x01, 0x7E, 0x40, 0x40, 0x7F],
    '3': [0x7E, 0x01, 0x01, 0x3E, 0x01, 0x01, 0x7E],
    '4': [0x81, 0x81, 0x81, 0x7F, 0x01, 0x01, 0x01],
    '5': [0x7F, 0x40, 0x40, 0x7E, 0x01, 0x01, 0x7E],
    '6': [0x7E, 0x40, 0x40, 0x7E, 0x81, 0x81, 0x7E],
    '7': [0x7F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
    '8': [0x7E, 0x81, 0x81, 0x7E, 0x81, 0x81, 0x7E],
    '9': [0x7E, 0x81, 0x81, 0x7F, 0x01, 0x01, 0x7E],
    ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    'B': [0x7C, 0x42, 0x42, 0x7C, 0x42, 0x42, 0x7C],
    'L': [0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x7E],
    'O': [0x7E, 0x81, 0x81, 0x81, 0x81, 0x81, 0x7E],
    'C': [0x7E, 0x80, 0x80, 0x80, 0x80, 0x80, 0x7E],
    'K': [0x42, 0x44, 0x48, 0x50, 0x48, 0x44, 0x42],
    'R': [0x7C, 0x42, 0x42, 0x7C, 0x48, 0x44, 0x42],
    'U': [0x81, 0x81, 0x81, 0x81, 0x81, 0x81, 0x7E],
    'S': [0x7E, 0x80, 0x80, 0x7E, 0x01, 0x01, 0x7E],
    'H': [0x81, 0x81, 0x81, 0xFF, 0x81, 0x81, 0x81],
    'D': [0x7C, 0x42, 0x41, 0x41, 0x41, 0x42, 0x7C],
    'A': [0x7E, 0x81, 0x81, 0x81, 0xFF, 0x81, 0x81],
    'I': [0x7E, 0x08, 0x08, 0x08, 0x08, 0x08, 0x7E],
    'P': [0x7E, 0x81, 0x81, 0x7E, 0x40, 0x40, 0x40],
    'M': [0x81, 0xC3, 0xA5, 0x99, 0x81, 0x81, 0x81],
    'E': [0x7F, 0x40, 0x40, 0x7E, 0x40, 0x40, 0x7F],
    'F': [0x7F, 0x40, 0x40, 0x7E, 0x40, 0x40, 0x40],
    'T': [0xFF, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08],
    'N': [0x81, 0xC1, 0xA1, 0x91, 0x89, 0x85, 0x83],
    'X': [0x81, 0x42, 0x24, 0x18, 0x24, 0x42, 0x81],
    ':': [0x00, 0x18, 0x18, 0x00, 0x18, 0x18, 0x00],
    '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x18],
  };

  let cx = x;
  const scale = Math.max(1, Math.floor(size / 7));
  const space = scale * 5;

  for (const ch of text.toUpperCase()) {
    if (ch === ' ') { cx += space * 0.6; continue; }
    const glyph = font[ch] || font[' '];
    for (let row = 0; row < 7; row++) {
      let bits = glyph[row];
      for (let col = 0; col < 5; col++) {
        if ((bits >> (4 - col)) & 1) {
          for (let sy = 0; sy < scale; sy++)
            for (let sx = 0; sx < scale; sx++)
              setPixel(img, cx + col * scale + sx, y + row * scale + sy, r, g, b);
        }
      }
    }
    cx += space;
  }
  return cx; // return new x position
}

// === Image Generators ===

// --- 1. Gameplay Screenshot 1: Start state ---
function generateScreenshot1() {
  const W = 360, H = 600;
  const img = new PNG({ width: W, height: H });

  // Background
  fillRect(img, 0, 0, W, H, BG[0], BG[1], BG[2]);

  // Header
  drawTextArea(img, 100, 15, "BLOCK CRUSH", 10, TEXT_RED[0], TEXT_RED[1], TEXT_RED[2]);

  // Score boxes
  fillRoundedRect(img, 40, 45, 80, 30, 6, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  fillRoundedRect(img, 140, 45, 80, 30, 6, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  fillRoundedRect(img, 240, 45, 80, 30, 6, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  drawTextArea(img, 50, 50, "0", 8, TEXT_WHITE[0], TEXT_WHITE[1], TEXT_WHITE[2]);
  drawTextArea(img, 160, 50, "0", 8, TEXT_GOLD[0], TEXT_GOLD[1], TEXT_GOLD[2]);
  drawTextArea(img, 250, 50, "DAILY", 7, TEXT_RED[0], TEXT_RED[1], TEXT_RED[2]);

  // Energy bar
  fillRoundedRect(img, 20, 90, 320, 18, 9, GRID_BG[0], GRID_BG[1], GRID_BG[2]);

  // Empty grid
  drawGrid(img, 30, 120, 300);

  // Piece tray
  fillRoundedRect(img, 20, 440, 320, 80, 8, GRID_BG[0], GRID_BG[1], GRID_BG[2]);

  // Draw 3 pieces in tray
  const pieces = [
    [[1,1],[1,0]],
    [[1,1,1],[0,1,0]],
    [[1,0],[1,0],[1,1]],
  ];
  for (let pi = 0; pi < 3; pi++) {
    const p = pieces[pi];
    for (let r = 0; r < p.length; r++)
      for (let c = 0; c < p[r].length; c++)
        if (p[r][c])
          drawBlock(img, 40 + pi * 100 + c * 22, 455 + r * 22, 20, (pi * 5 + r * 3 + c * 7));
  }

  // Bottom buttons
  fillRoundedRect(img, 20, 540, 90, 30, 6, TEXT_RED[0], TEXT_RED[1], TEXT_RED[2]);
  fillRoundedRect(img, 130, 540, 90, 30, 6, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  fillRoundedRect(img, 240, 540, 90, 30, 6, GRID_BG[0], GRID_BG[1], GRID_BG[2]);

  const buf = PNG.sync.write(img);
  fs.writeFileSync(path.join(OUT, 'screenshot1-start.png'), buf);
  console.log(`✅ screenshot1-start.png — ${(buf.length / 1024).toFixed(1)} KB`);
}

// --- 2. Gameplay Screenshot 2: Mid-game ---
function generateScreenshot2() {
  const W = 360, H = 600;
  const img = new PNG({ width: W, height: H });

  fillRect(img, 0, 0, W, H, BG[0], BG[1], BG[2]);

  // Header with score
  drawTextArea(img, 100, 15, "BLOCK CRUSH", 10, TEXT_RED[0], TEXT_RED[1], TEXT_RED[2]);

  fillRoundedRect(img, 40, 45, 80, 30, 6, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  fillRoundedRect(img, 140, 45, 80, 30, 6, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  fillRoundedRect(img, 240, 45, 80, 30, 6, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  drawTextArea(img, 50, 50, "1240", 8, TEXT_WHITE[0], TEXT_WHITE[1], TEXT_WHITE[2]);
  drawTextArea(img, 160, 50, "1240", 8, TEXT_GOLD[0], TEXT_GOLD[1], TEXT_GOLD[2]);
  drawTextArea(img, 250, 50, "DAILY", 7, TEXT_RED[0], TEXT_RED[1], TEXT_RED[2]);

  // Energy bar (partially filled)
  fillRoundedRect(img, 20, 90, 320, 18, 9, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  fillRoundedRect(img, 22, 92, 130, 14, 7, TEXT_RED[0], TEXT_RED[1], TEXT_RED[2]);
  drawTextArea(img, 140, 92, "2/5", 7, TEXT_WHITE[0], TEXT_WHITE[1], TEXT_WHITE[2]);

  // Grid with some blocks placed
  const gridState = [
    [0,0,1,0,0,0,0,0],
    [0,1,1,1,0,0,0,0],
    [0,0,1,0,0,1,1,0],
    [0,0,0,1,1,1,0,0],
    [0,0,0,0,0,1,0,0],
    [0,1,1,0,0,0,0,1],
    [1,1,0,0,0,0,1,1],
    [0,1,0,0,0,1,0,1],
  ];
  drawGrid(img, 30, 120, 300, null, gridState);

  // Piece tray
  fillRoundedRect(img, 20, 440, 320, 80, 8, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  drawTextArea(img, 25, 435, "Pieces left: 42", 6, TEXT_WHITE[0], TEXT_WHITE[1], TEXT_WHITE[2]);

  const pieces = [
    [[1,1,1]],
    [[1],[1],[1]],
    [[1,0],[1,1]],
  ];
  for (let pi = 0; pi < 3; pi++) {
    const p = pieces[pi];
    for (let r = 0; r < p.length; r++)
      for (let c = 0; c < p[r].length; c++)
        if (p[r][c])
          drawBlock(img, 40 + pi * 100 + c * 22, 455 + r * 22, 20, (pi * 5 + r * 3 + c * 7));
  }

  const buf = PNG.sync.write(img);
  fs.writeFileSync(path.join(OUT, 'screenshot2-midgame.png'), buf);
  console.log(`✅ screenshot2-midgame.png — ${(buf.length / 1024).toFixed(1)} KB`);
}

// --- 3. Gameplay Screenshot 3: Power-ups in use ---
function generateScreenshot3() {
  const W = 360, H = 600;
  const img = new PNG({ width: W, height: H });

  fillRect(img, 0, 0, W, H, BG[0], BG[1], BG[2]);

  drawTextArea(img, 100, 15, "BLOCK CRUSH", 10, TEXT_RED[0], TEXT_RED[1], TEXT_RED[2]);

  fillRoundedRect(img, 40, 45, 80, 30, 6, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  drawTextArea(img, 50, 50, "2890", 8, TEXT_WHITE[0], TEXT_WHITE[1], TEXT_WHITE[2]);
  fillRoundedRect(img, 140, 45, 80, 30, 6, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  drawTextArea(img, 160, 50, "2890", 8, TEXT_GOLD[0], TEXT_GOLD[1], TEXT_GOLD[2]);
  fillRoundedRect(img, 240, 45, 80, 30, 6, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  drawTextArea(img, 250, 50, "DAILY", 7, TEXT_RED[0], TEXT_RED[1], TEXT_RED[2]);

  // Full energy
  fillRoundedRect(img, 20, 90, 320, 18, 9, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  fillRoundedRect(img, 22, 92, 320, 14, 7, TEXT_GOLD[0], TEXT_GOLD[1], TEXT_GOLD[2]);
  drawTextArea(img, 140, 92, "5/5", 7, TEXT_WHITE[0], TEXT_WHITE[1], TEXT_WHITE[2]);

  // Grid with more blocks
  const gridState = [
    [0,0,0,1,1,0,0,0],
    [0,1,1,1,0,1,0,0],
    [0,0,1,1,1,1,0,0],
    [0,0,1,0,1,0,0,0],
    [0,0,1,0,1,1,1,0],
    [0,1,1,1,1,0,0,0],
    [1,1,0,0,0,0,0,0],
    [1,1,1,0,0,0,0,0],
  ];
  drawGrid(img, 30, 120, 300, null, gridState);

  // Power-up buttons
  fillRoundedRect(img, 25, 430, 100, 35, 8, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  fillRoundedRect(img, 130, 430, 100, 35, 8, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  fillRoundedRect(img, 235, 430, 100, 35, 8, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  drawTextArea(img, 40, 437, "BOMB  3", 7, TEXT_WHITE[0], TEXT_WHITE[1], TEXT_WHITE[2]);
  drawTextArea(img, 143, 437, "HAMMER 2", 7, TEXT_WHITE[0], TEXT_WHITE[1], TEXT_WHITE[2]);
  drawTextArea(img, 248, 437, "SHUFFLE 4", 7, TEXT_WHITE[0], TEXT_WHITE[1], TEXT_WHITE[2]);

  // Single piece left
  fillRoundedRect(img, 20, 480, 320, 50, 8, GRID_BG[0], GRID_BG[1], GRID_BG[2]);
  drawBlock(img, 170, 490, 28, 3);

  // Reward buttons
  fillRoundedRect(img, 25, 545, 150, 28, 6, 26, 90, 26);
  fillRoundedRect(img, 185, 545, 150, 28, 6, 26, 90, 26);
  drawTextArea(img, 28, 549, "WATCH DOUBLE", 6, 76, 175, 80);
  drawTextArea(img, 190, 549, "WATCH +2", 6, 76, 175, 80);

  const buf = PNG.sync.write(img);
  fs.writeFileSync(path.join(OUT, 'screenshot3-powerups.png'), buf);
  console.log(`✅ screenshot3-powerups.png — ${(buf.length / 1024).toFixed(1)} KB`);
}

// --- 4. Icon (512x512) ---
function generateIcon() {
  const S = 512;
  const img = new PNG({ width: S, height: S });
  fillRect(img, 0, 0, S, S, BG[0], BG[1], BG[2]);

  // Draw a 3x3 block grid in center
  const gs = 50;
  const gx = (S - 3 * gs) / 2;
  const gy = S / 2 - 3 * gs / 2 - 40;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      drawBlock(img, gx + c * gs, gy + r * gs, gs - 4, (r * 3 + c));

  // Title text
  drawTextArea(img, 80, gy + 3 * gs + 20, "BLOCK", 28, TEXT_RED[0], TEXT_RED[1], TEXT_RED[2]);
  drawTextArea(img, 110, gy + 3 * gs + 60, "CRUSH", 28, TEXT_RED[0], TEXT_RED[1], TEXT_RED[2]);

  // Small subtitle
  drawTextArea(img, 130, gy + 3 * gs + 100, "DAILY", 16, TEXT_GOLD[0], TEXT_GOLD[1], TEXT_GOLD[2]);

  const buf = PNG.sync.write(img);
  fs.writeFileSync(path.join(OUT, 'icon-512.png'), buf);
  console.log(`✅ icon-512.png — ${(buf.length / 1024).toFixed(1)} KB`);
}

// --- 5. Feature Graphic (1024x500) ---
function generateFeatureGraphic() {
  const W = 1024, H = 500;
  const img = new PNG({ width: W, height: H });

  // Gradient background
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = y / H;
      const r = Math.floor(26 + (15 - 26) * t);
      const g = Math.floor(26 + (52 - 26) * t);
      const b = Math.floor(46 + (96 - 46) * t);
      setPixel(img, x, y, r, g, b);
    }
  }

  // Decorative blocks on left side
  const gs = 40;
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      drawBlock(img, 60 + c * gs, 120 + r * gs, gs - 4, (r * 3 + c));

  // Title on right side
  drawTextArea(img, 350, 120, "BLOCK", 42, TEXT_RED[0], TEXT_RED[1], TEXT_RED[2]);
  drawTextArea(img, 350, 210, "CRUSH", 42, TEXT_RED[0], TEXT_RED[1], TEXT_RED[2]);

  // Tagline
  drawTextArea(img, 350, 280, "DAILY PUZZLE CHALLENGE", 18, TEXT_WHITE[0], TEXT_WHITE[1], TEXT_WHITE[2]);
  drawTextArea(img, 350, 330, "EVERY DAY EVERY BLOCK", 18, TEXT_GOLD[0], TEXT_GOLD[1], TEXT_GOLD[2]);

  // Store badge placeholders
  fillRoundedRect(img, 350, 380, 160, 40, 8, 233, 69, 96);
  fillRoundedRect(img, 530, 380, 160, 40, 8, 233, 69, 96);
  drawTextArea(img, 360, 387, "GET ON", 10, TEXT_WHITE[0], TEXT_WHITE[1], TEXT_WHITE[2]);
  drawTextArea(img, 560, 387, "COMING", 10, TEXT_WHITE[0], TEXT_WHITE[1], TEXT_WHITE[2]);

  const buf = PNG.sync.write(img);
  fs.writeFileSync(path.join(OUT, 'feature-graphic-1024x500.png'), buf);
  console.log(`✅ feature-graphic-1024x500.png — ${(buf.length / 1024).toFixed(1)} KB`);
}

// --- 6. Promo graphic (for Google Play) ---
function generatePromoGraphic() {
  const W = 180, H = 120;
  const img = new PNG({ width: W, height: H });

  fillRect(img, 0, 0, W, H, BG[0], BG[1], BG[2]);

  // Mini blocks
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 2; c++)
      drawBlock(img, 30 + c * 45, 20 + r * 45, 40, (r * 2 + c));

  drawTextArea(img, 20, 95, "BC", 14, TEXT_GOLD[0], TEXT_GOLD[1], TEXT_GOLD[2]);

  const buf = PNG.sync.write(img);
  fs.writeFileSync(path.join(OUT, 'promo-graphic-180x120.png'), buf);
  console.log(`✅ promo-graphic-180x120.png — ${(buf.length / 1024).toFixed(1)} KB`);
}

// === Run all ===
console.log('Generating store images...\n');
generateScreenshot1();
generateScreenshot2();
generateScreenshot3();
generateIcon();
generateFeatureGraphic();
generatePromoGraphic();

console.log('\n📁 All images saved to store/images/');
console.log('\nStore listing checklist:');
console.log('  ✅ icon-512.png (required - app icon)');
console.log('  ✅ feature-graphic-1024x500.png (required - header image)');
console.log('  ✅ screenshot1-start.png (gameplay screenshot)');
console.log('  ✅ screenshot2-midgame.png (gameplay screenshot)');
console.log('  ✅ screenshot3-powerups.png (gameplay screenshot)');
console.log('  ✅ promo-graphic-180x120.png (optional promo)');
