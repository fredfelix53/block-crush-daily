const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'store', 'images');
fs.mkdirSync(OUT, { recursive: true });

// === Professional color palette ===
const COLORS = {
  bg: '#0D1117',
  surface: '#161B22',
  card: '#21262D',
  primary: '#E94560',
  accent: '#F5C518',
  secondary: '#58A6FF',
  text: '#F0F6FC',
  muted: '#8B949E',
  border: '#30363D',
  success: '#3FB950',
};

// === SVG helpers ===
function svgTag(w, h, content) {
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0D1117"/>
        <stop offset="100%" stop-color="#161B22"/>
      </linearGradient>
      <linearGradient id="header-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#E94560"/>
        <stop offset="100%" stop-color="#FF6B6B"/>
      </linearGradient>
      <linearGradient id="accent-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#F5C518"/>
        <stop offset="100%" stop-color="#FF9F43"/>
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
      </filter>
      <filter id="card-shadow" x="-5%" y="-5%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.2"/>
      </filter>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg-grad)"/>
    ${content}
  </svg>`;
}

function blockSVG(x, y, size, colorIdx) {
  const colors = ['#E94560','#F5C518','#58A6FF','#3FB950','#FF9F43','#BC8CFF','#FF6B6B','#56D4DD'];
  const c = colors[colorIdx % colors.length];
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size*0.12}" fill="${c}" filter="url(#shadow)"/>
    <rect x="${x+size*0.06}" y="${y+size*0.05}" width="${size*0.35}" height="${size*0.06}" rx="2" fill="rgba(255,255,255,0.2)"/>`;
}

function roundedRect(x, y, w, h, r, fill) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
}

function esc(s) { return s.replace(/—/g,'-').replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
function text(x, y, str, size, color, weight) {
  return `<text x="${x}" y="${y}" font-size="${size}" font-family="system-ui,-apple-system,sans-serif" fill="${color}" font-weight="${weight||'600'}">${esc(str)}</text>`;
}

function gridSVG(ox, oy, cellSize, state) {
  let svg = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const x = ox + c * cellSize, y = oy + r * cellSize;
      if (state && state[r] && state[r][c]) {
        svg += blockSVG(x+1, y+1, cellSize-2, (r*7+c*13));
      } else {
        svg += roundedRect(x+1, y+1, cellSize-2, cellSize-2, 4, '#21262D');
      }
    }
  }
  return svg;
}

