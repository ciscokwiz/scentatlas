import { motion } from 'framer-motion'
import { accordColor, inkOn } from '../lib/families'

// The "main accords" bars from fragrance sites, muted and animated in on scroll.
export default function AccordBars({ accords, max = 10, compact = false }: { accords: { name: string; strength: number }[]; max?: number; compact?: boolean }) {
  return (
    <ul className={`accords${compact ? ' is-compact' : ''}`}>
      {accords.slice(0, max).map((a, i) => {
        const color = accordColor(a.name)
        return (
          <li key={a.name}>
            <motion.span
              className="accord-bar"
              style={{ background: color }}
              initial={{ width: 0 }}
              whileInView={{ width: `${Math.max(18, a.strength)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: i * 0.06, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <span className="accord-name" style={{ color: inkOn(color), textShadow: inkOn(color) === '#ffffff' ? undefined : 'none' }}>{a.name}</span>
            </motion.span>
          </li>
        )
      })}
    </ul>
  )
}
