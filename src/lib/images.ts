// Real photography: bottle photos and ingredient (note) photos.
//
// Images are listed in public/images/manifest.json, written by scripts/import_images.py
// (open image sets, validated and re-encoded) and scripts/fetch_images.py (Wikimedia Commons).
// Bundled images (same origin) get the full treatment: background removal, a 3D model
// extruded from the bottle's silhouette, and colours sampled for the page theme.

import { slug } from './router'
import { noteIllustration } from './illustrations'

export interface ImageEntry {
  src: string
  credit?: string
  license?: string
  source?: string
}
export interface ImageManifest {
  bottles: Record<string, ImageEntry>
  notes: Record<string, ImageEntry>
}

const EMPTY: ImageManifest = { bottles: {}, notes: {} }
let manifestPromise: Promise<ImageManifest> | null = null

export function loadImages(): Promise<ImageManifest> {
  manifestPromise ??= fetch(`${import.meta.env.BASE_URL}images/manifest.json`)
    .then((r) => (r.ok ? r.json() : EMPTY))
    .then((m: Partial<ImageManifest>) => ({ bottles: m.bottles ?? {}, notes: m.notes ?? {} }))
    .catch(() => EMPTY)
  return manifestPromise
}

const local = (src: string) => (/^https?:/.test(src) ? src : `${import.meta.env.BASE_URL}${src.replace(/^\//, '')}`)

/** Bottle photo for a perfume, keyed by its brand + name slug (stable across data rebuilds). */
export function bottleKey(brand: string, name: string) {
  return slug(`${brand} ${name}`)
}

export function bottleImage(m: ImageManifest | null, brand: string, name: string): ImageEntry | null {
  const hit = m?.bottles[bottleKey(brand, name)]
  return hit ? { ...hit, src: local(hit.src) } : null
}

/** Ingredient photo if we have one, otherwise a drawn illustration of the ingredient. */
export function noteImage(m: ImageManifest | null, note: string): ImageEntry | null {
  const hit = m?.notes[slug(note)]
  if (hit) return { ...hit, src: local(hit.src) }
  const drawn = noteIllustration(note)
  return drawn ? { src: drawn } : null
}

// ---------------------------------------------------------------------------
// Bottle photo analysis

export interface BottleCutout {
  /** Photo with the background made transparent. */
  canvas: HTMLCanvasElement
  /** Silhouette outline in "height units": x centred on 0, y from 0 (bottom) to ~1 (top). */
  outline: [number, number][]
  width: number
  height: number
  /** Pixel row just below the bottle's bottom edge, and its height as a fraction of the photo (texture alignment). */
  bottomRow: number
  span: number
  /** Dominant colours of the bottle itself, most characteristic first. */
  colors: string[]
}