// === SCREENSHOT 1: Game Start / Welcome ===
function makeScreenshot1() {
  const W = 1080, H = 1920;
  const gs = 90; // grid cell size
  const gx = (W - 8*gs) / 2;
  const gy = 480;

  const pieces = [
    '[[1,1],[1,0]]',
    '[[1,1,1],[0,1,0]]',
    '[[1,0],[1,0],[1,1]]',
  ];

  return svgTag(W, H, `
    <!-- Status bar -->
    ${text(40, 60, '9:41', 28, '#F0F6FC')}
    <rect x="${W-180}" y="45" width="150" height="24" rx="12" fill="#21262D"/>

    <!-- Logo area -->
    <rect x="${W/2-80}" y="${gy-200}" width="160" height="160" rx="32" fill="#21262D" filter="url(#shadow)"/>
    ${blockSVG(W/2-60, gy-180, 45, 0)}
    ${blockSVG(W/2-10, gy-180, 45, 1)}
    ${blockSVG(W/2+40, gy-180, 45, 2)}
    ${blockSVG(W/2-60, gy-130, 45, 3)}
    ${blockSVG(W/2-10, gy-130, 45, 4)}
    ${blockSVG(W/2+40, gy-130, 45, 5)}
    ${blockSVG(W/2-60, gy-80,  45, 6)}
    ${blockSVG(W/2-10, gy-80,  45, 7)}
    ${blockSVG(W/2+40, gy-80,  45, 0)}

    <!-- Title -->
    ${text(W/2-160, gy+160, 'BLOCK CRUSH', 64, '#E94560', '800')}
    ${text(W/2-200, gy+220, 'Daily Puzzle Challenge', 32, '#8B949E', '400')}

    <!-- Score bar -->
    ${roundedRect(60, gy+280, 280, 70, 16, '#161B22')}
    ${text(80, gy+310, 'SCORE', 16, '#8B949E')}
    ${text(80, gy+338, '0', 28, '#F0F6FC')}

    ${roundedRect(W-340, gy+280, 280, 70, 16, '#161B22')}
    ${text(W-320, gy+310, 'HIGH SCORE', 16, '#8B949E')}
    ${text(W-320, gy+338, '0', 28, '#F5C518')}

    <!-- Mode indicator -->
    ${roundedRect(W/2-80, gy+380, 160, 40, 20, '#E94560')}
    ${text(W/2-45, gy+408, 'DAILY', 18, '#F0F6FC')}

    <!-- Game Grid -->
    ${roundedRect(gx-8, gy-8, 8*gs+16, 8*gs+16, 12, '#21262D')}
    ${gridSVG(gx, gy, gs)}

    <!-- Pieces tray -->
    ${roundedRect(60, gy+8*gs+40, W-120, 130, 16, '#161B22')}

    <!-- 3 pieces in tray -->
    <rect x="120" y="${gy+8*gs+65}" width="60" height="42" rx="6" fill="#E94560"/>
    <rect x="120" y="${gy+8*gs+110}" width="60" height="42" rx="6" fill="#E94560"/>

    <rect x="320" y="${gy+8*gs+60}" width="60" height="60" rx="6" fill="#F5C518"/>
    <rect x="383" y="${gy+8*gs+60}" width="60" height="60" rx="6" fill="#58A6FF"/>
    <rect x="383" y="${gy+8*gs+84}" width="60" height="60" rx="6" fill="#F5C518"/>

    <rect x="600" y="${gy+8*gs+65}" width="42" height="60" rx="6" fill="#3FB950"/>
    <rect x="645" y="${gy+8*gs+65}" width="42" height="60" rx="6" fill="#BC8CFF"/>
    <rect x="600" y="${gy+8*gs+128}" width="60" height="42" rx="6" fill="#3FB950"/>

    <!-- Energy bar -->
    <rect x="60" y="${gy+8*gs+200}" width="${W-120}" height="32" rx="16" fill="#21262D"/>
    <rect x="64" y="${gy+8*gs+204}" width="80" height="24" rx="12" fill="url(#accent-grad)"/>

    <!-- Bottom buttons -->
    ${roundedRect(60, gy+8*gs+260, (W-160)/2, 56, 16, '#E94560')}
    ${text(120, gy+8*gs+296, '▶ PLAY', 20, '#F0F6FC')}
    ${roundedRect(W/2+20, gy+8*gs+260, (W-160)/2, 56, 16, '#161B22')}
    ${text(W/2+120, gy+8*gs+296, 'PRACTICE', 20, '#8B949E')}

    <!-- Banner ad placeholder -->
    ${roundedRect(60, gy+8*gs+340, W-120, 60, 12, '#21262D')}
    ${text(W/2-40, gy+8*gs+378, '━ ad ━', 14, '#484F58')}
  `);
}

