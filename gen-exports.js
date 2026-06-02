const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'store', 'images');
fs.mkdirSync(OUT, { recursive: true });

const COLORS = { bg: '#0D1117', surface: '#161B22', card: '#21262D', primary: '#E94560', accent: '#F5C518', secondary: '#58A6FF', text: '#F0F6FC', muted: '#8B949E', border: '#30363D', success: '#3FB950' };

function svgTag(w, h, content) {
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0D1117"/><stop offset="100%" stop-color="#161B22"/></linearGradient>
      <linearGradient id="header-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#E94560"/><stop offset="100%" stop-color="#FF6B6B"/></linearGradient>
      <linearGradient id="accent-grad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#F5C518"/><stop offset="100%" stop-color="#FF9F43"/></linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/></filter>
      <filter id="card-shadow" x="-5%" y="-5%" width="120%" height="120%"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.2"/></filter>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg-grad)"/>
    ${content}
  </svg>`;
}
function blockSVG(x, y, size, colorIdx) {
  const colors = ['#E94560','#F5C518','#58A6FF','#3FB950','#FF9F43','#BC8CFF','#FF6B6B','#56D4DD'];
  const c = colors[colorIdx % colors.length];
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size*0.12}" fill="${c}" filter="url(#shadow)"/><rect x="${x+size*0.06}" y="${y+size*0.05}" width="${size*0.35}" height="${size*0.06}" rx="2" fill="rgba(255,255,255,0.2)"/>`;
}
function roundedRect(x, y, w, h, r, fill) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`; }
function text(x, y, str, size, color, weight) { return `<text x="${x}" y="${y}" font-size="${size}" font-family="system-ui,-apple-system,sans-serif" fill="${color}" font-weight="${weight||'600'}">${str}</text>`; }
function gridSVG(ox, oy, cellSize, state) {
  let sv = '';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const x = ox + c * cellSize, y = oy + r * cellSize;
    if (state && state[r] && state[r][c]) sv += blockSVG(x+1, y+1, cellSize-2, (r*7+c*13));
    else sv += roundedRect(x+1, y+1, cellSize-2, cellSize-2, 4, '#21262D');
  }
  return sv;
}

function makeFeatureGraphic() {
  const W = 1024, H = 500;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fg-bg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#0D1117"/><stop offset="50%" stop-color="#161B22"/><stop offset="100%" stop-color="#1A1A2E"/></linearGradient>
      <filter id="fg-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/></filter>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#fg-bg)"/>
    <rect x="80" y="100" width="50" height="50" rx="10" fill="#E94560" filter="url(#fg-shadow)"/><rect x="140" y="100" width="50" height="50" rx="10" fill="#F5C518" filter="url(#fg-shadow)"/><rect x="200" y="100" width="50" height="50" rx="10" fill="#58A6FF" filter="url(#fg-shadow)"/>
    <rect x="80" y="160" width="50" height="50" rx="10" fill="#3FB950" filter="url(#fg-shadow)"/><rect x="140" y="160" width="50" height="50" rx="10" fill="#FF9F43" filter="url(#fg-shadow)"/><rect x="200" y="160" width="50" height="50" rx="10" fill="#BC8CFF" filter="url(#fg-shadow)"/>
    <rect x="80" y="220" width="50" height="50" rx="10" fill="#FF6B6B" filter="url(#fg-shadow)"/><rect x="140" y="220" width="50" height="50" rx="10" fill="#56D4DD" filter="url(#fg-shadow)"/><rect x="200" y="220" width="50" height="50" rx="10" fill="#E94560" filter="url(#fg-shadow)"/>
    <text x="380" y="200" font-size="80" font-family="system-ui,-apple-system,sans-serif" font-weight="800" fill="#E94560">BLOCK CRUSH</text>
    <text x="380" y="260" font-size="28" font-family="system-ui,-apple-system,sans-serif" font-weight="400" fill="#8B949E">A daily puzzle game for sharp minds</text>
    <circle cx="400" cy="310" r="6" fill="#3FB950"/><text x="420" y="318" font-size="20" font-family="system-ui,sans-serif" font-weight="500" fill="#F0F6FC">Daily challenges - same puzzle for everyone</text>
    <circle cx="400" cy="350" r="6" fill="#3FB950"/><text x="420" y="358" font-size="20" font-family="system-ui,sans-serif" font-weight="500" fill="#F0F6FC">Power-ups and progression - depth without complexity</text>
    <circle cx="400" cy="390" r="6" fill="#3FB950"/><text x="420" y="398" font-size="20" font-family="system-ui,sans-serif" font-weight="500" fill="#F0F6FC">Rewarded ads - you choose, no forced interruptions</text>
    <rect x="710" y="160" width="200" height="60" rx="12" fill="#21262D" stroke="#30363D" stroke-width="2"/>
    <text x="760" y="198" font-size="14" fill="#8B949E" font-family="system-ui,sans-serif">GET IT ON</text>
    <text x="745" y="215" font-size="20" font-family="system-ui,sans-serif" font-weight="800" fill="#F0F6FC">Google Play</text>
  </svg>`;
}

fs.writeFileSync('/tmp/test-feature.svg', makeFeatureGraphic());
console.log('SVG written');

sharp(Buffer.from(makeFeatureGraphic())).resize(1024, 500).png().toBuffer()
  .then(buf => { fs.writeFileSync('store/images/feature-graphic-1024x500.png', buf); console.log('✅ feature-graphic OK'); })
  .catch(e => console.log('❌ ERROR:', e.message));