export function loadImage(src: string, cors = true): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (cors) img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load ${src}`))
    img.src = src
  })
}

const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/**
 * Removes a plain (usually white) studio background by flood-filling from the edges,
 * traces the bottle's silhouette row by row and samples its colours.
 * Returns null if the pixels can't be read (cross-origin image without CORS).
 */
export function cutOutBottle(img: HTMLImageElement, maxDim = 512): BottleCutout | null {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
  const W = Math.max(8, Math.round(img.naturalWidth * scale))
  const H = Math.max(8, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, W, H)
  let data: ImageData
  try {
    data = ctx.getImageData(0, 0, W, H)
  } catch {
    return null // tainted canvas
  }
  const px = data.data
  const n = W * H
  const bg = new Uint8Array(n)

  // Already transparent (PNG cut-out)?
  let transparent = 0
  for (let i = 0; i < n; i++) if (px[i * 4 + 3] < 16) transparent++
  if (transparent > n * 0.05) {
    for (let i = 0; i < n; i++) bg[i] = px[i * 4 + 3] < 16 ? 1 : 0
  } else {
    // Background colour = average of the four corners; flood-fill similar pixels from the border.
    const corners = [0, W - 1, (H - 1) * W, H * W - 1]
    const ref = [0, 1, 2].map((c) => corners.reduce((a, i) => a + px[i * 4 + c], 0) / 4)
    const near = (i: number) => {
      const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2]
      const d = Math.abs(r - ref[0]) + Math.abs(g - ref[1]) + Math.abs(b - ref[2])
      return d < 42 || (r > 238 && g > 238 && b > 238)
    }
    const stack = new Int32Array(n)
    let sp = 0
    const push = (i: number) => {
      if (!bg[i] && near(i)) {
        bg[i] = 1
        stack[sp++] = i
      }
    }
    for (let x = 0; x < W; x++) {
      push(x)
      push((H - 1) * W + x)
    }
    for (let y = 0; y < H; y++) {
      push(y * W)
      push(y * W + W - 1)
    }
    while (sp > 0) {
      const i = stack[--sp]
      const x = i % W
      if (x > 0) push(i - 1)
      if (x < W - 1) push(i + 1)
      if (i >= W) push(i - W)
      if (i < n - W) push(i + W)
    }
  }

  // Soft edge: fade pixels that touch the background, make background transparent.
  for (let i = 0; i < n; i++) {
    if (bg[i]) px[i * 4 + 3] = 0
    else {
      const x = i % W
      const edge = (x > 0 && bg[i - 1]) || (x < W - 1 && bg[i + 1]) || (i >= W && bg[i - W]) || (i < n - W && bg[i + W])
      if (edge) px[i * 4 + 3] = Math.min(px[i * 4 + 3], 150)
    }
  }
  ctx.putImageData(data, 0, 0)

  // Row extents → silhouette. Rows with too few pixels are noise.
  const left = new Float32Array(H).fill(-1)
  const right = new Float32Array(H).fill(-1)
  let top = -1, bottom = -1
  const minRun = Math.max(2, W * 0.01)
  for (let y = 0; y < H; y++) {
    let l = -1, r = -1, count = 0
    for (let x = 0; x < W; x++) {
      if (!bg[y * W + x]) {
        if (l < 0) l = x
        r = x
        count++
      }
    }
    if (count >= minRun) {
      left[y] = l
      right[y] = r + 1
      if (top < 0) top = y
      bottom = y
    }
  }
  if (top < 0 || bottom - top < H * 0.15) return null

  const step = Math.max(1, Math.round((bottom - top) / 90))
  const rightPts: [number, number][] = []
  const leftPts: [number, number][] = []
  const median = (arr: Float32Array, y: number) => {
    const vals = [arr[Math.max(top, y - step)], arr[y], arr[Math.min(bottom, y + step)]].filter((v) => v >= 0).sort((a, b) => a - b)
    return vals[Math.floor(vals.length / 2)]
  }
  for (let y = top; y <= bottom; y += step) {
    if (left[y] < 0) continue
    const Y = (bottom + 1 - y) / H
    rightPts.push([(median(right, y) - W / 2) / H, Y])
    leftPts.push([(median(left, y) - W / 2) / H, Y])
  }
  const outline: [number, number][] = [
    ...rightPts,
    [(right[bottom] - W / 2) / H, 0],
    [(left[bottom] - W / 2) / H, 0],
    ...leftPts.reverse(),
  ]
  // Normalise so the silhouette spans y 0..1 regardless of padding in the photo.
  const span = (bottom + 1 - top) / H
  const norm = outline.map(([x, y]) => [x / span, y / span] as [number, number])

  return { canvas, outline: dedupe(norm), width: W, height: H, bottomRow: bottom + 1, span, colors: dominantColors(px, bg, n) }
}

function dedupe(pts: [number, number][]) {
  const out: [number, number][] = []
  for (const p of pts) {
    const q = out[out.length - 1]
    if (!q || Math.abs(q[0] - p[0]) > 1e-4 || Math.abs(q[1] - p[1]) > 1e-4) out.push(p)
  }
  return out
}

/** Colour histogram over the bottle's pixels, favouring saturated colours (glass, liquid, cap). */
function dominantColors(px: Uint8ClampedArray, bg: Uint8Array, n: number): string[] {
  const bins = new Map<number, { c: number; r: number; g: number; b: number }>()
  for (let i = 0; i < n; i += 2) {
    if (bg[i]) continue
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const e = bins.get(key) ?? { c: 0, r: 0, g: 0, b: 0 }
    e.c++
    e.r += r
    e.g += g
    e.b += b
    bins.set(key, e)
  }
  const scored = [...bins.values()].map((e) => {
    const r = e.r / e.c, g = e.g / e.c, b = e.b / e.c
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const sat = max === 0 ? 0 : (max - min) / max
    const extreme = max > 240 && sat < 0.08 ? 0.15 : max < 28 ? 0.35 : 1
    return { r, g, b, score: e.c * (0.25 + sat * 1.5) * extreme }
  })
  scored.sort((a, b) => b.score - a.score)
  const picked: { r: number; g: number; b: number }[] = []
  for (const s of scored) {
    if (picked.every((p) => Math.abs(p.r - s.r) + Math.abs(p.g - s.g) + Math.abs(p.b - s.b) > 70)) picked.push(s)
    if (picked.length === 3) break
  }
  return picked.map((p) => toHex(p.r, p.g, p.b))
}