// === SCREENSHOT 2: Active Gameplay ===
function makeScreenshot2() {
  const W = 1080, H = 1920;
  const gs = 90;
  const gx = (W - 8*gs) / 2;
  const gy = 380;

  const state = [
    [0,0,1,0,0,0,0,0],
    [0,1,1,1,0,0,0,0],
    [0,0,1,0,1,1,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,0,0,1,0,0,0],
    [0,1,1,0,0,0,0,1],
    [0,1,0,0,0,1,1,1],
    [1,0,0,0,0,1,0,0],
  ];

  return svgTag(W, H, `
    ${text(40, 60, '9:41', 28, '#F0F6FC')}
    <rect x="${W-180}" y="45" width="150" height="24" rx="12" fill="#21262D"/>

    <!-- Score header -->
    <rect x="40" y="${gy-100}" width="${W-80}" height="80" rx="16" fill="#161B22" filter="url(#card-shadow)"/>
    ${text(70, gy-60, 'SCORE', 16, '#8B949E')}
    ${text(70, gy-30, '1,240', 36, '#F0F6FC')}
    ${text(W/2, gy-60, 'BEST', 16, '#8B949E')}
    ${text(W/2, gy-30, '2,890', 36, '#F5C518')}
    ${text(W-200, gy-60, 'MODE', 16, '#8B949E')}
    ${roundedRect(W-170, gy-95, 100, 28, 14, '#E94560')}
    ${text(W-160, gy-78, 'DAILY', 13, '#F0F6FC')}

    <!-- Full energy bar -->
    <rect x="40" y="${gy-8}" width="${W-80}" height="28" rx="14" fill="#21262D"/>
    <rect x="43" y="${gy-5}" width="${W-86}" height="22" rx="11" fill="url(#accent-grad)"/>
    ${text(W/2-20, gy+14, '⚡ 5/5 MAX ENERGY', 14, '#F0F6FC')}

    <!-- Grid with blocks -->
    ${roundedRect(gx-8, gy-8, 8*gs+16, 8*gs+16, 12, '#21262D')}
    ${gridSVG(gx, gy, gs, state)}

    <!-- Pieces tray -->
    ${roundedRect(60, gy+8*gs+24, W-120, 120, 16, '#161B22')}
    ${text(80, gy+8*gs+52, 'Pieces remaining: 42', 16, '#8B949E')}

    <!-- 3 pieces -->
    <rect x="120" y="${gy+8*gs+65}" width="84" height="28" rx="6" fill="#E94560"/>
    <rect x="207" y="${gy+8*gs+65}" width="84" height="28" rx="6" fill="#E94560"/>
    <rect x="294" y="${gy+8*gs+65}" width="84" height="28" rx="6" fill="#E94560"/>

    <rect x="480" y="${gy+8*gs+60}" width="28" height="84" rx="6" fill="#F5C518"/>
    <rect x="511" y="${gy+8*gs+60}" width="28" height="84" rx="6" fill="#F5C518"/>
    <rect x="542" y="${gy+8*gs+60}" width="28" height="84" rx="6" fill="#F5C518"/>

    <rect x="700" y="${gy+8*gs+65}" width="54" height="28" rx="6" fill="#58A6FF"/>
    <rect x="757" y="${gy+8*gs+65}" width="54" height="28" rx="6" fill="#BC8CFF"/>
    <rect x="700" y="${gy+8*gs+96}" width="54" height="28" rx="6" fill="#58A6FF"/>

    <!-- Power-ups row -->
    <text x="80" y="${gy+8*gs+180}" font-size="16" fill="#8B949E" font-family="system-ui,sans-serif" font-weight="600">POWER-UPS</text>
    ${roundedRect(80, gy+8*gs+192, 140, 44, 12, '#21262D')}
    ${text(110, gy+8*gs+220, '💣 Bomb  ⚡3', 15, '#F0F6FC')}
    ${roundedRect(240, gy+8*gs+192, 140, 44, 12, '#21262D')}
    ${text(268, gy+8*gs+220, '🔨 Hammer  ⚡2', 15, '#F0F6FC')}
    ${roundedRect(400, gy+8*gs+192, 150, 44, 12, '#21262D')}
    ${text(430, gy+8*gs+220, '🔀 Shuffle  ⚡4', 15, '#F0F6FC')}

    <!-- Reward banner -->
    ${roundedRect(80, gy+8*gs+260, W-160, 48, 12, '#1A3A1A')}
    ${text(140, gy+8*gs+292, '📺 Watch ad to double your reward', 16, '#3FB950')}
  `);
}

// === SCREENSHOT 3: Daily Complete / Win State ===
function makeScreenshot3() {
  const W = 1080, H = 1920;
  const gs = 90;
  const gx = (W - 8*gs) / 2;
  const gy = 380;

  return svgTag(W, H, `
    ${text(40, 60, '9:41', 28, '#F0F6FC')}

    <!-- Success overlay background -->
    <rect width="${W}" height="${H}" fill="rgba(0,0,0,0.6)"/>

    <!-- Confetti effect -->
    <circle cx="200" cy="400" r="8" fill="#E94560"/>
    <circle cx="350" cy="350" r="6" fill="#F5C518"/>
    <circle cx="500" cy="300" r="10" fill="#58A6FF"/>
    <circle cx="700" cy="380" r="7" fill="#3FB950"/>
    <circle cx="850" cy="350" r="9" fill="#BC8CFF"/>
    <circle cx="300" cy="500" r="5" fill="#FF9F43"/>
    <circle cx="750" cy="500" r="6" fill="#E94560"/>
    <circle cx="150" cy="600" r="7" fill="#F5C518"/>
    <circle cx="900" cy="550" r="8" fill="#58A6FF"/>
    <circle cx="450" cy="650" r="5" fill="#3FB950"/>

    <!-- Victory modal -->
    ${roundedRect(W/2-250, H/2-220, 500, 440, 24, '#161B22',)}
    <rect x="${W/2-250}" y="${H/2-220}" width="500" height="440" rx="24" fill="#161B22" filter="url(#shadow)"/>

    <!-- Trophy -->
    <text x="${W/2-40}" y="${H/2-140}" font-size="80" font-family="sans-serif">🏆</text>

    ${text(W/2-140, H/2-50, 'DAILY COMPLETE!', 36, '#F5C518', '800')}

    <rect x="${W/2-100}" y="${H/2}" width="200" height="80" rx="16" fill="#21262D"/>
    ${text(W/2-60, H/2+30, 'SCORE', 16, '#8B949E')}
    ${text(W/2-60, H/2+60, '4,580', 36, '#F0F6FC')}

    <!-- Doubled score option -->
    ${roundedRect(W/2-160, H/2+120, 320, 56, 16, '#1A3A1A')}
    ${text(W/2-120, H/2+155, '📺 Watch ad to double → 9,160', 18, '#3FB950')}

    ${roundedRect(W/2-100, H/2+200, 200, 48, 24, '#E94560')}
    ${text(W/2-40, H/2+232, 'CONTINUE', 18, '#F0F6FC')}
  `);
}

