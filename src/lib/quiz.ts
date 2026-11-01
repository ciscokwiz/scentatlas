// "Find your scent": three beginner-friendly questions → a scent profile + recommendations.
// No perfume vocabulary needed: people pick moments and situations, and we translate.

import type { Perfume } from './data'
import { FAMILIES } from './families'
import { familyMix, profile } from './behavior'

export interface Option {
  id: string
  title: string
  line: string
  /** Family weights this answer adds. */
  families?: Record<string, number>
  sillage?: number
  weight?: number
  heat?: number
  swatch: string[] // family ids for the option's animated swatch
}

export interface Question {
  id: string
  ask: string
  hint: string
  options: Option[]
}

export const QUESTIONS: Question[] = [
  {
    id: 'mood',
    ask: 'Which moment sounds most like you?',
    hint: 'Go with your gut. There are no wrong answers.',
    options: [
      { id: 'fresh', title: 'A fresh start', line: 'Sunny morning, windows open, a lemon on the counter.', families: { citrus: 1, aquatic: 0.8, green: 0.6, aromatic: 0.45 }, swatch: ['citrus', 'aquatic', 'green'] },
      { id: 'bloom', title: 'In full bloom', line: 'Walking through a garden after the rain.', families: { floral: 1, whiteFloral: 0.8, fruity: 0.45, powdery: 0.3 }, swatch: ['floral', 'whiteFloral', 'fruity'] },
      { id: 'cozy', title: 'Sweet & cosy', line: 'A warm café: vanilla, caramel, something baking.', families: { gourmand: 1, amber: 0.6, musky: 0.35, spicy: 0.3 }, swatch: ['gourmand', 'amber', 'musky'] },
      { id: 'woods', title: 'Warm & woody', line: 'A cabin by the fire, a wool sweater, a cup of chai.', families: { woody: 1, spicy: 0.6, smoky: 0.5, amber: 0.45, earthy: 0.35 }, swatch: ['woody', 'spicy', 'smoky'] },
    ],
  },
  {
    id: 'presence',
    ask: 'How noticeable do you want to be?',
    hint: 'This is about how far your scent travels.',
    options: [
      { id: 'close', title: 'Just for me', line: 'Only someone hugging me should notice.', sillage: 0.2, families: { musky: 0.35, powdery: 0.2 }, swatch: ['musky'] },
      { id: 'trail', title: 'A soft trail', line: 'Noticed when people are near, never overwhelming.', sillage: 0.45, swatch: ['powdery', 'floral'] },
      { id: 'bold', title: 'Turn heads', line: 'People notice when I walk into a room.', sillage: 0.75, families: { amber: 0.2, whiteFloral: 0.15, gourmand: 0.15 }, swatch: ['amber', 'spicy'] },
    ],
  },
  {
    id: 'when',
    ask: 'When will you wear it most?',
    hint: 'Weather and occasion change what works best.',
    options: [
      { id: 'everyday', title: 'Every day', line: 'Work, errands, coffee with friends.', weight: 0.4, heat: 0.2, families: { musky: 0.2, citrus: 0.15, floral: 0.1 }, swatch: ['musky', 'citrus'] },
      { id: 'summer', title: 'Warm weather', line: 'Sunshine, holidays, long light evenings.', weight: 0.25, heat: 0.7, families: { citrus: 0.3, aquatic: 0.3, green: 0.2, fruity: 0.15 }, swatch: ['aquatic', 'citrus'] },
      { id: 'evening', title: 'Evenings out', line: 'Dinners, dates, something a little special.', weight: 0.7, heat: -0.2, families: { amber: 0.3, spicy: 0.2, whiteFloral: 0.2, gourmand: 0.15 }, swatch: ['amber', 'whiteFloral'] },
      { id: 'winter', title: 'Cold months', line: 'Scarves, rainy days, cosy nights in.', weight: 0.8, heat: -0.7, families: { amber: 0.3, gourmand: 0.25, woody: 0.25, spicy: 0.15 }, swatch: ['woody', 'gourmand'] },
    ],
  },
]

export type Answers = Record<string, string>

export interface ScentProfile {
  name: string
  tagline: string
  description: string
  families: { id: string; label: string; color: string; share: number }[]
  notesToTry: string[]
  sillage: number
  weight: number
  heat: number
}

