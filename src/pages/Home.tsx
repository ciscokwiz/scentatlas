import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { Index } from '../lib/data'
import { FAMILIES, familyOf, titleCase } from '../lib/families'
import { noteHref, perfumeHref } from '../lib/router'
import SearchBox from '../components/SearchBox'
import PerfumeCard from '../components/PerfumeCard'
import { noteIllustration } from '../lib/illustrations'
import { loadImages, noteImage, type ImageManifest } from '../lib/images'
import { useInViewClass } from '../lib/useInViewClass'

const HeroScene = lazy(() => import('../three/HeroScene'))

// The perfumes from the reference image that inspired the project.
const ALMOND: [string, string][] = [
  ['Poison Girl', 'Christian Dior'],
  ['Perfect', 'Marc Jacobs'],
  ['Not Another Cherry', "Fine'ry"],
  ['Whipped Almond No.14', 'Mix:Bar'],
  ['Good Girl', 'Carolina Herrera'],
  ['Fall Cashmere', 'Skylar'],
]

const STARTER_NOTES = ['vanilla', 'bergamot', 'rose', 'sandalwood', 'lavender', 'sea notes', 'cinnamon', 'jasmine', 'almond', 'coffee', 'leather', 'peach', 'oud', 'mint', 'tonka bean', 'cardamom']

const GLOSS_TINTS = ['#E7AFA6', '#D49A5E', '#B9C4A0', '#A9C1CB', '#C3B6DA', '#E2C46B']

const TRY = [['Good Girl', 'Carolina Herrera'], ['Baccarat Rouge 540', 'Maison Francis Kurkdjian'], ['Coco Mademoiselle', 'Chanel']]

const fade = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.8, ease: [0.2, 0.7, 0.2, 1] as const },
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '')

/** Finds a perfume by name + house, tolerating house spellings ('Christian Dior' vs 'Dior'). */
function find(ix: Index, name: string, brand: string) {
  const n = fold(name), b = fold(brand)
  return ix.items.find((i) => fold(i[1]) === n && (fold(i[2]) === b || fold(i[2]).includes(b) || b.includes(fold(i[2]))))
}

