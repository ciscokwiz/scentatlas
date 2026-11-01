import { useMemo, useRef, useState } from 'react'
import { search, searchNotes, type Index } from '../lib/data'
import { familyOf, titleCase } from '../lib/families'
import { noteHref, perfumeHref } from '../lib/router'

export default function SearchBox({ ix, small = false, autoFocus = false }: { ix: Index | null; small?: boolean; autoFocus?: boolean }) {
  // Phones get a placeholder short enough not to be cut off.
  const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    if (!ix || q.trim().length < 2) return []
    const notes = searchNotes(ix, q, small ? 2 : 3).map((n) => ({ kind: 'note' as const, href: noteHref(n), title: titleCase(n), sub: `Note · ${familyOf(n).label}`, color: familyOf(n).color }))
    const perfumes = search(ix, q, small ? 7 : 9).map((it) => ({ kind: 'perfume' as const, href: perfumeHref(it[0], it[1], it[2]), title: it[1], sub: `${it[2]}${it[3] ? ` · ${it[3]}` : ''}`, color: '' }))
    return [...perfumes, ...notes]
  }, [ix, q, small])

  const go = (href: string) => {
    location.hash = href
    setQ('')
    setOpen(false)
    input.current?.blur()
  }

  return (
    <div className={`search${small ? ' is-small' : ''}`}>
      <svg className="search-icon" viewBox="0 0 24 24" aria-hidden>
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        ref={input}
        autoFocus={autoFocus}
        value={q}
        placeholder={ix ? (small ? 'Search perfumes or notes' : narrow ? `Search ${ix.items.length.toLocaleString()} perfumes` : `Search ${ix.items.length.toLocaleString()} perfumes, brands or notes…`) : 'Loading perfumes…'}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((a) => Math.min(results.length - 1, a + 1))
          else if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1))
          else if (e.key === 'Enter' && results[active]) go(results[active].href)
          else if (e.key === 'Escape') setOpen(false)
        }}
        aria-label="Search perfumes"
        role="combobox"
        aria-expanded={open && results.length > 0}
      />
      {open && results.length > 0 && (
        <ul className="search-results" role="listbox">
          {results.map((r, i) => (
            <li key={r.href} role="option" aria-selected={i === active}>
              <a
                href={r.href}
                className={i === active ? 'is-active' : ''}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  go(r.href)
                }}
              >
                {r.kind === 'note' ? <span className="dot" style={{ background: r.color }} /> : <span className="dot is-hollow" />}
                <span className="r-title">{r.title}</span>
                <span className="r-sub">{r.sub}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {open && ix && q.trim().length >= 2 && results.length === 0 && <div className="search-results empty">No match yet. Try a brand, or a single word from the name.</div>}
    </div>
  )
}
