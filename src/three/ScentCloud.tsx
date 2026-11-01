import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Billboard, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Motion } from '../lib/families'
import { evaporation, layerIntensity, projection, type Conditions, type LayeredNote, type Profile } from '../lib/behavior'
import type { CapFinish } from './RealBottle'
import type { TypeStyle } from '../lib/brandType'
import type { BottleCutout } from '../lib/images'

// The note "pyramid" as a living cloud: top notes float highest and evaporate first,
// heart notes bloom in the middle, base notes sit heavy at the bottom and linger.
// Every note family has its own motion so you can *see* what kind of smell it is.

const TIER_Y = { top: 1.55, heart: 0.15, base: -1.2 }

const COUNTS: Record<Motion, number> = {
  fizz: 36, petal: 18, drop: 14, melt: 7, grain: 16, flicker: 28, leaf: 14, wave: 30, haze: 14, glow: 12, dust: 46, smoke: 18,
}
const SIZE: Record<Motion, number> = {
  fizz: 0.028, petal: 0.07, drop: 0.05, melt: 0.13, grain: 1, flicker: 0.022, leaf: 0.06, wave: 0.03, haze: 0.16, glow: 0.055, dust: 0.014, smoke: 0.09,
}
const OPACITY: Record<Motion, number> = {
  fizz: 0.9, petal: 0.8, drop: 0.85, melt: 0.55, grain: 0.85, flicker: 1, leaf: 0.8, wave: 0.75, haze: 0.16, glow: 0.9, dust: 0.7, smoke: 0.22,
}

const hash = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}
const dummy = new THREE.Object3D()
const tmp = new THREE.Vector3()
type Labels = MutableRefObject<Map<string, HTMLDivElement>>
export const noteKey = (n: LayeredNote) => `${n.layer}-${n.note}`

/** Loads an ingredient photo as a square-cropped texture (null until ready or on failure). */
function useCoverTexture(src: string | undefined) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!src) return
    let live = true
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (!live) return
      // Fit the whole ingredient (cut-outs have transparent backgrounds) into a padded square.
      const S = 256
      const c = document.createElement('canvas')
      c.width = c.height = S
      const ctx = c.getContext('2d')
      if (!ctx) return
      const pad = S * 0.16
      const k = Math.min((S - pad * 2) / img.width, (S - pad * 2) / img.height)
      const w = img.width * k, h = img.height * k
      ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h)
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      setTex(t)
    }
    img.onerror = () => live && setTex(null)
    img.src = src
    return () => {
      live = false
    }
  }, [src])
  useEffect(() => () => tex?.dispose(), [tex])
  return tex
}

