import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Float, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { FAMILIES } from '../lib/families'
import { RealBottle } from './RealBottle'

// Landing hero: a glass bottle with scent drifting out in curling ribbons, each ribbon a
// different note family, with note names floating up and dissolving.

const RIBBON_FAMILIES = ['citrus', 'floral', 'gourmand', 'woody', 'amber', 'green', 'musky', 'spicy']
const PER_RIBBON = 70
const WORDS = [
  ['bergamot', 'citrus'], ['jasmine', 'whiteFloral'], ['almond', 'gourmand'], ['cedar', 'woody'],
  ['vanilla', 'gourmand'], ['pink pepper', 'spicy'], ['musk', 'musky'], ['rose', 'floral'],
  ['amber', 'amber'], ['fig leaf', 'green'], ['sea salt', 'aquatic'], ['tonka bean', 'gourmand'],
] as const

const COMPACT = '(max-width: 720px)'

/** True on phones, where the hero scene sits in its own short panel above the text. */
function useCompact() {
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia(COMPACT).matches)
  useEffect(() => {
    const mq = window.matchMedia(COMPACT)
    const on = () => setCompact(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return compact
}

/** Frames the whole bottle and its ribbons: centred and a little further back in the short phone panel. */
function Framing({ compact }: { compact: boolean }) {
  const camera = useThree((st) => st.camera)
  useEffect(() => {
    if (compact) {
      camera.position.set(0, 0.45, 6.1)
      camera.lookAt(0, 0.45, 0)
    } else {
      camera.position.set(0, 2.2, 7)
      camera.lookAt(0, 0, 0) // the original desktop framing
    }
    camera.updateProjectionMatrix()
  }, [camera, compact])
  return null
}

const dummy = new THREE.Object3D()
const hash = (n: number) => {
  const x = Math.sin(n * 91.7) * 43758.5453
  return x - Math.floor(x)
}

function Ribbons() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const total = RIBBON_FAMILIES.length * PER_RIBBON
  const colors = useMemo(() => {
    const arr = new Float32Array(total * 3)
    const c = new THREE.Color()
    for (let i = 0; i < total; i++) {
      c.set(FAMILIES[RIBBON_FAMILIES[Math.floor(i / PER_RIBBON)]].color)
      arr.set([c.r, c.g, c.b], i * 3)
    }
    return arr
  }, [total])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!mesh.current) return
    for (let i = 0; i < total; i++) {
      const r = Math.floor(i / PER_RIBBON)
      const s = hash(i)
      const ph = (t * (0.025 + hash(r) * 0.015) + s) % 1
      const dir = (r / RIBBON_FAMILIES.length) * Math.PI * 2
      const swirl = dir + ph * (1.4 + hash(r + 9) * 1.2)
      const rad = 0.06 + ph * (1.2 + hash(r + 3) * 1.0)
      const x = Math.cos(swirl) * rad
      const z = Math.sin(swirl) * rad * 0.7
      const y = 2.0 + ph * 1.5 + Math.sin(ph * 9 + s * 6) * 0.04
      dummy.position.set(x, y, z)
      dummy.scale.setScalar((0.012 + s * 0.035) * Math.sin(ph * Math.PI) ** 0.6)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, total]} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 8]}>
        <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
      </sphereGeometry>
      <meshStandardMaterial vertexColors roughness={0.5} transparent opacity={0.85} depthWrite={false} />
    </instancedMesh>
  )
}

const tmp = new THREE.Vector3()

// Moves DOM word labels (rendered outside the canvas) along 3D paths.
function FloatingWords({ words }: { words: MutableRefObject<(HTMLDivElement | null)[]> }) {
  const anchor = useRef<THREE.Group>(null)
  useFrame(({ clock, camera, size }) => {
    const t = clock.elapsedTime
    WORDS.forEach((_, i) => {
      const el = words.current[i]
      if (!el || !anchor.current) return
      const ph = (t * 0.025 + i / WORDS.length) % 1
      const a = i * 2.4 + ph * 1.5
      tmp.set(Math.cos(a) * (0.9 + ph * 1.6), 2.1 + ph * 1.35, Math.sin(a) * 0.8)
      anchor.current.localToWorld(tmp)
      tmp.project(camera)
      el.style.transform = `translate(-50%, -50%) translate(${(((tmp.x + 1) / 2) * size.width).toFixed(1)}px, ${(((1 - tmp.y) / 2) * size.height).toFixed(1)}px)`
      el.style.opacity = String(Math.sin(ph * Math.PI) ** 2 * 0.9)
    })
  })
  return <group ref={anchor} />
}

export default function HeroScene() {
  const words = useRef<(HTMLDivElement | null)[]>([])
  const wrap = useRef<HTMLDivElement>(null)
  // Stop rendering when the hero is scrolled out of view.
  const [visible, setVisible] = useState(true)
  const compact = useCompact()
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div className="cloud-wrap" ref={wrap}>
    <Canvas frameloop={visible ? 'always' : 'never'} camera={{ position: [0, 2.2, 7], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <Framing compact={compact} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 6, 5]} intensity={1.4} />
      <Environment resolution={256}>
        <Lightformer intensity={2.4} position={[0, 6, 2]} scale={[10, 2, 1]} />
        <Lightformer intensity={2.8} position={[-4.5, 1.5, 2]} scale={[1.2, 8, 1]} />
        <Lightformer intensity={1.8} position={[4.5, 1.5, 2]} scale={[1.2, 8, 1]} />
        <Lightformer intensity={1} color="#f2e6d6" position={[0, 2, -6]} scale={[12, 5, 1]} />
        <Lightformer form="ring" intensity={1.4} position={[3, 4, 3]} scale={1.5} />
      </Environment>
      <group position={[0, -1.4, 0]}>
        <Float speed={0.8} rotationIntensity={0} floatIntensity={0.12}>
          <RealBottle seed={7} kind="flacon" liquid="#d9a77e" cap="gold" height={2.05} sway={false} spin label={{ title: 'Scent Atlas', subtitle: 'eau de parfum' }} />
        </Float>
        <Ribbons />
        <FloatingWords words={words} />
      </group>
    </Canvas>
      <div className="cloud-labels" aria-hidden>
        {WORDS.map(([w, fam], i) => (compact && i % 2 === 1 ? null : (
          <div key={w} ref={(el) => { words.current[i] = el }} className="hero-word" style={{ color: FAMILIES[fam].color, opacity: 0 }}>
            {w}
          </div>
        )))}
      </div>
    </div>
  )
}
