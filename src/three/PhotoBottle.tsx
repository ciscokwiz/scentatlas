import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { cutOutBottle, loadImage, type BottleCutout } from '../lib/images'

// Turns a 2D product photo into a 3D bottle: the background is removed, the silhouette is
// extruded into a solid with bevelled glass edges, and the photo is mapped onto the front
// and back faces. It gently sways so the depth and glass highlights read.

interface Props {
  src: string
  /** Height of the bottle in scene units. */
  height?: number
  onReady?: (cut: BottleCutout) => void
  onFail?: () => void
}

export function PhotoBottle({ src, height = 1.3, onReady, onFail, ...group }: Props & ThreeElements['group']) {
  const [cut, setCut] = useState<BottleCutout | null>(null)
  const ref = useRef<THREE.Group>(null)
  const cbs = useRef({ onReady, onFail })
  cbs.current = { onReady, onFail }

  useEffect(() => {
    let live = true
    loadImage(src)
      .then((img) => {
        if (!live) return
        const c = cutOutBottle(img)
        if (!c) throw new Error('unreadable')
        setCut(c)
        cbs.current.onReady?.(c)
      })
      .catch(() => live && cbs.current.onFail?.())
    return () => {
      live = false
    }
  }, [src])

  const built = useMemo(() => {
    if (!cut) return null
    const shape = new THREE.Shape(cut.outline.map(([x, y]) => new THREE.Vector2(x, y)))
    const xs = cut.outline.map(([x]) => x)
    const width = Math.max(...xs) - Math.min(...xs)
    const depth = Math.min(0.32, width * 0.32)
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: depth * 0.18,
      bevelSize: 0.012,
      bevelSegments: 4,
      curveSegments: 4,
    })
    geo.translate(0, 0, -depth / 2)
    geo.computeVertexNormals()

    const tex = new THREE.CanvasTexture(cut.canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    // Shape coordinates → photo UVs (see cutOutBottle for the coordinate system).
    tex.repeat.set((cut.span * cut.height) / cut.width, cut.span)
    tex.offset.set(0.5, 1 - cut.bottomRow / cut.height)
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping

    const face = new THREE.MeshPhysicalMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.35,
      roughness: 0.28,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      envMapIntensity: 0.55,
    })
    const edgeColor = new THREE.Color(cut.colors[0] ?? '#d9d2c7').lerp(new THREE.Color('#ffffff'), 0.35)
    const edge = new THREE.MeshPhysicalMaterial({
      color: edgeColor,
      roughness: 0.08,
      metalness: 0,
      transmission: 0.55,
      thickness: 0.4,
      clearcoat: 1,
      envMapIntensity: 1.2,
      transparent: true,
      opacity: 0.92,
    })
    return { geo, materials: [face, edge], tex }
  }, [cut])

  useEffect(() => () => {
    built?.geo.dispose()
    built?.tex.dispose()
    built?.materials.forEach((m) => m.dispose())
  }, [built])

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.45) * 0.55
  })

  if (!built) return null
  return (
    <group {...group}>
      <group ref={ref} scale={height}>
        <mesh geometry={built.geo} material={built.materials} castShadow />
      </group>
    </group>
  )
}
