import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import type { TypeStyle } from '../lib/brandType'

// A realistic perfume bottle, built the way real flacons are: thick glass walls and a
// heavy glass base, liquid inside with a dip tube, a metal collar and a weighty cap,
// and a printed label. Six common bottle archetypes are picked per perfume (seeded),
// and cap finish follows the scent (warm → gold, fresh → silver, dark → black lacquer).

export type CapFinish = 'gold' | 'silver' | 'black' | 'wood' | 'rose'
type Kind = 'flacon' | 'tall' | 'square' | 'cylinder' | 'faceted' | 'flask'
const KINDS: Kind[] = ['flacon', 'tall', 'square', 'cylinder', 'faceted', 'flask', 'flacon', 'tall']

interface Props {
  seed: number
  liquid: string
  cap?: CapFinish
  label?: { title: string; subtitle?: string; type?: TypeStyle }
  /** Overall height in scene units (body + cap). */
  height?: number
  sway?: boolean
  spin?: boolean
  kind?: Kind
}

function roundedRect(w: number, d: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2, y = -d / 2
  r = Math.min(r, w / 2 - 0.001, d / 2 - 0.001)
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + d - r)
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d)
  s.lineTo(x + r, y + d)
  s.quadraticCurveTo(x, y + d, x, y + d - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/** Vertical prism with soft bevelled edges: cross-section w×d, from y0 up by h. */
function prism(w: number, d: number, h: number, r: number, bevel: number, y0 = 0) {
  const g = new THREE.ExtrudeGeometry(roundedRect(w, d, r), {
    depth: h - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 4,
    curveSegments: 10,
  })
  g.rotateX(-Math.PI / 2)
  g.translate(0, y0 + bevel, 0)
  return g
}

function lathe(points: [number, number][], segments: number, zScale = 1) {
  const g = new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments)
  if (zScale !== 1) g.scale(1, 1, zScale)
  return g
}

function rng(seed: number) {
  let s = (Math.abs(seed) * 9301 + 49297) % 233280
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280)
}

interface Spec {
  kind: Kind
  glass: THREE.BufferGeometry
  liquid: THREE.BufferGeometry
  bodyH: number
  front: number // z of the front face (for the label)
  labelW: number
  topR: number // neck radius
  cap: THREE.BufferGeometry
  capH: number
}

function build(seed: number, forced?: Kind): Spec {
  const r = rng(seed)
  const kind = forced ?? KINDS[Math.floor(r() * KINDS.length)]
  const wall = 0.035, base = 0.11
  switch (kind) {
    case 'flacon':
    case 'tall':
    case 'square': {
      const [w, d, h] = kind === 'flacon' ? [0.66, 0.38, 0.8] : kind === 'tall' ? [0.46, 0.3, 1.02] : [0.7, 0.42, 0.64]
      const bevel = 0.03
      const glass = prism(w, d, h, kind === 'square' ? 0.04 : 0.07, bevel)
      const liquid = prism(w - wall * 2 - bevel, d - wall * 2 - bevel, h * 0.78, 0.04, 0.012, base)
      const capH = kind === 'tall' ? 0.36 : kind === 'square' ? 0.3 : 0.26
      const cap =
        kind === 'tall'
          ? new THREE.CylinderGeometry(0.11, 0.11, capH, 48)
          : prism(kind === 'square' ? w * 0.62 : w * 0.42, kind === 'square' ? d * 0.95 : d * 0.62, capH, 0.03, 0.015, -capH / 2)
      return { kind, glass, liquid, bodyH: h, front: d / 2 + bevel + 0.003, labelW: w * 0.8, topR: 0.075, cap, capH }
    }
    case 'cylinder': {
      const R = 0.3, h = 0.92
      const glass = lathe([[0, 0], [R - 0.02, 0], [R, 0.025], [R, h - 0.05], [R - 0.03, h - 0.005], [0.08, h], [0, h]], 72)
      const liquid = lathe([[0, base], [R - wall - 0.01, base], [R - wall, base + 0.02], [R - wall, h * 0.8], [0, h * 0.8]], 64)
      const capH = 0.36
      const cap = new THREE.CylinderGeometry(R * 0.97, R * 0.97, capH, 72)
      return { kind, glass, liquid, bodyH: h, front: R + 0.006, labelW: R * 1.3, topR: 0.08, cap, capH }
    }
    case 'faceted': {
      const R = 0.36, h = 0.78
      const glass = lathe([[0, 0], [R * 0.9, 0], [R, 0.08], [R, h * 0.62], [R * 0.55, h * 0.95], [0.08, h], [0, h]], 8)
      glass.rotateY(Math.PI / 8)
      const liquid = lathe([[0, base], [R * 0.86, base], [R - wall * 1.4, base + 0.06], [R - wall * 1.4, h * 0.6], [R * 0.5, h * 0.78], [0, h * 0.78]], 8)
      liquid.rotateY(Math.PI / 8)
      const capH = 0.34
      const cap = new THREE.OctahedronGeometry(0.19, 0)
      cap.scale(1, 0.95, 1)
      return { kind, glass, liquid, bodyH: h, front: R * 0.93 + 0.006, labelW: R * 1.05, topR: 0.07, cap, capH }
    }
    case 'flask':
    default: {
      const R = 0.38, h = 0.8
      const glass = lathe([[0, 0], [R * 0.7, 0], [R * 0.95, 0.07], [R, h * 0.4], [R * 0.85, h * 0.8], [0.09, h * 0.98], [0, h]], 64, 0.55)
      const liquid = lathe([[0, base], [R * 0.66, base], [R * 0.9, 0.15], [R - wall * 1.6, h * 0.42], [R * 0.75, h * 0.72], [0, h * 0.72]], 56, 0.5)
      const capH = 0.24
      const cap = new THREE.SphereGeometry(0.13, 48, 32)
      cap.scale(1, 0.9, 1)
      return { kind, glass, liquid, bodyH: h, front: R * 0.55 + 0.008, labelW: R * 1.05, topR: 0.075, cap, capH }
    }
  }
}