/** Position one particle. `e` is 0 (fresh) … 1 (fully evaporated). */
function place(m: Motion, i: number, t: number, e: number) {
  const s = hash(i + 1)
  const s2 = hash(i + 101)
  const s3 = hash(i + 211)
  const spread = 0.32 + e * 0.5
  const lift = e * 0.9
  dummy.rotation.set(0, 0, 0)
  let x = 0, y = 0, z = 0, k = 1
  switch (m) {
    case 'fizz': {
      const ph = (t * (0.5 + s * 0.6) + s2) % 1
      const a = s3 * Math.PI * 2
      x = Math.cos(a) * spread * 0.6 * s
      z = Math.sin(a) * spread * 0.6 * s
      y = ph * (0.9 + lift) - 0.35
      k = Math.sin(ph * Math.PI)
      break
    }
    case 'petal': {
      const a = t * (0.25 + s * 0.3) * (s2 > 0.5 ? 1 : -1) + s3 * Math.PI * 2
      const r = spread * (0.8 + s * 0.6)
      x = Math.cos(a) * r
      z = Math.sin(a) * r
      y = Math.sin(t * 0.7 + s * 6) * 0.18 + lift * s
      dummy.rotation.set(t * 0.6 + s * 6, a, t * 0.4 + s2 * 6)
      dummy.scale.set(1, 0.18, 0.62)
      break
    }
    case 'drop': {
      const a = t * 0.2 + s * Math.PI * 2
      const r = spread * (0.6 + s2 * 0.6)
      x = Math.cos(a) * r
      z = Math.sin(a) * r
      y = Math.sin(t * 1.6 + s3 * 6) * 0.12 + lift * s2
      break
    }
    case 'melt': {
      const a = t * 0.12 + s * Math.PI * 2
      const r = spread * 0.45 * (0.5 + s2)
      x = Math.cos(a) * r
      z = Math.sin(a) * r
      y = Math.sin(t * 0.5 + s3 * 6) * 0.08 + lift * 0.4 * s
      k = 0.75 + Math.sin(t * 0.9 + s * 9) * 0.25
      break
    }
    case 'grain': {
      const a = (i / COUNTS.grain) * Math.PI * 2 + t * 0.08
      const r = spread * (0.85 + s * 0.3)
      x = Math.cos(a) * r
      z = Math.sin(a) * r
      y = Math.sin(t * 0.3 + s2 * 6) * 0.06 + lift * 0.5 * s
      dummy.rotation.set(0, -a, (s3 - 0.5) * 0.3)
      dummy.scale.set(0.014, 0.16 + s * 0.12, 0.014)
      return { x, y, z, k, custom: true }
    }
    case 'flicker': {
      const step = Math.floor(t * 2.5 + s * 10)
      const a = hash(step * 13 + i) * Math.PI * 2
      const r = spread * (0.4 + hash(step * 7 + i) * 0.8)
      x = Math.cos(a) * r
      z = Math.sin(a) * r
      y = (hash(step * 3 + i) - 0.5) * 0.5 + lift * s
      k = Math.max(0, Math.sin((t * 2.5 + s * 10) * Math.PI))
      break
    }
    case 'leaf': {
      const ph = (t * 0.12 + s) % 1
      x = Math.sin(t * 0.9 + s * 6) * spread
      z = Math.cos(t * 0.6 + s2 * 6) * spread * 0.7
      y = 0.35 - ph * 0.7 + lift * s3
      dummy.rotation.set(Math.sin(t * 2 + s * 6) * 0.9, s2 * 6, Math.cos(t * 1.7 + s3 * 6) * 0.6)
      dummy.scale.set(1, 0.08, 0.5)
      k = Math.sin(ph * Math.PI)
      break
    }
    case 'wave': {
      const a = (i / COUNTS.wave) * Math.PI * 2 + t * 0.15
      const r = spread * 1.05
      x = Math.cos(a) * r
      z = Math.sin(a) * r
      y = Math.sin(a * 3 + t * 1.8) * 0.1 + lift * 0.4
      break
    }
    case 'haze': {
      const ph = (t * 0.07 + s) % 1
      const a = s2 * Math.PI * 2
      const r = spread * (0.2 + ph * 0.9)
      x = Math.cos(a) * r
      z = Math.sin(a) * r
      y = (s3 - 0.5) * 0.3 + lift * ph
      k = (0.6 + ph) * Math.sin(ph * Math.PI)
      break
    }
    case 'glow': {
      const ph = (t * 0.08 + s) % 1
      const a = s2 * Math.PI * 2 + t * 0.1
      const r = spread * (0.4 + s3 * 0.5)
      x = Math.cos(a) * r
      z = Math.sin(a) * r
      y = 0.25 - ph * 0.5 + lift * 0.3
      k = (0.7 + Math.sin(t * 2 + s * 9) * 0.3) * Math.sin(ph * Math.PI)
      break
    }
    case 'dust': {
      const ph = (t * 0.05 + s) % 1
      const a = s2 * Math.PI * 2 + t * 0.05
      const r = spread * (0.3 + s3 * 0.9)
      x = Math.cos(a) * r
      z = Math.sin(a) * r
      y = 0.4 - ph * 0.8 + lift * s
      k = Math.sin(ph * Math.PI)
      break
    }
    case 'smoke': {
      const ph = (t * 0.1 + s) % 1
      x = Math.sin(ph * 7 + s * 6) * 0.15 * (1 + ph) + (s2 - 0.5) * spread * 0.4
      z = Math.cos(ph * 5 + s2 * 6) * 0.15 * (1 + ph)
      y = ph * (0.8 + lift) - 0.35
      k = (0.4 + ph * 1.2) * Math.sin(ph * Math.PI)
      break
    }
  }
  return { x, y, z, k, custom: false }
}

interface NoteProps {
  item: LayeredNote
  position: [number, number, number]
  cond: MutableRefObject<Conditions>
  prof: Profile
  highlighted: boolean
  dimmed: boolean
  onHover: (note: string | null) => void
  onSelect: (note: string) => void
  labels: Labels
  image?: string
}

