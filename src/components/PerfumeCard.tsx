import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { loadPerfume, type Perfume } from '../lib/data'
import { perfumeHref } from '../lib/router'
import AccordBars from './AccordBars'
import { brandType, typeCss } from '../lib/brandType'
import { accordColor } from '../lib/families'
import { bottleImage, loadImages, type ImageManifest } from '../lib/images'


export default function PerfumeCard({ id, index = 0 }: { id: number; index?: number }) {
  const [p, setP] = useState<Perfume | null>(null)
  const [images, setImages] = useState<ImageManifest | null>(null)
  useEffect(() => {
    let live = true
    loadPerfume(id).then((x) => live && setP(x))
    loadImages().then((m) => live && setImages(m))
    return () => {
      live = false
    }
  }, [id])

  return (
    <motion.a
      href={p ? perfumeHref(p.id, p.name, p.brand) : undefined}
      className="card"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: (index % 6) * 0.06 }}
    >
      {p ? (
        <>
          {(() => {
            const photo = bottleImage(images, p.brand, p.name)
            return photo ? <img className="card-bottle" src={photo.src} alt="" loading="lazy" /> : null
          })()}
          <span className="card-strip">
            {(p.accords.length ? p.accords.slice(0, 3) : [{ name: 'woody', strength: 1 }]).map((a) => (
              <i key={a.name} style={{ background: accordColor(a.name) }} />
            ))}
          </span>
          <div className="card-head">
            <span className="card-brand" style={typeCss(brandType(p.brand), '0.8rem')}>{p.brand}</span>
            <span className="card-name" style={typeCss(brandType(p.brand), '1.45rem')}>{p.name}</span>
          </div>
          <span className="card-label">main accords</span>
          <AccordBars accords={p.accords} max={5} compact />
        </>
      ) : (
        <div className="card-skeleton" />
      )}
    </motion.a>
  )
}
