// Turns raw perfume data into beginner-friendly behaviour: how long it lasts, how far it
// projects, how it changes over the day, and what heat or skin type does to it.
// Community votes are used when available; otherwise values are estimated from the notes
// and accords (and the UI says so).

import type { Perfume } from './data'
import { accordFamily, familyOf, FAMILIES, type Family } from './families'

export type Layer = 'top' | 'heart' | 'base'
export type Skin = 'dry' | 'normal' | 'oily'

export interface LayeredNote {
  note: string
  layer: Layer
  family: Family
  /** True when the perfume publishes no notes and we are showing its accords instead. */
  fromAccord?: boolean
}

export function layeredNotes(p: Perfume): LayeredNote[] {
  const out: LayeredNote[] = []
  const push = (notes: string[], layer: Layer) => notes.forEach((note) => out.push({ note, layer, family: familyOf(note) }))
  push(p.top, 'top')
  push(p.heart, 'heart')
  push(p.base, 'base')
  // Flat lists: place by how heavy the note's family typically is.
  for (const note of p.flat) {
    const family = familyOf(note)
    out.push({ note, family, layer: family.weight < 0.35 ? 'top' : family.weight < 0.7 ? 'heart' : 'base' })
  }
  if (out.length === 0) {
    for (const a of p.accords.slice(0, 8)) {
      const family = accordFamily(a.name)
      out.push({ note: a.name, family, fromAccord: true, layer: family.weight < 0.35 ? 'top' : family.weight < 0.7 ? 'heart' : 'base' })
    }
  }
  return out
}

/** Accord-strength-weighted mix of families, normalised to sum to 1. */
export function familyMix(p: Perfume): { family: Family; share: number }[] {
  const m = new Map<string, number>()
  const src = p.accords.length
    ? p.accords.map((a) => [accordFamily(a.name), a.strength] as const)
    : layeredNotes(p).map((n) => [n.family, 50] as const)
  for (const [f, s] of src) m.set(f.id, (m.get(f.id) ?? 0) + s)
  const total = [...m.values()].reduce((a, b) => a + b, 0) || 1
  return [...m.entries()]
    .map(([id, s]) => ({ family: FAMILIES[id], share: s / total }))
    .sort((a, b) => b.share - a.share)
}

const avg = (mix: { family: Family; share: number }[], key: 'heat' | 'weight') =>
  mix.reduce((acc, m) => acc + m.family[key] * m.share, 0)

const LON_HOURS = [1.5, 3, 5.5, 8.5, 12]
const SIL_LEVEL = [0.15, 0.42, 0.72, 1]

export interface Profile {
  longevityHours: number
  longevityFrom: 'votes' | 'estimate'
  longevityVotes: number
  sillage: number // 0..1
  sillageFrom: 'votes' | 'estimate'
  sillageVotes: number
  heat: number // -1..1 how well it suits hot weather
  weight: number // 0..1 how heavy/rich
  mix: { family: Family; share: number }[]
  seasons: { name: string; score: number }[]
  dayNight: number // 0 = day, 1 = night
}

export function profile(p: Perfume): Profile {
  const mix = familyMix(p)
  const heat = avg(mix, 'heat')
  const weight = avg(mix, 'weight')

  let longevityHours = 2.5 + weight * 7.5
  let longevityFrom: Profile['longevityFrom'] = 'estimate'
  let longevityVotes = 0
  if (p.longevityVotes) {
    const n = p.longevityVotes.reduce((a, b) => a + b, 0)
    if (n >= 10) {
      const voted = p.longevityVotes.reduce((acc, v, i) => acc + v * LON_HOURS[i], 0) / n
      // Unlabelled votes are noisier: blend them with the estimate.
      longevityHours = p.votesLabelled ? voted : voted * 0.6 + longevityHours * 0.4
      longevityFrom = 'votes'
      longevityVotes = n
    }
  }

  const projectors = ['gourmand', 'amber', 'spicy', 'whiteFloral', 'smoky', 'fruity']
  let sillage = 0.25 + mix.reduce((acc, m) => acc + (projectors.includes(m.family.id) ? m.share * 0.6 : m.share * 0.15), 0)
  let sillageFrom: Profile['sillageFrom'] = 'estimate'
  let sillageVotes = 0
  if (p.sillageVotes) {
    const n = p.sillageVotes.reduce((a, b) => a + b, 0)
    if (n >= 10) {
      const voted = p.sillageVotes.reduce((acc, v, i) => acc + v * SIL_LEVEL[i], 0) / n
      sillage = p.votesLabelled ? voted : voted * 0.6 + sillage * 0.4
      sillageFrom = 'votes'
      sillageVotes = n
    }
  }

  const share = (ids: string[]) => mix.filter((m) => ids.includes(m.family.id)).reduce((a, m) => a + m.share, 0)
  const seasons = [
    { name: 'Spring', score: share(['floral', 'green', 'fruity', 'whiteFloral', 'aromatic']) + 0.15 },
    { name: 'Summer', score: Math.max(0, heat) * 0.9 + share(['citrus', 'aquatic']) * 0.6 },
    { name: 'Autumn', score: share(['woody', 'spicy', 'gourmand', 'earthy', 'smoky']) * 0.9 + 0.1 },
    { name: 'Winter', score: Math.max(0, -heat) * 0.8 + share(['amber', 'gourmand', 'smoky', 'animalic']) * 0.6 + weight * 0.2 },
  ]
  const max = Math.max(...seasons.map((s) => s.score)) || 1
  seasons.forEach((s) => (s.score = Math.max(0.08, s.score / max)))

  return {
    longevityHours: clamp(longevityHours, 1, 14),
    longevityFrom,
    longevityVotes,
    sillage: clamp(sillage, 0.08, 1),
    sillageFrom,
    sillageVotes,
    heat: clamp(heat, -1, 1),
    weight,
    mix,
    seasons,
    dayNight: clamp(0.5 - heat * 0.35 + (weight - 0.5) * 0.6, 0, 1),
  }
}