function NoteCluster({ item, position, cond, prof, highlighted, dimmed, onHover, onSelect, labels, image }: NoteProps) {
  const motion = item.family.motion
  const count = COUNTS[motion]
  const group = useRef<THREE.Group>(null)
  const inst = useRef<THREE.InstancedMesh>(null)
  const orb = useRef<THREE.Mesh>(null)
  const photo = useCoverTexture(image)
  const state = useRef({ t: Math.random() * 100, i: 1 })
  const color = useMemo(() => new THREE.Color(item.family.color), [item.family.color])
  const backing = useMemo(() => new THREE.Color(item.family.color).lerp(new THREE.Color('#fbf8f2'), 0.78), [item.family.color])

  useFrame(({ camera, size }, dt) => {
    const c = cond.current
    const target = layerIntensity(item.layer, c, prof.longevityHours)
    const st = state.current
    st.i += (target - st.i) * Math.min(1, dt * 4)
    const speed = evaporation(c.tempC)
    st.t += dt * speed
    const e = 1 - st.i
    const focus = highlighted ? 1.25 : dimmed ? 0.35 : 1

    if (group.current) {
      group.current.position.y = position[1] + e * (item.layer === 'top' ? 0.45 : item.layer === 'heart' ? 0.35 : 0.2)
    }
    if (orb.current) {
      const s = (0.12 + 0.12 * st.i) * (highlighted ? 1.25 : 1) * (photo ? 1.5 : 1)
      orb.current.scale.setScalar(s + Math.sin(st.t * 1.3 + position[0]) * 0.008)
      const mat = orb.current.material as THREE.MeshPhysicalMaterial
      // Pictures stay legible even when a layer is faint; plain orbs can fade further.
      mat.opacity = Math.min(1, (photo ? 0.5 + 0.5 * st.i : 0.15 + 0.85 * st.i) * focus)
    }
    if (inst.current) {
      const base = SIZE[motion]
      for (let i = 0; i < count; i++) {
        const visible = i / count < 0.25 + st.i * 0.75
        const p = place(motion, i, st.t, e)
        dummy.position.set(p.x, p.y, p.z)
        if (!p.custom) {
          if (motion !== 'petal' && motion !== 'leaf') dummy.scale.set(1, 1, 1)
          dummy.scale.multiplyScalar(base * Math.max(0, p.k) * (visible ? 1 : 0))
        } else if (!visible) dummy.scale.setScalar(0)
        dummy.updateMatrix()
        inst.current.setMatrixAt(i, dummy.matrix)
      }
      inst.current.instanceMatrix.needsUpdate = true
      const mat = inst.current.material as THREE.MeshStandardMaterial
      mat.opacity = OPACITY[motion] * (0.2 + 0.8 * st.i) * focus
    }
    const el = labels.current.get(noteKey(item))
    if (el && group.current) {
      group.current.getWorldPosition(tmp)
      tmp.y -= 0.36
      tmp.project(camera)
      const x = ((tmp.x + 1) / 2) * size.width
      const y = ((1 - tmp.y) / 2) * size.height
      el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
      el.style.opacity = tmp.z > 1 ? '0' : String(Math.max(0.15, (0.3 + 0.7 * st.i) * (dimmed ? 0.4 : 1)))
    }
  })

  const geo = motion === 'grain' ? <boxGeometry args={[1, 1, 1]} /> : <sphereGeometry args={[1, 10, 8]} />
  const pointer = {
    onPointerOver: (ev: { stopPropagation: () => void }) => {
      ev.stopPropagation()
      onHover(item.note)
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      onHover(null)
      document.body.style.cursor = ''
    },
    onClick: (ev: { stopPropagation: () => void }) => {
      ev.stopPropagation()
      onSelect(item.note)
    },
  }
  return (
    <group ref={group} position={position}>
      {photo ? (
        // Ingredient photo: a floating medallion that always faces the viewer.
        <Billboard>
          <mesh ref={orb} {...pointer}>
            <circleGeometry args={[1, 48]} />
            <meshBasicMaterial map={photo} transparent toneMapped={false} depthWrite={false} />
            <mesh position={[0, 0, -0.0006]}>
              <circleGeometry args={[1, 48]} />
              <meshBasicMaterial color={backing} transparent opacity={0.96} toneMapped={false} depthWrite={false} />
            </mesh>
            <mesh position={[0, 0, -0.001]}>
              <ringGeometry args={[0.98, 1.09, 64]} />
              <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
            </mesh>
          </mesh>
        </Billboard>
      ) : (
        <mesh ref={orb} {...pointer}>
          <sphereGeometry args={[1, 32, 24]} />
          <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.18} roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.4} envMapIntensity={0.35} transparent depthWrite={false} />
        </mesh>
      )}
      <instancedMesh ref={inst} args={[undefined, undefined, count]} frustumCulled={false}>
        {geo}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={motion === 'glow' || motion === 'flicker' ? 0.8 : 0.15}
          roughness={0.6}
          transparent
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  )
}

