// Line-art illustrations, one per chapter. Pure SVG, no image files.
// Paths with class="d" draw themselves in when they scroll into view.
// Turn rect and circle into paths so the draw-in effect works the same in every browser.
const toPaths = (svg) =>
  svg
    .replace(/<rect ([^>]*?)\/>/g, (m, a) => {
      const g = (k) => parseFloat((a.match(new RegExp(`\\b${k}="([\\d.-]+)"`)) || [])[1] || 0);
      const x = g('x'), y = g('y'), w = g('width'), h = g('height');
      const cls = (a.match(/class="([^"]*)"/) || [])[1] || '';
      return `<path class="${cls}" pathLength="1" d="M${x} ${y}h${w}v${h}h${-w}Z"/>`;
    })
    .replace(/<circle ([^>]*?)\/>/g, (m, a) => {
      const g = (k) => parseFloat((a.match(new RegExp(`\\b${k}="([\\d.-]+)"`)) || [])[1] || 0);
      const cx = g('cx'), cy = g('cy'), r = g('r');
      const cls = (a.match(/class="([^"]*)"/) || [])[1] || '';
      return `<path class="${cls}" pathLength="1" d="M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z"/>`;
    });
const wrap = (inner, label) => toPaths(
  `<svg class="art" viewBox="0 0 400 260" role="img" aria-label="${label}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`);

const windows = (x0, y0, cols, rows, w, h, gx, gy, lit) => {
  let s = '';
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const on = lit.includes(r * cols + c);
      s += `<rect class="${on ? 'lit' : 'd'}" pathLength="1" x="${x0 + c * (w + gx)}" y="${y0 + r * (h + gy)}" width="${w}" height="${h}" rx="1"/>`;
    }
  return s;
};

export const art = {
  dedication: wrap(
    `<path class="d" pathLength="1" d="M200 215 C 170 185 120 170 120 125 C 120 95 150 80 175 92 C 188 98 196 108 200 118 C 204 108 212 98 225 92 C 250 80 280 95 280 125 C 280 170 230 185 200 215 Z"/>
     <path class="d" pathLength="1" d="M60 230 H340"/>
     <circle class="lit" cx="200" cy="140" r="4"/>`,
    'A heart drawn in one line'
  ),
  note: wrap(
    `<rect class="d" pathLength="1" x="110" y="40" width="180" height="190" rx="4"/>
     <path class="d" pathLength="1" d="M135 80 H265 M135 105 H265 M135 130 H240 M135 155 H265 M135 180 H210"/>
     <path class="d" pathLength="1" d="M300 70 L330 40 L345 55 L315 85 Z"/>`,
    'A page of notes'
  ),
  before: wrap(
    `<path class="d" pathLength="1" d="M40 220 H360"/>
     <path class="d" pathLength="1" d="M200 220 V60"/>
     <circle class="d" pathLength="1" cx="200" cy="60" r="34"/>
     <path class="d" pathLength="1" d="M200 60 L200 38 M200 60 L216 70"/>
     <path class="d" pathLength="1" d="M90 220 C 120 170 160 150 200 150 C 240 150 280 170 310 220"/>
     <circle class="lit" cx="200" cy="60" r="3"/>`,
    'A clock above the horizon'
  ),
  s01: wrap(
    `<path class="d" pathLength="1" d="M90 230 V40 H250 V230"/>
     <path class="d" pathLength="1" d="M70 230 H330"/>
     ${windows(106, 56, 5, 7, 18, 14, 10, 10, [8, 17, 23, 31])}
     <path class="d" pathLength="1" d="M300 230 V150 L330 120"/>
     <path class="beam" d="M330 120 L250 70 L250 150 Z"/>`,
    'A hotel at night, a flashlight finding a lit window'
  ),
  s02: wrap(
    `${[[200, 70], [110, 120], [290, 120], [140, 205], [260, 205], [200, 140]]
      .map(([x, y], i) => `<circle class="${i === 5 ? 'lit-ring' : 'd'}" pathLength="1" cx="${x}" cy="${y}" r="${i === 5 ? 20 : 15}"/>`)
      .join('')}
     <path class="d" pathLength="1" d="M200 85 L200 120 M124 126 L181 136 M276 126 L219 136 M151 193 L187 155 M249 193 L213 155 M125 120 L185 75 M275 120 L215 75 M155 205 H245"/>`,
    'People connected to each other'
  ),
  s03: wrap(
    `<path class="d" pathLength="1" d="M60 220 H350 M60 220 V40"/>
     <path class="d" pathLength="1" d="M60 200 C 110 195 130 150 170 160 C 210 170 230 110 270 100 C 300 92 320 70 345 55"/>
     ${[100, 140, 180, 220, 260, 300]
       .map((x, i) => `<rect class="d" pathLength="1" x="${x}" y="${220 - (30 + i * 18)}" width="22" height="${30 + i * 18}"/>`)
       .join('')}
     <circle class="lit" cx="345" cy="55" r="5"/>`,
    'A rising line over a ledger'
  ),
  s04: wrap(
    `<circle class="d" pathLength="1" cx="200" cy="130" r="40"/>
     ${Array.from({ length: 8 }, (_, i) => {
       const a = (i * Math.PI) / 4;
       const x1 = 200 + Math.cos(a) * 40, y1 = 130 + Math.sin(a) * 40;
       const x2 = 200 + Math.cos(a) * 54, y2 = 130 + Math.sin(a) * 54;
       return `<path class="d" pathLength="1" d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}"/>`;
     }).join('')}
     <path class="d" pathLength="1" d="M95 130 A105 105 0 0 1 300 95"/>
     <path class="d" pathLength="1" d="M300 95 L304 72 M300 95 L278 88"/>
     <path class="d" pathLength="1" d="M305 165 A105 105 0 0 1 100 165"/>
     <path class="d" pathLength="1" d="M100 165 L96 188 M100 165 L122 172"/>
     <circle class="lit" cx="200" cy="130" r="8"/>`,
    'A gear inside a closed loop'
  ),
  s05: wrap(
    `<path class="d" pathLength="1" d="M40 140 H360"/>
     <path class="d" pathLength="1" d="M40 180 C 80 160 110 200 150 180 C 190 160 220 200 260 180 C 300 160 330 200 360 180"/>
     <path class="d" pathLength="1" d="M40 210 C 80 190 110 230 150 210 C 190 190 220 230 260 210 C 300 190 330 230 360 210"/>
     <path class="d" pathLength="1" d="M120 70 C 120 50 150 40 165 55 C 175 35 215 35 222 60 C 245 55 260 75 248 90 H125 C 110 90 108 72 120 70 Z"/>
     <path class="d" pathLength="1" d="M180 92 L168 118 H186 L174 140"/>
     <circle class="lit" cx="200" cy="140" r="4"/>`,
    'A storm over a steady horizon'
  ),
  s06: wrap(
    `<rect class="d" pathLength="1" x="150" y="40" width="100" height="180" rx="6"/>
     <path class="d" pathLength="1" d="M200 40 V220"/>
     <path class="d" pathLength="1" d="M130 230 H270"/>
     <path class="d" pathLength="1" d="M170 20 H230"/>
     ${[0, 1, 2, 3, 4].map((i) => `<circle class="${i === 4 ? 'lit' : 'd'}" pathLength="1" cx="${176 + i * 12}" cy="20" r="3"/>`).join('')}
     <path class="d" pathLength="1" d="M280 130 L300 110 L320 130 M300 110 V160"/>
     <path class="d" pathLength="1" d="M80 130 L100 150 L120 130 M100 150 V100"/>`,
    'An elevator, still going up'
  ),
};