// ---------------------------------------------------------------------------
// Time / temperature / skin model used by the 3D scene and readouts.

export interface Conditions {
  hours: number
  tempC: number
  skin: Skin
}

const SKIN_FACTOR: Record<Skin, number> = { dry: 0.75, normal: 1, oily: 1.2 }

/** How fast things evaporate relative to a 22°C room. */
export const evaporation = (tempC: number) => clamp(1 + (tempC - 22) * 0.028, 0.55, 1.5)

const topTau = (L: number) => clamp(0.035 * L, 0.12, 0.35)

/** Roughly when the opening has faded (intensity below ~10%). */
export function topFadeHours(c: Pick<Conditions, 'tempC' | 'skin'>, longevityHours: number) {
  return 2.3 * topTau((longevityHours * SKIN_FACTOR[c.skin]) / evaporation(c.tempC))
}

/** 0..1 strength of each layer at a moment in time. */
export function layerIntensity(layer: Layer, c: Conditions, longevityHours: number): number {
  const L = (longevityHours * SKIN_FACTOR[c.skin]) / evaporation(c.tempC)
  const t = Math.max(0, c.hours)
  if (layer === 'top') return Math.exp(-t / topTau(L))
  if (layer === 'heart') return (1 - Math.exp(-(t + 0.02) / 0.18)) * Math.exp(-Math.max(0, t - 0.4) / (0.42 * L))
  return (0.35 + 0.65 * (1 - Math.exp(-t / 0.7))) * Math.exp(-Math.max(0, t - 0.8) / (0.72 * L))
}

/** Projection radius 0..1 at a moment (heat makes a scent louder but shorter). */
export function projection(c: Conditions, prof: Profile): number {
  const strongest = Math.max(
    layerIntensity('top', c, prof.longevityHours) * 0.9,
    layerIntensity('heart', c, prof.longevityHours),
    layerIntensity('base', c, prof.longevityHours) * 0.8,
  )
  return clamp(prof.sillage * (0.55 + 0.45 * evaporation(c.tempC)) * strongest, 0, 1)
}

export function projectionLabel(v: number) {
  if (v < 0.12) return 'Skin scent: someone would have to hug you'
  if (v < 0.3) return 'Close: noticed at arm’s length'
  if (v < 0.55) return 'Moderate: leaves a soft trail as you walk by'
  if (v < 0.8) return 'Strong: people notice when you enter a room'
  return 'Very loud: fills the room'
}

export function longevityLabel(h: number) {
  if (h < 2.5) return 'Fades fast'
  if (h < 5) return 'A few hours'
  if (h < 8) return 'Lasts the workday'
  if (h < 11) return 'Long lasting'
  return 'All day and night'
}

// ---------------------------------------------------------------------------
// Plain-language copy.