export default function Home({ ix }: { ix: Index | null }) {
  useEffect(() => {
    document.title = 'Scent Atlas'
  }, [])
  useInViewClass([ix])
  const [images, setImages] = useState<ImageManifest | null>(null)
  useEffect(() => {
    loadImages().then(setImages)
  }, [])
  const almondIds = useMemo(() => (ix ? ALMOND.map(([n, b]) => find(ix, n, b)?.[0]).filter((x): x is number => x != null) : []), [ix])
  const tries = useMemo(() => (ix ? TRY.map(([n, b]) => find(ix, n, b)).filter(Boolean) : []), [ix])
  // Newest releases people are already wearing: this year and last, most-voted first.
  const fresh = useMemo(() => {
    if (!ix) return []
    const newest = Math.max(...ix.items.slice(0, 5000).map((i) => i[3] ?? 0))
    return ix.items.filter((i) => (i[3] ?? 0) >= newest - 1).slice(0, 12)
  }, [ix])
  const newestYear = fresh.length ? Math.max(...fresh.map((i) => i[3] ?? 0)) : null

  return (
    <>
      <section className="hero pausable">
        <div className="hero-canvas">
          <Suspense fallback={null}>
            <HeroScene />
          </Suspense>
        </div>
        <div className="hero-copy">
          <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            A perfume guide for beginners
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}>
            Every perfume,
            <br />
            <em>in plain words.</em>
          </motion.h1>
          <motion.p className="lede" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.15 }}>
            Search any perfume. See what it smells like, how long it lasts, and how heat and your skin change it.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3 }}>
            <SearchBox ix={ix} />
            {tries.length > 0 && (
              <p className="try">
                Try{' '}
                {tries.map((t, i) => (
                  <span key={t![0]}>
                    <a href={perfumeHref(t![0], t![1], t![2])}>{t![1]}</a>
                    {i < tries.length - 1 ? ' · ' : ''}
                  </span>
                ))}
                {' · '}
                <a href={noteHref('vanilla')}>anything with vanilla</a>
              </p>
            )}
            <a href="#find-your-scent" className="quiz-cta">
              <span className="quiz-cta-dots" aria-hidden>
                <i style={{ background: FAMILIES.citrus.color }} />
                <i style={{ background: FAMILIES.floral.color }} />
                <i style={{ background: FAMILIES.gourmand.color }} />
              </span>
              New to perfume? <strong>Find your scent in 3 questions</strong> →
            </a>
          </motion.div>
        </div>
        <div className="scroll-cue" aria-hidden>
          <span />
        </div>
      </section>

      <section id="learn" className="section learn band band-plum pausable">
        <motion.div {...fade} className="section-head">
          <p className="eyebrow">Perfume 101</p>
          <h2>The only words you actually need</h2>
          <p className="muted">A perfume isn’t one smell. It’s a story that changes over a few hours, because some ingredients evaporate faster than others.</p>
        </motion.div>

        <div className="pyramid-explain">
          <motion.div {...fade} className="pyramid-visual" aria-hidden>
            {(['top', 'heart', 'base'] as const).map((t) => (
              <div key={t} className={`tier tier-${t}`}>
                {Array.from({ length: t === 'top' ? 14 : t === 'heart' ? 10 : 7 }).map((_, i) => (
                  <span key={i} style={{ ['--i' as string]: i, ['--c' as string]: t === 'top' ? FAMILIES.citrus.color : t === 'heart' ? FAMILIES.floral.color : FAMILIES.amber.color }} />
                ))}
              </div>
            ))}
          </motion.div>
          <div className="pyramid-copy">
            {[
              ['Top notes', 'The first impression', 'What you smell the moment you spray. Light, bright ingredients like citrus that evaporate within 15–30 minutes. Don’t judge a perfume by these alone.'],
              ['Heart notes', 'The main character', 'Show up as the top fades and last a few hours. Usually flowers, fruits or spices. This is what the perfume is really about.'],
              ['Base notes', 'What lingers', 'Heavy, slow ingredients like woods, vanilla, musk and resins. They anchor everything and are what you smell on your sweater the next day.'],
            ].map(([t, s, d], i) => (
              <motion.div {...fade} transition={{ ...fade.transition, delay: i * 0.1 }} key={t} className="tier-copy">
                <h3>
                  {t} <span>{s}</span>
                </h3>
                <p>{d}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="glossary">
          {[
            ['Note', 'One recognisable smell in the perfume: “almond”, “rose”, “cedar”. Like an ingredient in a recipe.'],
            ['Accord', 'The overall vibe that notes create together: “sweet”, “woody”, “fresh”. Like describing a dish as “spicy”.'],
            ['Longevity', 'How many hours you can still smell it on your skin.'],
            ['Sillage', 'French for “wake”, as in a boat. How far the scent travels around you, and the trail you leave behind.'],
            ['Dry-down', 'How the perfume smells after an hour or two, once it has settled. Often the best part.'],
            ['Projection', 'How loud a perfume is: can others smell it from across the room, or only when they hug you?'],
          ].map(([w, d], i) => (
            <motion.div {...fade} transition={{ ...fade.transition, delay: (i % 3) * 0.08 }} key={w} className="gloss" style={{ ['--tile' as string]: GLOSS_TINTS[i % GLOSS_TINTS.length] }}>
              <h4>{w}</h4>
              <p>{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="section band band-champagne">
        <motion.div {...fade} className="section-head">
          <p className="eyebrow">Collection</p>
          <h2 className="script-title">almond notes</h2>
          <p className="muted">Soft, nutty, marzipan-like. Almond is in under 2% of perfumes, so these stand out.</p>
        </motion.div>
        <div className="grid">
          {almondIds.map((id, i) => (
            <PerfumeCard key={id} id={id} index={i} />
          ))}
        </div>
      </section>

      <section className="section band band-sage">
        <motion.div {...fade} className="section-head">
          <p className="eyebrow">Start with a smell you know</p>
          <h2>Pick an ingredient, find perfumes built around it</h2>
          <p className="muted">Love vanilla ice cream, fresh lemons or a cup of chai? Start there.</p>
        </motion.div>
        <div className="note-tiles">
          {STARTER_NOTES.map((n, i) => {
            const fam = familyOf(n)
            const img = noteImage(images, n)
            const isPhoto = !!img && !img.src.startsWith('data:')
            const pic = img?.src ?? noteIllustration(n)
            return (
              <motion.a
                key={n}
                href={noteHref(n)}
                className="note-tile"
                style={{ ['--c' as string]: fam.color }}
                initial={{ opacity: 0, y: 24, scale: 0.92 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: (i % 8) * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <span className={`note-tile-pic${isPhoto ? ' is-photo' : ''}`}>{pic ? <img src={pic} alt="" /> : <span className={`swatch m-${fam.motion}`} />}</span>
                <span className="note-tile-name">{titleCase(n)}</span>
                <span className="note-tile-fam">{fam.label}</span>
              </motion.a>
            )
          })}
        </div>
      </section>

      <section className="quiz-band pausable">
        <div className="quiz-band-inner">
          <motion.div {...fade}>
            <p className="eyebrow">Find your scent</p>
            <h2>
              Not sure where to begin?
              <br />
              <em>Three questions. No jargon.</em>
            </h2>
            <p className="lede">Tell us a moment you love, how noticeable you want to be and when you’ll wear it. We’ll build your scent profile and pick perfumes to try first.</p>
            <a href="#find-your-scent" className="btn-primary">Start the quiz →</a>
          </motion.div>
          <motion.div {...fade} className="quiz-band-art" aria-hidden>
            {['citrus', 'floral', 'gourmand', 'woody'].map((f, i) => (
              <span key={f} className={`qb-orb qb-${i}`} style={{ background: FAMILIES[f].color }}>
                <img src={noteIllustration(['lemon', 'rose', 'vanilla', 'sandalwood'][i]) ?? ''} alt="" />
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {fresh.length > 0 && (
        <section className="section band band-sand">
          <motion.div {...fade} className="section-head">
            <p className="eyebrow">New releases</p>
            <h2>Just out: {newestYear! - 1} and {newestYear}</h2>
            <p className="lede">The newest perfumes already getting a lot of votes.</p>
          </motion.div>
          <div className="grid">{fresh.map((it, i) => <PerfumeCard key={it[0]} id={it[0]} index={i} />)}</div>
        </section>
      )}

      <section className="section band band-blush">
        <motion.div {...fade} className="section-head">
          <p className="eyebrow">Most loved</p>
          <h2>The perfumes people talk about most</h2>
        </motion.div>
        <div className="grid">{ix && ix.items.slice(0, 12).map((it, i) => <PerfumeCard key={it[0]} id={it[0]} index={i} />)}</div>
      </section>
    </>
  )
}