const PROFILE_COPY: Record<string, { name: string; description: string }> = {
  fresh: { name: 'Fresh & Bright', description: 'You like scents that feel clean, airy and energising: citrus peel, sea breeze, crushed leaves. Easy to wear and hard to get wrong.' },
  bloom: { name: 'Soft Floral', description: 'You’re drawn to flowers and fruit: pretty, romantic and uplifting. Florals range from fresh and dewy to rich and creamy, so there’s lots to explore.' },
  cozy: { name: 'Sweet & Cosy', description: 'You love comforting, edible scents: vanilla, caramel, tonka, almond. They feel like a warm hug and tend to last a long time.' },
  woods: { name: 'Warm & Woody', description: 'You like depth: woods, spices and a hint of smoke. Grounded, calm and a little mysterious.' },
}

const NOTES_TO_TRY: Record<string, string[]> = {
  citrus: ['bergamot', 'mandarin orange', 'grapefruit'], aquatic: ['sea notes', 'water notes'], green: ['green tea', 'fig leaf'], aromatic: ['lavender', 'mint'],
  floral: ['rose', 'peony', 'iris'], whiteFloral: ['jasmine', 'orange blossom', 'tuberose'], fruity: ['pear', 'peach', 'black currant'], powdery: ['violet', 'heliotrope'],
  gourmand: ['vanilla', 'tonka bean', 'almond', 'caramel'], amber: ['amber', 'benzoin'], musky: ['musk', 'white musk'], spicy: ['cardamom', 'cinnamon', 'pink pepper'],
  woody: ['sandalwood', 'cedar', 'vetiver'], smoky: ['incense', 'tobacco'], earthy: ['patchouli'],
}

export function buildProfile(a: Answers): ScentProfile {
  const fam: Record<string, number> = {}
  let sillage = 0.45, weight = 0.5, heat = 0
  for (const q of QUESTIONS) {
    const o = q.options.find((x) => x.id === a[q.id])
    if (!o) continue
    for (const [k, v] of Object.entries(o.families ?? {})) fam[k] = (fam[k] ?? 0) + v
    if (o.sillage != null) sillage = o.sillage
    if (o.weight != null) weight = o.weight
    if (o.heat != null) heat = o.heat
  }
  const total = Object.values(fam).reduce((x, y) => x + y, 0) || 1
  const families = Object.entries(fam)
    .map(([id, v]) => ({ id, label: FAMILIES[id].label, color: FAMILIES[id].color, share: v / total }))
    .sort((x, y) => y.share - x.share)
  const base = PROFILE_COPY[a.mood] ?? PROFILE_COPY.fresh
  const presence = sillage < 0.3 ? 'close to the skin' : sillage < 0.6 ? 'with a soft trail' : 'with presence'
  const when = { everyday: 'for every day', summer: 'for warm weather', evening: 'for evenings', winter: 'for cold months' }[a.when] ?? ''
  const notesToTry = [...new Set(families.slice(0, 4).flatMap((f) => NOTES_TO_TRY[f.id] ?? []))].slice(0, 8)
  return { name: base.name, tagline: `${when}, ${presence}`, description: base.description, families, notesToTry, sillage, weight, heat }
}

export interface Match {
  perfume: Perfume
  score: number
  longevity: number
  sillage: number
}

export function recommend(sp: ScentProfile, pool: Perfume[], n = 6): Match[] {
  const want = new Map(sp.families.map((f) => [f.id, f.share]))
  const wantNorm = Math.hypot(...sp.families.map((f) => f.share))
  const scored = pool.map((p, rank) => {
    const mix = familyMix(p)
    let dot = 0
    for (const m of mix) dot += (want.get(m.family.id) ?? 0) * m.share
    const cos = dot / (wantNorm * (Math.hypot(...mix.map((m) => m.share)) || 1))
    const prof = profile(p)
    const score =
      cos * 2 -
      Math.abs(prof.sillage - sp.sillage) * 0.6 -
      Math.abs(prof.weight - sp.weight) * 0.5 -
      Math.abs(prof.heat - sp.heat) * 0.25 +
      (1 - rank / pool.length) * 0.25 // gently favour well-known, easy-to-find perfumes
    return { perfume: p, score, longevity: prof.longevityHours, sillage: prof.sillage }
  })
  scored.sort((x, y) => y.score - x.score)
  const out: Match[] = []
  const brands = new Set<string>()
  for (const m of scored) {
    if (brands.has(m.perfume.brand)) continue // variety: one per brand
    brands.add(m.perfume.brand)
    out.push(m)
    if (out.length === n) break
  }
  return out
}