const FAMILY_ADJ: Record<string, string> = {
  citrus: 'zesty', floral: 'floral', whiteFloral: 'creamy-floral', fruity: 'fruity', gourmand: 'sweet',
  woody: 'woody', spicy: 'spicy', green: 'green', aquatic: 'fresh', musky: 'soft', amber: 'warm',
  powdery: 'powdery', aromatic: 'herbal', smoky: 'smoky', earthy: 'earthy', animalic: 'sensual',
}
const FAMILY_THINK: Record<string, string> = {
  citrus: 'a freshly peeled orange on a sunny morning', floral: 'walking past a flower stall',
  whiteFloral: 'a warm summer night near blooming jasmine', fruity: 'a bowl of ripe fruit',
  gourmand: 'a bakery or a dessert counter', woody: 'a cedar chest or a quiet forest cabin',
  spicy: 'a warm kitchen with the spice jars open', green: 'snapping a fresh stem in a garden',
  aquatic: 'a sea breeze or freshly washed laundry', musky: 'clean skin under a soft sweater',
  amber: 'a candle-lit room on a cold evening', powdery: 'a vintage makeup bag',
  aromatic: 'a herb garden after rain', smoky: 'a leather armchair by a fireplace',
  earthy: 'a forest floor after rain', animalic: 'warm skin at the end of the day',
}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

export function plainSummary(p: Perfume, prof: Profile): { headline: string; think: string; journey: string | null } {
  const fams = prof.mix.slice(0, 3).map((m) => FAMILY_ADJ[m.family.id])
  const uniq = [...new Set(fams)]
  const headline = `A ${list(uniq.slice(0, 2))} scent${uniq[2] ? ` with a ${uniq[2]} side` : ''}.`
  const think = `Think ${FAMILY_THINK[prof.mix[0]?.family.id ?? 'musky']}.`
  const pick = (xs: string[]) => list(xs.slice(0, 2))
  let journey: string | null = null
  if (p.top.length || p.heart.length || p.base.length) {
    const parts: string[] = []
    if (p.top.length) parts.push(`opens with ${pick(p.top)}`)
    if (p.heart.length) parts.push(`${parts.length ? 'settles' : 'centres'} into ${pick(p.heart)}`)
    if (p.base.length) parts.push(`dries down to ${pick(p.base)}`)
    journey = `It ${list(parts)}.`
  }
  return { headline, think, journey }
}

export function heatAdvice(prof: Profile): { hot: string; cold: string } {
  const gourmand = prof.mix.find((m) => ['gourmand', 'amber'].includes(m.family.id))?.share ?? 0
  const fresh = prof.mix.filter((m) => ['citrus', 'aquatic', 'green', 'aromatic'].includes(m.family.id)).reduce((a, m) => a + m.share, 0)
  let hot: string
  if (prof.heat > 0.35) hot = 'Shines in heat. Warm skin helps it bloom and it feels refreshing. It will fade a bit faster, so carry a travel spray.'
  else if (prof.heat > -0.1) hot = 'Works in warm weather. Heat makes it project more but burns through the opening faster. 1–2 sprays is plenty.'
  else if (gourmand > 0.3) hot = 'Can feel heavy or cloying in the heat. Sweetness gets amplified on warm skin. If you wear it in summer, use one spray, on clothes rather than skin.'
  else hot = 'Rich notes get louder in heat and can feel dense. Better for evenings or air-conditioned spaces in summer.'
  let cold: string
  if (prof.weight > 0.6) cold = 'Made for cold weather. Cold air keeps it close and cosy, and it lasts longer.'
  else if (fresh > 0.4) cold = 'In the cold it stays very close to the skin and may feel thin. Spray on a scarf to help it carry.'
  else cold = 'Fine in cool weather. It will sit a little closer to the skin and last longer than in heat.'
  return { hot, cold }
}

export const SKIN_ADVICE: Record<Skin, string> = {
  dry: 'Dry skin gives scent nothing to hold onto, so it evaporates faster. Moisturise first with an unscented lotion.',
  normal: 'Spray on pulse points (wrists, neck, behind the ears) where warmth helps it radiate. Don’t rub your wrists together: it crushes the top notes.',
  oily: 'Oily skin holds fragrance longer and can make it richer. Start with fewer sprays.',
}

export function whatYouSmell(notes: LayeredNote[], c: Conditions, prof: Profile, n = 4) {
  return notes
    .map((x) => ({ ...x, i: layerIntensity(x.layer, c, prof.longevityHours) }))
    .filter((x) => x.i > 0.2)
    .sort((a, b) => b.i - a.i)
    .slice(0, n)
}

export const formatHours = (h: number) => {
  if (h < 1 / 60) return 'Just sprayed'
  if (h < 1) return `${Math.round(h * 60)} min`
  const whole = Math.floor(h)
  const mins = Math.round((h - whole) * 60)
  return mins >= 5 && h < 4 ? `${whole} h ${mins} min` : `${Math.round(h)} h`
}

export function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v))
}
