// Scent families: how a note looks, moves and is explained to a beginner.
// Colours are deliberately muted, earthy tones so the motion carries the page.

export type Motion =
  | 'fizz' // rises quickly in tiny bubbles
  | 'petal' // swirls in slow orbits
  | 'drop' // round droplets bobbing
  | 'melt' // big soft blobs, viscous wobble
  | 'grain' // slow vertical slivers
  | 'flicker' // jittery sparks
  | 'leaf' // sideways flutter
  | 'wave' // horizontal swell
  | 'haze' // diffuse, expanding cloud
  | 'glow' // warm pulsing drops that sink
  | 'dust' // fine powder falling
  | 'smoke' // curling upward

export interface Family {
  id: string
  label: string
  color: string
  motion: Motion
  feel: string // one plain-English line
  heat: number // -1 struggles in heat … +1 shines in heat
  weight: number // 0 airy … 1 heavy (how long it tends to linger)
}

export const FAMILIES: Record<string, Family> = {
  citrus: { id: 'citrus', label: 'Citrus', color: '#C8B25A', motion: 'fizz', feel: 'Zesty and bright, like peeling fruit. Usually the first thing you smell, and the first to go.', heat: 1, weight: 0.1 },
  floral: { id: 'floral', label: 'Floral', color: '#A98E8C', motion: 'petal', feel: 'Smells like a bouquet. Soft, pretty, romantic.', heat: 0.2, weight: 0.45 },
  whiteFloral: { id: 'whiteFloral', label: 'White floral', color: '#DCD3C2', motion: 'petal', feel: 'Creamy, heady flowers like jasmine and tuberose. Rich and a little intoxicating.', heat: -0.2, weight: 0.5 },
  fruity: { id: 'fruity', label: 'Fruity', color: '#B9775A', motion: 'drop', feel: 'Juicy and playful, like a fruit bowl or candy.', heat: 0.3, weight: 0.25 },
  gourmand: { id: 'gourmand', label: 'Sweet & edible', color: '#A47C58', motion: 'melt', feel: 'Smells like dessert: vanilla, caramel, chocolate, almond pastry. Cozy and comforting.', heat: -0.8, weight: 0.8 },
  woody: { id: 'woody', label: 'Woody', color: '#7A6A55', motion: 'grain', feel: 'Dry, warm wood, like a cedar chest or pencil shavings. Grounding.', heat: -0.1, weight: 0.8 },
  spicy: { id: 'spicy', label: 'Spicy', color: '#985A3E', motion: 'flicker', feel: 'Kitchen-cabinet spices: pepper, cinnamon, cardamom. Adds a tingle or warmth.', heat: -0.4, weight: 0.5 },
  green: { id: 'green', label: 'Green', color: '#7D8A66', motion: 'leaf', feel: 'Freshly cut stems, leaves and grass. Crisp and outdoorsy.', heat: 0.9, weight: 0.25 },
  aquatic: { id: 'aquatic', label: 'Fresh & watery', color: '#7F98A0', motion: 'wave', feel: 'Sea breeze, rain, clean laundry. Light and airy.', heat: 1, weight: 0.2 },
  musky: { id: 'musky', label: 'Musky', color: '#BDB6AB', motion: 'haze', feel: 'Clean skin, soft cotton. A quiet "your skin but better" smell.', heat: 0.3, weight: 0.85 },
  amber: { id: 'amber', label: 'Amber & resin', color: '#B07E3C', motion: 'glow', feel: 'Golden, warm and slightly sweet, like tree sap and incense. Wraps around you.', heat: -0.7, weight: 0.95 },
  powdery: { id: 'powdery', label: 'Powdery', color: '#CBC1B8', motion: 'dust', feel: 'Like makeup powder or baby powder. Soft, nostalgic, a bit vintage.', heat: -0.1, weight: 0.6 },
  aromatic: { id: 'aromatic', label: 'Herbal', color: '#6E8170', motion: 'leaf', feel: 'Garden herbs like lavender, rosemary and sage. Clean and calming.', heat: 0.6, weight: 0.35 },
  smoky: { id: 'smoky', label: 'Smoky & leather', color: '#4F4741', motion: 'smoke', feel: 'Campfire, tobacco, a worn leather jacket. Dark and moody.', heat: -0.6, weight: 0.9 },
  earthy: { id: 'earthy', label: 'Earthy', color: '#6A6150', motion: 'smoke', feel: 'Damp soil, moss, roots. Deep and natural.', heat: -0.2, weight: 0.9 },
  animalic: { id: 'animalic', label: 'Animalic', color: '#6B5848', motion: 'haze', feel: 'Warm, skin-like, a little "dirty" in a sensual way.', heat: -0.6, weight: 0.95 },
}

