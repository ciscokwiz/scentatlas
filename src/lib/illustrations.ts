// Hand-built ingredient illustrations (SVG) for the most common notes, so every note shows
// a recognisable picture of the actual ingredient even before real photos are downloaded.
// Photos from public/images/manifest.json take priority (see images.ts).

type Svg = string

// ---------- helpers ----------
const n = (v: number) => Math.round(v * 10) / 10
function shade(hex: string, f: number) {
  // f < 0 darkens, f > 0 lightens
  const x = parseInt(hex.slice(1), 16)
  const ch = [(x >> 16) & 255, (x >> 8) & 255, x & 255].map((c) => Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f))
  return '#' + ch.map((c) => c.toString(16).padStart(2, '0')).join('')
}
const deg = (i: number, count: number, off = 0) => (360 / count) * i + off
const polar = (cx: number, cy: number, r: number, a: number): [number, number] => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)]
const shadow = (cx = 50, cy = 85, rx = 26) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="3.6" fill="#3a2e22" opacity=".12"/>`
const hl = (cx: number, cy: number, r: number) => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(r)}" ry="${n(r * 0.6)}" fill="#fff" opacity=".35" transform="rotate(-30 ${n(cx)} ${n(cy)})"/>`

function wrap(body: string, bg = '#F4EFE7'): Svg {
  // Content is drawn in a 100×100 box; scale it up a touch so it fills a round medallion.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><g transform="translate(50 52) scale(1.14) translate(-50 -52)">${body}</g></svg>`
}

// ---------- primitives ----------
function citrusSlice(rind: string, flesh: string, segs = 10, cx = 50, cy = 50, r = 33) {
  const pith = shade(flesh, 0.75)
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${rind}"/><circle cx="${cx}" cy="${cy}" r="${r - 3}" fill="${pith}"/>`
  for (let i = 0; i < segs; i++) {
    const a1 = deg(i, segs) + 3, a2 = deg(i + 1, segs) - 3
    const [x1, y1] = polar(cx, cy, r - 6, a1), [x2, y2] = polar(cx, cy, r - 6, a2)
    const [ix, iy] = polar(cx, cy, 3.5, (a1 + a2) / 2)
    s += `<path d="M${n(ix)} ${n(iy)} L${n(x1)} ${n(y1)} A${r - 6} ${r - 6} 0 0 1 ${n(x2)} ${n(y2)} Z" fill="${flesh}"/>`
    const [dx, dy] = polar(cx, cy, (r - 6) * 0.62, (a1 + a2) / 2)
    s += `<ellipse cx="${n(dx)}" cy="${n(dy)}" rx="1.4" ry="3" fill="${shade(flesh, 0.35)}" opacity=".7" transform="rotate(${n((a1 + a2) / 2 + 90)} ${n(dx)} ${n(dy)})"/>`
  }
  return s + `<circle cx="${cx}" cy="${cy}" r="2.4" fill="${pith}"/>`
}
const citrus = (rind: string, flesh: string, segs = 10) => wrap(shadow(50, 87, 28) + citrusSlice(rind, flesh, segs) + hl(38, 32, 9))
function wholeAndSlice(rind: string, flesh: string) {
  return wrap(shadow(50, 86, 34) + `<circle cx="36" cy="52" r="24" fill="${rind}"/>${hl(28, 42, 8)}<circle cx="27" cy="38" r="1" fill="${shade(rind, -0.25)}"/>` + citrusSlice(rind, flesh, 9, 64, 58, 20))
}

