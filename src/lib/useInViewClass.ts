import { useEffect } from 'react'

/** Adds `in-view` to every `.pausable` element while it's on screen, so off-screen
 *  CSS animations can be paused (see styles.css). */
export function useInViewClass(deps: unknown[] = []) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.pausable'))
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle('in-view', e.isIntersecting)),
      { rootMargin: '100px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
