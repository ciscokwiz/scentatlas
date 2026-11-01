import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { RealBottle, type CapFinish } from './RealBottle'
import { PhotoBottle } from './PhotoBottle'
import type { BottleCutout } from '../lib/images'
import type { TypeStyle } from '../lib/brandType'

// A product-shot style stage for one bottle: studio softboxes for glass reflections,
// a soft contact shadow, gentle sway. Uses the real photo (as a 3D cut-out) when
// available, otherwise the realistic modelled bottle.

interface Props {
  seed: number
  liquid: string
  cap: CapFinish
  label: { title: string; subtitle?: string; type?: TypeStyle }
  photo?: string | null
  onPhoto?: (cut: BottleCutout) => void
}

export default function BottleShowcase({ seed, liquid, cap, label, photo, onPhoto }: Props) {
  const [photoFailed, setPhotoFailed] = useState(false)
  return (
    <Canvas camera={{ position: [0, 1.25, 4.4], fov: 32 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }} onCreated={({ camera }) => camera.lookAt(0, 1.05, 0)}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.2} />
      <Environment resolution={256}>
        <Lightformer intensity={2.4} position={[0, 5, 1]} scale={[6, 1.5, 1]} />
        <Lightformer intensity={3} position={[-3, 1.4, 1.5]} scale={[0.8, 5, 1]} />
        <Lightformer intensity={1.8} position={[3, 1.4, 1.5]} scale={[0.8, 5, 1]} />
        <Lightformer intensity={0.9} color="#f2e6d6" position={[0, 1.5, -4]} scale={[8, 4, 1]} />
        <Lightformer form="ring" intensity={1.3} position={[2, 3, 2.5]} scale={1} />
      </Environment>
      {photo && !photoFailed ? (
        <PhotoBottle key={photo} src={photo} height={2.1} onReady={onPhoto} onFail={() => setPhotoFailed(true)} />
      ) : (
        <RealBottle seed={seed} liquid={liquid} cap={cap} label={label} height={2.15} />
      )}
    </Canvas>
  )
}