// === ICON (512x512) ===
function makeIcon() {
  const S = 512;
  return `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="icon-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1A1A2E"/>
        <stop offset="100%" stop-color="#0D1117"/>
      </linearGradient>
      <filter id="icon-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="12" flood-opacity="0.4"/>
      </filter>
    </defs>
    <rect width="${S}" height="${S}" rx="96" fill="url(#icon-bg)"/>
    <!-- 3x3 block grid centered -->
    <rect x="176" y="120" width="40" height="40" rx="8" fill="#E94560" filter="url(#icon-shadow)"/>
    <rect x="226" y="120" width="40" height="40" rx="8" fill="#F5C518" filter="url(#icon-shadow)"/>
    <rect x="276" y="120" width="40" height="40" rx="8" fill="#58A6FF" filter="url(#icon-shadow)"/>
    <rect x="176" y="170" width="40" height="40" rx="8" fill="#3FB950" filter="url(#icon-shadow)"/>
    <rect x="226" y="170" width="40" height="40" rx="8" fill="#FF9F43" filter="url(#icon-shadow)"/>
    <rect x="276" y="170" width="40" height="40" rx="8" fill="#BC8CFF" filter="url(#icon-shadow)"/>
    <rect x="176" y="220" width="40" height="40" rx="8" fill="#FF6B6B" filter="url(#icon-shadow)"/>
    <rect x="226" y="220" width="40" height="40" rx="8" fill="#56D4DD" filter="url(#icon-shadow)"/>
    <rect x="276" y="220" width="40" height="40" rx="8" fill="#E94560" filter="url(#icon-shadow)"/>
    <!-- Title bar below blocks -->
    <text x="256" y="320" text-anchor="middle" font-size="48" font-family="system-ui,-apple-system,sans-serif" font-weight="800" fill="#E94560">BLOCK</text>
    <text x="256" y="370" text-anchor="middle" font-size="48" font-family="system-ui,-apple-system,sans-serif" font-weight="800" fill="#F0F6FC">CRUSH</text>
    <rect x="160" y="390" width="192" height="4" rx="2" fill="#F5C518"/>
  </svg>`;
}

