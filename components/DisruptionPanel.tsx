'use client';

import { useState } from 'react';
import { useQradhaStore } from '@/lib/store';
import { 
  AlertTriangle, 
  X, 
  Loader2, 
  CheckCircle,
  CloudRain,
  Wrench,
  Waves,
  Clock,
  Ship
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const disruptionTemplates = [
  { 
    id: 'weather_fog', 
    label: 'Fog Delay', 
    icon: CloudRain,
    description: 'Vessel delayed due to low visibility',
    defaultDelay: 240 
  },
  { 
    id: 'weather_storm', 
    label: 'Storm Delay', 
    icon: CloudRain,
    description: 'Vessel delayed due to North Sea storm',
    defaultDelay: 360 
  },
  { 
    id: 'mechanical_failure', 
    label: 'Mechanical Failure', 
    icon: Wrench,
    description: 'Equipment or vessel mechanical issue',
    defaultDelay: 180 
  },
  { 
    id: 'tidal_miss', 
    label: 'Tidal Miss', 
    icon: Waves,
    description: 'Vessel missed tidal window',
    defaultDelay: 720 
  },
  { 
    id: 'congestion', 
    label: 'Port Congestion', 
    icon: Clock,
    description: 'Berth or rail congestion delay',
    defaultDelay: 120 
  },
];

export default function DisruptionPanel() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedVesselId, setSelectedVesselId] = useState<string>('');
  const [delayMinutes, setDelayMinutes] = useState<number>(240);
  const [customDescription, setCustomDescription] = useState('');
  
  const { 
    portState, 
    isDisruptionPanelOpen, 
    setIsDisruptionPanelOpen,
    simulateDisruption,
    runOptimization,
    currentDisruption,
    isOptimizing,
    lastOptimization,
    setCurrentDisruption,
    setLastOptimization
  } = useQradhaStore();

  const handleTemplateSelect = (templateId: string) => {
    const template = disruptionTemplates.find(t => t.id === templateId);
    setSelectedTemplate(templateId);
    if (template) {
      setDelayMinutes(template.defaultDelay);
    }
  };

  const handleSimulate = async () => {
    if (!selectedVesselId || !selectedTemplate) return;
    
    const vessel = portState.vessels.find(v => v.id === selectedVesselId);
    const template = disruptionTemplates.find(t => t.id === selectedTemplate);
    
    const description = customDescription || 
      `${vessel?.name} ${template?.description}, delayed by ${Math.floor(delayMinutes / 60)} hours`;
    
    await simulateDisruption(description);
  };

  const handleOptimize = async () => {
    if (currentDisruption) {
      await runOptimization(currentDisruption);
    }
  };

  const handleReset = () => {
    setSelectedTemplate(null);
    setSelectedVesselId('');
    setDelayMinutes(240);
    setCustomDescription('');
    setCurrentDisruption(null);
    setLastOptimization(null); // Clear last optimization to show form again
  };

  return (
    <AnimatePresence>
      {isDisruptionPanelOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setIsDisruptionPanelOpen(false)}
        >
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className="bg-navy-500 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-accent-cyan/30"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-accent-orange" />
                <h2 className="text-xl font-semibold">Disruption Control</h2>
              </div>
              <button
                onClick={() => setIsDisruptionPanelOpen(false)}
                className="p-1 hover:bg-navy-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Show optimization result if available */}
            {lastOptimization && !currentDisruption && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-green-500">Optimization Complete</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Improvement</div>
                    <div className="text-xl font-bold text-green-500">
                      {lastOptimization.improvement_percent.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Runtime</div>
                    <div className="text-xl font-bold">
                      {(lastOptimization.runtime_ms / 1000).toFixed(1)}s
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Changes Made</div>
                    <div className="text-xl font-bold">
                      {lastOptimization.changes.length}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="mt-4 text-sm text-accent-cyan hover:underline"
                >
                  Report another disruption
                </button>
              </motion.div>
            )}

            {/* Current disruption confirmation */}
            {currentDisruption && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-accent-orange/10 border border-accent-orange/30 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-accent-orange" />
                  <span className="font-semibold text-accent-orange">Disruption Parsed</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-400">Vessel:</span>
                    <span className="ml-2">{currentDisruption.vessel_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Delay:</span>
                    <span className="ml-2">{currentDisruption.delay_minutes} min</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Cause:</span>
                    <span className="ml-2">{currentDisruption.cause.replace(/_/g, ' ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Confidence:</span>
                    <span className="ml-2">{(currentDisruption.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleOptimize}
                    disabled={isOptimizing}
                    className="flex-1 py-2 bg-accent-cyan text-navy font-semibold rounded-lg hover:bg-accent-cyan/80 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      'Run Optimization'
                    )}
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-navy-300 rounded-lg hover:bg-navy-200"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {/* Disruption form */}
            {!currentDisruption && !lastOptimization && (
              <>
                {/* Template Selection */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-400 mb-2">Disruption Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {disruptionTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template.id)}
                        className={`p-3 rounded-lg border transition-all ${
                          selectedTemplate === template.id
                            ? 'border-accent-cyan bg-accent-cyan/10'
                            : 'border-navy-300 hover:border-accent-cyan/50'
                        }`}
                      >
                        <template.icon className={`w-5 h-5 mx-auto mb-1 ${
                          selectedTemplate === template.id ? 'text-accent-cyan' : 'text-gray-400'
                        }`} />
                        <div className="text-xs">{template.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vessel Selection */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-400 mb-2">Affected Vessel</label>
                  <div className="grid grid-cols-2 gap-2">
                    {portState.vessels.map((vessel) => (
                      <button
                        key={vessel.id}
                        onClick={() => setSelectedVesselId(vessel.id)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          selectedVesselId === vessel.id
                            ? 'border-accent-cyan bg-accent-cyan/10'
                            : 'border-navy-300 hover:border-accent-cyan/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Ship className={`w-4 h-4 ${
                            selectedVesselId === vessel.id ? 'text-accent-cyan' : 'text-gray-400'
                          }`} />
                          <div>
                            <div className="text-sm font-medium">{vessel.name}</div>
                            <div className="text-xs text-gray-500">
                              ETA: {new Date(vessel.eta).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delay Duration */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-400 mb-2">
                    Delay Duration: {Math.floor(delayMinutes / 60)}h {delayMinutes % 60}m
                  </label>
                  <input
                    type="range"
                    min={30}
                    max={1440}
                    step={30}
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(parseInt(e.target.value))}
                    className="w-full accent-accent-cyan"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>30 min</span>
                    <span>12 hours</span>
                    <span>24 hours</span>
                  </div>
                </div>

                {/* Custom Description */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-400 mb-2">
                    Additional Details (optional)
                  </label>
                  <textarea
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Add any specific details about the disruption..."
                    className="w-full bg-navy-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-cyan resize-none"
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSimulate}
                    disabled={!selectedTemplate || !selectedVesselId}
                    className="flex-1 py-3 bg-accent-orange text-navy font-semibold rounded-lg hover:bg-accent-orange/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Parse Disruption
                  </button>
                  <button
                    onClick={() => setIsDisruptionPanelOpen(false)}
                    className="px-6 py-3 bg-navy-300 rounded-lg hover:bg-navy-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
