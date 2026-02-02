import { create } from 'zustand';
import type { PortState, Vessel, Berth, Disruption, OptimizationResult, ChatMessage, RiskAlert, Metrics } from './types';
import { mockPortState, mockMetrics } from './mock-data';

interface QradhaStore {
  // Port State
  portState: PortState;
  setPortState: (state: PortState) => void;
  
  // Metrics
  metrics: Metrics;
  setMetrics: (metrics: Metrics) => void;
  
  // Selected entities
  selectedVessel: Vessel | null;
  setSelectedVessel: (vessel: Vessel | null) => void;
  selectedBerth: Berth | null;
  setSelectedBerth: (berth: Berth | null) => void;
  
  // Disruption handling
  currentDisruption: Disruption | null;
  setCurrentDisruption: (disruption: Disruption | null) => void;
  isOptimizing: boolean;
  setIsOptimizing: (optimizing: boolean) => void;
  optimizationProgress: number;
  setOptimizationProgress: (progress: number) => void;
  lastOptimization: OptimizationResult | null;
  setLastOptimization: (result: OptimizationResult | null) => void;
  
  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  
  // UI State
  activePanel: 'map' | '3d' | 'metrics' | 'schedule';
  setActivePanel: (panel: 'map' | '3d' | 'metrics' | 'schedule') => void;
  isDisruptionPanelOpen: boolean;
  setIsDisruptionPanelOpen: (open: boolean) => void;
  
  // Simulation
  simulateDisruption: (input: string) => Promise<Disruption>;
  runOptimization: (disruption: Disruption) => Promise<OptimizationResult>;
}