const CAP_MATERIAL: Record<CapFinish, () => THREE.Material> = {
  gold: () => new THREE.MeshStandardMaterial({ color: '#c9a35e', metalness: 1, roughness: 0.22 }),
  rose: () => new THREE.MeshStandardMaterial({ color: '#c99486', metalness: 1, roughness: 0.25 }),
  silver: () => new THREE.MeshStandardMaterial({ color: '#d9d9d6', metalness: 1, roughness: 0.18 }),
  black: () => new THREE.MeshPhysicalMaterial({ color: '#141312', metalness: 0.2, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 }),
  wood: () => new THREE.MeshStandardMaterial({ color: '#6f4c33', metalness: 0, roughness: 0.55 }),
}

function useLabelTexture(label: Props['label'], ink: string) {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null)
  useEffect(() => {
    if (!label) return
    let live = true
    const family = label.type?.fontFamily ?? "'Gilda Display', serif"
    const draw = () => {
      if (!live) return
      const c = document.createElement('canvas')
      c.width = 1024
      c.height = 360
      const g = c.getContext('2d')!
      g.clearRect(0, 0, c.width, c.height)
      g.fillStyle = ink
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      const title = label.title.toUpperCase()
      let size = 108
      const spacing = 0.14
      const font = (s: number) => `${label.type?.fontWeight ?? 400} ${s}px ${family}`
      // Fit the title to the label width (with letter spacing).
      const measure = (s: number) => {
        g.font = font(s)
        return g.measureText(title).width + title.length * s * spacing
      }
      while (size > 40 && measure(size) > 940) size -= 4
      g.font = font(size)
      ;(g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${Math.round(size * spacing)}px`
      g.fillText(title, c.width / 2, label.subtitle ? 150 : 180)
      if (label.subtitle) {
        ;(g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '10px'
        g.font = `400 46px 'Jost', sans-serif`
        g.globalAlpha = 0.75
        g.fillText(label.subtitle.toUpperCase(), c.width / 2, 262)
      }
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      setTex(t)
    }
    // Wait for the web font so the label is set in the house typeface.
    const spec = `${label.type?.fontWeight ?? 400} 64px ${family}`
    if (document.fonts?.load) document.fonts.load(spec).then(draw, draw)
    else draw()
    return () => {
      live = false
    }
  }, [label?.title, label?.subtitle, label?.type?.fontFamily, ink]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => tex?.dispose(), [tex])
  return tex
}

function useShadowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64)
    grad.addColorStop(0, 'rgba(30,24,20,0.55)')
    grad.addColorStop(0.5, 'rgba(30,24,20,0.18)')
    grad.addColorStop(1, 'rgba(30,24,20,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }, [])
}

const luminance = (hex: string) => {
  const c = new THREE.Color(hex)
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
}

export function RealBottle({ seed, liquid, cap = 'gold', label, height = 1.4, sway = true, spin = false, kind, ...group }: Props & ThreeElements['group']) {
  const spec = useMemo(() => build(seed, kind), [seed, kind])
  const ref = useRef<THREE.Group>(null)
  const shadow = useShadowTexture()
  const ink = luminance(liquid) < 0.25 ? '#efe2c6' : '#2a2420'
  const labelTex = useLabelTexture(label, ink)

  const mats = useMemo(() => {
    // Real perfume tends towards pale gold, amber or blush: pull the accord colour that way.
    const tint = new THREE.Color(liquid).lerp(new THREE.Color('#e8c98f'), 0.38)
    return {
      glass: new THREE.MeshPhysicalMaterial({
        color: '#ffffff', transmission: 1, thickness: 0.3, roughness: 0.02, ior: 1.5, metalness: 0,
        clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1, envMapIntensity: 1.35, transparent: true,
        attenuationColor: new THREE.Color('#f4f1ea'), attenuationDistance: 3,
      }),
      // Opaque + glossy so it is captured in the glass's transmission pass and reads as
      // rich liquid through the glass (a see-through liquid would vanish behind it).
      liquid: new THREE.MeshPhysicalMaterial({
        color: tint, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05,
        sheen: 0.4, sheenColor: tint.clone().lerp(new THREE.Color('#ffffff'), 0.5), envMapIntensity: 1.1,
      }),
      metal: CAP_MATERIAL[cap === 'black' || cap === 'wood' ? 'silver' : cap](),
      cap: CAP_MATERIAL[cap](),
      tube: new THREE.MeshPhysicalMaterial({ color: '#ffffff', transmission: 0.6, roughness: 0.3, transparent: true, opacity: 0.55 }),
    }
  }, [liquid, cap])

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose())
    },
    [mats],
  )
  useEffect(
    () => () => {
      spec.glass.dispose()
      spec.liquid.dispose()
      spec.cap.dispose()
    },
    [spec],
  )

  useFrame(({ clock }, dt) => {
    if (!ref.current) return
    if (spin) ref.current.rotation.y += dt * 0.18
    else if (sway) ref.current.rotation.y = -0.35 + Math.sin(clock.elapsedTime * 0.25) * 0.28
  })

  const total = spec.bodyH + 0.12 + spec.capH
  const k = height / total
  const neckTop = spec.bodyH + 0.06
  const capY = neckTop + 0.06 + spec.capH / 2

  return (
    <group {...group}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} scale={k * 1.6}>
        <planeGeometry args={[1.1, 0.75]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>
      <group ref={ref} scale={k}>
        <mesh geometry={spec.liquid} material={mats.liquid} />
        <mesh geometry={spec.glass} material={mats.glass} renderOrder={2} castShadow />
        {/* dip tube */}
        <mesh position={[0, (0.11 + neckTop) / 2, 0]} material={mats.tube}>
          <cylinderGeometry args={[0.007, 0.007, neckTop - 0.11, 8]} />
        </mesh>
        {/* glass neck + metal collar */}
        <mesh position={[0, spec.bodyH + 0.025, 0]} material={mats.glass}>
          <cylinderGeometry args={[spec.topR, spec.topR, 0.05, 32]} />
        </mesh>
        <mesh position={[0, neckTop + 0.02, 0]} material={mats.metal}>
          <cylinderGeometry args={[spec.topR + 0.012, spec.topR + 0.018, 0.06, 40]} />
        </mesh>
        <mesh position={[0, capY, 0]} geometry={spec.cap} material={mats.cap} />
        {labelTex && (
          <mesh renderOrder={3} position={[0, spec.bodyH * (spec.kind === 'faceted' ? 0.36 : 0.45), spec.front + 0.004]}>
            <planeGeometry args={[spec.labelW, spec.labelW * (360 / 1024)]} />
            <meshStandardMaterial map={labelTex} transparent roughness={0.4} metalness={ink === '#efe2c6' ? 0.6 : 0} depthWrite={false} />
          </mesh>
        )}
      </group>
    </group>
  )
}

/** Choose a cap finish that suits the scent. */
export function capFor(familyId: string | undefined, seed: number): CapFinish {
  switch (familyId) {
    case 'gourmand':
    case 'amber':
    case 'spicy':
      return seed % 3 === 0 ? 'rose' : 'gold'
    case 'citrus':
    case 'aquatic':
    case 'green':
    case 'aromatic':
      return 'silver'
    case 'smoky':
    case 'earthy':
    case 'animalic':
      return seed % 2 ? 'black' : 'wood'
    case 'woody':
      return seed % 2 ? 'wood' : 'black'
    case 'floral':
    case 'fruity':
      return seed % 2 ? 'rose' : 'gold'
    default:
      return ['gold', 'silver', 'black'][seed % 3] as CapFinish
  }
}