function fruit(color: string, opts: { shape?: 'round' | 'pear' | 'apple'; leaf?: boolean; crease?: boolean; stem?: boolean } = {}) {
  const { shape = 'round', leaf = true, crease = false, stem = true } = opts
  const dark = shade(color, -0.25)
  let body = ''
  if (shape === 'pear') body = `<path d="M50 24 C57 24 58 36 60 42 C70 50 72 64 66 74 C60 83 40 83 34 74 C28 64 30 50 40 42 C42 36 43 24 50 24Z" fill="${color}"/>`
  else if (shape === 'apple') body = `<path d="M50 34 C40 26 22 30 22 50 C22 68 36 82 46 80 C48 79 52 79 54 80 C64 82 78 68 78 50 C78 30 60 26 50 34Z" fill="${color}"/>`
  else body = `<circle cx="50" cy="54" r="28" fill="${color}"/>`
  const top = shape === 'pear' ? 24 : shape === 'apple' ? 34 : 27
  return wrap(
    shadow(50, 86, 28) + body +
      (crease ? `<path d="M50 ${top + 2} C44 44 44 66 50 80" stroke="${dark}" stroke-width="1.6" fill="none" opacity=".45"/>` : '') +
      hl(shape === 'pear' ? 42 : 38, shape === 'pear' ? 56 : 46, 9) +
      (stem ? `<path d="M50 ${top + 2} C50 ${top - 4} 52 ${top - 8} 55 ${top - 10}" stroke="#6b4a2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : '') +
      (leaf ? `<path d="M53 ${top - 4} C60 ${top - 16} 72 ${top - 14} 76 ${top - 10} C70 ${top - 2} 60 ${top - 1} 53 ${top - 4}Z" fill="#7d9460"/><path d="M54 ${top - 4} L73 ${top - 10}" stroke="#5f7748" stroke-width=".8"/>` : ''),
  )
}

function berries(color: string, count = 7, r = 9, leaf = true) {
  const all: [number, number][] = [[50, 52], [36, 46], [64, 46], [42, 64], [58, 64], [50, 36], [30, 60], [70, 60], [50, 72]]
  const pts = all.slice(0, count)
  let s = shadow(50, 84, 26)
  if (leaf) s += `<path d="M50 30 C42 16 30 18 26 22 C32 30 42 32 50 30Z" fill="#7d9460"/><path d="M50 30 C58 16 70 18 74 22 C68 30 58 32 50 30Z" fill="#6f8756"/>`
  for (const [x, y] of pts) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.28}" fill="#fff" opacity=".4"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${shade(color, -0.3)}" stroke-width=".8" opacity=".5"/>`
  return wrap(s)
}

function drupelets(color: string) {
  // raspberry / blackberry: dome of small beads
  let s = shadow(50, 84, 22) + `<path d="M34 34 C40 26 60 26 66 34 C60 30 40 30 34 34Z" fill="#6f8756"/>`
  for (let row = 0; row < 5; row++) {
    const y = 38 + row * 9, count = row === 0 ? 4 : row === 4 ? 3 : 5
    for (let i = 0; i < count; i++) {
      const x = 50 + (i - (count - 1) / 2) * 8.5
      s += `<circle cx="${n(x)}" cy="${y}" r="5.2" fill="${color}"/><circle cx="${n(x - 1.6)}" cy="${y - 1.6}" r="1.4" fill="#fff" opacity=".45"/>`
    }
  }
  return wrap(s)
}

function petalPath(cx: number, cy: number, len: number, w: number, a: number, shape: 'round' | 'pointed' | 'long' | 'heart') {
  let d = ''
  if (shape === 'round') d = `M${cx} ${cy} C${cx - w} ${cy - len * 0.3} ${cx - w} ${cy - len} ${cx} ${cy - len} C${cx + w} ${cy - len} ${cx + w} ${cy - len * 0.3} ${cx} ${cy}Z`
  else if (shape === 'heart') d = `M${cx} ${cy} C${cx - w} ${cy - len * 0.4} ${cx - w * 1.1} ${cy - len * 1.05} ${cx - w * 0.3} ${cy - len} L${cx} ${cy - len * 0.88} L${cx + w * 0.3} ${cy - len} C${cx + w * 1.1} ${cy - len * 1.05} ${cx + w} ${cy - len * 0.4} ${cx} ${cy}Z`
  else if (shape === 'long') d = `M${cx} ${cy} C${cx - w * 0.6} ${cy - len * 0.4} ${cx - w * 0.3} ${cy - len * 0.9} ${cx} ${cy - len} C${cx + w * 0.3} ${cy - len * 0.9} ${cx + w * 0.6} ${cy - len * 0.4} ${cx} ${cy}Z`
  else d = `M${cx} ${cy} Q${cx - w} ${cy - len * 0.55} ${cx} ${cy - len} Q${cx + w} ${cy - len * 0.55} ${cx} ${cy}Z`
  return `transform="rotate(${n(a)} ${cx} ${cy})" d="${d}"`
}

function flowerHead(cx: number, cy: number, o: { petals: number; len: number; w: number; color: string; center: string; shape?: 'round' | 'pointed' | 'long' | 'heart'; layers?: number; off?: number; centerR?: number; stamens?: boolean }) {
  const { petals, len, w, color, center, shape = 'round', layers = 1, off = 0, centerR = 4, stamens = false } = o
  let s = ''
  for (let L = layers - 1; L >= 0; L--) {
    const scale = 1 - L * 0.28
    const c = L === 0 ? color : shade(color, -0.08 * L)
    for (let i = 0; i < petals; i++) s += `<path ${petalPath(cx, cy, len * scale, w * scale, deg(i, petals, off + L * (180 / petals)), shape)} fill="${c}" stroke="${shade(color, -0.22)}" stroke-width=".6"/>`
  }
  if (stamens) for (let i = 0; i < 6; i++) {
    const [x, y] = polar(cx, cy, centerR + 5, deg(i, 6, 15))
    s += `<line x1="${cx}" y1="${cy}" x2="${n(x)}" y2="${n(y)}" stroke="${shade(center, -0.2)}" stroke-width=".8"/><circle cx="${n(x)}" cy="${n(y)}" r="1.3" fill="${center}"/>`
  }
  return s + `<circle cx="${cx}" cy="${cy}" r="${centerR}" fill="${center}"/>`
}
const leafAt = (x: number, y: number, a: number, len = 18, color = '#7d9460') =>
  `<path transform="rotate(${a} ${x} ${y})" d="M${x} ${y} C${x - 6} ${y - len * 0.4} ${x - 4} ${y - len * 0.9} ${x} ${y - len} C${x + 4} ${y - len * 0.9} ${x + 6} ${y - len * 0.4} ${x} ${y}Z" fill="${color}"/><path transform="rotate(${a} ${x} ${y})" d="M${x} ${y} L${x} ${y - len * 0.9}" stroke="${shade(color, -0.2)}" stroke-width=".7"/>`

const flower = (o: Parameters<typeof flowerHead>[2], leaves = true) =>
  wrap(shadow(50, 88, 22) + (leaves ? leafAt(36, 70, -130, 22) + leafAt(64, 70, 130, 22) : '') + flowerHead(50, 50, o))

function cluster(o: Parameters<typeof flowerHead>[2], positions: [number, number, number][], stem = '#7d9460') {
  let s = shadow(50, 88, 22) + `<path d="M50 88 C50 74 48 66 50 56" stroke="${stem}" stroke-width="2" fill="none"/>` + leafAt(50, 80, -55, 20) + leafAt(50, 78, 60, 18)
  for (const [x, y, k] of positions) s += flowerHead(x, y, { ...o, len: o.len * k, w: o.w * k, centerR: (o.centerR ?? 3) * k })
  return wrap(s)
}

function rose(color: string) {
  const d = shade(color, -0.22)
  let s = shadow(50, 86, 24) + leafAt(30, 72, -120, 22) + leafAt(70, 72, 120, 22)
  s += `<circle cx="50" cy="50" r="27" fill="${color}"/>`
  for (let i = 0; i < 5; i++) s += `<path ${petalPath(50, 50, 28, 17, deg(i, 5, 18), 'round')} fill="${shade(color, -0.05)}" stroke="${d}" stroke-width=".7"/>`
  s += `<circle cx="50" cy="50" r="17" fill="${color}" stroke="${d}" stroke-width=".7"/>`
  s += `<path d="M50 50 m-12 0 a12 12 0 1 1 12 12 a9 9 0 1 1 -9 -9 a6 6 0 1 1 6 6 a3 3 0 1 1 -3 -3" fill="none" stroke="${d}" stroke-width="1.4" stroke-linecap="round"/>`
  return wrap(s + hl(42, 40, 6))
}

function bells(color = '#FBF8F0') {
  let s = shadow(50, 88, 20) + `<path d="M30 86 C34 60 44 40 70 26" stroke="#6f8756" stroke-width="2" fill="none"/>` + `<path d="M26 88 C14 60 24 34 36 22 C38 44 36 66 26 88Z" fill="#7d9460"/>`
  const pts: [number, number][] = [[38, 56], [46, 46], [55, 39], [64, 33]]
  for (const [x, y] of pts) s += `<path d="M${x} ${y} l0 5" stroke="#6f8756" stroke-width="1"/><path d="M${x - 5} ${y + 13} C${x - 6} ${y + 6} ${x - 4} ${y + 4} ${x} ${y + 4} C${x + 4} ${y + 4} ${x + 6} ${y + 6} ${x + 5} ${y + 13} l-2 -1.5 l-1.5 1.5 l-1.5 -1.5 l-1.5 1.5 l-1.5 -1.5 l-1.5 1.5Z" fill="${color}" stroke="#c9c2b2" stroke-width=".6"/>`
  return wrap(s)
}

function spike(color: string, stems = 3) {
  let s = shadow(50, 88, 18)
  for (let k = 0; k < stems; k++) {
    const x = 40 + k * 10, tilt = (k - (stems - 1) / 2) * 6
    s += `<g transform="rotate(${tilt} ${x} 88)"><path d="M${x} 88 L${x} 22" stroke="#7d8a66" stroke-width="1.6"/>`
    for (let i = 0; i < 9; i++) {
      const y = 24 + i * 4.6
      s += `<ellipse cx="${x - 2.6}" cy="${y}" rx="2.6" ry="3.4" fill="${shade(color, (i % 2) * 0.1)}"/><ellipse cx="${x + 2.6}" cy="${y + 2}" rx="2.6" ry="3.4" fill="${shade(color, -0.08)}"/>`
    }
    s += `</g>`
  }
  return wrap(s)
}

function puffs(color: string) {
  let s = shadow(50, 88, 24) + `<path d="M50 88 C50 70 46 56 40 44 M50 70 C56 58 62 50 70 44" stroke="#6f8756" stroke-width="1.6" fill="none"/>`
  for (let i = 0; i < 9; i++) s += leafAt(44 + (i % 3) * 3, 84 - i * 2, (i % 2 ? 1 : -1) * (40 + i * 8), 12, '#8a9a70')
  const pts = [[40, 40], [32, 50], [48, 32], [70, 40], [62, 32], [76, 50], [56, 44], [44, 52], [66, 54]]
  for (const [x, y] of pts) {
    s += `<circle cx="${x}" cy="${y}" r="6" fill="${color}"/>`
    for (let i = 0; i < 8; i++) {
      const [px, py] = polar(x, y, 5.5, deg(i, 8))
      s += `<circle cx="${n(px)}" cy="${n(py)}" r="1.4" fill="${shade(color, 0.25)}"/>`
    }
  }
  return wrap(s)
}

function sprig(color: string, shape: 'oval' | 'needle' | 'round' | 'serrated' = 'oval', pairs = 4) {
  let s = shadow(50, 88, 18) + `<path d="M50 88 C50 70 50 40 50 18" stroke="${shade(color, -0.25)}" stroke-width="1.8" fill="none"/>`
  for (let i = 0; i < pairs; i++) {
    const y = 76 - i * (56 / pairs), len = shape === 'needle' ? 12 : 18 - i * 1.5
    const w = shape === 'needle' ? 1.2 : shape === 'round' ? 7 : 5
    for (const side of [-1, 1]) {
      const a = side * (shape === 'needle' ? 60 : 50)
      if (shape === 'needle') for (let j = 0; j < 3; j++) s += `<path ${petalPath(50, y - j * 4, len, w, a + side * j * 6, 'long')} fill="${shade(color, j * 0.06)}"/>`
      else s += `<path ${petalPath(50, y, len, w, a, 'round')} fill="${color}" stroke="${shade(color, -0.2)}" stroke-width="${shape === 'serrated' ? 1.2 : 0.6}" stroke-dasharray="${shape === 'serrated' ? '1.6 1' : 'none'}"/>`
    }
  }
  if (shape !== 'needle') s += `<path ${petalPath(50, 22, 14, 5, 0, 'round')} fill="${shade(color, 0.08)}"/>`
  return wrap(s)
}

function bigLeaves(color: string, veins = true) {
  let s = shadow(50, 88, 26)
  for (const [x, y, a, len] of [[50, 86, -38, 54], [50, 86, 36, 50], [50, 88, 0, 62]] as const) {
    s += `<path transform="rotate(${a} ${x} ${y})" d="M${x} ${y} C${x - 18} ${y - len * 0.35} ${x - 14} ${y - len * 0.85} ${x} ${y - len} C${x + 14} ${y - len * 0.85} ${x + 18} ${y - len * 0.35} ${x} ${y}Z" fill="${a === 0 ? color : shade(color, -0.1)}"/>`
    if (veins) {
      s += `<path transform="rotate(${a} ${x} ${y})" d="M${x} ${y} L${x} ${y - len * 0.95}" stroke="${shade(color, -0.3)}" stroke-width=".9"/>`
      for (let i = 1; i < 5; i++) s += `<path transform="rotate(${a} ${x} ${y})" d="M${x} ${y - len * i * 0.18} l-8 -7 M${x} ${y - len * i * 0.18} l8 -7" stroke="${shade(color, -0.3)}" stroke-width=".6"/>`
    }
  }
  return wrap(s)
}

function logRings(bark: string, wood: string) {
  const ring = shade(wood, -0.18)
  let s = shadow(50, 86, 30) + `<path d="M18 50 L18 66 C18 80 82 80 82 66 L82 50" fill="${bark}"/>` + `<ellipse cx="50" cy="50" rx="32" ry="20" fill="${shade(bark, 0.1)}"/><ellipse cx="50" cy="50" rx="29" ry="17.5" fill="${wood}"/>`
  for (let i = 1; i <= 4; i++) s += `<ellipse cx="${50 + i * 0.6}" cy="50" rx="${29 - i * 6}" ry="${17.5 - i * 3.6}" fill="none" stroke="${ring}" stroke-width=".9"/>`
  s += `<path d="M50 50 L64 44" stroke="${shade(wood, -0.3)}" stroke-width="1"/>`
  for (let i = 0; i < 6; i++) s += `<path d="M${24 + i * 10} 62 l0 10" stroke="${shade(bark, -0.25)}" stroke-width="1" opacity=".6"/>`
  return wrap(s)
}

function chips(color: string) {
  let s = shadow(50, 84, 28)
  const pcs = [[34, 56, -20], [56, 50, 15], [46, 66, 40], [66, 64, -35], [40, 42, 60]] as const
  for (const [x, y, a] of pcs) s += `<g transform="rotate(${a} ${x} ${y})"><rect x="${x - 11}" y="${y - 4}" width="22" height="8" rx="1.5" fill="${color}"/><path d="M${x - 9} ${y - 1} L${x + 9} ${y - 2} M${x - 9} ${y + 2} L${x + 8} ${y + 1.5}" stroke="${shade(color, -0.35)}" stroke-width=".7"/></g>`
  return wrap(s)
}

function pods(color: string, count = 5, ridge = true) {
  let s = shadow(50, 84, 26)
  const ps = [[36, 50, -30], [52, 44, 10], [64, 56, 40], [44, 64, -60], [58, 68, 75], [30, 66, 20]].slice(0, count) as [number, number, number][]
  for (const [x, y, a] of ps) {
    s += `<g transform="rotate(${a} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="6.5" ry="11" fill="${color}"/>${ridge ? `<path d="M${x} ${y - 10} C${x - 2} ${y - 3} ${x - 2} ${y + 3} ${x} ${y + 10}" stroke="${shade(color, -0.3)}" stroke-width=".9" fill="none"/><path d="M${x + 3} ${y - 8} C${x + 4} ${y - 2} ${x + 4} ${y + 2} ${x + 3} ${y + 8}" stroke="${shade(color, -0.2)}" stroke-width=".6" fill="none"/>` : ''}<ellipse cx="${x - 2.5}" cy="${y - 4}" rx="1.6" ry="4" fill="#fff" opacity=".3"/><path d="M${x} ${y - 11} l0 -3" stroke="${shade(color, -0.35)}" stroke-width="1.4"/></g>`
  }
  return wrap(s)
}

function corns(color: string, count = 14, r = 4.6) {
  let s = shadow(50, 82, 26)
  for (let i = 0; i < count; i++) {
    const a = i * 137.5, rad = 4 + Math.sqrt(i) * 6.2
    const [x, y] = polar(50, 58, rad, a)
    s += `<circle cx="${n(x)}" cy="${n(y * 0.9 + 4)}" r="${r}" fill="${shade(color, (i % 3) * 0.06)}"/><path d="M${n(x - r * 0.6)} ${n(y * 0.9 + 4)} q${r * 0.6} -${r * 0.5} ${r * 1.2} 0" stroke="${shade(color, -0.35)}" stroke-width=".6" fill="none"/><circle cx="${n(x - r * 0.35)}" cy="${n(y * 0.9 + 4 - r * 0.35)}" r="${n(r * 0.28)}" fill="#fff" opacity=".35"/>`
  }
  return wrap(s)
}

function sticks(color: string) {
  let s = shadow(50, 82, 30)
  for (const [y, a] of [[46, -12], [56, -4], [64, 6]] as const) {
    s += `<g transform="rotate(${a} 50 ${y})"><rect x="16" y="${y - 5}" width="66" height="10" rx="2" fill="${color}"/><path d="M18 ${y - 2} L80 ${y - 2.5}" stroke="${shade(color, -0.25)}" stroke-width=".8"/><path d="M18 ${y + 2} L80 ${y + 2.5}" stroke="${shade(color, 0.2)}" stroke-width=".6"/><ellipse cx="82" cy="${y}" rx="3" ry="5" fill="${shade(color, -0.15)}"/><path d="M82 ${y} m-1.5 0 a1.5 2.6 0 1 1 1.5 2.6 a2.4 3.6 0 1 1 -2 -4" stroke="${shade(color, -0.4)}" stroke-width=".7" fill="none"/></g>`
  }
  return wrap(s)
}

function starAnise(color: string) {
  let s = shadow(50, 84, 26)
  for (let i = 0; i < 8; i++) {
    const a = deg(i, 8, -90)
    s += `<path ${petalPath(50, 52, 28, 7, a + 90, 'pointed')} fill="${color}" stroke="${shade(color, -0.3)}" stroke-width=".8"/>`
    const [x, y] = polar(50, 52, 15, a)
    s += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="2.4" ry="3.6" fill="#c69a5a" transform="rotate(${n(a + 90)} ${n(x)} ${n(y)})"/>`
  }
  return wrap(s + `<circle cx="50" cy="52" r="3.4" fill="${shade(color, -0.2)}"/>`)
}

function threads(color: string) {
  let s = shadow(50, 80, 24)
  for (let i = 0; i < 14; i++) {
    const x = 30 + ((i * 37) % 40), y = 50 + ((i * 23) % 22), a = (i * 53) % 180
    s += `<path transform="rotate(${a} ${x} ${y})" d="M${x - 12} ${y} C${x - 4} ${y - 3} ${x + 4} ${y + 3} ${x + 12} ${y - 1}" stroke="${i % 3 ? color : shade(color, 0.25)}" stroke-width="2" fill="none" stroke-linecap="round"/><circle transform="rotate(${a} ${x} ${y})" cx="${x + 12}" cy="${y - 1}" r="1.6" fill="#e0a43a"/>`
  }
  return wrap(s)
}

function root(color: string) {
  const d = shade(color, -0.25)
  return wrap(
    shadow(50, 82, 30) +
      `<path d="M20 58 C18 46 30 42 38 46 C40 34 54 32 58 42 C66 36 80 42 78 54 C86 58 82 72 70 70 C62 78 48 76 44 70 C34 76 20 70 20 58Z" fill="${color}" stroke="${d}" stroke-width="1"/>` +
      `<path d="M30 56 q4 -2 8 0 M50 50 q4 -2 8 0 M62 62 q4 -2 8 0 M40 64 q3 -2 6 0" stroke="${d}" stroke-width=".9" fill="none"/>` +
      `<ellipse cx="72" cy="60" rx="6" ry="5" fill="${shade(color, 0.45)}" stroke="${d}" stroke-width=".8"/>` +
      hl(40, 48, 6),
  )
}

function beans(color: string, kind: 'coffee' | 'tonka' | 'almond' | 'cacao') {
  let s = shadow(50, 82, 28)
  const ps = [[36, 54, -30], [56, 46, 20], [62, 64, 70], [42, 68, -70]] as const
  for (const [x, y, a] of ps) {
    if (kind === 'coffee') s += `<g transform="rotate(${a} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="8.5" ry="11.5" fill="${color}"/><path d="M${x} ${y - 10} C${x - 4} ${y - 4} ${x + 4} ${y + 4} ${x} ${y + 10}" stroke="${shade(color, -0.45)}" stroke-width="1.6" fill="none"/>${hl(x - 3, y - 4, 2.6)}</g>`
    else if (kind === 'tonka') s += `<g transform="rotate(${a} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="5.5" ry="13" fill="${color}"/><path d="M${x - 3} ${y - 8} q3 2 5 0 M${x - 3} ${y - 2} q3 2 6 -1 M${x - 3} ${y + 4} q3 2 5 0 M${x - 2} ${y + 9} q2 1 4 0" stroke="${shade(color, -0.4)}" stroke-width=".8" fill="none"/></g>`
    else if (kind === 'almond') s += `<g transform="rotate(${a} ${x} ${y})"><path d="M${x} ${y - 13} C${x + 9} ${y - 6} ${x + 9} ${y + 8} ${x} ${y + 11} C${x - 9} ${y + 8} ${x - 9} ${y - 6} ${x} ${y - 13}Z" fill="${color}"/><path d="M${x - 3} ${y - 6} l1 3 M${x + 2} ${y - 3} l1 3 M${x - 2} ${y + 2} l1 3 M${x + 3} ${y + 4} l-1 3" stroke="${shade(color, -0.3)}" stroke-width=".8"/>${hl(x - 2, y - 5, 2.6)}</g>`
  }
  if (kind === 'cacao') {
    s += `<rect x="22" y="34" width="56" height="40" rx="3" fill="${color}"/>`
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) s += `<rect x="${25 + i * 18}" y="${37 + j * 18.5}" width="15" height="15.5" rx="1.5" fill="${shade(color, 0.08)}" stroke="${shade(color, -0.3)}" stroke-width=".8"/><path d="M${26 + i * 18} ${38 + j * 18.5} l13 0" stroke="#fff" stroke-width=".8" opacity=".25"/>`
  }
  return wrap(s)
}

function vanilla() {
  let s = shadow(50, 84, 30)
  for (const [y, a] of [[52, -18], [58, -10], [64, -2]] as const) s += `<g transform="rotate(${a} 50 ${y})"><path d="M16 ${y} C30 ${y - 3} 70 ${y - 3} 86 ${y + 1} C70 ${y + 4} 30 ${y + 4} 16 ${y}Z" fill="#3d2a1e"/><path d="M20 ${y} C40 ${y - 1} 60 ${y - 1} 82 ${y + 0.5}" stroke="#6a4a33" stroke-width=".7"/></g>`
  s += flowerHead(66, 30, { petals: 5, len: 13, w: 7, color: '#F3E7C4', center: '#E2C46B', shape: 'round', centerR: 3.2 }) + leafAt(56, 40, -60, 14)
  return wrap(s)
}

function chunks(color: string, translucent = true) {
  let s = shadow(50, 84, 28)
  const shapes = [
    'M28 64 L34 46 L48 42 L54 56 L46 70 L32 72Z',
    'M50 58 L58 38 L72 40 L78 56 L68 70 L54 70Z',
    'M40 46 L46 32 L58 30 L60 42 L50 50Z',
  ]
  shapes.forEach((d, i) => {
    s += `<path d="${d}" fill="${shade(color, i * 0.08)}" opacity="${translucent ? 0.92 : 1}" stroke="${shade(color, -0.25)}" stroke-width=".9"/>`
  })
  s += `<path d="M34 50 L44 46 M60 44 L70 46 M46 36 L54 34" stroke="#fff" stroke-width="1.6" opacity=".5" stroke-linecap="round"/>`
  return wrap(s)
}

function tears(color: string) {
  let s = shadow(50, 82, 26)
  const ps = [[34, 58, 7], [52, 50, 9], [66, 62, 6.5], [44, 70, 6], [60, 40, 5.5], [28, 44, 5]] as const
  for (const [x, y, r] of ps) s += `<path d="M${x} ${y - r * 1.5} C${x + r} ${y - r * 0.4} ${x + r} ${y + r} ${x} ${y + r} C${x - r} ${y + r} ${x - r} ${y - r * 0.4} ${x} ${y - r * 1.5}Z" fill="${color}" opacity=".95"/>${hl(x - r * 0.3, y - r * 0.1, r * 0.35)}`
  return wrap(s)
}

function incense() {
  return wrap(
    shadow(50, 86, 20) +
      `<path d="M30 84 L64 30" stroke="#5a3b28" stroke-width="2.6" stroke-linecap="round"/><path d="M38 72 L62 33" stroke="#8a5a3c" stroke-width="3.6" stroke-linecap="round"/><circle cx="64" cy="30" r="1.8" fill="#e07a3a"/>` +
      `<path d="M64 28 C58 22 70 18 64 12 C58 6 68 2 66 -2" stroke="#9b938a" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/><path d="M66 26 C74 20 66 14 74 8" stroke="#b9b2a8" stroke-width="1.4" fill="none" opacity=".6" stroke-linecap="round"/>`,
  )
}

function cloud(color: string) {
  return wrap(
    `<g opacity=".95"><circle cx="38" cy="56" r="16" fill="${color}"/><circle cx="56" cy="46" r="20" fill="${color}"/><circle cx="68" cy="60" r="14" fill="${color}"/><rect x="30" y="56" width="44" height="16" rx="8" fill="${color}"/></g>` +
      `<circle cx="50" cy="40" r="8" fill="#fff" opacity=".45"/><circle cx="36" cy="52" r="5" fill="#fff" opacity=".35"/>` +
      `<circle cx="22" cy="30" r="2" fill="${color}"/><circle cx="80" cy="34" r="2.6" fill="${color}"/><circle cx="76" cy="80" r="1.8" fill="${color}"/>`,
  )
}

function leather(color: string) {
  return wrap(
    shadow(50, 84, 30) +
      `<path d="M20 34 C34 28 66 28 80 34 C84 50 84 62 80 74 C66 80 34 80 20 74 C16 62 16 46 20 34Z" fill="${color}"/>` +
      `<path d="M25 38 C38 33 62 33 75 38 C78 50 78 60 75 70 C62 75 38 75 25 70 C22 60 22 48 25 38Z" fill="none" stroke="${shade(color, 0.35)}" stroke-width="1.2" stroke-dasharray="3 2.2"/>` +
      `<path d="M30 48 q10 -4 18 2 M52 62 q10 -6 18 0" stroke="${shade(color, -0.3)}" stroke-width=".8" fill="none" opacity=".6"/>` + hl(34, 42, 7),
  )
}

function driedLeaf(color: string) {
  return wrap(
    shadow(50, 86, 28) +
      `<path d="M20 78 C24 50 44 26 80 20 C78 54 58 76 20 78Z" fill="${color}"/><path d="M20 78 C40 60 58 42 78 22" stroke="${shade(color, -0.3)}" stroke-width="1.2" fill="none"/>` +
      [0.25, 0.42, 0.58, 0.74].map((t) => { const x = 20 + 58 * t, y = 78 - 56 * t; return `<path d="M${n(x)} ${n(y)} l-${n(10 - t * 6)} -${n(4 + t * 2)} M${n(x)} ${n(y)} l${n(4 + t * 2)} ${n(10 - t * 6)}" stroke="${shade(color, -0.3)}" stroke-width=".7"/>` }).join('') +
      `<path d="M30 72 C40 70 46 64 50 60" stroke="${shade(color, 0.25)}" stroke-width="1" fill="none" opacity=".6"/>`,
  )
}

function waves(color: string) {
  let s = ''
  for (let i = 0; i < 4; i++) {
    const y = 34 + i * 12
    s += `<path d="M10 ${y} C20 ${y - 7} 30 ${y - 7} 40 ${y} C50 ${y + 7} 60 ${y + 7} 70 ${y} C80 ${y - 7} 90 ${y - 7} 100 ${y} L100 100 L10 100Z" fill="${shade(color, i * 0.12)}" opacity=".9"/>`
  }
  return wrap(s + `<circle cx="74" cy="22" r="7" fill="#f2d9a6" opacity=".9"/>`, '#EEF1EE')
}

function droplet(color: string) {
  return wrap(
    shadow(50, 86, 18) + `<path d="M50 16 C62 36 74 48 74 62 C74 76 63 84 50 84 C37 84 26 76 26 62 C26 48 38 36 50 16Z" fill="${color}" opacity=".85"/>` + hl(40, 56, 7) +
      `<path d="M40 70 C42 76 48 78 54 77" stroke="#fff" stroke-width="2" fill="none" opacity=".5" stroke-linecap="round"/>`,
    '#EEF1EE',
  )
}

function moss() {
  let s = shadow(50, 84, 32) + `<path d="M16 76 C18 60 34 52 50 54 C66 52 82 60 84 76Z" fill="#8a8476"/>`
  for (let i = 0; i < 26; i++) {
    const x = 20 + ((i * 29) % 62), y = 56 + ((i * 17) % 16)
    s += `<circle cx="${x}" cy="${y}" r="${3 + (i % 3)}" fill="${['#7f8a62', '#93a072', '#6d7853', '#a3ad86'][i % 4]}"/>`
  }
  return wrap(s)
}

function grassRoots(color: string) {
  let s = shadow(50, 86, 22) + `<rect x="42" y="40" width="16" height="7" rx="2" fill="#a07e5a"/>`
  for (let i = 0; i < 9; i++) s += `<path d="M${44 + i * 1.5} 40 C${40 + i * 2} 28 ${30 + i * 5} 18 ${26 + i * 6} 12" stroke="#8a9a62" stroke-width="1.6" fill="none"/>`
  for (let i = 0; i < 11; i++) s += `<path d="M${43 + i * 1.4} 47 C${42 + i * 1.6} 60 ${36 + i * 3} 72 ${32 + i * 3.6} 84" stroke="${shade(color, (i % 3) * 0.1)}" stroke-width="1.3" fill="none"/>`
  return wrap(s)
}

function coconut() {
  return wrap(
    shadow(50, 84, 30) + `<path d="M18 56 A32 26 0 0 0 82 56Z" fill="#6b4a33"/><path d="M22 56 A28 22 0 0 0 78 56Z" fill="#F7F3EA"/><ellipse cx="50" cy="56" rx="32" ry="7" fill="#6b4a33"/><ellipse cx="50" cy="56" rx="28" ry="5" fill="#EFE8DA"/>` +
      `<circle cx="70" cy="34" r="16" fill="#6b4a33"/><circle cx="66" cy="30" r="1.8" fill="#3f2a1d"/><circle cx="72" cy="30" r="1.8" fill="#3f2a1d"/><circle cx="69" cy="35" r="1.8" fill="#3f2a1d"/>`,
  )
}

function pineapple() {
  let s = shadow(50, 88, 22)
  for (let i = 0; i < 7; i++) s += leafAt(50, 34, -45 + i * 15, 22 - Math.abs(i - 3) * 2, i % 2 ? '#6f8756' : '#86a06a')
  s += `<ellipse cx="50" cy="60" rx="20" ry="26" fill="#d9a441"/>`
  for (let i = -3; i <= 3; i++) s += `<path d="M${50 + i * 8 - 20} 36 L${50 + i * 8 + 20} 86" stroke="#a87a2c" stroke-width=".9" opacity=".7"/><path d="M${50 + i * 8 + 20} 36 L${50 + i * 8 - 20} 86" stroke="#a87a2c" stroke-width=".9" opacity=".7"/>`
  return wrap(s.replace(`<ellipse cx="50" cy="60" rx="20" ry="26" fill="#d9a441"/>`, `<clipPath id="p"><ellipse cx="50" cy="60" rx="20" ry="26"/></clipPath><ellipse cx="50" cy="60" rx="20" ry="26" fill="#d9a441"/><g clip-path="url(#p)">`) + `</g>`)
}

function strawberry() {
  let s = shadow(50, 86, 20) + `<path d="M50 84 C30 70 24 50 30 40 C36 32 64 32 70 40 C76 50 70 70 50 84Z" fill="#c2453f"/>`
  for (let i = 0; i < 14; i++) s += `<ellipse cx="${34 + ((i * 13) % 32)}" cy="${44 + ((i * 7) % 30)}" rx=".9" ry="1.5" fill="#f2d27a"/>`
  for (let i = 0; i < 5; i++) s += `<path ${petalPath(50, 36, 12, 4, deg(i, 5, 180) - 90, 'pointed')} fill="#6f8756"/>`
  return wrap(s + hl(40, 46, 5))
}

function cherries() {
  return wrap(
    shadow(50, 86, 24) + `<path d="M36 60 C40 40 50 26 58 18 M64 58 C62 40 60 28 58 18" stroke="#6b4a2e" stroke-width="2" fill="none"/>` + leafAt(58, 20, 60, 18) +
      `<circle cx="36" cy="64" r="13" fill="#8e2b33"/><circle cx="64" cy="62" r="13" fill="#9d3038"/>` + hl(31, 59, 4) + hl(59, 57, 4),
  )
}

function fig() {
  return wrap(
    shadow(50, 86, 22) + `<path d="M50 22 C56 34 74 46 74 62 C74 76 62 84 50 84 C38 84 26 76 26 62 C26 46 44 34 50 22Z" fill="#6e4a6a"/>` +
      `<path d="M50 22 l0 -6" stroke="#6b5a2e" stroke-width="2.4"/>` + hl(40, 54, 6) +
      `<ellipse cx="70" cy="72" rx="12" ry="9" fill="#d98a8a" stroke="#6e4a6a" stroke-width="2.4"/><circle cx="68" cy="72" r="1" fill="#f6e3b0"/><circle cx="72" cy="70" r="1" fill="#f6e3b0"/><circle cx="71" cy="75" r="1" fill="#f6e3b0"/>`,
  )
}

function melonSlice() {
  return wrap(shadow(50, 84, 30) + `<path d="M14 50 A36 30 0 0 0 86 50Z" fill="#8aa06a"/><path d="M18 50 A32 26 0 0 0 82 50Z" fill="#f0e2a8"/><path d="M24 50 A26 20 0 0 0 76 50Z" fill="#e9a565"/>` + [30, 40, 50, 60, 70].map((x) => `<ellipse cx="${x}" cy="54" rx="1.2" ry="2.2" fill="#f7eedb"/>`).join(''))
}

function teacup() {
  return wrap(
    shadow(50, 86, 28) + `<path d="M24 50 L76 50 C76 70 66 80 50 80 C34 80 24 70 24 50Z" fill="#f4f0e8" stroke="#cfc6b6" stroke-width="1"/><ellipse cx="50" cy="50" rx="26" ry="5" fill="#b9874a"/>` +
      `<path d="M76 56 C86 56 86 68 74 68" stroke="#cfc6b6" stroke-width="3" fill="none"/>` + leafAt(32, 34, -50, 16, '#6f8756') + leafAt(40, 30, -20, 16, '#7d9460') +
      `<path d="M50 44 C46 38 54 34 50 26" stroke="#b9b2a8" stroke-width="1.4" fill="none" opacity=".6"/>`,
  )
}

function honey() {
  let s = ''
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    const x = 18 + i * 13 + (j % 2) * 6.5, y = 22 + j * 11
    s += `<path d="M${x} ${y - 6} l5.6 3.2 0 6.4 -5.6 3.2 -5.6 -3.2 0 -6.4Z" fill="${(i + j) % 3 ? '#e2a63c' : '#efc15e'}" stroke="#b9802a" stroke-width=".8" opacity=".9"/>`
  }
  return wrap(s + shadow(50, 88, 18) + `<path d="M50 52 C58 64 64 70 64 76 C64 84 57 88 50 88 C43 88 36 84 36 76 C36 70 42 64 50 52Z" fill="#d99a2b"/>` + hl(44, 74, 4))
}

