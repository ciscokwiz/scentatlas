// Typography that echoes each perfume house's style. These are open (Google) typefaces in
// the same tradition as the houses' own lettering, not their logos: Didone for couture
// houses, spaced geometric capitals for modernist ones, Roman capitals for heritage
// houses, typewriter for "laboratory" niche brands, and so on.

import type { Perfume } from './data'
import type { Family } from './families'
import type { CSSProperties } from 'react'

export interface TypeStyle {
  id: string
  label: string
  fontFamily: string
  fontWeight: number
  fontStyle?: 'italic' | 'normal'
  textTransform?: 'uppercase' | 'none'
  letterSpacing: string
  /** Relative size tweak so different faces look balanced at the same nominal size. */
  scale: number
}

const STYLES: Record<string, TypeStyle> = {
  didone: { id: 'didone', label: 'Engraved serif', fontFamily: "'Gilda Display', serif", fontWeight: 400, letterSpacing: '0', scale: 0.98 },
  didoneCaps: { id: 'didoneCaps', label: 'Didone capitals', fontFamily: "'Bodoni Moda', serif", fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', scale: 0.72 },
  couture: { id: 'couture', label: 'Couture sans', fontFamily: "'Jost', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.2em', scale: 0.7 },
  roman: { id: 'roman', label: 'Roman capitals', fontFamily: "'Cinzel', serif", fontWeight: 400, letterSpacing: '0.08em', scale: 0.8 },
  modern: { id: 'modern', label: 'Modern capitals', fontFamily: "'Tenor Sans', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.14em', scale: 0.72 },
  garamond: { id: 'garamond', label: 'Soft serif', fontFamily: "'Fraunces', serif", fontWeight: 400, letterSpacing: '-0.01em', scale: 0.92 },
  romantic: { id: 'romantic', label: 'Romantic italic', fontFamily: "'Playfair Display', serif", fontWeight: 400, fontStyle: 'italic', letterSpacing: '-0.01em', scale: 0.95 },
  typewriter: { id: 'typewriter', label: 'Typewriter', fontFamily: "'Courier Prime', monospace", fontWeight: 400, letterSpacing: '0', scale: 0.78 },
  classic: { id: 'classic', label: 'Classic serif', fontFamily: "'Marcellus', serif", fontWeight: 400, letterSpacing: '0.02em', scale: 0.9 },
}

// House → style. Matched case-insensitively against the start of the brand name.
const HOUSES: [RegExp, keyof typeof STYLES][] = [
  [/^(christian )?dior/i, 'didone'],
  [/^chanel/i, 'couture'],
  [/^yves saint laurent|^ysl/i, 'couture'],
  [/^tom ford/i, 'modern'],
  [/^le labo/i, 'typewriter'],
  [/^maison (martin )?margiela/i, 'typewriter'],
  [/^byredo/i, 'modern'],
  [/^diptyque/i, 'garamond'],
  [/^jo malone/i, 'classic'],
  [/^guerlain/i, 'garamond'],
  [/^herm[eè]s/i, 'garamond'],
  [/^gucci/i, 'didoneCaps'],
  [/^prada/i, 'classic'],
  [/^versace/i, 'roman'],
  [/^givenchy/i, 'modern'],
  [/^lanc[oô]me/i, 'romantic'],
  [/^carolina herrera/i, 'didone'],
  [/^viktor ?& ?rolf/i, 'roman'],
  [/^by kilian|^kilian/i, 'roman'],
  [/^creed/i, 'roman'],
  [/^maison francis kurkdjian/i, 'modern'],
  [/^giorgio armani|^armani/i, 'couture'],
  [/^calvin klein/i, 'couture'],
  [/^dolce ?& ?gabbana|^d&g/i, 'didoneCaps'],
  [/^mugler|^thierry mugler/i, 'couture'],
  [/^chlo[ée]/i, 'romantic'],
  [/^narciso rodriguez/i, 'couture'],
  [/^burberry/i, 'roman'],
  [/^valentino/i, 'didoneCaps'],
  [/^serge lutens/i, 'garamond'],
  [/^l ?'?artisan parfumeur/i, 'garamond'],
  [/^zara/i, 'didoneCaps'],
  [/^marc jacobs/i, 'couture'],
  [/^jean paul gaultier/i, 'modern'],
  [/^paco rabanne|^rabanne/i, 'modern'],
  [/^montale|^mancera/i, 'roman'],
  [/^amouage/i, 'roman'],
  [/^xerjoff|^parfums de marly|^initio/i, 'roman'],
  [/^penhaligon/i, 'classic'],
  [/^acqua di parma/i, 'classic'],
  [/^bvlgari|^bulgari/i, 'roman'],
  [/^cartier/i, 'garamond'],
  [/^van cleef/i, 'garamond'],
  [/^estée lauder|^estee lauder/i, 'garamond'],
  [/^clinique/i, 'couture'],
  [/^hugo boss|^boss/i, 'modern'],
  [/^ralph lauren/i, 'classic'],
  [/^kenzo/i, 'modern'],
  [/^issey miyake/i, 'couture'],
  [/^juliette has a gun|^escentric/i, 'modern'],
  [/^fine'?ry/i, 'didone'],
  [/^mix:? ?bar/i, 'couture'],
  [/^skylar/i, 'modern'],
  [/^ariana grande/i, 'romantic'],
  [/^victoria'?s secret/i, 'romantic'],
  [/^nishane|^lattafa|^armaf|^rasasi|^ajmal/i, 'roman'],
]

// No house match: pick by the perfume's character.
const BY_FAMILY: Record<string, keyof typeof STYLES> = {
  citrus: 'couture', aquatic: 'couture', green: 'modern', aromatic: 'modern',
  floral: 'romantic', whiteFloral: 'didone', fruity: 'romantic', powdery: 'garamond',
  gourmand: 'didone', amber: 'roman', spicy: 'roman', woody: 'classic',
  smoky: 'modern', earthy: 'classic', musky: 'garamond', animalic: 'didone',
}

export function brandType(brand: string, mainFamily?: Family): TypeStyle {
  for (const [re, id] of HOUSES) if (re.test(brand.trim())) return STYLES[id]
  return STYLES[(mainFamily && BY_FAMILY[mainFamily.id]) || 'didone']
}

export function perfumeType(p: Perfume, mainFamily?: Family) {
  return brandType(p.brand, mainFamily)
}

/** Inline style for an element set in a house's typeface. `size` is the nominal CSS size. */
export function typeCss(t: TypeStyle, size?: string): CSSProperties {
  return {
    fontFamily: t.fontFamily,
    fontWeight: t.fontWeight,
    fontStyle: t.fontStyle ?? 'normal',
    textTransform: t.textTransform ?? 'none',
    letterSpacing: t.letterSpacing,
    ...(size ? { fontSize: `calc(${size} * ${t.scale})` } : {}),
  }
}
