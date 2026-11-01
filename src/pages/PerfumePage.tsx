import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { genderLabel, loadPerfume, type Index, type Perfume } from '../lib/data'
import {
  evaporation, formatHours, heatAdvice, topFadeHours, layeredNotes, longevityLabel, plainSummary, profile, projection, projectionLabel,
  SKIN_ADVICE, whatYouSmell, type Conditions, type Layer, type Skin,
} from '../lib/behavior'
import { describeNote, familyOf, titleCase } from '../lib/families'
import { noteHref } from '../lib/router'
import AccordBars from '../components/AccordBars'
import Ambient from '../components/Ambient'
import { applyTheme, resetTheme, themeFor, themeFromColors } from '../lib/theme'
import { bottleImage, loadImages, noteImage, type ImageManifest } from '../lib/images'
import type { BottleCutout } from '../lib/images'
import NoteThumb from '../components/NoteThumb'
import { LogoMark } from '../components/Logo'
import { capFor } from '../three/RealBottle'
import { perfumeType, typeCss } from '../lib/brandType'
import PerfumeCard from '../components/PerfumeCard'

const ScentCloud = lazy(() => import('../three/ScentCloud'))
const BottleShowcase = lazy(() => import('../three/BottleShowcase'))

const TIME_STOPS = [0, 0.25, 0.5, 1, 2, 3, 4, 6, 8, 10, 12]
const LAYER_LABEL: Record<Layer, string> = { top: 'Top: first impression', heart: 'Heart: the main character', base: 'Base: what lingers' }

const tempWord = (t: number) => (t < 10 ? 'Cold' : t < 18 ? 'Cool' : t < 26 ? 'Mild' : t < 32 ? 'Warm' : 'Hot')

export default function PerfumePage({ id, ix }: { id: number; ix: Index }) {
  const [p, setP] = useState<Perfume | null | undefined>(undefined)
  useEffect(() => {
    loadPerfume(id).then(setP)
  }, [id])
  if (p === undefined)
    return (
      <div className="page-loading">
        <LogoMark size={52} animated />
        <span>Opening the bottle…</span>
      </div>
    )
  if (p === null) return <div className="page-loading">We couldn’t find that perfume.</div>
  return <PerfumeView p={p} ix={ix} />
}

