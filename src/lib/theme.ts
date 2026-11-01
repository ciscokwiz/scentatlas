// Per-perfume colour theme. The page background takes on the perfume's character
// (from its strongest accords) while text colours are checked for readable contrast.

import type { Perfume } from './data'
import { accordColor, familyOf } from './families'

type RGB = [number, number, number]
const hexToRgb = (h: string): RGB => {
  const n = parseInt(h.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const rgbToHex = (c: RGB) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
export const mix = (a: string, b: string, t: number) => {
  const x = hexToRgb(a), y = hexToRgb(b)
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t])
}
const lum = (h: string) => {
  const f = (v: number) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = hexToRgb(h)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
export const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
/** Darken `fg` towards near-black until it reaches the target contrast on `bg`. */
function ensure(fg: string, bg: string, target: number) {
  let c = fg
  for (let i = 0; i < 20 && contrast(c, bg) < target; i++) c = mix(c, '#141210', 0.15)
  return c
}

export interface Theme {
  bg: string
  bg2: string
  card: string
  ink: string
  ink2: string
  ink3: string
  line: string
  panel: string
  accent: string
  c1: string
  c2: string
  c3: string
}

export function themeFor(p: Perfume, opts: ThemeOpts = {}): Theme {
  const colors = p.accords.length
    ? p.accords.slice(0, 3).map((a) => accordColor(a.name))
    : [...p.top, ...p.heart, ...p.base].slice(0, 3).map((n) => familyOf(n).color)
  return themeFromColors(colors, opts)
}

export interface ThemeOpts {
  /** Add a soft complementary hue to the backdrop so it sets off the bottle colour. */
  complement?: boolean
}

function hsl(h: string): [number, number, number] {
  const [r, g, b] = hexToRgb(h).map((v) => v / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [hue * 60, s, l]
}
function fromHsl(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255])
}
/** A muted complementary colour (opposite hue), gentle enough for a backdrop. */
export function complementOf(hex: string) {
  const [h, s, l] = hsl(hex)
  return fromHsl((h + 180) % 360, Math.min(0.35, s * 0.6 + 0.08), Math.min(0.72, Math.max(0.5, l)))
}

export function themeFromColors(colors: string[], opts: ThemeOpts = {}): Theme {
  colors = [...colors]
  while (colors.length < 3) colors.push(colors[colors.length - 1] ?? '#B9935F')
  const [c1, c2, c3] = colors
  // Very dark accords (leather, oud, coffee) would make a muddy tint: lift them first.
  const tintSrc = lum(c1) < 0.08 ? mix(c1, '#B9A58C', 0.45) : c1
  // Solid, light tint of the bottle/accord colour: readable first, characterful second.
  const bg = mix('#F6F1E9', tintSrc, 0.17)
  const theme: Theme = {
    bg,
    bg2: mix('#EDE5D9', tintSrc, 0.24),
    card: mix('#FCF9F4', tintSrc, 0.06),
    panel: mix(bg, '#FFFFFF', 0.4),
    ink: ensure(mix('#1C1B19', c1, 0.12), bg, 12),
    ink2: ensure(mix('#55504A', c1, 0.18), bg, 6),
    ink3: ensure(mix('#857E74', c1, 0.2), bg, 3.6),
    line: 'rgba(38, 34, 31, 0.12)',
    accent: ensure(c1, bg, 3.2),
    c1,
    c2,
    c3: opts.complement ? complementOf(c1) : c3,
  }
  return theme
}

const VARS: Record<keyof Theme, string> = {
  bg: '--bg', bg2: '--bg-2', card: '--card', panel: '--panel', ink: '--ink', ink2: '--ink-2', ink3: '--ink-3', line: '--line', accent: '--gold', c1: '--c1', c2: '--c2', c3: '--c3',
}

export function applyTheme(t: Theme) {
  const s = document.documentElement.style
  for (const k of Object.keys(VARS) as (keyof Theme)[]) s.setProperty(VARS[k], t[k])
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg)
}

export function resetTheme() {
  const s = document.documentElement.style
  for (const v of Object.values(VARS)) s.removeProperty(v)
}