// Order matters: first match wins.
const RULES: [RegExp, string][] = [
  [/almond|vanill|caramel|praline|chocolate|cacao|cocoa|coffee|honey|sugar|cream|milk|butter|cookie|cake|marshmallow|candy|nougat|toffee|meringue|tonka|coumarin|hazelnut|pistachio|chestnut|nut(?!meg)|maple|rum|cognac|whisk|bourbon|liqueur|licorice|biscuit|dulce|popcorn|bread|custard|coconut|condensed|lactonic|gourmand|sweet/, 'gourmand'],
  [/lemon|bergamot|orange(?! blossom| flower)|mandarin|tangerine|grapefruit|lime|yuzu|citrus|citron|clementine|pomelo|kumquat|petitgrain|verbena|lemongrass|bigarade/, 'citrus'],
  [/jasmin|tuberose|gardenia|ylang|orange blossom|orange flower|neroli|frangipani|tiare|magnolia|lily|honeysuckle|champaca|white flower|osmanthus|lotus|freesia/, 'whiteFloral'],
  [/rose(?!mary|wood)|violet(?! leaf)|iris|orris|peony|geranium|carnation|lilac|hyacinth|mimosa|narcissus|daffodil|orchid|heliotrope|cyclamen|floral|flower|blossom|petal|hibiscus|marigold|chamomile|camellia|tulip|poppy|daisy|sweet pea|wisteria|muguet|aldehyde/, 'floral'],
  [/apple|pear|peach|plum|apricot|cherry|berr|currant|cassis|raspberr|strawberr|blackberr|fig(?! leaf)|melon|watermelon|pineapple|mango|passion|lychee|litchi|pomegranate|nectarine|banana|grape|guava|papaya|quince|fruit|rhubarb|kiwi|date|tropical/, 'fruity'],
  [/sea|marine|water|aquatic|ozon|rain|salt|calone|air|aldehydic|cucumber|melon|cotton|laundry|soap|clean|fresh|\bice\b|snow|mineral/, 'aquatic'],
  [/musk|ambrette|cashmeran|skin|velvet/, 'musky'],
  [/amber|benzoin|labdanum|myrrh|olibanum|frankincense|incense|resin|balsam|styrax|opoponax|elemi|tolu|peru|copal|ambergris|ambroxan|amberwood|gum/, 'amber'],
  [/oud|agarwood|sandal|cedar|vetiver|guaiac|wood|birch|cypress|pine|fir|teak|oak|ebony|rosewood|palisander|cashmere|bamboo|massoia|hinoki|juniper(?! berr)|cypriol|nagarmotha|akigalawood|iso e/, 'woody'],
  [/leather|suede|tobacco|smok|\btar\b|birch tar|cade|burnt|ash|gunpowder|incense/, 'smoky'],
  [/patchouli|moss|oakmoss|earth|soil|truffle|mushroom|beet|carrot|root|hay|tea/, 'earthy'],
  [/civet|castoreum|animal|hyrax|indol|honeycomb|beeswax/, 'animalic'],
  [/pepper|cinnamon|cardamom|clove|nutmeg|ginger|saffron|cumin|coriander|anise|star anise|caraway|cassia|allspice|chili|spic|pimento|curry|fennel|mace/, 'spicy'],
  [/lavender|rosemary|sage|basil|mint|thyme|artemisia|wormwood|tarragon|eucalyptus|herb|aromatic|bay leaf|myrtle|davana|angelica|clary/, 'aromatic'],
  [/green|leaf|leaves|grass|galbanum|stem|ivy|fern|tomato|bamboo|fig leaf|violet leaf|matcha|shiso/, 'green'],
  [/powder/, 'powdery'],
]

