import { useEffect, useState } from 'react'

// Tiny hash router. Routes are plain "#name" hashes (letters, digits, hyphens) so they work
// on any static host, including sandboxed previews:
//   #perfume-123   #note-tonka-bean   #find-your-scent   #learn   (empty = home)
export type Route =
  | { page: 'home'; anchor?: string }
  | { page: 'perfume'; id: number }
  | { page: 'note'; slug: string }
  | { page: 'quiz' }

export const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function parse(hash: string): Route {
  const h = hash.replace(/^#/, '')
  let m = h.match(/^perfume-(\d+)/) ?? h.match(/^\/p\/(\d+)/)
  if (m) return { page: 'perfume', id: Number(m[1]) }
  if (h === 'quiz' || h === 'find-your-scent') return { page: 'quiz' }
  m = h.match(/^note-([a-z0-9-]+)$/)
  if (m) return { page: 'note', slug: m[1] }
  m = h.match(/^\/note\/(.+)$/)
  if (m) return { page: 'note', slug: slug(decodeURIComponent(m[1])) }
  return { page: 'home', anchor: h || undefined }
}

export function useRoute() {
  const [route, setRoute] = useState(() => parse(location.hash))
  useEffect(() => {
    const on = () => {
      const r = parse(location.hash)
      setRoute(r)
      if (r.page === 'home' && r.anchor) {
        setTimeout(() => document.getElementById(r.anchor!)?.scrollIntoView({ behavior: 'smooth' }), 60)
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' })
      }
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export const perfumeHref = (id: number, _name = '', _brand = '') => `#perfume-${id}`
export const noteHref = (note: string) => `#note-${slug(note)}`
