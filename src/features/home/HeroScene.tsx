import { useRef, useMemo, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Float, Trail, Line } from "@react-three/drei"
import * as THREE from "three"

const ADVANCEMENT_COLORS = [
  "#22d3ee", // telomerase — cyan
  "#a78bfa", // bci — violet
  "#4ade80", // tissue — green
  "#fb923c", // fusion — orange
  "#f472b6", // crispr — pink
  "#facc15", // aagi — yellow
] as const

const ORB_COUNT = 6
const PARTICLE_COUNT = 600

function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 3 + Math.random() * 12
      temp.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        speed: 0.0005 + Math.random() * 0.002,
        offset: Math.random() * Math.PI * 2,
        scale: 0.005 + Math.random() * 0.02,
        colorIndex: Math.floor(Math.random() * 6),
        drift: 0.1 + Math.random() * 0.4,
      })
    }
    return temp
  }, [])

  const colorArray = useMemo(() => {
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const tempColor = new THREE.Color()
    particles.forEach((p, i) => {
      tempColor.set(ADVANCEMENT_COLORS[p.colorIndex] ?? "#ffffff")
      colors[i * 3] = tempColor.r
      colors[i * 3 + 1] = tempColor.g
      colors[i * 3 + 2] = tempColor.b
    })
    return colors
  }, [particles])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    particles.forEach((p, i) => {
      const drift = Math.sin(t * p.speed * 100 + p.offset) * p.drift
      dummy.position.set(p.x + drift, p.y + Math.sin(t * p.speed * 80 + p.offset) * p.drift, p.z + drift * 0.5)
      const pulse = 1 + Math.sin(t * 2 + p.offset) * 0.3
      dummy.scale.setScalar(p.scale * pulse)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.6}>
        <instancedBufferAttribute attach="geometry-attributes-color" args={[colorArray, 3]} />
      </meshBasicMaterial>
    </instancedMesh>
  )
}

function Orb({ color, radius, speed, yOffset, phase }: {
  readonly color: string
  readonly radius: number
  readonly speed: number
  readonly yOffset: number
  readonly phase: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const col = useMemo(() => new THREE.Color(color), [color])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + phase
    const x = Math.cos(t) * radius
    const z = Math.sin(t) * radius
    const y = yOffset + Math.sin(t * 1.5) * 0.5

    if (meshRef.current) {
      meshRef.current.position.set(x, y, z)
    }
    if (lightRef.current) {
      lightRef.current.position.set(x, y, z)
    }
  })

  return (
    <>
      <Float speed={2} rotationIntensity={0} floatIntensity={0.3}>
        <Trail
          width={1.5}
          length={8}
          color={col}
          attenuation={(t) => t * t}
          decay={1}
        >
          <mesh ref={meshRef}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color={col} toneMapped={false} />
          </mesh>
        </Trail>
      </Float>
      <pointLight ref={lightRef} color={col} intensity={2} distance={6} decay={2} />
    </>
  )
}

function NexusCore() {
  const ringRef = useRef<THREE.Mesh>(null)
  const ring2Ref = useRef<THREE.Mesh>(null)
  const ring3Ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ringRef.current) {
      ringRef.current.rotation.x = t * 0.3
      ringRef.current.rotation.z = t * 0.15
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = t * 0.25
      ring2Ref.current.rotation.x = Math.PI / 3 + t * 0.1
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z = t * 0.2
      ring3Ref.current.rotation.y = Math.PI / 4 + t * 0.18
    }
  })

  return (
    <group>
      <mesh ref={ringRef}>
        <torusGeometry args={[2.2, 0.008, 16, 100]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.25} toneMapped={false} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[2.8, 0.006, 16, 100]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.15} toneMapped={false} />
      </mesh>
      <mesh ref={ring3Ref}>
        <torusGeometry args={[3.4, 0.005, 16, 100]} />
        <meshBasicMaterial color="#f472b6" transparent opacity={0.1} toneMapped={false} />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <pointLight color="#ffffff" intensity={3} distance={10} decay={2} />
    </group>
  )
}

function ConnectionLines() {
  const linesRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!linesRef.current) return
    const t = clock.getElapsedTime()
    linesRef.current.rotation.y = t * 0.05
    linesRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      if (mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.opacity = 0.03 + Math.sin(t * 0.5 + i) * 0.02
      }
    })
  })

  const lines = useMemo(() => {
    const result: Array<{ start: THREE.Vector3; end: THREE.Vector3; color: string }> = []
    for (let i = 0; i < ORB_COUNT; i++) {
      for (let j = i + 1; j < ORB_COUNT; j++) {
        if (Math.random() > 0.5) {
          const theta1 = (i / ORB_COUNT) * Math.PI * 2
          const theta2 = (j / ORB_COUNT) * Math.PI * 2
          const r1 = 2 + i * 0.5
          const r2 = 2 + j * 0.5
          result.push({
            start: new THREE.Vector3(Math.cos(theta1) * r1, (i - 2.5) * 0.3, Math.sin(theta1) * r1),
            end: new THREE.Vector3(Math.cos(theta2) * r2, (j - 2.5) * 0.3, Math.sin(theta2) * r2),
            color: ADVANCEMENT_COLORS[i] ?? "#ffffff",
          })
        }
      }
    }
    return result
  }, [])

  return (
    <group ref={linesRef}>
      {lines.map((l, i) => {
        const mid = new THREE.Vector3().lerpVectors(l.start, l.end, 0.5)
        mid.y += 0.5
        const curve = new THREE.QuadraticBezierCurve3(l.start, mid, l.end)
        const curvePoints = curve.getPoints(30)
        return (
          <Line
            key={i}
            points={curvePoints}
            color={l.color}
            transparent
            opacity={0.05}
            lineWidth={1}
            toneMapped={false}
          />
        )
      })}
    </group>
  )
}

function CameraRig() {
  const { camera } = useThree()
  const [mouse] = useState({ x: 0, y: 0 })

  useFrame(() => {
    camera.position.x += (mouse.x * 1.5 - camera.position.x) * 0.02
    camera.position.y += (mouse.y * 0.8 + 1 - camera.position.y) * 0.02
    camera.lookAt(0, 0, 0)
  })

  return (
    <mesh
      visible={false}
      onPointerMove={(e) => {
        mouse.x = (e.point.x / 10)
        mouse.y = (e.point.y / 10)
      }}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

function Scene() {
  return (
    <>
      <fog attach="fog" args={["#06070a", 8, 25]} />
      <ambientLight intensity={0.05} />

      <NexusCore />

      {ADVANCEMENT_COLORS.map((color, i) => (
        <Orb
          key={color}
          color={color}
          radius={2 + i * 0.6}
          speed={0.3 - i * 0.03}
          yOffset={(i - 2.5) * 0.4}
          phase={(i / ORB_COUNT) * Math.PI * 2}
        />
      ))}

      <Particles />
      <ConnectionLines />
      <CameraRig />
    </>
  )
}

export function HeroScene() {
  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 1, 10], fov: 50, near: 0.1, far: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