function caramel() {
  let s = shadow(50, 84, 28)
  for (const [x, y, a] of [[36, 58, -12], [60, 52, 14], [50, 70, 4]] as const) s += `<g transform="rotate(${a} ${x} ${y})"><rect x="${x - 11}" y="${y - 9}" width="22" height="18" rx="4" fill="#b8762f"/><rect x="${x - 11}" y="${y - 9}" width="22" height="7" rx="3" fill="#cf9046"/>${hl(x - 5, y - 5, 3)}</g>`
  return wrap(s + `<path d="M58 28 C58 36 62 40 62 46" stroke="#c98a3e" stroke-width="3" stroke-linecap="round" fill="none"/>`)
}

function bouquet(colors: string[]) {
  let s = shadow(50, 88, 22) + `<path d="M44 88 L48 58 M50 88 L50 56 M56 88 L52 58" stroke="#6f8756" stroke-width="1.6"/>` + leafAt(46, 72, -40, 18) + leafAt(54, 72, 40, 18)
  const pos = [[36, 46], [64, 46], [50, 34], [42, 58], [58, 58]]
  pos.forEach(([x, y], i) => (s += flowerHead(x, y, { petals: 5 + (i % 2), len: 9, w: 6, color: colors[i % colors.length], center: '#e2c46b', centerR: 2.4 })))
  return wrap(s)
}

