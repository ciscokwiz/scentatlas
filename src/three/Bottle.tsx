import { useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'

// A procedural glass bottle. The shape is seeded so each perfume gets its own silhouette
// without needing a licensed product photo.

function rng(seed: number) {
  let s = (seed * 9301 + 49297) % 233280
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function profile(seed: number) {
  const r = rng(seed + 1)
  const kind = Math.floor(r() * 4)
  const w = 0.55 + r() * 0.25 // body half-width
  const h = 1.1 + r() * 0.5 // body height
  const neck = 0.12 + r() * 0.05
  const pts: [number, number][] = []
  pts.push([0, 0], [w * 0.92, 0], [w, 0.06])
  if (kind === 0) {
    // round shoulders
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI * 0.5
      pts.push([neck + (w - neck) * Math.cos(a), h * 0.62 + Math.sin(a) * h * 0.38])
    }
  } else if (kind === 1) {
    // flask: wide in the middle
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      pts.push([neck + (w - neck) * Math.sin(Math.PI * (0.15 + t * 0.85)) ** 0.7, 0.06 + t * h])
    }
  } else if (kind === 2) {
    // tall column with square-ish shoulder
    pts.push([w, h * 0.88], [w * 0.92, h * 0.97], [neck, h])
  } else {
    // tapering cone
    pts.push([w * 0.95, h * 0.35], [w * 0.62, h * 0.85], [neck * 1.3, h * 0.98], [neck, h])
  }
  pts.push([neck, h + 0.12], [neck * 1.05, h + 0.14], [0, h + 0.14])
  return { pts, h, w, neck, capH: 0.28 + r() * 0.3, capW: neck * (1.25 + r() * 0.9), round: r() > 0.5 }
}

export function Bottle({ seed = 1, tint = '#B07E3C', fill = 0.7, spin = true, ...props }: { seed?: number; tint?: string; fill?: number; spin?: boolean } & ThreeElements['group']) {
  const group = useRef<THREE.Group>(null)
  const p = useMemo(() => profile(seed), [seed])
  const glass = useMemo(() => new THREE.LatheGeometry(p.pts.map(([x, y]) => new THREE.Vector2(x, y)), 64), [p])
  const liquid = useMemo(() => {
    const top = p.h * fill
    const pts = p.pts.filter(([, y]) => y <= top).map(([x, y]) => new THREE.Vector2(Math.max(0, x - 0.045), Math.max(0.05, y)))
    const last = pts[pts.length - 1]
    pts.push(new THREE.Vector2(last.x, top), new THREE.Vector2(0, top))
    return new THREE.LatheGeometry(pts, 48)
  }, [p, fill])

  useFrame((_, dt) => {
    if (spin && group.current) group.current.rotation.y += dt * 0.25
  })

  return (
    <group ref={group} {...props}>
      <mesh geometry={glass} castShadow>
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={1}
          thickness={0.6}
          roughness={0.06}
          ior={1.45}
          clearcoat={1}
          clearcoatRoughness={0.05}
          attenuationColor={tint}
          attenuationDistance={2.5}
          transparent
        />
      </mesh>
      <mesh geometry={liquid}>
        <meshPhysicalMaterial color={tint} transmission={0.6} roughness={0.2} thickness={1} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, p.h + 0.14 + p.capH / 2, 0]} castShadow>
        {p.round ? <cylinderGeometry args={[p.capW, p.capW, p.capH, 48]} /> : <boxGeometry args={[p.capW * 1.7, p.capH, p.capW * 1.7]} />}
        <meshStandardMaterial color="#2A2724" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  )
}
