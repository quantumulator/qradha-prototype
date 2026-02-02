'use client';

import { useQradhaStore } from '@/lib/store';
import { Ship, Anchor, Package, ArrowRight, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VesselList() {
  const { portState, selectedVessel, setSelectedVessel } = useQradhaStore();

  const sortedVessels = [...portState.vessels].sort((a, b) => 
    new Date(a.eta).getTime() - new Date(b.eta).getTime()
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Ship className="w-5 h-5 text-accent-cyan" />
          Vessel Queue
        </h2>
        
        <div className="space-y-2">
          {sortedVessels.map((vessel, index) => (
            <motion.button
              key={vessel.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedVessel(vessel)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedVessel?.id === vessel.id
                  ? 'border-accent-cyan bg-accent-cyan/10'
                  : 'border-navy-300 hover:border-accent-cyan/50 bg-navy-400'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusDot(vessel.status)}`} />
                    <span className="font-medium">{vessel.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">IMO: {vessel.imo}</div>
                </div>
                <div className={`text-xs px-2 py-0.5 rounded ${getStatusBadge(vessel.status)}`}>
                  {vessel.status}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div className="flex items-center gap-1 text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(vessel.eta).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Anchor className="w-3 h-3" />
                  <span>{vessel.berth_assignment.replace('berth_', 'B')}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Package className="w-3 h-3" />
                  <span>{(vessel.cargo_teu / 1000).toFixed(1)}K</span>
                </div>
              </div>
              
              {vessel.status === 'approaching' && (
                <div className="mt-2 flex items-center gap-1 text-xs text-accent-cyan">
                  <ArrowRight className="w-3 h-3" />
                  <span>{vessel.speed?.toFixed(1)} kn</span>
                  <span className="text-gray-500">• Draft {vessel.draft_meters}m</span>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

function getStatusDot(status: string): string {
  switch (status) {
    case 'berthed': return 'bg-green-500';
    case 'approaching': return 'bg-accent-cyan';
    case 'waiting': return 'bg-accent-orange';
    case 'departing': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
}

function getStatusBadge(status: string): string {
  switch (status) {
    case 'berthed': return 'bg-green-500/20 text-green-500';
    case 'approaching': return 'bg-accent-cyan/20 text-accent-cyan';
    case 'waiting': return 'bg-accent-orange/20 text-accent-orange';
    case 'departing': return 'bg-purple-500/20 text-purple-500';
    default: return 'bg-gray-500/20 text-gray-500';
  }
}
