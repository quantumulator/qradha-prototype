'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useQradhaStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Cpu, Zap, Box, RotateCcw, Play, Pause, ZoomIn, ZoomOut } from 'lucide-react';

interface InteractiveNode {
  x: number;
  y: number;
  radius: number;
  label: string;
  type: string;
  color: string;
  data?: Record<string, unknown>;
}

interface Tooltip {
  x: number;
  y: number;
  content: string;
  visible: boolean;
}

// Pure Canvas-based 3D visualization with full interactivity
export default function QuantumVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const nodesRef = useRef<InteractiveNode[]>([]);
  const [view, setView] = useState<'energy' | 'containers' | 'network'>('energy');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [tooltip, setTooltip] = useState<Tooltip>({ x: 0, y: 0, content: '', visible: false });
  const [selectedNode, setSelectedNode] = useState<InteractiveNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<InteractiveNode | null>(null);
  
  const { isOptimizing, portState, optimizationProgress, runOptimization, currentDisruption } = useQradhaStore();

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    const clickedNode = nodesRef.current.find(node => {
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) < node.radius * 1.5;
    });
    
    if (clickedNode) {
      setSelectedNode(clickedNode);
    } else {
      setSelectedNode(null);
    }
  }, []);

  // Handle canvas mouse move for hover effects
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    const hovered = nodesRef.current.find(node => {
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) < node.radius * 1.5;
    });
    
    if (hovered) {
      setHoveredNode(hovered);
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 40,
        content: `${hovered.label}\n${hovered.type.charAt(0).toUpperCase() + hovered.type.slice(1)}`,
        visible: true,
      });
      canvas.style.cursor = 'pointer';
    } else {
      setHoveredNode(null);
      setTooltip(prev => ({ ...prev, visible: false }));
      canvas.style.cursor = 'default';
    }
  }, []);

  // Energy landscape animation
  const drawEnergyLandscape = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    ctx.clearRect(0, 0, width, height);
    nodesRef.current = [];
    
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0a0f1a');
    bgGrad.addColorStop(1, '#0d1424');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
    
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-width / 2, -height / 2);
    
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
    
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) / 3;
    
    for (let r = 5; r > 0; r--) {
      const radius = r * scale / 4;
      const offset = isPaused ? 0 : Math.sin(time * 2 + r) * 10;
      
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
    
    const peaks = [
      { x: centerX - scale/2, y: centerY - 30, label: 'Local Min 1', value: 0.7, type: 'minimum' },
      { x: centerX + scale/2, y: centerY + 20, label: 'Local Min 2', value: 0.6, type: 'minimum' },
      { x: centerX, y: centerY - 50, label: 'Global Optimum', value: 0.2, optimal: true, type: 'optimum' },
    ];
    
    peaks.forEach((peak, i) => {
      const isHovered = hoveredNode?.label === peak.label;
      const isSelected = selectedNode?.label === peak.label;
      const pulse = isPaused ? 0 : Math.sin(time * 3 + i) * 5;
      const peakRadius = (isHovered || isSelected ? 25 : 20) + pulse;
      
      const glowGrad = ctx.createRadialGradient(peak.x, peak.y, 0, peak.x, peak.y, peakRadius * 2);
      glowGrad.addColorStop(0, peak.optimal ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 159, 67, 0.3)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(peak.x, peak.y, peakRadius * 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(peak.x, peak.y, peakRadius / 2, 0, Math.PI * 2);
      ctx.fillStyle = peak.optimal ? '#00FF88' : '#FF9F43';
      ctx.fill();
      
      if (isSelected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(peak.x, peak.y, peakRadius / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(peak.label, peak.x, peak.y + 35);
      ctx.fillStyle = peak.optimal ? '#00FF88' : '#FF9F43';
      ctx.fillText(`E = ${peak.value.toFixed(2)}`, peak.x, peak.y + 48);
      
      nodesRef.current.push({
        x: peak.x,
        y: peak.y,
        radius: peakRadius / 2,
        label: peak.label,
        type: peak.type,
        color: peak.optimal ? '#00FF88' : '#FF9F43',
        data: { energy: peak.value },
      });
    });
    
    const particleAngle = isPaused ? 0 : time * (isOptimizing ? 2 : 0.5);
    const particleRadius = isOptimizing ? scale/3 * (1 - optimizationProgress/100) : scale/3;
    const particleX = centerX + Math.cos(particleAngle) * particleRadius;
    const particleY = centerY + Math.sin(particleAngle) * particleRadius * 0.6;
    
    if (!isPaused) {
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
    }
    
    const particleGlow = ctx.createRadialGradient(particleX, particleY, 0, particleX, particleY, 30);
    particleGlow.addColorStop(0, 'rgba(147, 51, 234, 0.8)');
    particleGlow.addColorStop(0.5, 'rgba(147, 51, 234, 0.3)');
    particleGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = particleGlow;
    ctx.beginPath();
    ctx.arc(particleX, particleY, 30, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(particleX, particleY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#9333EA';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    nodesRef.current.push({
      x: particleX,
      y: particleY,
      radius: 8,
      label: 'Quantum State',
      type: 'particle',
      color: '#9333EA',
      data: { progress: optimizationProgress },
    });
    
    ctx.restore();
    
    ctx.fillStyle = '#00D9FF';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Quantum Energy Landscape', 20, 30);
    
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Simulated Annealing + Tensor Networks', 20, 50);
    ctx.fillText('Click on nodes to inspect • Scroll to zoom', 20, 68);
    
    if (isOptimizing) {
      ctx.fillStyle = '#00FF88';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Optimizing... ${optimizationProgress.toFixed(0)}%`, width - 20, 30);
      
      ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
      ctx.fillRect(width - 170, 40, 150, 8);
      ctx.fillStyle = '#00FF88';
      ctx.fillRect(width - 170, 40, 150 * optimizationProgress / 100, 8);
    }
  }, [isOptimizing, optimizationProgress, isPaused, zoom, hoveredNode, selectedNode]);

  // Container yard visualization
  const drawContainerYard = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    ctx.clearRect(0, 0, width, height);
    nodesRef.current = [];
    
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0a0f1a');
    bgGrad.addColorStop(1, '#0d1424');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
    
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-width / 2, -height / 2);
    
    const stackRows = 5;
    const stackCols = 8;
    const containerWidth = 50;
    const containerHeight = 20;
    const containerDepth = 15;
    const startX = 60;
    const startY = height - 80;
    
    const berths = portState?.berths || [];
    const colors = ['#00D9FF', '#FF6B6B', '#00FF88', '#FFD93D', '#9333EA'];
    
    for (let row = 0; row < stackRows; row++) {
      for (let col = 0; col < stackCols; col++) {
        const stackHeight = ((row + col) % 4) + 1;
        const baseX = startX + col * (containerWidth + 15);
        const baseY = startY - row * 60;
        
        const stackId = `stack_${row}_${col}`;
        const isStackHovered = hoveredNode?.label === stackId;
        const isStackSelected = selectedNode?.label === stackId;
        
        for (let h = 0; h < stackHeight; h++) {
          const x = baseX - h * 5;
          const y = baseY - h * containerHeight;
          const color = colors[(row + col + h) % colors.length];
          const cScale = isStackHovered || isStackSelected ? 1.05 : 1;
          
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + containerWidth * cScale, y);
          ctx.lineTo(x + containerWidth * cScale + containerDepth, y - containerDepth/2);
          ctx.lineTo(x + containerDepth, y - containerDepth/2);
          ctx.closePath();
          ctx.fill();
          
          ctx.fillStyle = color;
          ctx.globalAlpha = isStackHovered ? 1 : 0.8;
          ctx.fillRect(x, y, containerWidth * cScale, containerHeight);
          ctx.globalAlpha = 1;
          
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.moveTo(x + containerWidth * cScale, y);
          ctx.lineTo(x + containerWidth * cScale + containerDepth, y - containerDepth/2);
          ctx.lineTo(x + containerWidth * cScale + containerDepth, y + containerHeight - containerDepth/2);
          ctx.lineTo(x + containerWidth * cScale, y + containerHeight);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
          
          ctx.strokeStyle = isStackSelected ? '#fff' : 'rgba(0,0,0,0.3)';
          ctx.lineWidth = isStackSelected ? 2 : 1;
          ctx.strokeRect(x, y, containerWidth * cScale, containerHeight);
        }
        
        nodesRef.current.push({
          x: baseX + containerWidth / 2,
          y: baseY - (stackHeight * containerHeight) / 2,
          radius: 30,
          label: stackId,
          type: 'container_stack',
          color: colors[(row + col) % colors.length],
          data: { row, col, height: stackHeight, teu: stackHeight * 2 },
        });
      }
    }
    
    const craneX = isPaused ? 350 : 200 + Math.sin(time * 0.5) * 150;
    const craneY = 50;
    
    ctx.fillStyle = '#333';
    ctx.fillRect(30, craneY, width - 60, 8);
    
    ctx.fillStyle = '#FF9F43';
    ctx.fillRect(craneX - 5, craneY, 10, 150);
    ctx.fillRect(craneX - 40, craneY + 150, 80, 10);
    
    const hookY = craneY + 80 + (isPaused ? 0 : Math.sin(time * 2) * 20);
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
    
    nodesRef.current.push({
      x: craneX,
      y: craneY + 75,
      radius: 40,
      label: 'Gantry Crane',
      type: 'crane',
      color: '#FF9F43',
      data: { status: 'active', moves_per_hour: 35 },
    });
    
    ctx.restore();
    
    ctx.fillStyle = '#00D9FF';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Container Yard Operations', 20, 30);
    
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText(`${berths.length} Berths | ${portState?.vessels?.length || 0} Vessels | ${portState?.cranes?.length || 0} Cranes`, 20, 50);
    ctx.fillText('Click containers to inspect • Hover for details', 20, 68);
  }, [portState, isPaused, zoom, hoveredNode, selectedNode]);

  // Network topology visualization
  const drawNetworkTopology = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    ctx.clearRect(0, 0, width, height);
    nodesRef.current = [];
    
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0a0f1a');
    bgGrad.addColorStop(1, '#0d1424');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
    
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-width / 2, -height / 2);
    
    const vessels = portState?.vessels || [];
    const berths = portState?.berths || [];
    const trains = portState?.trains || [];
    
    const nodes: InteractiveNode[] = [];
    
    nodes.push({ x: width/2, y: height/2, radius: 30, label: 'Hamburg Port', type: 'port', color: '#00D9FF' });
    
    berths.slice(0, 6).forEach((berth, i) => {
      const angle = (i / 6) * Math.PI * 2 - Math.PI/2;
      const radius = 100;
      nodes.push({
        x: width/2 + Math.cos(angle) * radius,
        y: height/2 + Math.sin(angle) * radius,
        radius: 20,
        label: berth.name.replace(' - CTB', '').replace(' - CTA', ''),
        type: 'berth',
        color: berth.status === 'occupied' ? '#FF6B6B' : '#00FF88',
        data: { status: berth.status, utilization: berth.utilization },
      });
    });
    
    vessels.slice(0, 6).forEach((vessel, i) => {
      const angle = (i / 6) * Math.PI * 2 - Math.PI/2 + Math.PI/6;
      const radius = 180;
      nodes.push({
        x: width/2 + Math.cos(angle) * radius,
        y: height/2 + Math.sin(angle) * radius,
        radius: 15,
        label: vessel.name.split(' ')[0],
        type: 'vessel',
        color: vessel.status === 'berthed' ? '#00FF88' : vessel.status === 'approaching' ? '#00D9FF' : '#FF9F43',
        data: { status: vessel.status, cargo_teu: vessel.cargo_teu },
      });
    });
    
    trains.forEach((train, i) => {
      nodes.push({
        x: 80 + i * 120,
        y: height - 60,
        radius: 15,
        label: train.name.split(' ')[0],
        type: 'train',
        color: '#9333EA',
        data: { status: train.status, containers_teu: train.containers_teu },
      });
    });
    
    ctx.lineWidth = 1;
    nodes.forEach((node) => {
      if (node.type === 'berth') {
        const dashOffset = isPaused ? 0 : time * 20;
        ctx.strokeStyle = 'rgba(0, 217, 255, 0.3)';
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = dashOffset;
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        ctx.lineTo(node.x, node.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (node.type === 'vessel') {
        const nearestBerth = nodes.find(n => n.type === 'berth');
        if (nearestBerth) {
          const gradient = ctx.createLinearGradient(node.x, node.y, nearestBerth.x, nearestBerth.y);
          gradient.addColorStop(0, node.color);
          gradient.addColorStop(1, 'transparent');
          ctx.strokeStyle = gradient;
          ctx.beginPath();
          ctx.setLineDash([5, 5]);
          ctx.lineDashOffset = isPaused ? 0 : -time * 30;
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(nearestBerth.x, nearestBerth.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      if (node.type === 'train') {
        ctx.strokeStyle = 'rgba(147, 51, 234, 0.3)';
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        ctx.lineTo(node.x, node.y);
        ctx.stroke();
      }
    });
    
    nodes.forEach((node, i) => {
      const isHovered = hoveredNode?.label === node.label;
      const isSelected = selectedNode?.label === node.label;
      
      const pulse = isPaused ? 0 : Math.sin(time * 2 + i) * 3;
      const nodeRadius = (isHovered || isSelected ? node.radius * 1.2 : node.radius) + pulse;
      
      const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, nodeRadius * 2);
      glow.addColorStop(0, node.color + '40');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius * 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = isSelected ? '#fff' : isHovered ? '#ccc' : '#fff';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      
      ctx.fillStyle = '#fff';
      ctx.font = isHovered ? 'bold 11px Inter, sans-serif' : '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + nodeRadius + 18);
      
      nodesRef.current.push(node);
    });
    
    ctx.restore();
    
    ctx.fillStyle = '#00D9FF';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Port Network Topology', 20, 30);
    
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
    
    ctx.fillStyle = '#888';
    ctx.fillText('Click nodes to view details • Scroll to zoom', 20, 68);
  }, [portState, isPaused, zoom, hoveredNode, selectedNode]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(2, Math.max(0.5, prev * delta)));
  }, []);

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
      const time = isPaused ? 0 : (Date.now() - startTime) / 1000;
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
  }, [view, drawEnergyLandscape, drawContainerYard, drawNetworkTopology, isPaused]);

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

  const handleRunOptimization = async () => {
    if (currentDisruption && !isOptimizing) {
      await runOptimization(currentDisruption);
    }
  };

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

      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="p-2 rounded-lg bg-navy-400/80 hover:bg-navy-300 transition-all"
          title={isPaused ? 'Play' : 'Pause'}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setZoom(prev => Math.min(2, prev * 1.2))}
          className="p-2 rounded-lg bg-navy-400/80 hover:bg-navy-300 transition-all"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(0.5, prev * 0.8))}
          className="p-2 rounded-lg bg-navy-400/80 hover:bg-navy-300 transition-all"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="p-2 rounded-lg bg-navy-400/80 hover:bg-navy-300 transition-all"
          title="Reset Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        {currentDisruption && !isOptimizing && (
          <button
            onClick={handleRunOptimization}
            className="px-3 py-2 rounded-lg bg-accent-orange text-navy font-medium flex items-center gap-2 hover:bg-accent-orange/80 transition-all"
          >
            <Zap className="w-4 h-4" />
            Optimize
          </button>
        )}
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

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip.visible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute z-30 bg-navy-400 border border-accent-cyan/30 rounded-lg px-3 py-2 text-sm pointer-events-none"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}
          >
            {tooltip.content.split('\n').map((line, i) => (
              <div key={i} className={i === 0 ? 'font-semibold text-accent-cyan' : 'text-gray-400 text-xs'}>
                {line}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected node info panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute bottom-4 left-4 z-20 bg-navy-400/95 border border-accent-cyan/30 rounded-lg p-4 min-w-[200px]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: selectedNode.color }}
                />
                <span className="font-semibold text-accent-cyan">{selectedNode.label}</span>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="text-gray-500 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="text-xs text-gray-400 capitalize mb-2">
              {selectedNode.type.replace('_', ' ')}
            </div>
            {selectedNode.data && (
              <div className="space-y-1 text-sm">
                {Object.entries(selectedNode.data).slice(0, 5).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500 capitalize">{key.replace('_', ' ')}:</span>
                    <span className="text-white">
                      {typeof value === 'number' ? value.toFixed(1) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-xl"
        style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #0d1424 100%)' }}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onWheel={handleWheel}
      />
    </div>
  );
}