export const useQradhaStore = create<QradhaStore>((set, get) => ({
  // Initial Port State
  portState: mockPortState,
  setPortState: (state) => set({ portState: state }),
  
  // Metrics
  metrics: mockMetrics,
  setMetrics: (metrics) => set({ metrics }),
  
  // Selected entities
  selectedVessel: null,
  setSelectedVessel: (vessel) => set({ selectedVessel: vessel }),
  selectedBerth: null,
  setSelectedBerth: (berth) => set({ selectedBerth: berth }),
  
  // Disruption handling
  currentDisruption: null,
  setCurrentDisruption: (disruption) => set({ currentDisruption: disruption }),
  isOptimizing: false,
  setIsOptimizing: (optimizing) => set({ isOptimizing: optimizing }),
  optimizationProgress: 0,
  setOptimizationProgress: (progress) => set({ optimizationProgress: progress }),
  lastOptimization: null,
  setLastOptimization: (result) => set({ lastOptimization: result }),
  
  // Chat
  chatMessages: [
    {
      id: '1',
      role: 'assistant',
      content: 'Welcome to Qradha! I\'m your AI assistant for port operations. You can describe disruptions in natural language, ask "what-if" scenarios, or request optimization insights. How can I help you today?',
      timestamp: new Date().toISOString(),
    }
  ],
  addChatMessage: (message) => set((state) => ({ 
    chatMessages: [...state.chatMessages, message] 
  })),
  clearChat: () => set({ chatMessages: [] }),
  isChatOpen: false,
  setIsChatOpen: (open) => set({ isChatOpen: open }),
  
  // UI State
  activePanel: 'map',
  setActivePanel: (panel) => set({ activePanel: panel }),
  isDisruptionPanelOpen: false,
  setIsDisruptionPanelOpen: (open) => set({ isDisruptionPanelOpen: open }),
  
  // Simulation functions (mock implementations)
  simulateDisruption: async (input: string): Promise<Disruption> => {
    // Simulate AI agent parsing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Parse simple patterns from input
    const lowercaseInput = input.toLowerCase();
    let cause: Disruption['cause'] = 'other';
    let delayMinutes = 120;
    
    if (lowercaseInput.includes('fog')) cause = 'weather_fog';
    else if (lowercaseInput.includes('storm')) cause = 'weather_storm';
    else if (lowercaseInput.includes('ice')) cause = 'weather_ice';
    else if (lowercaseInput.includes('mechanical') || lowercaseInput.includes('engine')) cause = 'mechanical_failure';
    else if (lowercaseInput.includes('tide')) cause = 'tidal_miss';
    else if (lowercaseInput.includes('congestion')) cause = 'congestion';
    
    // Extract delay duration
    const hourMatch = input.match(/(\d+)\s*hours?/i);
    const minMatch = input.match(/(\d+)\s*min/i);
    if (hourMatch) delayMinutes = parseInt(hourMatch[1]) * 60;
    if (minMatch) delayMinutes = parseInt(minMatch[1]);
    
    // Extract vessel name
    const vessels = get().portState.vessels;
    let vesselId = vessels[0]?.id || 'UNKNOWN_VESSEL';
    for (const vessel of vessels) {
      if (lowercaseInput.includes(vessel.name.toLowerCase())) {
        vesselId = vessel.id;
        break;
      }
    }
    
    const disruption: Disruption = {
      disruption_type: 'vessel_delay',
      vessel_id: vesselId,
      delay_minutes: delayMinutes,
      cause,
      confidence: 0.85,
      clarifications_needed: [],
      berth_change: null,
    };
    
    set({ currentDisruption: disruption });
    return disruption;
  },
  
  runOptimization: async (disruption: Disruption): Promise<OptimizationResult> => {
    set({ isOptimizing: true, optimizationProgress: 0 });
    
    // Simulate optimization progress
    const startTime = Date.now();
    const totalDuration = 2000 + Math.random() * 1000;
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / totalDuration) * 100, 95);
      set({ optimizationProgress: progress });
    }, 100);
    
    await new Promise(resolve => setTimeout(resolve, totalDuration));
    clearInterval(progressInterval);
    set({ optimizationProgress: 100 });
    
    const runtime = Date.now() - startTime;
    
    const costBefore = 15000 + Math.random() * 5000;
    const improvement = 0.08 + Math.random() * 0.04; // 8-12% improvement
    const costAfter = costBefore * (1 - improvement);
    
    const result: OptimizationResult = {
      id: `opt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      cost_before: costBefore,
      cost_after: costAfter,
      improvement_percent: improvement * 100,
      runtime_ms: runtime,
      changes: [
        {
          type: 'berth_reassignment',
          entity_id: disruption.vessel_id || 'vessel_1',
          from: 'Berth 1',
          to: 'Berth 3',
          reason: 'Free deep-water access for mega-ship'
        },
        {
          type: 'crane_reallocation',
          entity_id: 'QC4',
          from: 'Berth 1',
          to: 'Berth 2',
          reason: 'Balance workload during delay'
        },
        {
          type: 'rail_slot_change',
          entity_id: 'DB_CARGO_142',
          from: '14:00',
          to: '16:30',
          reason: 'Avoid demurrage penalty'
        }
      ],
      insights: `**Optimization Summary:**

The re-optimized schedule achieves **${(improvement * 100).toFixed(1)}% throughput increase** by:

1. **Berth Reallocation:** Moving vessel from Berth 1 → Berth 3 frees critical deep-water access, avoiding a 6-hour tidal delay.

2. **Rail Prioritization:** Allocated priority rail slots to outbound containers, preventing €42K in demurrage penalties.

3. **Energy Arbitrage:** Shifted 40% of crane operations to off-peak hours, saving 1,850 kWh (~€480).

**Trade-offs:**
- Truck gate congestion increases by 12 min average during 14:00-16:00 peak.
- Berth 3 utilization rises to 94% (tight margin for next disruption).

**Quantum Insight:** Algorithm tunneled through a local optimum that favored immediate vessel discharge but created rail bottleneck 8 hours downstream.`
    };
    
    set({ 
      isOptimizing: false, 
      lastOptimization: result,
      currentDisruption: null 
    });
    
    // Update metrics
    const currentMetrics = get().metrics;
    set({
      metrics: {
        ...currentMetrics,
        throughput_teu: currentMetrics.throughput_teu * (1 + improvement * 0.5),
        throughput_change: improvement * 100,
        delays_hours: Math.max(0, currentMetrics.delays_hours - disruption.delay_minutes / 60 * 0.7),
      }
    });
    
    return result;
  },
}));
