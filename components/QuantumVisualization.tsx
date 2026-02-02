'use client';

import { useRef, useMemo, useState, useEffect, Component, ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, Box } from '@react-three/drei';
import * as THREE from 'three';
import { useQradhaStore } from '@/lib/store';

// Error Boundary for 3D components
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ThreeErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('3D Visualization Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Energy Landscape Surface
function EnergyLandscape() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { isOptimizing } = useQradhaStore();
  
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(10, 10, 50, 50);
    const positions = geo.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      
      let z = Math.sin(x * 0.8) * Math.cos(y * 0.8) * 0.5;
      z += Math.sin(x * 1.5 + 1) * Math.cos(y * 1.5 + 1) * 0.3;
      z += Math.sin(x * 2.5) * Math.cos(y * 2.5) * 0.15;
      
      const dist1 = Math.sqrt((x - 2) ** 2 + (y - 2) ** 2);
      const dist2 = Math.sqrt((x + 2) ** 2 + (y - 2) ** 2);
      z += Math.exp(-dist1 * 0.8) * 1.5;
      z += Math.exp(-dist2 * 0.8) * 1.2;
      
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
      <primitive object={geometry} attach="geometry" />
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
  const { isOptimizing } = useQradhaStore();
  const [position, setPosition] = useState({ x: 2, y: 2, z: 1 });

  useFrame(({ clock }) => {
    if (!particleRef.current) return;
    
    const t = clock.elapsedTime;
    
    if (isOptimizing) {
      const targetX = -1;
      const targetY = -1;
      
      const newX = position.x + (targetX - position.x) * 0.02 + Math.sin(t * 3) * 0.1;
      const newY = position.y + (targetY - position.y) * 0.02 + Math.cos(t * 3) * 0.1;
      
      let newZ = Math.sin(newX * 0.8) * Math.cos(newY * 0.8) * 0.5;
      newZ += Math.sin(newX * 1.5 + 1) * Math.cos(newY * 1.5 + 1) * 0.3;
      newZ += 0.5;
      
      setPosition({ x: newX, y: newY, z: newZ });
      
      particleRef.current.position.x = newX;
      particleRef.current.position.y = newZ;
      particleRef.current.position.z = newY;
    } else {
      particleRef.current.position.y = position.z + Math.sin(t * 2) * 0.1;
    }
    
    const scale = 1 + Math.sin(t * 5) * 0.1;
    particleRef.current.scale.setScalar(scale);
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={particleRef} position={[position.x, position.z + 0.5, position.y]}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial
          color="#FF6B35"
          emissive="#FF6B35"
          emissiveIntensity={0.5}
        />
      </mesh>
    </Float>
  );
}

// Container yard visualization
function ContainerYard() {
  const { portState } = useQradhaStore();
  
  const containers = useMemo(() => {
    const result: { position: [number, number, number]; height: number; color: string }[] = [];
    const gridSize = 8;
    const berths = portState.berths;
    
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const berth = berths[Math.floor(Math.random() * berths.length)];
        const utilization = berth?.utilization || 50;
        const isOccupied = Math.random() * 100 < utilization;
        
        if (isOccupied) {
          result.push({
            position: [x - gridSize / 2, 0, z - gridSize / 2],
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
        <Box 
          key={i} 
          args={[0.4, container.height, 0.2]}
          position={[container.position[0] * 0.6, container.height / 2, container.position[2] * 0.6]}
        >
          <meshStandardMaterial color={container.color} />
        </Box>
      ))}
      
      {/* Crane */}
      <group position={[0, 0, 4]}>
        <Box args={[0.1, 3, 0.1]} position={[0, 1.5, 0]}>
          <meshStandardMaterial color="#FF6B35" />
        </Box>
        <Box args={[4, 0.1, 0.1]} position={[0, 3, 0]}>
          <meshStandardMaterial color="#FF6B35" />
        </Box>
      </group>
    </group>
  );
}

function getContainerColor(): string {
  const colors = ['#00D9FF', '#FF6B35', '#22c55e', '#eab308', '#a855f7'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Labels using Text component
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
        color="#888888"
        anchorX="center"
      >
        Berth Allocation →
      </Text>
      <Text
        position={[0, 1, 4]}
        fontSize={0.15}
        color="#888888"
        anchorX="center"
        rotation={[0, -Math.PI / 2, 0]}
      >
        Time →
      </Text>
    </group>
  );
}

// Scene content
function SceneContent({ viewMode }: { viewMode: 'landscape' | 'yard' }) {
  return (
    <>
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
      
      <gridHelper args={[20, 20, '#1e3a5f', '#1e3a5f']} position={[0, -2.5, 0]} />
    </>
  );
}

// Error fallback UI
function ErrorFallback({ error, onRetry }: { error?: string; onRetry: () => void }) {
  return (
    <div className="w-full h-full bg-navy-400 flex items-center justify-center">
      <div className="text-center p-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">3D Visualization Error</h3>
        <p className="text-gray-400 text-sm mb-4 max-w-xs mx-auto">
          {error || 'Unable to render the 3D visualization. Your browser may not support WebGL.'}
        </p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-accent-cyan text-navy rounded-lg hover:bg-accent-cyan/80 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export default function QuantumVisualization() {
  const { isOptimizing, lastOptimization } = useQradhaStore();
  const [viewMode, setViewMode] = useState<'landscape' | 'yard'>('landscape');
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [key, setKey] = useState(0);

  // Check WebGL support
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasError(true);
      }
    } catch (e) {
      setHasError(true);
    }
  }, []);

  const handleRetry = () => {
    setHasError(false);
    setKey(prev => prev + 1);
  };

  if (hasError) {
    return <ErrorFallback onRetry={handleRetry} />;
  }

  return (
    <div className="relative w-full h-full">
      <ThreeErrorBoundary fallback={<ErrorFallback onRetry={handleRetry} />}>
        <Canvas 
          key={key}
          camera={{ position: [8, 6, 8], fov: 50 }}
          onCreated={() => setIsLoaded(true)}
          gl={{ 
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false
          }}
        >
          <SceneContent viewMode={viewMode} />
        </Canvas>
      </ThreeErrorBoundary>
      
      {/* Loading overlay */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-navy-400 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading 3D visualization...</p>
          </div>
        </div>
      )}
      
      {/* Controls overlay */}
      <div className="absolute top-4 left-4 flex gap-2">
        <button
          onClick={() => setViewMode('landscape')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            viewMode === 'landscape' 
              ? 'bg-accent-cyan text-navy shadow-lg shadow-accent-cyan/30' 
              : 'bg-navy-300/80 hover:bg-navy-200 backdrop-blur-sm'
          }`}
        >
          ⚡ Energy Landscape
        </button>
        <button
          onClick={() => setViewMode('yard')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            viewMode === 'yard' 
              ? 'bg-accent-cyan text-navy shadow-lg shadow-accent-cyan/30' 
              : 'bg-navy-300/80 hover:bg-navy-200 backdrop-blur-sm'
          }`}
        >
          📦 Container Yard
        </button>
      </div>
      
      {/* Help tooltip */}
      <div className="absolute top-4 right-4 glass rounded-lg px-3 py-2 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span>🖱️ Drag to rotate</span>
          <span>•</span>
          <span>Scroll to zoom</span>
        </div>
      </div>
      
      {/* Status indicator */}
      {isOptimizing && (
        <div className="absolute bottom-4 left-4 glass rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-accent-orange animate-ping absolute" />
            <div className="w-3 h-3 rounded-full bg-accent-orange" />
          </div>
          <span className="text-sm font-medium">Quantum tunneling in progress...</span>
        </div>
      )}
      
      {lastOptimization && !isOptimizing && (
        <div className="absolute bottom-4 left-4 glass rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm">
            ✓ Optimal solution found: <span className="font-semibold text-green-400">{lastOptimization.improvement_percent.toFixed(1)}% improvement</span>
          </span>
        </div>
      )}
    </div>
  );
}
