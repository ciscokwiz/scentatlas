import { useId } from 'react'

// Scent Atlas mark: a scent droplet drawn as a globe (meridians + latitudes), with a
// small spritz glint. The wordmark is set in spaced Didone capitals, like a perfume house.
export function LogoMark({ size = 28, glint = 'currentColor', animated = false }: { size?: number; glint?: string; animated?: boolean }) {
  const id = useId().replace(/:/g, '')
  const drop = 'M24 3C30 13 39 21 39 30.5a15 15 0 0 1-30 0C9 21 18 13 24 3Z'
  return (
    <svg className={`logo-svg${animated ? ' is-animated' : ''}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E7AFA6" />
          <stop offset=".55" stopColor="#D49A5E" />
          <stop offset="1" stopColor="#8E73A8" />
        </linearGradient>
        <clipPath id={`c${id}`}>
          <path d={drop} />
        </clipPath>
      </defs>
      <path d={drop} fill={`url(#g${id})`} />
      <ellipse cx="18.5" cy="25" rx="3.2" ry="6" fill="#fff" opacity=".28" transform="rotate(20 18.5 25)" />
      <g clipPath={`url(#c${id})`} fill="none" stroke="#FFF8F0" strokeWidth="1.7" opacity=".9">
        <g className="logo-globe">
          <ellipse cx="24" cy="30.5" rx="6.5" ry="15" />
          <path d="M24 12v34" />
        </g>
        <path d="M8 25.5Q24 21.5 40 25.5M8 31h32M9 37.5Q24 41 39 37.5" />
      </g>
      <path d={drop} fill="none" stroke={glint} strokeOpacity=".28" strokeWidth="1" />
      <path className="logo-glint" d="M40 4.5l1.1 3.4 3.4 1.1-3.4 1.1L40 13.5l-1.1-3.4-3.4-1.1 3.4-1.1Z" fill={glint} />
    </svg>
  )
}

export default function Logo({ size = 28, tone = 'dark', stacked = false }: { size?: number; tone?: 'dark' | 'light'; stacked?: boolean }) {
  return (
    <span className={`logo-lockup is-${tone}${stacked ? ' is-stacked' : ''}`}>
      <LogoMark size={size} glint={tone === 'light' ? '#F6E7C8' : '#3A2433'} />
      <span className="logo-word">
        Scent<span className="logo-amp"> </span>Atlas
      </span>
    </span>
  )
}
