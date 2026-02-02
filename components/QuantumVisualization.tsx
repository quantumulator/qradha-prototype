'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useQradhaStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Cpu, Zap, Box, RotateCcw } from 'lucide-react';

// Pure Canvas-based 3D visualization to avoid React Three Fiber issues
export default function QuantumVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [view, setView] = useState<'energy' | 'containers' | 'network'>('energy');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { isOptimizing, portState, optimizationProgress } = useQradhaStore();

  // Energy landscape animation
  const drawEnergyLandscape = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    ctx.clearRect(0, 0, width, height);
    
    // Dark gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0a0f1a');
    bgGrad.addColorStop(1, '#0d1424');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
    
    // Grid
    ctx.strokeStyle = 'rgba(0, 217, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // 3D-like energy surface
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) / 3;
    
    // Draw concentric energy rings
    for (let r = 5; r > 0; r--) {
      const radius = r * scale / 4;
      const offset = Math.sin(time * 2 + r) * 10;
      
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + offset, radius, radius * 0.6, 0, 0, Math.PI * 2);
      
      const grad = ctx.createRadialGradient(centerX, centerY + offset, 0, centerX, centerY + offset, radius);
      grad.addColorStop(0, `rgba(0, 217, 255, ${0.1 + (5 - r) * 0.05})`);
      grad.addColorStop(1, 'rgba(0, 217, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fill();
      
      ctx.strokeStyle = `rgba(0, 217, 255, ${0.3 + (5 - r) * 0.1})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Energy peaks (local minima visualization)
    const peaks = [
      { x: centerX - scale/2, y: centerY - 30, label: 'Local Min 1', value: 0.7 },
      { x: centerX + scale/2, y: centerY + 20, label: 'Local Min 2', value: 0.6 },
      { x: centerX, y: centerY - 50, label: 'Global Optimum', value: 0.2, optimal: true },
    ];
    
    peaks.forEach((peak, i) => {
      const pulse = Math.sin(time * 3 + i) * 5;
      const peakRadius = 20 + pulse;
      
      // Glow
      const glowGrad = ctx.createRadialGradient(peak.x, peak.y, 0, peak.x, peak.y, peakRadius * 2);
      glowGrad.addColorStop(0, peak.optimal ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 159, 67, 0.3)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(peak.x, peak.y, peakRadius * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Core
      ctx.beginPath();
      ctx.arc(peak.x, peak.y, peakRadius / 2, 0, Math.PI * 2);
      ctx.fillStyle = peak.optimal ? '#00FF88' : '#FF9F43';
      ctx.fill();
      
      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(peak.label, peak.x, peak.y + 35);
      ctx.fillStyle = peak.optimal ? '#00FF88' : '#FF9F43';
      ctx.fillText(`E = ${peak.value.toFixed(2)}`, peak.x, peak.y + 48);
    });
    
    // Quantum particle (current solution state)
    const particleAngle = time * (isOptimizing ? 2 : 0.5);
    const particleRadius = isOptimizing ? scale/3 * (1 - optimizationProgress/100) : scale/3;
    const particleX = centerX + Math.cos(particleAngle) * particleRadius;
    const particleY = centerY + Math.sin(particleAngle) * particleRadius * 0.6;
    
    // Particle trail
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 2; t += 0.1) {
      const trailR = particleRadius + Math.sin(t * 3 + time) * 20;
      const tx = centerX + Math.cos(particleAngle - t * 0.1) * trailR;
      const ty = centerY + Math.sin(particleAngle - t * 0.1) * trailR * 0.6;
      if (t === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }
    ctx.stroke();
    
    // Particle glow
    const particleGlow = ctx.createRadialGradient(particleX, particleY, 0, particleX, particleY, 30);
    particleGlow.addColorStop(0, 'rgba(147, 51, 234, 0.8)');
    particleGlow.addColorStop(0.5, 'rgba(147, 51, 234, 0.3)');
    particleGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = particleGlow;
    ctx.beginPath();
    ctx.arc(particleX, particleY, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Particle core
    ctx.beginPath();
    ctx.arc(particleX, particleY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#9333EA';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Title
    ctx.fillStyle = '#00D9FF';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Quantum Energy Landscape', 20, 30);
    
    // Legend
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Simulated Annealing + Tensor Networks', 20, 50);
    
    // Optimization status
    if (isOptimizing) {
      ctx.fillStyle = '#00FF88';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Optimizing... ${optimizationProgress.toFixed(0)}%`, width - 20, 30);
      
      // Progress bar
      ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
      ctx.fillRect(width - 170, 40, 150, 8);
      ctx.fillStyle = '#00FF88';
      ctx.fillRect(width - 170, 40, 150 * optimizationProgress / 100, 8);
    }
  }, [isOptimizing, optimizationProgress]);

  // Container yard visualization
  const drawContainerYard = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    ctx.clearRect(0, 0, width, height);
    
    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0a0f1a');
    bgGrad.addColorStop(1, '#0d1424');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
    
    // Draw container stacks
    const stackRows = 5;
    const stackCols = 8;
    const containerWidth = 50;
    const containerHeight = 20;
    const containerDepth = 15;
    const startX = 60;
    const startY = height - 80;
    
    const berths = portState?.berths || [];
    
    for (let row = 0; row < stackRows; row++) {
      for (let col = 0; col < stackCols; col++) {
        const stackHeight = Math.floor(Math.random() * 4) + 1;
        const baseX = startX + col * (containerWidth + 15);
        const baseY = startY - row * 60;
        
        // Stack each container
        for (let h = 0; h < stackHeight; h++) {
          const x = baseX - h * 5;
          const y = baseY - h * containerHeight;
          
          // Determine color based on status
          const colors = ['#00D9FF', '#FF6B6B', '#00FF88', '#FFD93D', '#9333EA'];
          const color = colors[(row + col + h) % colors.length];
          
          // 3D container box
          // Top face
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + containerWidth, y);
          ctx.lineTo(x + containerWidth + containerDepth, y - containerDepth/2);
          ctx.lineTo(x + containerDepth, y - containerDepth/2);
          ctx.closePath();
          ctx.fill();
          
          // Front face
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.8;
          ctx.fillRect(x, y, containerWidth, containerHeight);
          ctx.globalAlpha = 1;
          
          // Right face
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.moveTo(x + containerWidth, y);
          ctx.lineTo(x + containerWidth + containerDepth, y - containerDepth/2);
          ctx.lineTo(x + containerWidth + containerDepth, y + containerHeight - containerDepth/2);
          ctx.lineTo(x + containerWidth, y + containerHeight);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
          
          // Container lines
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, containerWidth, containerHeight);
        }
      }
    }
    
    // Crane animation
    const craneX = 200 + Math.sin(time * 0.5) * 150;
    const craneY = 50;
    
    // Crane rail
    ctx.fillStyle = '#333';
    ctx.fillRect(30, craneY, width - 60, 8);
    
    // Crane structure
    ctx.fillStyle = '#FF9F43';
    ctx.fillRect(craneX - 5, craneY, 10, 150);
    ctx.fillRect(craneX - 40, craneY + 150, 80, 10);
    
    // Crane hook
    const hookY = craneY + 80 + Math.sin(time * 2) * 20;
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(craneX, craneY + 20);
    ctx.lineTo(craneX, hookY);
    ctx.stroke();
    
    ctx.fillStyle = '#FFD93D';
    ctx.beginPath();
    ctx.arc(craneX, hookY + 10, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Title
    ctx.fillStyle = '#00D9FF';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Container Yard Operations', 20, 30);
    
    // Stats
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText(`${berths.length} Berths | ${portState?.vessels?.length || 0} Vessels | ${portState?.cranes?.length || 0} Cranes`, 20, 50);
  }, [portState]);

  // Network topology visualization
  const drawNetworkTopology = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    ctx.clearRect(0, 0, width, height);
    
    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0a0f1a');
    bgGrad.addColorStop(1, '#0d1424');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
    
    const vessels = portState?.vessels || [];
    const berths = portState?.berths || [];
    const trains = portState?.trains || [];
    
    // Create nodes
    const nodes: { x: number; y: number; label: string; type: string; color: string }[] = [];
    
    // Central port node
    nodes.push({ x: width/2, y: height/2, label: 'Hamburg Port', type: 'port', color: '#00D9FF' });
    
    // Berth nodes (inner ring)
    berths.slice(0, 6).forEach((berth, i) => {
      const angle = (i / 6) * Math.PI * 2 - Math.PI/2;
      const radius = 100;
      nodes.push({
        x: width/2 + Math.cos(angle) * radius,
        y: height/2 + Math.sin(angle) * radius,
        label: berth.name.replace(' - CTB', '').replace(' - CTA', ''),
        type: 'berth',
        color: berth.status === 'occupied' ? '#FF6B6B' : '#00FF88',
      });
    });
    
    // Vessel nodes (outer ring)
    vessels.slice(0, 6).forEach((vessel, i) => {
      const angle = (i / 6) * Math.PI * 2 - Math.PI/2 + Math.PI/6;
      const radius = 180;
      nodes.push({
        x: width/2 + Math.cos(angle) * radius,
        y: height/2 + Math.sin(angle) * radius,
        label: vessel.name.split(' ')[0],
        type: 'vessel',
        color: vessel.status === 'berthed' ? '#00FF88' : vessel.status === 'approaching' ? '#00D9FF' : '#FF9F43',
      });
    });
    
    // Train nodes (bottom)
    trains.forEach((train, i) => {
      nodes.push({
        x: 80 + i * 120,
        y: height - 60,
        label: train.name.split(' ')[0],
        type: 'train',
        color: '#9333EA',
      });
    });
    
    // Draw connections
    ctx.lineWidth = 1;
    nodes.forEach((node, i) => {
      if (node.type === 'berth') {
        // Connect berths to port
        ctx.strokeStyle = 'rgba(0, 217, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        ctx.lineTo(node.x, node.y);
        ctx.stroke();
      }
      if (node.type === 'vessel') {
        // Connect vessels to nearest berth
        const nearestBerth = nodes.find(n => n.type === 'berth');
        if (nearestBerth) {
          const gradient = ctx.createLinearGradient(node.x, node.y, nearestBerth.x, nearestBerth.y);
          gradient.addColorStop(0, node.color);
          gradient.addColorStop(1, 'transparent');
          ctx.strokeStyle = gradient;
          ctx.beginPath();
          ctx.setLineDash([5, 5]);
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(nearestBerth.x, nearestBerth.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      if (node.type === 'train') {
        // Connect trains to port
        ctx.strokeStyle = 'rgba(147, 51, 234, 0.3)';
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        ctx.lineTo(node.x, node.y);
        ctx.stroke();
      }
    });
    
    // Draw nodes
    nodes.forEach((node, i) => {
      // Pulse effect
      const pulse = Math.sin(time * 2 + i) * 3;
      const radius = node.type === 'port' ? 30 : node.type === 'berth' ? 20 : 15;
      
      // Glow
      const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 2);
      glow.addColorStop(0, node.color + '40');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius * 2 + pulse, 0, Math.PI * 2);
      ctx.fill();
      
      // Node
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + pulse/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Label
      ctx.fillStyle = '#fff';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + radius + 18);
    });
    
    // Title
    ctx.fillStyle = '#00D9FF';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Port Network Topology', 20, 30);
    
    // Legend
    ctx.font = '11px Inter, sans-serif';
    const legendY = 50;
    const legendItems = [
      { color: '#00D9FF', label: 'Port Hub' },
      { color: '#00FF88', label: 'Available' },
      { color: '#FF6B6B', label: 'Occupied' },
      { color: '#9333EA', label: 'Rail' },
    ];
    legendItems.forEach((item, i) => {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(30 + i * 80, legendY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#888';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, 40 + i * 80, legendY + 4);
    });
  }, [portState]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Canvas 2D context not available');
      return;
    }

    setIsLoading(false);

    let startTime = Date.now();
    
    const animate = () => {
      const time = (Date.now() - startTime) / 1000;
      const { width, height } = canvas;
      
      switch (view) {
        case 'energy':
          drawEnergyLandscape(ctx, width, height, time);
          break;
        case 'containers':
          drawContainerYard(ctx, width, height, time);
          break;
        case 'network':
          drawNetworkTopology(ctx, width, height, time);
          break;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [view, drawEnergyLandscape, drawContainerYard, drawNetworkTopology]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const container = canvas.parentElement;
        if (container) {
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-navy-400 rounded-xl">
        <div className="text-center p-8">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Visualization Error</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-accent-cyan text-navy rounded-lg hover:bg-accent-cyan/80"
          >
            <RotateCcw className="w-4 h-4 inline mr-2" />
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* View selector */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setView('energy')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            view === 'energy' ? 'bg-accent-cyan text-navy' : 'bg-navy-400/80 hover:bg-navy-300'
          }`}
        >
          <Zap className="w-4 h-4" />
          Energy
        </button>
        <button
          onClick={() => setView('containers')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            view === 'containers' ? 'bg-accent-cyan text-navy' : 'bg-navy-400/80 hover:bg-navy-300'
          }`}
        >
          <Box className="w-4 h-4" />
          Containers
        </button>
        <button
          onClick={() => setView('network')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            view === 'network' ? 'bg-accent-cyan text-navy' : 'bg-navy-400/80 hover:bg-navy-300'
          }`}
        >
          <Cpu className="w-4 h-4" />
          Network
        </button>
      </div>

      {/* Loading state */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-navy-400 z-20"
          >
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading visualization...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-xl"
        style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #0d1424 100%)' }}
      />
    </div>
  );
}