function Sillage({ cond, prof }: { cond: MutableRefObject<Conditions>; prof: Profile }) {
  const ring = useRef<THREE.Mesh>(null)
  const ripple = useRef<THREE.Mesh>(null)
  const st = useRef({ r: 0.5, t: 0 })
  useFrame((_, dt) => {
    const target = 0.55 + projection(cond.current, prof) * 2.6
    st.current.r += (target - st.current.r) * Math.min(1, dt * 3)
    st.current.t += dt * 0.35 * evaporation(cond.current.tempC)
    const r = st.current.r
    ring.current?.scale.setScalar(r)
    if (ripple.current) {
      const ph = st.current.t % 1
      ripple.current.scale.setScalar(0.3 + ph * r)
      ;(ripple.current.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - ph)
    }
  })
  return (
    <group position={[0, -2.29, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={ring}>
        <ringGeometry args={[0.985, 1, 128]} />
        <meshBasicMaterial color="#1C1B19" transparent opacity={0.35} />
      </mesh>
      <mesh ref={ripple}>
        <ringGeometry args={[0.97, 1, 128]} />
        <meshBasicMaterial color="#8C7B66" transparent opacity={0.3} />
      </mesh>
      <mesh>
        <circleGeometry args={[4.5, 64]} />
        <meshBasicMaterial color="#1C1B19" transparent opacity={0.025} />
      </mesh>
    </group>
  )
}

function Cloud({ notes, cond, prof, hovered, onHover, onSelect, labels, noteImages }: SceneProps & { labels: Labels }) {
  const spin = useRef<THREE.Group>(null)
  const layout = useMemo(() => {
    const byTier = { top: [] as LayeredNote[], heart: [] as LayeredNote[], base: [] as LayeredNote[] }
    notes.forEach((n) => byTier[n.layer].push(n))
    const out: { item: LayeredNote; pos: [number, number, number] }[] = []
    ;(['top', 'heart', 'base'] as const).forEach((tier, ti) => {
      const list = byTier[tier]
      const k = list.length
      const rx = k <= 1 ? 0 : Math.min(2.3, 0.75 + k * 0.22)
      const rz = rx * 0.6
      list.forEach((item, i) => {
        const a = (i / Math.max(1, k)) * Math.PI * 2 + ti * 0.7
        out.push({ item, pos: [Math.cos(a) * rx, TIER_Y[tier] + Math.sin(i * 2.1) * 0.12, Math.sin(a) * rz] })
      })
    })
    return out
  }, [notes])

  useFrame((_, dt) => {
    if (spin.current && !hovered) spin.current.rotation.y += dt * 0.06
  })

  return (
    <>
      <group ref={spin}>
        {layout.map(({ item, pos }) => (
          <NoteCluster
            key={`${item.layer}-${item.note}`}
            item={item}
            position={pos}
            cond={cond}
            prof={prof}
            highlighted={hovered === item.note}
            dimmed={!!hovered && hovered !== item.note}
            onHover={onHover}
            onSelect={onSelect}
            labels={labels}
            image={noteImages?.[item.note]}
          />
        ))}
      </group>
      <Sillage cond={cond} prof={prof} />
    </>
  )
}

interface SceneProps {
  notes: LayeredNote[]
  cond: MutableRefObject<Conditions>
  prof: Profile
  hovered: string | null
  onHover: (n: string | null) => void
  onSelect: (n: string) => void
  seed: number
  tint: string
  /** Real bottle photo; turned into a 3D model when its pixels are readable. */
  bottleSrc?: string | null
  onBottle?: (cut: BottleCutout) => void
  /** note name → ingredient photo URL */
  noteImages?: Record<string, string>
  cap?: CapFinish
  label?: { title: string; subtitle?: string; type?: TypeStyle }
}

export default function ScentCloud(props: SceneProps) {
  const labels = useRef(new Map<string, HTMLDivElement>())
  return (
    <div className="cloud-wrap">
    <Canvas camera={{ position: [0, 0.6, 7.2], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} />
      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 5, 2]} scale={[8, 2, 1]} />
        <Lightformer intensity={2.5} position={[-4, 0.5, 2]} scale={[1, 7, 1]} />
        <Lightformer intensity={1.6} position={[4, 0.5, 2]} scale={[1, 7, 1]} />
        <Lightformer intensity={1} color="#f2e6d6" position={[0, 1, -5]} scale={[10, 4, 1]} />
        <Lightformer form="ring" intensity={1.2} position={[2.5, 2.5, 3]} scale={1.2} />
      </Environment>
      <Cloud {...props} labels={labels} />
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI * 0.32} maxPolarAngle={Math.PI * 0.62} rotateSpeed={0.5} />
    </Canvas>
      {/* Labels live in the DOM (not inside the WebGL scene) and are positioned every frame. */}
      <div className="cloud-labels" aria-hidden>
        {props.notes.map((n) => (
          <div
            key={noteKey(n)}
            ref={(el) => {
              if (el) labels.current.set(noteKey(n), el)
              else labels.current.delete(noteKey(n))
            }}
            className={`note-label${props.hovered === n.note ? ' is-hot' : ''}`}
          >
            {n.note}
          </div>
        ))}
      </div>
    </div>
  )
}
