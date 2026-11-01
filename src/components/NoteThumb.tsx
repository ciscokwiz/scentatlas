import type { Family } from '../lib/families'

// A note's picture: the real ingredient photo when we have one, otherwise an animated
// swatch that moves the way that family smells.
export default function NoteThumb({ note, family, image, size = 40 }: { note: string; family: Family; image?: string; size?: number }) {
  if (image) {
    return (
      <span className="note-thumb" style={{ width: size, height: size, ['--c' as string]: family.color }}>
        <img src={image} alt={note} loading="lazy" />
      </span>
    )
  }
  return <span className={`swatch m-${family.motion}`} style={{ width: size, height: size, ['--c' as string]: family.color }} />
}