function fruitBowl() {
  return wrap(shadow(50, 86, 30) + `<circle cx="36" cy="54" r="13" fill="#c66a4a"/><circle cx="62" cy="52" r="14" fill="#d9a441"/><circle cx="50" cy="64" r="12" fill="#8e2b33"/>${hl(32, 50, 4)}${hl(58, 47, 4)}<path d="M20 62 C22 80 78 80 80 62Z" fill="#e8dcc8" stroke="#c9b99c" stroke-width="1"/>`)
}

function spiceMix() {
  return wrap(shadow(50, 84, 30) + `<g transform="translate(-14 4) scale(.7) translate(21 21)">${starAnise('#7a4a2e').replace(/^<svg[^>]*><rect[^>]*\/>/, '').replace('</svg>', '')}</g><g transform="translate(18 14) scale(.55) translate(40 40)">${corns('#3b302a', 10).replace(/^<svg[^>]*><rect[^>]*\/>/, '').replace('</svg>', '')}</g><g transform="translate(16 -16) scale(.5) translate(50 50)">${sticks('#a0623a').replace(/^<svg[^>]*><rect[^>]*\/>/, '').replace('</svg>', '')}</g>`)
}

function aldehydes() {
  let s = ''
  for (let i = 0; i < 16; i++) {
    const x = 18 + ((i * 41) % 66), y = 18 + ((i * 29) % 66), r = 2 + (i % 4)
    s += `<path d="M${x} ${y - r * 2} L${x + r * 0.5} ${y - r * 0.5} L${x + r * 2} ${y} L${x + r * 0.5} ${y + r * 0.5} L${x} ${y + r * 2} L${x - r * 0.5} ${y + r * 0.5} L${x - r * 2} ${y} L${x - r * 0.5} ${y - r * 0.5}Z" fill="${i % 2 ? '#d7d3c8' : '#bfc9cc'}"/>`
  }
  return wrap(s)
}

