'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useQradhaStore } from '@/lib/store';

// Energy Landscape Surface
function EnergyLandscape() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { isOptimizing, lastOptimization } = useQradhaStore();
  
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(10, 10, 50, 50);
    const positions = geo.attributes.position.array as Float32Array;
    
    // Create energy landscape with valleys and peaks
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      
      // Multiple sine waves for complex landscape
      let z = Math.sin(x * 0.8) * Math.cos(y * 0.8) * 0.5;
      z += Math.sin(x * 1.5 + 1) * Math.cos(y * 1.5 + 1) * 0.3;
      z += Math.sin(x * 2.5) * Math.cos(y * 2.5) * 0.15;
      
      // Add some peaks (constraint violations)
      const dist1 = Math.sqrt((x - 2) ** 2 + (y - 2) ** 2);
      const dist2 = Math.sqrt((x + 2) ** 2 + (y - 2) ** 2);
      z += Math.exp(-dist1 * 0.8) * 1.5;
      z += Math.exp(-dist2 * 0.8) * 1.2;
      
      // Deep valley (optimal solution)
      const distOptimal = Math.sqrt((x + 1) ** 2 + (y + 1) ** 2);
      z -= Math.exp(-distOptimal * 0.5) * 0.8;
      
      positions[i + 2] = z;
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current && isOptimizing) {
      meshRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.2) * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -1, 0]}>
      <primitive object={geometry} />
      <meshStandardMaterial
        color="#00D9FF"
        wireframe
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

// Quantum particle representing current solution
function QuantumParticle() {
  const particleRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Points>(null);
  const { isOptimizing } = useQradhaStore();
  const [position, setPosition] = useState({ x: 2, y: 2, z: 1 });
  
  // Trail positions
  const trailPositions = useMemo(() => new Float32Array(300), []);
  const trailIndex = useRef(0);

  useFrame(({ clock }) => {
    if (!particleRef.current) return;
    
    const t = clock.elapsedTime;
    
    if (isOptimizing) {
      // Quantum tunneling animation - move towards optimal
      const targetX = -1;
      const targetY = -1;
      
      const newX = position.x + (targetX - position.x) * 0.02 + Math.sin(t * 3) * 0.1;
      const newY = position.y + (targetY - position.y) * 0.02 + Math.cos(t * 3) * 0.1;
      
      // Calculate z based on landscape
      let newZ = Math.sin(newX * 0.8) * Math.cos(newY * 0.8) * 0.5;
      newZ += Math.sin(newX * 1.5 + 1) * Math.cos(newY * 1.5 + 1) * 0.3;
      newZ += 0.5; // Hover above surface
      
      setPosition({ x: newX, y: newY, z: newZ });
      
      particleRef.current.position.x = newX;
      particleRef.current.position.y = newZ;
      particleRef.current.position.z = newY;
      
      // Update trail
      if (trailRef.current) {
        const idx = (trailIndex.current % 100) * 3;
        trailPositions[idx] = newX;
        trailPositions[idx + 1] = newZ;
        trailPositions[idx + 2] = newY;
        trailIndex.current++;
        trailRef.current.geometry.attributes.position.needsUpdate = true;
      }
    } else {
      // Idle oscillation
      particleRef.current.position.y = position.z + Math.sin(t * 2) * 0.1;
    }
    
    // Pulse effect
    const scale = 1 + Math.sin(t * 5) * 0.1;
    particleRef.current.scale.setScalar(scale);
  });

  return (
    <group>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh ref={particleRef} position={[position.x, position.z + 0.5, position.y]}>
          <sphereGeometry args={[0.15, 32, 32]} />
          <MeshDistortMaterial
            color="#FF6B35"
            emissive="#FF6B35"
            emissiveIntensity={0.5}
            distort={0.3}
            speed={4}
          />
        </mesh>
      </Float>
      
      {/* Trail */}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={100}
            array={trailPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color="#FF6B35" size={0.05} transparent opacity={0.5} />
      </points>
    </group>
  );
}

// Container yard visualization
function ContainerYard() {
  const { portState } = useQradhaStore();
  
  const containers = useMemo(() => {
    const result = [];
    const gridSize = 8;
    const berths = portState.berths;
    
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const berth = berths[Math.floor(Math.random() * berths.length)];
        const utilization = berth?.utilization || 50;
        const isOccupied = Math.random() * 100 < utilization;
        
        if (isOccupied) {
          result.push({
            position: [x - gridSize / 2, 0, z - gridSize / 2] as [number, number, number],
            height: 0.2 + Math.random() * 0.4,
            color: getContainerColor(),
          });
        }
      }
    }
    return result;
  }, [portState.berths]);

  return (
    <group position={[0, -2, 0]}>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#0A1929" />
      </mesh>
      
      {/* Containers */}
      {containers.map((container, i) => (
        <mesh key={i} position={[container.position[0] * 0.6, container.height / 2, container.position[2] * 0.6]}>
          <boxGeometry args={[0.4, container.height, 0.2]} />
          <meshStandardMaterial color={container.color} />
        </mesh>
      ))}
      
      {/* Crane */}
      <group position={[0, 0, 4]}>
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[0.1, 3, 0.1]} />
          <meshStandardMaterial color="#FF6B35" />
        </mesh>
        <mesh position={[0, 3, 0]}>
          <boxGeometry args={[4, 0.1, 0.1]} />
          <meshStandardMaterial color="#FF6B35" />
        </mesh>
      </group>
    </group>
  );
}

