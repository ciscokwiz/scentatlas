import { useEffect, useState } from 'react'
import type { Index } from '../lib/data'
import SearchBox from './SearchBox'
import Logo from './Logo'

export default function Header({ ix, compact }: { ix: Index | null; compact: boolean }) {
  // On the home page the big hero search is visible first; the header search slides in
  // once you scroll past it. Everywhere else it is always there.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > window.innerHeight * 0.55)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const showSearch = compact || scrolled
  return (
    <header className={`header${compact || scrolled ? ' is-compact' : ''}`}>
      <a href="#home" className="logo" aria-label="Scent Atlas home">
        <Logo size={36} />
      </a>
      <div className={`header-search${showSearch ? ' is-on' : ''}`} aria-hidden={!showSearch}>
        <SearchBox ix={ix} small />
      </div>
      <nav className="nav">
        <a href="#home">Explore</a>
        <a href="#find-your-scent" className="nav-cta">Find your scent</a>
        <a href="#learn" onClick={() => setTimeout(() => document.getElementById('learn')?.scrollIntoView({ behavior: 'smooth' }), 80)}>
          Perfume 101
        </a>
      </nav>
    </header>
  )
}
