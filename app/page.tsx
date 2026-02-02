'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { useQradhaStore } from '@/lib/store';
import Header from '@/components/Header';
import MetricsPanel from '@/components/MetricsPanel';
import VesselList from '@/components/VesselList';
import ChatPanel from '@/components/ChatPanel';
import DisruptionPanel from '@/components/DisruptionPanel';
import { ErrorBoundary, MapSkeleton, VisualizationSkeleton } from '@/components/ErrorBoundary';

// Dynamic imports for heavy components
const PortMap = dynamic(() => import('@/components/PortMap'), { 
  ssr: false,
  loading: () => <MapSkeleton />
});

const QuantumVisualization = dynamic(() => import('@/components/QuantumVisualization'), { 
  ssr: false,
  loading: () => <VisualizationSkeleton />
});

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
          <ErrorBoundary>
            <VesselList />
          </ErrorBoundary>
        </aside>
        
        {/* Main Panel */}
        <main className="flex-1 relative">
          <ErrorBoundary>
            <Suspense fallback={activePanel === 'map' ? <MapSkeleton /> : <VisualizationSkeleton />}>
              {activePanel === 'map' && <PortMap />}
              {activePanel === '3d' && <QuantumVisualization />}
              {activePanel === 'metrics' && (
                <div className="h-full overflow-y-auto bg-navy-500">
                  <div className="max-w-4xl mx-auto">
                    <MetricsPanel />
                  </div>
                </div>
              )}
            </Suspense>
          </ErrorBoundary>
        </main>
        
        {/* Right Sidebar - Metrics Summary (visible on map/3d views) */}
        {(activePanel === 'map' || activePanel === '3d') && (
          <aside className="w-80 glass border-l border-navy-300 overflow-hidden">
            <ErrorBoundary>
              <MetricsPanel />
            </ErrorBoundary>
          </aside>
        )}
      </div>
      
      {/* Overlays */}
      <ChatPanel />
      <DisruptionPanel />
    </div>
  );
}