// === FEATURE GRAPHIC (1024x500) ===
function makeFeatureGraphic() {
  const W = 1024, H = 500;
  return '<svg width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="fg-bg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#0D1117"/><stop offset="50%" stop-color="#161B22"/><stop offset="100%" stop-color="#1A1A2E"/></linearGradient>' +
    '<filter id="fg-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/></filter></defs>' +
    '<rect width="' + W + '" height="' + H + '" fill="url(#fg-bg)"/>' +
    '<rect x="80" y="100" width="50" height="50" rx="10" fill="#E94560" filter="url(#fg-shadow)"/>' +
    '<rect x="140" y="100" width="50" height="50" rx="10" fill="#F5C518" filter="url(#fg-shadow)"/>' +
    '<rect x="200" y="100" width="50" height="50" rx="10" fill="#58A6FF" filter="url(#fg-shadow)"/>' +
    '<rect x="80" y="160" width="50" height="50" rx="10" fill="#3FB950" filter="url(#fg-shadow)"/>' +
    '<rect x="140" y="160" width="50" height="50" rx="10" fill="#FF9F43" filter="url(#fg-shadow)"/>' +
    '<rect x="200" y="160" width="50" height="50" rx="10" fill="#BC8CFF" filter="url(#fg-shadow)"/>' +
    '<rect x="80" y="220" width="50" height="50" rx="10" fill="#FF6B6B" filter="url(#fg-shadow)"/>' +
    '<rect x="140" y="220" width="50" height="50" rx="10" fill="#56D4DD" filter="url(#fg-shadow)"/>' +
    '<rect x="200" y="220" width="50" height="50" rx="10" fill="#E94560" filter="url(#fg-shadow)"/>' +
    '<text x="380" y="200" font-size="80" font-family="system-ui,sans-serif" font-weight="800" fill="#E94560">BLOCK CRUSH</text>' +
    '<text x="380" y="260" font-size="28" font-family="system-ui,sans-serif" font-weight="400" fill="#8B949E">A daily puzzle game for sharp minds</text>' +
    '<circle cx="400" cy="310" r="6" fill="#3FB950"/><text x="420" y="318" font-size="20" font-family="system-ui,sans-serif" font-weight="500" fill="#F0F6FC">Daily challenges - same puzzle for everyone</text>' +
    '<circle cx="400" cy="350" r="6" fill="#3FB950"/><text x="420" y="358" font-size="20" font-family="system-ui,sans-serif" font-weight="500" fill="#F0F6FC">Power-ups and progression - depth without complexity</text>' +
    '<circle cx="400" cy="390" r="6" fill="#3FB950"/><text x="420" y="398" font-size="20" font-family="system-ui,sans-serif" font-weight="500" fill="#F0F6FC">Rewarded ads - you choose, no forced interruptions</text>' +
    '<rect x="710" y="160" width="200" height="60" rx="12" fill="#21262D" stroke="#30363D" stroke-width="2"/>' +
    '<text x="760" y="198" font-size="14" fill="#8B949E" font-family="system-ui,sans-serif">GET IT ON</text>' +
    '<text x="745" y="215" font-size="20" font-family="system-ui,sans-serif" font-weight="800" fill="#F0F6FC">Google Play</text>' +
    '</svg>';
}

// === PROMO GRAPHIC (180x120) ===
function makePromo() {
  return `<svg width="180" height="120" xmlns="http://www.w3.org/2000/svg">
    <rect width="180" height="120" rx="16" fill="#0D1117"/>
    <rect x="30" y="15" width="18" height="18" rx="4" fill="#E94560"/>
    <rect x="52" y="15" width="18" height="18" rx="4" fill="#F5C518"/>
    <rect x="30" y="37" width="18" height="18" rx="4" fill="#58A6FF"/>
    <rect x="52" y="37" width="18" height="18" rx="4" fill="#3FB950"/>
    <text x="30" y="95" font-size="18" font-family="system-ui,sans-serif" font-weight="800" fill="#E94560">BC</text>
  </svg>`;
}

// === Convert SVG to PNG ===
async function svgToPng(svg, name, w, h) {
  const buf = Buffer.from(svg);
  const png = await sharp(buf).resize(w, h).png().toBuffer();
  const filePath = path.join(OUT, name);
  fs.writeFileSync(filePath, png);
  console.log(`✅ ${name} — ${(png.length / 1024).toFixed(1)} KB`);
  return filePath;
}

// === Main ===
(async () => {
  console.log('Generating professional store images...\n');

  await svgToPng(makeScreenshot1(), 'screenshot1-start.png', 1080, 1920);
  await svgToPng(makeScreenshot2(), 'screenshot2-gameplay.png', 1080, 1920);
  await svgToPng(makeScreenshot3(), 'screenshot3-complete.png', 1080, 1920);
  await svgToPng(makeIcon(), 'icon-512.png', 512, 512);
  await svgToPng(makeFeatureGraphic(), 'feature-graphic-1024x500.png', 1024, 500);
  await svgToPng(makePromo(), 'promo-graphic-180x120.png', 180, 120);

  console.log('\n✅ All images generated successfully!');
  console.log('\n📁 store/images/');
  ['icon-512.png','feature-graphic-1024x500.png','screenshot1-start.png','screenshot2-gameplay.png','screenshot3-complete.png','promo-graphic-180x120.png']
    .forEach(f => console.log(`  ${f}`));
})();
