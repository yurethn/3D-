import { useFrame } from '@react-three/fiber';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  rotationSpeed: THREE.Euler;
  size: number;
}

export function Explosion({ position }: { position: [number, number, number] }) {
  const count = 15;
  const particles = useMemo(() => {
    const p: Particle[] = [];
    for (let i = 0; i < count; i++) {
      p.push({
        position: new THREE.Vector3(...position),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random()) * 0.2,
          (Math.random() - 0.5) * 0.2
        ),
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        rotationSpeed: new THREE.Euler(Math.random() * 0.1, Math.random() * 0.1, Math.random() * 0.1),
        size: Math.random() * 0.2 + 0.1,
      });
    }
    return p;
  }, [position]);

  const [activeParticles, setActiveParticles] = useState(particles);
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const newParticles = activeParticles.map(p => {
      p.position.add(p.velocity);
      p.velocity.y -= 0.005; // Gravity
      p.rotation.x += p.rotationSpeed.x;
      p.rotation.y += p.rotationSpeed.y;
      p.rotation.z += p.rotationSpeed.z;
      return p;
    });
    
    setActiveParticles([...newParticles]);
  });

  return (
    <group ref={meshRef}>
      {activeParticles.map((p, i) => (
        <mesh key={i} position={p.position} rotation={p.rotation}>
          <boxGeometry args={[p.size, p.size, p.size]} />
          <meshStandardMaterial color="#ff4d4d" emissive="#ff0000" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}
