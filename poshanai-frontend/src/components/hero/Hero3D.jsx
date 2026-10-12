/* eslint react/no-unknown-property: off -- React Three Fiber uses Three.js custom elements and props. */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const palette = {
  green: '#1E5631',
  orange: '#F57C00',
  cream: '#F9FBF9',
  dark: '#15211a',
  softGreen: '#2F774A',
  darkGreen: '#0E2C21',
  warmWhite: '#F9FBF9',
};

function sequenceValue(index, multiplier, offset = 0) {
  return (index * multiplier + offset) % 1;
}

function Lights() {
  return (
    <>
      <hemisphereLight args={['#f8f3dc', '#0f172a', 1.1]} position={[0, 8, 0]} />
      <directionalLight
        castShadow
        intensity={1.6}
        position={[6, 8, 5]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight intensity={0.45} position={[-6, 4, -4]} color="#f8d6a4" />
    </>
  );
}

function Thali({ theme }) {
  const trayColor = theme === 'dark' ? '#1d3b2d' : '#1E5631';
  const bowlColor = theme === 'dark' ? '#111f19' : '#F9FBF9';
  const accentColor = theme === 'dark' ? '#f7d39a' : '#F57C00';
  const rimColor = theme === 'dark' ? '#264e3d' : '#2F774A';

  return (
    <group position={[0, 0.2, 0]}>
      <mesh receiveShadow position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.2, 64]} />
        <meshStandardMaterial color={theme === 'dark' ? '#101d17' : '#edf6ee'} roughness={1} />
      </mesh>

      <mesh position={[0, -0.68, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.4, 2.5, 0.22, 64]} />
        <meshStandardMaterial color={trayColor} metalness={0.12} roughness={0.8} />
      </mesh>

      <mesh position={[0, -0.56, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.1, 2.26, 0.18, 64]} />
        <meshStandardMaterial color={rimColor} metalness={0.2} roughness={0.7} />
      </mesh>

      {[
        { position: [-1.3, -0.3, 1.1], scale: 1.1, color: palette.orange },
        { position: [1.4, -0.28, 0.7], scale: 1.2, color: '#F9FBF9' },
        { position: [0.15, -0.35, -1.35], scale: 0.95, color: '#2F774A' },
      ].map((bowl, index) => (
        <group key={index} position={bowl.position}>
          <mesh castShadow receiveShadow position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.88 * bowl.scale, 0.9 * bowl.scale, 0.46, 40]} />
            <meshStandardMaterial color={bowlColor} metalness={0.08} roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0, 0.26, 0]}>
            <sphereGeometry args={[0.55 * bowl.scale, 24, 24]} />
            <meshStandardMaterial color={bowl.color} roughness={0.72} metalness={0.1} />
          </mesh>
          <mesh castShadow position={[0.18, 0.36, 0.08]}>
            <sphereGeometry args={[0.12 * bowl.scale, 18, 18]} />
            <meshStandardMaterial color={accentColor} roughness={0.85} metalness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function AINetwork({ theme }) {
  const nodesRef = useRef([]);
  const positions = useMemo(() => {
    const ringA = Array.from({ length: 10 }, (_, index) => {
      const angle = (index / 10) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * 2.2, 0.5 + Math.sin(index * 0.8) * 0.2, Math.sin(angle) * 2.2);
    });

    const ringB = Array.from({ length: 8 }, (_, index) => {
      const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
      return new THREE.Vector3(Math.cos(angle) * 3.1, 1.1 + Math.cos(index * 0.7) * 0.25, Math.sin(angle) * 3.1);
    });

    const hub = new THREE.Vector3(0, 1.3, 0);
    return [...ringA, ...ringB, hub];
  }, []);

  const links = useMemo(() => {
    const result = [];
    for (let index = 0; index < positions.length - 1; index += 1) {
      result.push([positions[index], positions[(index + 1) % (positions.length - 1)]]);
    }
    result.push([positions[0], positions[positions.length - 1]]);
    result.push([positions[positions.length - 2], positions[positions.length - 1]]);
    return result;
  }, [positions]);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    nodesRef.current.forEach((mesh, index) => {
      if (!mesh) return;
      const base = positions[index];
      const drift = Math.sin(elapsed * 1.2 + index * 1.4) * 0.18;
      mesh.position.x = base.x + Math.cos(elapsed + index * 0.7) * 0.12;
      mesh.position.y = base.y + drift;
      mesh.position.z = base.z + Math.sin(elapsed * 1.1 + index) * 0.14;
    });
  });

  return (
    <group position={[0, 1.2, 0.1]}>
      {positions.map((point, index) => (
        <mesh
          key={`node-${index}`}
          ref={(element) => {
            nodesRef.current[index] = element;
          }}
          position={point.toArray()}
          castShadow
        >
          <sphereGeometry args={[0.12, 18, 18]} />
          <meshStandardMaterial
            color={theme === 'dark' ? '#F9FBF9' : '#1E5631'}
            emissive={theme === 'dark' ? '#4CAF50' : '#A8D8A8'}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}

      {links.map((link, index) => (
        <Line
          key={`line-${index}`}
          points={[link[0], link[1]]}
          color={theme === 'dark' ? '#d6fbe3' : '#1E5631'}
          lineWidth={0.75}
          transparent
          opacity={0.42}
        />
      ))}
    </group>
  );
}

function Particles({ theme }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 90 }, (_, index) => ({
        x: (sequenceValue(index, 0.754877666) - 0.5) * 6.5,
        y: 1 + sequenceValue(index, 0.569840291, 0.25) * 5.2,
        z: (sequenceValue(index, 0.438289) - 0.5) * 5,
        speed: 0.04 + (index % 9) * 0.006,
        size: 0.03 + sequenceValue(index, 0.349938) * 0.05,
      })),
    [],
  );

  const particleRefs = useRef([]);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    particleRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const particle = particles[index];
      mesh.position.y -= particle.speed;
      if (mesh.position.y < -1.2) {
        mesh.position.x = (Math.random() - 0.5) * 5;
        mesh.position.y = 4.5 + Math.random() * 2;
        mesh.position.z = (Math.random() - 0.5) * 4.5;
      }
      mesh.position.x += Math.sin(elapsed * 1.6 + index) * 0.002;
    });
  });

  return (
    <group>
      {particles.map((particle, index) => (
        <mesh
          key={`particle-${index}`}
          ref={(element) => {
            particleRefs.current[index] = element;
          }}
          position={[particle.x, particle.y, particle.z]}
        >
          <sphereGeometry args={[particle.size, 10, 10]} />
          <meshStandardMaterial
            color={theme === 'dark' ? '#F9FBF9' : '#F57C00'}
            emissive={theme === 'dark' ? '#7bd7a6' : '#F57C00'}
            emissiveIntensity={0.25}
          />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ theme }) {
  const { camera } = useThree();
  const rootRef = useRef();

  // React Three Fiber owns this frame loop, where camera mutation is intentional.
  /* eslint-disable react-hooks/immutability */
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (rootRef.current) {
      rootRef.current.rotation.y = t * 0.15;
    }
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, 6.2 + Math.sin(t * 0.5) * 0.2, 0.06);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 5 + Math.cos(t * 0.45) * 0.15, 0.06);
    camera.lookAt(0, 0.5, 0);
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <group ref={rootRef}>
      <Lights />
      <Thali theme={theme} />
      <AINetwork theme={theme} />
      <Particles theme={theme} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.18, 0]} receiveShadow>
        <circleGeometry args={[4.5, 64]} />
        <shadowMaterial color={theme === 'dark' ? '#08120d' : '#dfe7e0'} opacity={0.45} />
      </mesh>
    </group>
  );
}

export default function Hero3D({ theme = 'light' }) {
  const background = theme === 'dark' ? palette.dark : palette.cream;

  return (
    <Canvas
      camera={{ position: [6.2, 5.0, 7.4], fov: 32 }}
      dpr={[1, 2]}
      shadows
      onCreated={({ gl }) => {
        gl.setClearColor(background);
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, 9, 18]} />
      <Scene theme={theme} />
    </Canvas>
  );
}
