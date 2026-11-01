import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { loadTopPerfumes, type Perfume } from '../lib/data'
import { FAMILIES, familyOf, titleCase } from '../lib/families'
import { buildProfile, QUESTIONS, recommend, type Answers } from '../lib/quiz'
import { loadImages, noteImage, type ImageManifest } from '../lib/images'
import { applyTheme, resetTheme, themeFromColors } from '../lib/theme'
import { longevityLabel, projectionLabel } from '../lib/behavior'
import { noteHref } from '../lib/router'
import PerfumeCard from '../components/PerfumeCard'
import NoteThumb from '../components/NoteThumb'
import Ambient from '../components/Ambient'

const ease = [0.2, 0.7, 0.2, 1] as const

export default function QuizPage() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [pool, setPool] = useState<Perfume[] | null>(null)
  const [images, setImages] = useState<ImageManifest | null>(null)
  const done = step >= QUESTIONS.length

  useEffect(() => {
    document.title = 'Find your scent · Scent Atlas'
    loadTopPerfumes(4000).then(setPool) // start loading while they answer
    loadImages().then(setImages)
    return () => resetTheme()
  }, [])

  const sp = useMemo(() => (done ? buildProfile(answers) : null), [done, answers])
  const matches = useMemo(() => (sp && pool ? recommend(sp, pool, 6) : null), [sp, pool])

  useEffect(() => {
    if (sp) applyTheme(themeFromColors(sp.families.slice(0, 3).map((f) => f.color), { complement: true }))
    else resetTheme()
  }, [sp])

  const pick = (qid: string, oid: string) => {
    setAnswers((a) => ({ ...a, [qid]: oid }))
    setTimeout(() => setStep((s) => s + 1), 260)
  }

  return (
    <article className="quiz">
      <Ambient />
      {!done && (
        <section className="quiz-stage">
          <div className="quiz-progress" aria-label={`Question ${step + 1} of ${QUESTIONS.length}`}>
            {QUESTIONS.map((q, i) => (
              <button key={q.id} className={i === step ? 'is-on' : i < step ? 'is-done' : ''} onClick={() => i < step && setStep(i)} aria-label={`Question ${i + 1}`} />
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.5, ease }}>
              <p className="eyebrow">Find your scent · {step + 1} of {QUESTIONS.length}</p>
              <h1 className="quiz-ask">{QUESTIONS[step].ask}</h1>
              <p className="muted">{QUESTIONS[step].hint}</p>
              <div className={`quiz-options n-${QUESTIONS[step].options.length}`}>
                {QUESTIONS[step].options.map((o, i) => (
                  <motion.button
                    key={o.id}
                    className={`quiz-option${answers[QUESTIONS[step].id] === o.id ? ' is-picked' : ''}`}
                    onClick={() => pick(QUESTIONS[step].id, o.id)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.07, duration: 0.5, ease }}
                    whileHover={{ y: -6 }}
                  >
                    <span className="opt-swatches">
                      {o.swatch.map((f) => (
                        <span key={f} className={`swatch m-${FAMILIES[f].motion}`} style={{ ['--c' as string]: FAMILIES[f].color }} />
                      ))}
                    </span>
                    <strong>{o.title}</strong>
                    <span>{o.line}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </section>
      )}

      {done && sp && (
        <motion.section className="quiz-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <div className="result-head">
            <p className="eyebrow">Your scent profile</p>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease }}>
              {sp.name}
            </motion.h1>
            <p className="result-tag">{titleCase(sp.tagline)}</p>
            <p className="lede">{sp.description}</p>
          </div>

          <div className="result-grid">
            <div className="result-card">
              <h2 className="h-sm">What you’re drawn to</h2>
              <ul className="fam-bars">
                {sp.families.slice(0, 5).map((f, i) => (
                  <li key={f.id}>
                    <span className="fam-name">{f.label}</span>
                    <span className="fam-track">
                      <motion.span style={{ background: f.color }} initial={{ width: 0 }} animate={{ width: `${Math.round((f.share / sp.families[0].share) * 100)}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.9, ease }} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="result-card">
              <h2 className="h-sm">Notes to look for</h2>
              <p className="muted small">When you see these on a perfume, there’s a good chance you’ll like it.</p>
              <div className="chips">
                {sp.notesToTry.map((n) => (
                  <a key={n} href={noteHref(n)} className="chip has-thumb">
                    <NoteThumb note={n} family={familyOf(n)} image={noteImage(images, n)?.src} size={26} />
                    {titleCase(n)}
                  </a>
                ))}
              </div>
            </div>
            <div className="result-card">
              <h2 className="h-sm">Your average match</h2>
              {matches ? (
                <AverageMatch matches={matches} />
              ) : (
                <p className="muted">Finding perfumes…</p>
              )}
            </div>
          </div>

          <h2 className="h-sm result-recs">Perfumes to try first</h2>
          <p className="muted small">Picked from the 4,000 most-loved perfumes, one per brand, so they’re easy to find and sample.</p>
          <div className="grid">{matches ? matches.map((m, i) => <PerfumeCard key={m.perfume.id} id={m.perfume.id} index={i} />) : null}</div>

          <div className="result-actions">
            <button className="more" onClick={() => { setAnswers({}); setStep(0) }}>Retake the quiz</button>
            <p className="muted small">Tip: test 2–3 of these on your skin (not paper) and wait 30 minutes before deciding. That’s when the heart notes show up.</p>
          </div>
        </motion.section>
      )}
    </article>
  )
}

function AverageMatch({ matches }: { matches: { longevity: number; sillage: number }[] }) {
  const lon = matches.reduce((a, m) => a + m.longevity, 0) / matches.length
  const sil = matches.reduce((a, m) => a + m.sillage, 0) / matches.length
  return (
    <div className="avg">
      <div>
        <span className="q-label">Lasts about</span>
        <span className="q-value">{Math.round(lon)} hours</span>
        <span className="q-sub">{longevityLabel(lon)}</span>
      </div>
      <div>
        <span className="q-label">Projection</span>
        <span className="q-sub">{projectionLabel(sil)}</span>
      </div>
    </div>
  )
}