const cache = new Map<string, Family>()
export function familyOf(note: string): Family {
  const hit = cache.get(note)
  if (hit) return hit
  const n = note.toLowerCase()
  let fam = FAMILIES.musky
  for (const [re, id] of RULES) {
    if (re.test(n)) {
      fam = FAMILIES[id]
      break
    }
  }
  cache.set(note, fam)
  return fam
}

// Accords (the "main accords" bars) map straight onto families.
const ACCORD_FAMILY: Record<string, string> = {
  citrus: 'citrus', floral: 'floral', 'white floral': 'whiteFloral', 'yellow floral': 'whiteFloral', rose: 'floral', tuberose: 'whiteFloral', iris: 'floral', violet: 'floral',
  fruity: 'fruity', tropical: 'fruity', cherry: 'fruity', sour: 'fruity',
  sweet: 'gourmand', vanilla: 'gourmand', caramel: 'gourmand', cacao: 'gourmand', almond: 'gourmand', nutty: 'gourmand', honey: 'gourmand', coffee: 'gourmand', coconut: 'gourmand', milky: 'gourmand', lactonic: 'gourmand', rum: 'gourmand', whiskey: 'gourmand', gourmand: 'gourmand', cinnamon: 'spicy',
  woody: 'woody', oud: 'woody', conifer: 'woody',
  'warm spicy': 'spicy', 'fresh spicy': 'spicy', 'soft spicy': 'spicy',
  green: 'green', aquatic: 'aquatic', marine: 'aquatic', ozonic: 'aquatic', fresh: 'aquatic', salty: 'aquatic', watery: 'aquatic', soapy: 'aquatic', aldehydic: 'aquatic',
  musky: 'musky', amber: 'amber', balsamic: 'amber', powdery: 'powdery', aromatic: 'aromatic', herbal: 'aromatic', lavender: 'aromatic', camphor: 'aromatic',
  leather: 'smoky', smoky: 'smoky', tobacco: 'smoky', earthy: 'earthy', patchouli: 'earthy', mossy: 'earthy', animalic: 'animalic', beeswax: 'animalic',
}
// Each accord gets its own shade within its family so bars are distinguishable.
export const ACCORD_COLOR: Record<string, string> = {
  vanilla: '#C9A978', sweet: '#B48A6A', almond: '#C2A07C', cacao: '#6E4E3A', caramel: '#A86F3D', coffee: '#5B4636', nutty: '#9C7B57',
  honey: '#C49A4A', coconut: '#D8CDBB', lactonic: '#E2D9C8', milky: '#E2D9C8', rum: '#8A5A3A', whiskey: '#94673C',
  'warm spicy': '#985A3E', cinnamon: '#A45F3A', 'fresh spicy': '#A8876A', 'soft spicy': '#B79479',
  woody: '#7A6A55', oud: '#4E3E33', balsamic: '#B07E3C', amber: '#C08A44',
  fruity: '#B9775A', cherry: '#8E4A45', tropical: '#C59A5A', sour: '#B5A65A',
  floral: '#A98E8C', rose: '#B08487', 'white floral': '#DCD3C2', 'yellow floral': '#CDB57A', iris: '#9D93A6', tuberose: '#E2DACB', violet: '#8F86A0',
  green: '#7D8A66', aromatic: '#6E8170', herbal: '#7C8B6C', lavender: '#8E88A0', citrus: '#C8B25A',
  fresh: '#A9BCC0', aquatic: '#7F98A0', marine: '#6E8C97', ozonic: '#B3C3C6', salty: '#9FB0B0', soapy: '#D3D3CB', aldehydic: '#CFCCC2',
  musky: '#BDB6AB', powdery: '#CBC1B8', leather: '#5A4A40', smoky: '#4F4741', tobacco: '#8A6A48',
  earthy: '#6A6150', patchouli: '#6B5A47', mossy: '#5F6B4E', animalic: '#6B5848',
}