function PerfumeView({ p, ix }: { p: Perfume; ix: Index }) {
  const notes = useMemo(() => layeredNotes(p), [p])
  const prof = useMemo(() => profile(p), [p])
  const summary = useMemo(() => plainSummary(p, prof), [p, prof])
  const heat = useMemo(() => heatAdvice(prof), [prof])
  const houseType = useMemo(() => perfumeType(p, prof.mix[0]?.family), [p, prof])

  const [stop, setStop] = useState(0)
  const [tempC, setTempC] = useState(22)
  const [skin, setSkin] = useState<Skin>('normal')
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [images, setImages] = useState<ImageManifest | null>(null)
  const [bottle3d, setBottle3d] = useState(false)
  useEffect(() => {
    loadImages().then(setImages)
  }, [])
  const bottle = bottleImage(images, p.brand, p.name)
  const noteImages = useMemo(() => {
    const out: Record<string, string> = {}
    for (const n of notes) {
      const img = noteImage(images, n.note)
      if (img) out[n.note] = img.src
    }
    return out
  }, [images, notes])
  // The bottle's own colours drive the page palette once its photo has been analysed.
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const onBottle = (cut: BottleCutout) => {
    // The 3D scene can finish loading after the user has navigated away: don't repaint then.
    if (!mounted.current) return
    setBottle3d(true)
    const accordColors = themeFor(p)
    applyTheme(themeFromColors([...cut.colors, accordColors.c1, accordColors.c2].slice(0, 3), { complement: true }))
  }
  const hours = TIME_STOPS[stop]
  const cond = useRef<Conditions>({ hours, tempC, skin })
  cond.current = { hours, tempC, skin }

  // "Play the day": step through the time stops automatically.
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      setStop((s) => {
        if (s >= TIME_STOPS.length - 1) {
          setPlaying(false)
          return s
        }
        return s + 1
      })
    }, 1300)
    return () => clearInterval(t)
  }, [playing])

  useEffect(() => {
    document.title = `${p.name} by ${p.brand} · Scent Atlas`
    applyTheme(themeFor(p, { complement: true }))
    window.scrollTo({ top: 0, behavior: 'instant' })
    return () => resetTheme()
  }, [p])

  const smellNow = whatYouSmell(notes, cond.current, prof)
  const proj = projection(cond.current, prof)
  // The generated bottle's liquid uses the same colour the page background is built from.
  const tint = useMemo(() => themeFor(p).c1, [p])
  const focusNote = hovered ?? selected
  const fromAccords = notes.some((n) => n.fromAccord)
  const rarest = useMemo(() => {
    const all = [...p.top, ...p.heart, ...p.base, ...p.flat]
    const counts = all.map((n) => ({ n, c: ix.noteCounts[ix.notes.indexOf(n)] ?? 0 })).filter((x) => x.c > 0)
    counts.sort((a, b) => a.c - b.c)
    return { rare: counts[0], common: counts[counts.length - 1] }
  }, [p, ix])

  return (
    <article className="perfume">
      <Ambient />
      <section className="perfume-top">
        <motion.div className="perfume-intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p className="eyebrow house" style={typeCss(houseType, '1.2rem')}>{p.brand}</p>
          <h1 style={typeCss(houseType, 'clamp(2.6rem, 4.8vw, 4.3rem)')}>{p.name}</h1>
          <div className="meta">
            {p.year && <span>{p.year}</span>}
            {genderLabel(p.gender) && <span>{genderLabel(p.gender)}</span>}
            {p.rating && <span>★ {p.rating.toFixed(2)} community rating</span>}
          </div>
          <div className="showcase">
            <Suspense fallback={null}>
              <BottleShowcase
                seed={p.id + 3}
                liquid={tint}
                cap={capFor(prof.mix[0]?.family.id, p.id)}
                label={{ title: p.name, subtitle: p.brand, type: houseType }}
                photo={bottle?.src}
                onPhoto={onBottle}
              />
            </Suspense>
          </div>
          <div className="plain">
            <p className="plain-head">{summary.headline}</p>
            <p>{summary.think}</p>
            {summary.journey && <p className="muted">{summary.journey}</p>}
            {p.description && (
              <p className="desc">
                {p.description.text}{' '}
                <a className="credit" href={p.description.url ?? 'https://www.scento.com/perfume-database'}>Description: Scento, CC BY 4.0</a>
              </p>
            )}
          </div>
          <div className="quick">
            <div>
              <span className="q-label">Lasts</span>
              <span className="q-value">~{Math.round(prof.longevityHours)} h</span>
              <span className="q-sub">{longevityLabel(prof.longevityHours)}</span>
            </div>
            <div>
              <span className="q-label">Projection</span>
              <span className="q-value">{prof.sillage < 0.3 ? 'Soft' : prof.sillage < 0.55 ? 'Moderate' : prof.sillage < 0.8 ? 'Strong' : 'Loud'}</span>
              <span className="q-sub">{prof.sillageFrom === 'votes' ? `${prof.sillageVotes.toLocaleString()} votes` : 'estimated'}</span>
            </div>
            <div>
              <span className="q-label">Best in</span>
              <span className="q-value">{[...prof.seasons].sort((a, b) => b.score - a.score)[0].name}</span>
              <span className="q-sub">{prof.dayNight > 0.6 ? 'evenings' : prof.dayNight < 0.4 ? 'daytime' : 'day or night'}</span>
            </div>
          </div>
          {bottle && !bottle3d && (
            <figure className="photo">
              <img src={bottle.src} alt={`${p.name} bottle`} loading="lazy" referrerPolicy="no-referrer" onError={(e) => ((e.currentTarget.parentElement as HTMLElement).style.display = 'none')} />
            </figure>
          )}
        </motion.div>

        <div className="stage">
          <div className="stage-canvas">
            <Suspense fallback={<div className="stage-loading">Releasing the notes…</div>}>
              <ScentCloud notes={notes} cond={cond} prof={prof} hovered={hovered} onHover={setHovered} onSelect={(n) => setSelected((s) => (s === n ? null : n))} seed={p.id + 3} tint={tint} noteImages={noteImages} />
            </Suspense>
            <div className="tier-tags" aria-hidden>
              <span style={{ top: '14%' }}>Top</span>
              <span style={{ top: '38%' }}>Heart</span>
              <span style={{ top: '60%' }}>Base</span>
              <span style={{ top: '86%' }}>Projection ring</span>
            </div>
            <AnimatePresence>
              {focusNote && (
                <motion.div key={focusNote} className="note-pop" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <span className="dot" style={{ background: familyOf(focusNote).color }} />
                  <strong>{titleCase(focusNote)}</strong>
                  <span className="fam">{familyOf(focusNote).label}</span>
                  <p>{describeNote(focusNote)}</p>
                  {!fromAccords && <a href={noteHref(focusNote)}>More perfumes with {focusNote} →</a>}
                </motion.div>
              )}
            </AnimatePresence>
            <p className="stage-hint">Drag to rotate · hover a note to learn what it smells like</p>
          </div>

          <div className="controls">
            <div className="control">
              <div className="control-head">
                <label htmlFor="time">Time on skin</label>
                <span className="control-value">{formatHours(hours)}</span>
                <button className="play" onClick={() => { if (stop >= TIME_STOPS.length - 1) setStop(0); setPlaying((x) => !x) }}>
                  {playing ? 'Pause' : '▶ Play the day'}
                </button>
              </div>
              <input id="time" type="range" min={0} max={TIME_STOPS.length - 1} step={1} value={stop} onChange={(e) => { setPlaying(false); setStop(Number(e.target.value)) }} />
              <div className="ticks"><span>Spray</span><span>1 h</span><span>4 h</span><span>12 h</span></div>
            </div>
            <div className="control">
              <div className="control-head">
                <label htmlFor="temp">Weather</label>
                <span className="control-value">{tempWord(tempC)} · {tempC}°C</span>
              </div>
              <input id="temp" type="range" min={0} max={40} value={tempC} onChange={(e) => setTempC(Number(e.target.value))} className="temp" />
              <div className="ticks"><span>Freezing</span><span>Room</span><span>Heatwave</span></div>
            </div>
            <div className="control">
              <div className="control-head"><span className="label">Skin</span></div>
              <div className="seg">
                {(['dry', 'normal', 'oily'] as Skin[]).map((s) => (
                  <button key={s} className={skin === s ? 'is-on' : ''} onClick={() => setSkin(s)}>{titleCase(s)}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="now">
            <div>
              <span className="q-label">At {formatHours(hours).toLowerCase()}, you’d mostly smell</span>
              <p className="now-notes">
                {smellNow.length ? smellNow.map((n, i) => (
                  <span key={n.note} style={{ color: n.family.color }}>{n.note}{i < smellNow.length - 1 ? ', ' : ''}</span>
                )) : <span className="muted">almost nothing. It has faded to a faint skin scent.</span>}
              </p>
            </div>
            <div>
              <span className="q-label">Projection right now</span>
              <p>{projectionLabel(proj)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section two-col">
        <div>
          <h2 className="h-sm">Main accords</h2>
          <p className="muted small">The overall vibe. Longer bars mean that character is stronger.{p.accordsAreRanked && ' (Bar lengths reflect ranking.)'}</p>
          <AccordBars accords={p.accords} />
        </div>
        <div>
          <h2 className="h-sm">How it behaves</h2>
          <div className="behave">
            <div className="b-card">
              <span className="b-icon hot" aria-hidden />
              <h3>In heat</h3>
              <p>{heat.hot}</p>
            </div>
            <div className="b-card">
              <span className="b-icon cold" aria-hidden />
              <h3>In the cold</h3>
              <p>{heat.cold}</p>
            </div>
            <div className="b-card">
              <span className="b-icon skin" aria-hidden />
              <h3>On {skin} skin</h3>
              <p>{SKIN_ADVICE[skin]}</p>
            </div>
            <div className="b-card">
              <h3>Seasons</h3>
              <div className="seasons">
                {prof.seasons.map((s) => (
                  <div key={s.name}>
                    <motion.span initial={{ height: 0 }} whileInView={{ height: `${s.score * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }} />
                    <em>{s.name}</em>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="source small">
            Longevity {prof.longevityFrom === 'votes' ? `from ${prof.longevityVotes.toLocaleString()} community votes` : 'estimated from its notes'};
            heat, cold and season guidance modelled from its accords.
          </p>
        </div>
      </section>

      <section className="section">
        <h2 className="h-sm">{fromAccords ? 'Its character, explained' : 'The notes, explained'}</h2>
        {fromAccords && <p className="muted small">{p.sourceNote ?? 'This perfume’s full note list isn’t in our data yet, so we’re showing its accords.'}</p>}
        <div className="notes-cols">
          {(['top', 'heart', 'base'] as Layer[]).map((layer) => {
            const list = notes.filter((n) => n.layer === layer)
            if (!list.length) return null
            return (
              <div key={layer}>
                <h3 className="layer-title">{LAYER_LABEL[layer]}</h3>
                {list.map((n, i) => (
                  <motion.a
                    key={n.note}
                    href={n.fromAccord ? undefined : noteHref(n.note)}
                    className="note-card"
                    onMouseEnter={() => setHovered(n.note)}
                    onMouseLeave={() => setHovered(null)}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <NoteThumb note={n.note} family={n.family} image={noteImages[n.note]} />
                    <span>
                      <strong>{titleCase(n.note)}</strong>
                      <em>{n.family.label}</em>
                      <p>{describeNote(n.note)}</p>
                    </span>
                  </motion.a>
                ))}
              </div>
            )
          })}
        </div>
        {p.flat.length > 0 && <p className="source small">This perfume publishes its notes as a single list. We placed them into layers by how heavy each kind of note usually is.</p>}
      </section>

      <section className="section facts">
        <h2 className="h-sm">Good to know</h2>
        <ul>
          {rarest.rare && rarest.rare.c < 800 && (
            <li><strong>{titleCase(rarest.rare.n)}</strong> is its most unusual note. Only {rarest.rare.c.toLocaleString()} of {ix.items.length.toLocaleString()} perfumes in our atlas use it.</li>
          )}
          {rarest.common && <li><strong>{titleCase(rarest.common.n)}</strong> is its most familiar note. It appears in {Math.round((rarest.common.c / ix.items.length) * 100)}% of perfumes, so it may feel recognisable.</li>}
          <li>Top notes fade in about <strong>{formatHours(topFadeHours({ tempC: 22, skin: 'normal' }, prof.longevityHours)).toLowerCase()}</strong> at room temperature. Wait that long before deciding whether you like it.</li>
          <li>In a {tempWord(30).toLowerCase()} 30°C room, everything evaporates about <strong>{Math.round(evaporation(30) * 100 - 100)}% faster</strong> than at 22°C: louder, but shorter.</li>
          <li>Testing tip: spray on skin, not just a paper strip. Your skin’s warmth and oils change how the heart and base notes develop.</li>
        </ul>
      </section>

      {p.similar.length > 0 && (
        <section className="section">
          <h2 className="h-sm">If you like this, try</h2>
          <div className="grid">{p.similar.map((sid, i) => <PerfumeCard key={sid} id={sid} index={i} />)}</div>
        </section>
      )}
    </article>
  )
}
