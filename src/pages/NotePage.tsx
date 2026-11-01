import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { loadNoteIndex, loadNoteInfo, type Index, type NoteInfo } from '../lib/data'
import { describeNote, familyOf, titleCase } from '../lib/families'
import PerfumeCard from '../components/PerfumeCard'
import Ambient from '../components/Ambient'
import { applyTheme, mix, resetTheme, themeFromColors } from '../lib/theme'
import { loadImages, noteImage, type ImageEntry } from '../lib/images'

export default function NotePage({ note, ix }: { note: string; ix: Index }) {
  const [ids, setIds] = useState<number[] | null>(null)
  const [shown, setShown] = useState(12)
  const idx = ix.notes.indexOf(note)
  const fam = familyOf(note)
  const [photo, setPhoto] = useState<ImageEntry | null>(null)
  const [info, setInfo] = useState<NoteInfo | null>(null)
  useEffect(() => {
    loadImages().then((m) => setPhoto(noteImage(m, note)))
    loadNoteInfo().then((m) => setInfo(m[note] ?? null))
  }, [note])

  useEffect(() => {
    document.title = `${titleCase(note)} · Scent Atlas`
    loadNoteIndex().then((m) => setIds(m[String(idx)] ?? []))
    applyTheme(themeFromColors([fam.color, mix(fam.color, '#ffffff', 0.35), mix(fam.color, '#3a3631', 0.3)]))
    return () => resetTheme()
  }, [note, idx, fam.color])

  return (
    <article className="note-page">
      <Ambient />
      <section className="note-hero">
        <motion.div className={`note-orb m-${fam.motion}${photo ? ' has-photo' : ''}`} style={{ ['--c' as string]: fam.color }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1 }}>
          {photo && <img src={photo.src} alt={note} />}
          {Array.from({ length: 18 }).map((_, i) => (
            <i key={i} style={{ ['--i' as string]: i }} />
          ))}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p className="eyebrow">Note · {fam.label}</p>
          <h1>{titleCase(note)}</h1>
          <p className="lede">{describeNote(note)}</p>
          <p className="muted">{fam.feel}</p>
          {info && (
            <p className="note-smell">
              <span className="q-label">How perfumers describe it</span>
              {info.smell}
              {info.origin && info.origin !== 'accord' && <span className="muted"> ({info.origin === 'both' ? 'natural or lab-made' : info.origin === 'synthetic' ? 'made in a lab' : 'natural'})</span>}
              <a className="credit" href="https://www.scento.com/perfume-database"> Source: Scento, CC BY 4.0</a>
            </p>
          )}
          {photo?.credit && (
            <p className="credit">
              Photo: {photo.source ? <a href={photo.source}>{photo.credit}</a> : photo.credit}
              {photo.license ? ` · ${photo.license}` : ''}
            </p>
          )}
          {idx >= 0 && (
            <p className="source small">
              Found in {ix.noteCounts[idx].toLocaleString()} perfumes ({((ix.noteCounts[idx] / ix.items.length) * 100).toFixed(1)}% of the atlas).
            </p>
          )}
        </motion.div>
      </section>
      <section className="section">
        <h2 className="h-sm">Popular perfumes with {note}</h2>
        {ids === null ? (
          <p className="muted">Loading…</p>
        ) : ids.length === 0 ? (
          <p className="muted">No perfumes with this exact note yet. Try searching for a related one.</p>
        ) : (
          <>
            <div className="grid">{ids.slice(0, shown).map((id, i) => <PerfumeCard key={id} id={id} index={i} />)}</div>
            {shown < ids.length && (
              <button className="more" onClick={() => setShown((s) => s + 12)}>
                Show more
              </button>
            )}
          </>
        )}
      </section>
    </article>
  )
}