export function accordColor(accord: string): string {
  return ACCORD_COLOR[accord] ?? accordFamily(accord).color
}

/** Pick readable text for a coloured background. */
export function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return 0.299 * r + 0.587 * g + 0.114 * b > 165 ? '#3a3631' : '#ffffff'
}

export function accordFamily(accord: string): Family {
  const id = ACCORD_FAMILY[accord]
  return id ? FAMILIES[id] : familyOf(accord)
}

// Plain-English descriptions for the most common notes. Others fall back to their family.
export const NOTE_DESCRIPTIONS: Record<string, string> = {
  musk: 'The smell of clean, warm skin. Soft and cosy, it helps everything else last longer.',
  'white musk': 'Fresh-laundry musk. Like crisp white sheets.',
  jasmine: 'A rich, sweet white flower. Creamy and a little sensual.',
  'jasmine sambac': 'A greener, fruitier jasmine, almost like jasmine tea.',
  sandalwood: 'Creamy, smooth wood. Milky and soft, never sharp.',
  bergamot: 'A citrus fruit that smells like Earl Grey tea. Bright with a floral twist.',
  amber: 'Not a single ingredient: a warm, golden blend of resin, vanilla and soft spice.',
  rose: 'The classic flower. Can read fresh and dewy or deep and jammy.',
  patchouli: 'Earthy and dark, a bit like damp soil or a forest floor. Gives depth.',
  vanilla: 'Sweet, creamy and comforting, like ice cream or custard.',
  cedar: 'Dry, clean wood, like pencil shavings or a cedar closet.',
  'mandarin orange': 'Sweet, juicy orange. Happy and sunny.',
  vetiver: 'A grassy root with a smoky, earthy, slightly salty dryness.',
  lemon: 'Sharp, sparkling lemon zest. Instantly fresh.',
  'lily-of-the-valley': 'A tiny white flower that smells clean, green and dewy.',
  lavender: 'Calming purple herb. Clean, a bit soapy, like a spa.',
  'tonka bean': 'Smells like vanilla with hints of almond, hay and caramel.',
  violet: 'Powdery, sweet little flower, like old-fashioned violet candy.',
  'ylang-ylang': 'A tropical flower: creamy, banana-like, very lush.',
  grapefruit: 'Tangy, slightly bitter citrus. Wakes you up.',
  iris: 'Powdery and buttery, like expensive lipstick or cool suede.',
  'orris root': 'The root of the iris: powdery, earthy, lipstick-like.',
  'orange blossom': 'White flowers from orange trees. Sweet, honeyed and clean.',
  peach: 'Soft, fuzzy, juicy peach. Warm and friendly.',
  oakmoss: 'Damp forest moss. Earthy, inky, a classic vintage note.',
  'woody notes': 'A general warm-wood impression rather than one specific tree.',
  cardamom: 'A fresh, slightly minty spice, like chai.',
  orange: 'Sweet, juicy orange zest.',
  freesia: 'A light, fresh flower. Peppery-sweet and clean.',
  geranium: 'Rosy and minty-green. Smells like a rose leaf.',
  citrus: 'A mix of citrus fruits: zesty and bright.',
  leather: 'A worn leather jacket or new car seats. Smoky and luxurious.',
  cinnamon: 'Warm, sweet spice, like cinnamon rolls.',
  neroli: 'Orange-tree blossom, distilled: fresh, green, slightly bitter and floral.',
  'pink pepper': 'Not really pepper: a rosy, fizzy, slightly fruity spice.',
  nutmeg: 'Warm, nutty holiday spice.',
  'green notes': 'Snapped stems and fresh leaves. Crisp and outdoorsy.',
  'black currant': 'Tart, juicy berry with a green, catty edge.',
  incense: 'Church incense: smoky, resinous and meditative.',
  tuberose: 'A very rich, creamy white flower. Bold and heady.',
  benzoin: 'A resin that smells like warm vanilla and caramel.',
  oud: 'Dark, smoky, slightly medicinal wood from the Middle East. Very intense.',
  peony: 'A fresh, airy pink flower. Light, rosy and a bit fruity.',
  'floral notes': 'A general bouquet effect rather than one flower.',
  'virginia cedar': 'Pencil-shaving cedar: dry and clean.',
  pepper: 'Sharp, tingly black pepper.',
  'black pepper': 'Sharp, tingly black pepper. Adds a kick.',
  ginger: 'Zingy, fresh and warm all at once.',
  mint: 'Cool, fresh mint, like toothpaste or mojitos.',
  raspberry: 'Sweet-tart red berry.',
  coriander: 'Spicy-citrusy seed. Fresh and aromatic.',
  gardenia: 'Creamy white flower with a mushroomy, buttery side.',
  magnolia: 'Lemony, creamy white flower. Fresh and elegant.',
  labdanum: 'A sticky resin: leathery, ambery and warm.',
  heliotrope: 'Powdery flower that smells like almond and play-dough.',
  pear: 'Crisp, juicy pear. Fresh and sweet.',
  lime: 'Zesty lime, like a cocktail.',
  plum: 'Dark, jammy, slightly boozy fruit.',
  apple: 'Crisp, sweet apple.',
  saffron: 'A spice that smells leathery, metallic and honeyed.',
  aldehydes: 'Sparkly, soapy, "freshly ironed" effect. Think Chanel No 5.',
  coconut: 'Creamy coconut, like sunscreen or a piña colada.',
  caramel: 'Burnt sugar: sweet, buttery and warm.',
  almond: 'Marzipan and cherry-pie-crust sweetness. Nutty, soft and a little powdery.',
  'almond milk': 'Soft, milky almond. Creamy and comforting rather than sugary.',
  praline: 'Caramelised nuts: sweet, roasted and toasty.',
  coffee: 'Roasted coffee beans. Rich and slightly bitter.',
  cacao: 'Dark chocolate powder. Rich, dry and sweet.',
  honey: 'Thick, golden honey. Sweet with a waxy, animal warmth.',
  tobacco: 'Sweet, dried pipe tobacco leaves. Warm and hay-like.',
  ambergris: 'A salty, skin-like, warm note. Gives a scent glow and staying power.',
  cashmeran: 'A soft, woody-musky molecule. Feels like a warm cashmere sweater.',
  rhubarb: 'Tart, green and juicy. Fresh with a candy-like sourness.',
  narcissus: 'A spring flower that is green, honeyed and slightly hay-like.',
  cherry: 'Sweet cherry with an almond-like edge, like cherry pie or cough drops.',
  myrrh: 'An ancient resin. Warm, bittersweet, slightly medicinal.',
  olibanum: 'Frankincense: fresh, lemony smoke.',
  'sea notes': 'Salty sea breeze. Fresh and wet.',
  tea: 'Brewed tea leaves. Calm, slightly bitter and clean.',
  osmanthus: 'An apricot-scented flower with a suede-like softness.',
  mimosa: 'Fluffy yellow flower. Powdery, honeyed and soft.',
  'guaiac wood': 'Smoky, tarry wood with a hint of rose.',
  'bitter orange': 'Sharp orange peel, a bit more bitter and grown-up.',
  'damask rose': 'A rich, honeyed rose, the classic perfume rose.',
  'grasse rose': 'A soft, fresh rose from Grasse, the French perfume capital.',
  'bulgarian rose': 'A deep, slightly spicy, lemony rose.',
  'tolu balsam': 'A resin that smells like cinnamon, vanilla and soft smoke.',
  'cashmere wood': 'Soft, fuzzy, musky wood. Cosy and warm.',
  vanille: 'Vanilla: sweet, creamy and comforting.',
}

export function describeNote(note: string): string {
  return NOTE_DESCRIPTIONS[note] ?? familyOf(note).feel
}

export const titleCase = (s: string) =>
  s.replace(/(^|[\s-(])([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase())
