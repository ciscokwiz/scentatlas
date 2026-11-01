import { useEffect, useState } from 'react'
import { loadIndex, type Index } from './lib/data'
import { slug, useRoute } from './lib/router'
import Home from './pages/Home'
import PerfumePage from './pages/PerfumePage'
import NotePage from './pages/NotePage'
import QuizPage from './pages/QuizPage'
import Header from './components/Header'
import Logo, { LogoMark } from './components/Logo'

export default function App() {
  const route = useRoute()
  const [ix, setIx] = useState<Index | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadIndex().then(setIx, (e: Error) => setError(e.message))
  }, [])

  return (
    <>
      <Header ix={ix} compact={route.page !== 'home'} />
      <main>
        {error && <p className="error">{error}</p>}
        {route.page === 'home' && <Home ix={ix} />}
        {route.page === 'perfume' && ix && <PerfumePage key={route.id} id={route.id} ix={ix} />}
        {route.page === 'quiz' && <QuizPage />}
        {route.page === 'note' && ix && <NotePage key={route.slug} note={ix.notes.find((n) => slug(n) === route.slug) ?? route.slug.replace(/-/g, ' ')} ix={ix} />}
      </main>
      {!ix && !error && (
        <div className="boot" aria-label="Loading">
          <LogoMark size={56} animated />
          <p>Opening the atlas…</p>
        </div>
      )}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Logo size={40} tone="light" />
            <p>Every perfume, in plain words. A beginner’s guide to how fragrances smell, last and change on your skin.</p>
          </div>
          <nav className="footer-links">
            <a href="#home">Explore</a>
            <a href="#find-your-scent">Find your scent</a>
            <a href="#learn">Perfume 101</a>
          </nav>
        </div>
        <p className="footer-fine">
          Data compiled from open community datasets. Behaviour in heat and on skin is modelled from notes and community votes, not lab measurements.
          House names are set in typefaces inspired by each brand’s style; Scent Atlas is not affiliated with any brand.
        </p>
      </footer>
    </>
  )
}
