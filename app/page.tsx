'use client';

import dynamic from 'next/dynamic';
import { useQradhaStore } from '@/lib/store';
import Header from '@/components/Header';
import MetricsPanel from '@/components/MetricsPanel';
import VesselList from '@/components/VesselList';
import ChatPanel from '@/components/ChatPanel';
import DisruptionPanel from '@/components/DisruptionPanel';

// Dynamic imports for heavy components
const PortMap = dynamic(() => import('@/components/PortMap'), { 
  ssr: false,
  loading: () => <MapSkeleton />
});

const QuantumVisualization = dynamic(() => import('@/components/QuantumVisualization'), { 
  ssr: false,
  loading: () => <VisualizationSkeleton />
});

function MapSkeleton() {
  return (
    <div className="w-full h-full bg-navy-400 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading map...</p>
      </div>
    </div>
  );
}

function VisualizationSkeleton() {
  return (
    <div className="w-full h-full bg-navy-400 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-accent-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading 3D visualization...</p>
      </div>
    </div>
  );
}

export default function Home() {
  const { activePanel } = useQradhaStore();

  return (
    <div className="h-screen flex flex-col bg-navy">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Vessel List */}
        <aside className="w-80 glass border-r border-navy-300 overflow-hidden">
          <VesselList />
        </aside>
        
        {/* Main Panel */}
        <main className="flex-1 relative">
          {activePanel === 'map' && <PortMap />}
          {activePanel === '3d' && <QuantumVisualization />}
          {activePanel === 'metrics' && (
            <div className="h-full overflow-y-auto bg-navy-500">
              <div className="max-w-4xl mx-auto">
                <MetricsPanel />
              </div>
            </div>
          )}
        </main>
        
        {/* Right Sidebar - Metrics Summary (visible on map/3d views) */}
        {(activePanel === 'map' || activePanel === '3d') && (
          <aside className="w-80 glass border-l border-navy-300 overflow-hidden">
            <MetricsPanel />
          </aside>
        )}
      </div>
      
      {/* Overlays */}
      <ChatPanel />
      <DisruptionPanel />
    </div>
  );
}
