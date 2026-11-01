// Loads the static JSON produced by scripts/build_data.py.

export type IndexItem = [id: number, name: string, brand: string, year: number | null, gender: 'f' | 'm' | 'u' | null, pop: number]

export interface Index {
  shard: number
  notes: string[]
  noteCounts: number[]
  accords: string[]
  items: IndexItem[]
}

interface RawPerfume {
  id: number
  n: string
  b: string
  y: number | null
  g: 'f' | 'm' | 'u' | null
  r: number | null
  t: number[]
  m: number[]
  bs: number[]
  fl: number[]
  a: [number, number][]
  as: 'rank' | 'strength'
  lon: number[] | null
  sil: number[] | null
  vs: 'labelled' | 'unlabelled' | null
  src: string
  s: number[]
  note?: string
  /** Fragrantica perfume id (used to look up bottle photos). */
  fid?: number
  /** Plain-language description (Scento, CC BY 4.0) and its page. */
  d?: string
  du?: string
}

export interface Perfume {
  id: number
  name: string
  brand: string
  year: number | null
  gender: 'f' | 'm' | 'u' | null
  rating: number | null
  top: string[]
  heart: string[]
  base: string[]
  /** Notes listed without a pyramid (some perfumes only publish a flat list). */
  flat: string[]
  accords: { name: string; strength: number }[]
  accordsAreRanked: boolean
  longevityVotes: number[] | null
  sillageVotes: number[] | null
  votesLabelled: boolean
  similar: number[]
  sourceNote?: string
  /** Plain-language description from Scento (CC BY 4.0), with a link to its page. */
  description?: { text: string; url?: string }
  fragranticaId?: number
}

const BASE = `${import.meta.env.BASE_URL}data/`
let indexPromise: Promise<Index> | null = null
const shardCache = new Map<number, Promise<RawPerfume[]>>()
let notesPromise: Promise<Record<string, number[]>> | null = null

interface CompactIndex {
  v: 2
  shard: number
  notes: string[]
  noteCounts: number[]
  accords: string[]
  brands: string[]
  /** [name, brand index, year (0 = unknown), gender ('' = unknown), log2(popularity + 1)]; row = id */
  items: [string, number, number, '' | 'f' | 'm' | 'u', number][]
}

export function loadIndex(): Promise<Index> {
  indexPromise ??= fetch(`${BASE}index.json`)
    .then((r) => {
      if (!r.ok) throw new Error('Could not load perfume index')
      return r.json() as Promise<CompactIndex>
    })
    .then((c) => ({
      shard: c.shard,
      notes: c.notes,
      noteCounts: c.noteCounts,
      accords: c.accords,
      items: c.items.map(([n, b, y, g, pop], id): IndexItem => [id, n, c.brands[b] ?? '', y || null, g || null, 2 ** pop - 1]),
    }))
  return indexPromise
}

function loadShard(n: number) {
  let p = shardCache.get(n)
  if (!p) {
    p = fetch(`${BASE}shards/${n}.json`).then((r) => r.json())
    shardCache.set(n, p)
  }
  return p
}

export async function loadPerfume(id: number): Promise<Perfume | null> {
  const ix = await loadIndex()
  const shard = await loadShard(Math.floor(id / ix.shard))
  const raw = shard.find((p) => p.id === id)
  return raw ? toPerfume(raw, ix) : null
}

/** The most popular perfumes (the data is sorted by popularity, so these are the first shards). */
export async function loadTopPerfumes(count: number): Promise<Perfume[]> {
  const ix = await loadIndex()
  const shards = await Promise.all(Array.from({ length: Math.ceil(count / ix.shard) }, (_, i) => loadShard(i)))
  return shards.flat().slice(0, count).map((r) => toPerfume(r, ix))
}

function toPerfume(raw: RawPerfume, ix: Index): Perfume {
  const N = (ids: number[]) => ids.map((i) => ix.notes[i])
  return {
    id: raw.id,
    name: raw.n,
    brand: raw.b,
    year: raw.y,
    gender: raw.g,
    rating: raw.r,
    top: N(raw.t),
    heart: N(raw.m),
    base: N(raw.bs),
    flat: N(raw.fl),
    accords: raw.a.map(([a, s]) => ({ name: ix.accords[a], strength: s })),
    accordsAreRanked: raw.as === 'rank',
    longevityVotes: raw.lon,
    sillageVotes: raw.sil,
    votesLabelled: raw.vs === 'labelled',
    similar: raw.s,
    sourceNote: raw.note,
    description: raw.d ? { text: raw.d, url: raw.du } : undefined,
    fragranticaId: raw.fid,
  }
}

export async function loadNoteIndex() {
  notesPromise ??= fetch(`${BASE}notes.json`).then((r) => r.json())
  return notesPromise
}

const fold = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

let folded: { name: string; brand: string; both: string }[] | null = null

/** Simple ranked search: every query word must appear in name or brand; popularity breaks ties. */
export function search(ix: Index, query: string, limit = 12): IndexItem[] {
  const q = fold(query)
  if (!q) return []
  folded ??= ix.items.map((it) => {
    const name = fold(it[1])
    const brand = fold(it[2])
    return { name, brand, both: `${name} ${brand}` }
  })
  const words = q.split(' ')
  const scored: [number, IndexItem][] = []
  for (let i = 0; i < ix.items.length; i++) {
    const f = folded[i]
    if (!words.every((w) => f.both.includes(w))) continue
    let score = Math.log10(ix.items[i][5] + 10)
    if (f.name === q) score += 6
    else if (f.name.startsWith(q)) score += 4
    else if (f.both.startsWith(q)) score += 2.5
    if (words.every((w) => f.name.includes(w))) score += 1.5
    scored.push([score, ix.items[i]])
  }
  scored.sort((a, b) => b[0] - a[0])
  return scored.slice(0, limit).map((s) => s[1])
}

export function searchNotes(ix: Index, query: string, limit = 6): string[] {
  const q = fold(query)
  if (q.length < 2) return []
  const out: string[] = []
  for (let i = 0; i < ix.notes.length && out.length < limit; i++) {
    if (ix.noteCounts[i] < 3) break
    if (fold(ix.notes[i]).startsWith(q)) out.push(ix.notes[i])
  }
  return out
}

export const genderLabel = (g: Perfume['gender']) =>
  g === 'f' ? 'Marketed for women' : g === 'm' ? 'Marketed for men' : g === 'u' ? 'Unisex' : null

export interface NoteInfo {
  smell: string
  family: string
  origin: string
}
let noteInfoPromise: Promise<Record<string, NoteInfo>> | null = null

/** Plain smell descriptions for raw materials (Scento perfume database, CC BY 4.0). */
export function loadNoteInfo() {
  noteInfoPromise ??= fetch(`${BASE}note_info.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
  return noteInfoPromise
}