function getContainerColor(): string {
  const colors = ['#00D9FF', '#FF6B35', '#22c55e', '#eab308', '#a855f7'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Labels
function Labels() {
  return (
    <group>
      <Text
        position={[0, 3, 0]}
        fontSize={0.3}
        color="#00D9FF"
        anchorX="center"
        anchorY="middle"
      >
        Quantum Optimization Landscape
      </Text>
      <Text
        position={[-4, 1, 0]}
        fontSize={0.15}
        color="#888"
        anchorX="center"
      >
        Berth Allocation →
      </Text>
      <Text
        position={[0, 1, 4]}
        fontSize={0.15}
        color="#888"
        anchorX="center"
        rotation={[0, -Math.PI / 2, 0]}
      >
        Time →
      </Text>
    </group>
  );
}

export default function QuantumVisualization() {
  const { isOptimizing, lastOptimization } = useQradhaStore();
  const [viewMode, setViewMode] = useState<'landscape' | 'yard'>('landscape');

  return (
    <div className="relative w-full h-full">
      <Canvas camera={{ position: [8, 6, 8], fov: 50 }}>
        <color attach="background" args={['#0A1929']} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, 10, -5]} intensity={0.5} color="#00D9FF" />
        
        {viewMode === 'landscape' ? (
          <>
            <EnergyLandscape />
            <QuantumParticle />
            <Labels />
          </>
        ) : (
          <ContainerYard />
        )}
        
        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true}
          minDistance={5}
          maxDistance={20}
        />
        
        {/* Grid helper */}
        <gridHelper args={[20, 20, '#1e3a5f', '#1e3a5f']} position={[0, -2.5, 0]} />
      </Canvas>
      
      {/* Controls overlay */}
      <div className="absolute top-4 left-4 flex gap-2">
        <button
          onClick={() => setViewMode('landscape')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            viewMode === 'landscape' 
              ? 'bg-accent-cyan text-navy' 
              : 'bg-navy-300 hover:bg-navy-200'
          }`}
        >
          Energy Landscape
        </button>
        <button
          onClick={() => setViewMode('yard')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            viewMode === 'yard' 
              ? 'bg-accent-cyan text-navy' 
              : 'bg-navy-300 hover:bg-navy-200'
          }`}
        >
          Container Yard
        </button>
      </div>
      
      {/* Status indicator */}
      {isOptimizing && (
        <div className="absolute bottom-4 left-4 glass rounded-lg px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-orange animate-pulse" />
          <span className="text-sm">Quantum tunneling in progress...</span>
        </div>
      )}
      
      {lastOptimization && !isOptimizing && (
        <div className="absolute bottom-4 left-4 glass rounded-lg px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm">
            Optimal solution found: {lastOptimization.improvement_percent.toFixed(1)}% improvement
          </span>
        </div>
      )}
    </div>
  );
}