// ---------- the catalogue ----------
const WHITE = '#FBF8F1'
const BUILD: Record<string, () => Svg> = {
  // citrus
  bergamot: () => wholeAndSlice('#b9b84a', '#e6e08a'),
  lemon: () => citrus('#e8cd45', '#f4e48a'),
  'amalfi lemon': () => wholeAndSlice('#e8cd45', '#f4e48a'),
  lime: () => citrus('#7da347', '#c8dc8a'),
  'mandarin orange': () => wholeAndSlice('#e8913a', '#f3b765'),
  tangerine: () => citrus('#e8853a', '#f3ad5e'),
  orange: () => citrus('#e88f3a', '#f4b25e'),
  'bitter orange': () => wholeAndSlice('#d97f2e', '#eaa356'),
  'blood orange': () => citrus('#d8742e', '#b8453f'),
  grapefruit: () => citrus('#eba66a', '#e8766a', 12),
  citrus: () => wholeAndSlice('#e8cd45', '#f3b765'),
  yuzu: () => wholeAndSlice('#d9c24a', '#efe08e'),
  petitgrain: () => sprig('#6f8756', 'oval', 4),
  // fruit
  peach: () => fruit('#eea377', { crease: true }),
  apricot: () => fruit('#eba55a', { crease: true }),
  plum: () => fruit('#6c3f63', { crease: true, leaf: false }),
  apple: () => fruit('#c9473f', { shape: 'apple' }),
  'red apple': () => fruit('#c0413b', { shape: 'apple' }),
  'green apple': () => fruit('#97b45a', { shape: 'apple' }),
  pear: () => fruit('#c9c35a', { shape: 'pear' }),
  'black currant': () => berries('#3b2a3f', 8, 8),
  cassis: () => berries('#3b2a3f', 8, 8),
  'red berries': () => berries('#b83a3f', 8, 8),
  'red currant': () => berries('#c2343a', 8, 7),
  raspberry: () => drupelets('#c24a5a'),
  blackberry: () => drupelets('#3b2638'),
  strawberry,
  cherry: cherries,
  fig,
  melon: melonSlice,
  pineapple,
  coconut,
  mango: () => fruit('#eaa53e', { leaf: true }),
  litchi: () => berries('#d97f86', 5, 11),
  'passionfruit': () => fruit('#5b3a55', { leaf: false }),
  'fruity notes': fruitBowl,
  rhubarb: () => sprig('#b8565a', 'round', 2),
  // flowers
  rose: () => rose('#b8606a'),
  'bulgarian rose': () => rose('#a8505e'),
  'turkish rose': () => rose('#b25a66'),
  'damask rose': () => rose('#b8606a'),
  'grasse rose': () => rose('#d48b95'),
  'white rose': () => rose('#efe6da'),
  jasmine: () => cluster({ petals: 5, len: 13, w: 6, color: WHITE, center: '#e7d38a', shape: 'pointed', centerR: 2.2 }, [[38, 46, 1], [60, 40, 1.1], [52, 60, 0.9]]),
  'jasmine sambac': () => cluster({ petals: 8, len: 11, w: 6, color: WHITE, center: '#e7d38a', shape: 'round', layers: 2, centerR: 2 }, [[40, 46, 1], [60, 44, 1.05]]),
  'orange blossom': () => cluster({ petals: 5, len: 14, w: 8, color: WHITE, center: '#e3c45a', shape: 'round', centerR: 3, stamens: true }, [[40, 44, 1], [62, 50, 0.9]]),
  neroli: () => cluster({ petals: 5, len: 14, w: 8, color: '#f8f3e6', center: '#d9b44a', shape: 'round', centerR: 3, stamens: true }, [[44, 46, 1.1], [64, 56, 0.8]]),
  'african orange flower': () => cluster({ petals: 5, len: 14, w: 8, color: WHITE, center: '#e3c45a', shape: 'round', centerR: 3, stamens: true }, [[50, 46, 1.2]]),
  tuberose: () => cluster({ petals: 6, len: 14, w: 7, color: WHITE, center: '#efe3c0', shape: 'pointed', layers: 2, centerR: 2.4 }, [[50, 30, 0.8], [40, 50, 1], [60, 52, 1]]),
  gardenia: () => flower({ petals: 7, len: 26, w: 13, color: '#f7f2e6', center: '#efe3b8', shape: 'round', layers: 3, centerR: 3 }),
  'ylang-ylang': () => flower({ petals: 6, len: 30, w: 6, color: '#dccf6a', center: '#a99a3a', shape: 'long', centerR: 3.6, off: 15 }),
  magnolia: () => flower({ petals: 6, len: 26, w: 13, color: '#f4e6e2', center: '#d8c27a', shape: 'round', layers: 2, centerR: 5 }),
  lily: () => flower({ petals: 6, len: 30, w: 10, color: '#f6efe6', center: '#c98a4a', shape: 'pointed', centerR: 3, stamens: true }),
  'water lily': () => flower({ petals: 10, len: 24, w: 9, color: '#f3dde0', center: '#e3c45a', shape: 'pointed', layers: 2, centerR: 4 }, false),
  lotus: () => flower({ petals: 8, len: 26, w: 11, color: '#e8b4bd', center: '#e3c45a', shape: 'pointed', layers: 2, centerR: 4.5 }, false),
  'lily-of-the-valley': () => bells(),
  violet: () => flower({ petals: 5, len: 20, w: 12, color: '#7d6596', center: '#e8cf6a', shape: 'round', centerR: 3 }),
  'violet leaf': () => bigLeaves('#5f7a4a'),
  iris: () => flower({ petals: 3, len: 30, w: 16, color: '#8476a6', center: '#e3c45a', shape: 'heart', layers: 2, off: 60, centerR: 3.4 }),
  'orris root': () => root('#cdb79a'),
  orris: () => root('#cdb79a'),
  peony: () => flower({ petals: 9, len: 27, w: 13, color: '#e3a3ae', center: '#f0d78a', shape: 'heart', layers: 3, centerR: 4 }),
  freesia: () => cluster({ petals: 6, len: 12, w: 7, color: '#e9d27a', center: '#c9a03a', shape: 'round', centerR: 2 }, [[36, 50, 0.8], [50, 42, 1], [64, 36, 1.1]]),
  geranium: () => cluster({ petals: 5, len: 8, w: 5, color: '#d6788a', center: '#f2e2a0', shape: 'round', centerR: 1.6 }, [[44, 40, 1], [56, 40, 1], [50, 32, 1], [40, 50, 1], [60, 50, 1], [50, 48, 1]]),
  carnation: () => flower({ petals: 12, len: 26, w: 9, color: '#d0606e', center: '#b8505e', shape: 'heart', layers: 3, centerR: 3 }),
  heliotrope: () => cluster({ petals: 5, len: 6, w: 4, color: '#a08ab8', center: '#f2f0e6', shape: 'round', centerR: 1.2 }, [[44, 40, 1], [52, 36, 1], [60, 42, 1], [40, 48, 1], [48, 46, 1], [56, 50, 1], [62, 50, 1], [50, 54, 1]]),
  lilac: () => cluster({ petals: 4, len: 6, w: 4, color: '#b39acb', center: '#efe8f2', shape: 'round', centerR: 1.2 }, [[46, 30, 1], [54, 32, 1], [42, 38, 1], [50, 40, 1], [58, 40, 1], [46, 48, 1], [54, 48, 1], [50, 56, 1]]),
  hyacinth: () => cluster({ petals: 6, len: 7, w: 4, color: '#8f8ac2', center: '#e8e6f2', shape: 'pointed', centerR: 1.2 }, [[50, 26, 1], [44, 34, 1], [56, 34, 1], [48, 42, 1], [58, 44, 1], [42, 46, 1], [50, 52, 1]]),
  orchid: () => flower({ petals: 5, len: 24, w: 13, color: '#e0c4dc', center: '#b04a7a', shape: 'round', off: 36, centerR: 6 }),
  mimosa: () => puffs('#e8c84a'),
  osmanthus: () => cluster({ petals: 4, len: 6, w: 5, color: '#ea9a4a', center: '#d07a2a', shape: 'round', centerR: 1.2 }, [[44, 40, 1], [52, 36, 1], [60, 42, 1], [46, 50, 1], [56, 52, 1], [38, 48, 1]]),
  honeysuckle: () => flower({ petals: 5, len: 30, w: 5, color: '#efe2a8', center: '#d9b44a', shape: 'long', off: -20, centerR: 2 }),
  frangipani: () => flower({ petals: 5, len: 26, w: 15, color: '#f7f0e2', center: '#ecc65a', shape: 'round', off: 20, centerR: 7 }),
  narcissus: () => flower({ petals: 6, len: 24, w: 12, color: '#f6f0dc', center: '#e8a43a', shape: 'pointed', centerR: 8 }),
  cyclamen: () => flower({ petals: 5, len: 28, w: 9, color: '#d97a9a', center: '#8a3a5a', shape: 'long', off: 180, centerR: 3 }),
  'white flowers': () => bouquet([WHITE, '#f4eedc', '#efe6da']),
  'floral notes': () => bouquet(['#d48b95', WHITE, '#a08ab8', '#e9d27a']),
  lavender: () => spike('#8f80b6'),
  // herbs & green
  mint: () => sprig('#6f9a63', 'serrated', 4),
  basil: () => sprig('#5f8a4a', 'round', 3),
  sage: () => sprig('#93a08a', 'oval', 4),
  'clary sage': () => spike('#a99ac0', 2),
  rosemary: () => sprig('#5f7a55', 'needle', 6),
  thyme: () => sprig('#7d8a5f', 'round', 6),
  artemisia: () => sprig('#a3ad8e', 'needle', 5),
  tarragon: () => sprig('#6f8a52', 'needle', 4),
  'green notes': () => bigLeaves('#7d9460'),
  'green leaves': () => bigLeaves('#7d9460'),
  galbanum: () => tears('#c9c98a'),
  'fig leaf': () => bigLeaves('#6a8a4f'),
  patchouli: () => bigLeaves('#4f6a3f'),
  oakmoss: moss,
  'oak moss': moss,
  moss,
  tea: teacup,
  'green tea': teacup,
  'black tea': teacup,
  juniper: () => berries('#4a5a7a', 7, 7),
  'juniper berries': () => berries('#4a5a7a', 7, 7),
  // spices
  cardamom: () => pods('#9aab6a'),
  cinnamon: () => sticks('#a0623a'),
  pepper: () => corns('#3b302a'),
  'black pepper': () => corns('#3b302a'),
  'pink pepper': () => corns('#d98a8a', 16, 4.2),
  'white pepper': () => corns('#d9ccb0'),
  nutmeg: () => pods('#8a5a3c', 3, false),
  cloves: () => threads('#5a3a28').replace(/stroke-width="2"/g, 'stroke-width="3.2"').replace(/#e0a43a/g, '#6a4430'),
  'star anise': () => starAnise('#7a4a2e'),
  anise: () => corns('#b5a07a', 16, 3.4),
  saffron: () => threads('#c2402e'),
  ginger: () => root('#d8b27a'),
  coriander: () => corns('#c9a46a', 14, 5),
  caraway: () => corns('#8a6a4a', 18, 3.4),
  cumin: () => corns('#9a7a52', 18, 3.4),
  'spicy notes': spiceMix,
  spices: spiceMix,
  // gourmand
  vanilla,
  'madagascar vanilla': vanilla,
  'bourbon vanilla': vanilla,
  'tonka bean': () => beans('#3f2a20', 'tonka'),
  almond: () => beans('#c08a5a', 'almond'),
  'bitter almond': () => beans('#b07a4a', 'almond'),
  coffee: () => beans('#5a3a28', 'coffee'),
  cacao: () => beans('#5a3a2a', 'cacao'),
  chocolate: () => beans('#5a3a2a', 'cacao'),
  'dark chocolate': () => beans('#3f2a20', 'cacao'),
  caramel,
  praline: () => beans('#a8703f', 'almond'),
  honey,
  'white honey': honey,
  sugar: () => chunks('#f4efe4', false),
  // woods
  sandalwood: () => logRings('#8a6a4a', '#e2c49a'),
  cedar: () => logRings('#7a5a40', '#c98a5a'),
  'virginia cedar': () => logRings('#7a5a40', '#c47f52'),
  'woody notes': () => logRings('#6f5a44', '#c9a77a'),
  'guaiac wood': () => logRings('#5a4636', '#9a7a5a'),
  'cashmere wood': () => logRings('#8a7a6a', '#e2d2bd'),
  cypress: () => sprig('#4f6a4f', 'needle', 6),
  'palisander rosewood': () => logRings('#5a3a2e', '#a0605a'),
  'brazilian rosewood': () => logRings('#5a3a2e', '#a0605a'),
  oud: () => chips('#4a3426'),
  agarwood: () => chips('#4a3426'),
  vetiver: () => grassRoots('#b0905a'),
  birch: () => logRings('#e8e2d6', '#d9c7a8'),
  pine: () => sprig('#3f5a40', 'needle', 7),
  'pine tree': () => sprig('#3f5a40', 'needle', 7),
  fir: () => sprig('#3f5a48', 'needle', 7),
  // resins & ambers
  amber: () => chunks('#d39a3e'),
  'white amber': () => chunks('#ead7a8'),
  benzoin: () => chunks('#c98a4a'),
  labdanum: () => tears('#7a4a2a'),
  myrrh: () => tears('#a8582e'),
  olibanum: () => tears('#e3d2a8'),
  frankincense: () => tears('#e3d2a8'),
  styrax: () => tears('#8a5a3a'),
  'tolu balsam': () => tears('#9a5a2e'),
  'peru balsam': () => tears('#6a3a22'),
  opoponax: () => tears('#b07a3a'),
  elemi: () => tears('#efe6c8'),
  incense,
  ambergris: () => chunks('#cfc6b4', false),
  // musks, leather, tobacco, aquatic
  musk: () => cloud('#e7ddd0'),
  'white musk': () => cloud('#f7f4ee'),
  ambrette: () => corns('#8a7a5a', 16, 3.6),
  leather: () => leather('#7a4f36'),
  suede: () => leather('#a07a5a'),
  tobacco: () => driedLeaf('#9a6a3a'),
  'tobacco leaf': () => driedLeaf('#9a6a3a'),
  hay: () => grassRoots('#d2b46a'),
  'sea notes': () => waves('#7f98a0'),
  'sea water': () => waves('#6e8c97'),
  'water notes': () => droplet('#9fb8c0'),
  'watery notes': () => droplet('#9fb8c0'),
  aldehydes,
}

const cache = new Map<string, string>()

/** A data: URL with an illustration of the note's ingredient, or null if we don't have one. */
export function noteIllustration(note: string): string | null {
  const key = note.toLowerCase()
  const hit = cache.get(key)
  if (hit !== undefined) return hit || null
  const build = BUILD[key]
  const url = build ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(build())}` : ''
  cache.set(key, url)
  return url || null
}

export const ILLUSTRATED_NOTES = Object.keys(BUILD)
