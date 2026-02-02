'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQradhaStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Play, Ship, Train, Anchor, Cog } from 'lucide-react';
import type { Vessel, Berth, Crane, Train as TrainType } from '@/lib/types';

// Hamburg Port coordinates - centered to show both port and approach
const HAMBURG_CENTER: [number, number] = [9.9100, 53.5380];

// Layer visibility state
type LayerType = 'vessels' | 'berths' | 'cranes' | 'trains';

export default function PortMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState<Record<LayerType, boolean>>({
    vessels: true,
    berths: true,
    cranes: false,
    trains: true,
  });
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [isSimulatingDisruption, setIsSimulatingDisruption] = useState(false);
  const [disruptionCascade, setDisruptionCascade] = useState<string[]>([]);
  
  const { 
    portState, 
    setSelectedVessel, 
    setSelectedBerth, 
    selectedVessel,
    selectedBerth,
    currentDisruption 
  } = useQradhaStore();

  // Toggle layer visibility
  const toggleLayer = useCallback((layer: LayerType) => {
    setVisibleLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  // Simulate disruption cascade
  const simulateDisruptionCascade = useCallback(() => {
    setIsSimulatingDisruption(true);
    setDisruptionCascade([]);
    
    // Cascade through entities with delays
    const affectedEntities = [
      ...portState.vessels.slice(0, 3).map(v => v.id),
      ...portState.berths.slice(0, 2).map(b => b.id),
      ...portState.trains.slice(0, 2).map(t => t.id),
    ];
    
    affectedEntities.forEach((id, index) => {
      setTimeout(() => {
        setDisruptionCascade(prev => [...prev, id]);
      }, index * 500);
    });
    
    setTimeout(() => {
      setIsSimulatingDisruption(false);
    }, affectedEntities.length * 500 + 2000);
  }, [portState]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.de/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
      center: HAMBURG_CENTER,
      zoom: 12,
      pitch: 30,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');
    map.current.addControl(new maplibregl.FullscreenControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Clear all markers
  const clearMarkers = useCallback(() => {
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};
  }, []);

  // Create vessel marker element - LARGER and MORE VISIBLE
  const createVesselMarker = useCallback((vessel: Vessel) => {
    const isSelected = selectedVessel?.id === vessel.id;
    const isHovered = hoveredEntity === vessel.id;
    const isAffected = disruptionCascade.includes(vessel.id);
    
    const el = document.createElement('div');
    el.className = 'vessel-marker';
    el.innerHTML = `
      <div style="
        position: relative;
        cursor: pointer;
        transform: rotate(${vessel.heading || 0}deg);
        transition: transform 0.3s ease;
        animation: ${isAffected ? 'pulse-red 0.5s ease-in-out' : 'none'};
      ">
        <svg width="60" height="60" viewBox="0 0 60 60" style="
          filter: drop-shadow(0 0 ${isSelected ? '16px' : isAffected ? '12px' : '8px'} ${isAffected ? '#FF2E63' : getVesselColor(vessel)});
          transition: all 0.3s ease;
          transform: scale(${isSelected || isHovered ? 1.3 : 1});
        ">
          <!-- Ship hull - LARGER -->
          <path d="M30 5 L52 40 L48 50 L12 50 L8 40 Z" 
            fill="${isAffected ? '#FF2E63' : getVesselColor(vessel)}" 
            stroke="white" 
            stroke-width="2.5"
          />
          <!-- Bridge -->
          <rect x="22" y="25" width="16" height="12" rx="2" fill="#0A1929" stroke="white" stroke-width="1.5"/>
          <!-- Containers (if cargo ship) -->
          <rect x="18" y="37" width="24" height="8" rx="1" fill="${isAffected ? '#FF2E63' : getVesselColor(vessel)}" stroke="white" stroke-width="0.5"/>
          <!-- Navigation light -->
          <circle cx="30" cy="15" r="3" fill="${vessel.status === 'approaching' ? '#00FF88' : '#FFD93D'}">
            <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
          </circle>
        </svg>
        <div style="
          position: absolute;
          bottom: -25px;
          left: 50%;
          transform: translateX(-50%);
          background: ${isAffected ? 'rgba(255, 46, 99, 0.95)' : 'rgba(10, 25, 41, 0.95)'};
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
          font-family: 'IBM Plex Sans', sans-serif;
          border: 2px solid ${isAffected ? '#FF2E63' : getVesselColor(vessel)};
          box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        ">${vessel.name}</div>
      </div>
    `;
    
    el.onmouseenter = () => setHoveredEntity(vessel.id);
    el.onmouseleave = () => setHoveredEntity(null);
    el.onclick = () => setSelectedVessel(vessel);
    
    return el;
  }, [selectedVessel, hoveredEntity, setSelectedVessel, disruptionCascade]);

  // Create berth marker element
  const createBerthMarker = useCallback((berth: Berth) => {
    const isSelected = selectedBerth?.id === berth.id;
    const isHovered = hoveredEntity === berth.id;
    const isAffected = disruptionCascade.includes(berth.id);
    
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        cursor: pointer;
        transition: all 0.3s ease;
        transform: scale(${isSelected || isHovered ? 1.15 : 1});
        animation: ${isAffected ? 'pulse-red 0.5s ease-in-out' : berth.status === 'occupied' ? 'pulse-berth 2s ease-in-out infinite' : 'none'};
      ">
        <svg width="60" height="28" viewBox="0 0 60 28" style="
          filter: drop-shadow(0 0 ${isSelected ? '10px' : '5px'} ${isAffected ? '#FF2E63' : getBerthColor(berth)});
        ">
          <!-- Berth dock -->
          <rect x="0" y="0" width="60" height="18" rx="3" 
            fill="${isAffected ? '#FF2E63' : getBerthColor(berth)}" 
            stroke="white" 
            stroke-width="2"
            opacity="0.95"
          />
          <!-- Fenders with animation -->
          <circle cx="10" cy="9" r="4" fill="#0A1929" stroke="white" stroke-width="1">
            ${berth.status === 'occupied' ? '<animate attributeName="r" values="4;5;4" dur="2s" repeatCount="indefinite"/>' : ''}
          </circle>
          <circle cx="30" cy="9" r="4" fill="#0A1929" stroke="white" stroke-width="1">
            ${berth.status === 'occupied' ? '<animate attributeName="r" values="4;5;4" dur="2s" repeatCount="indefinite" begin="0.5s"/>' : ''}
          </circle>
          <circle cx="50" cy="9" r="4" fill="#0A1929" stroke="white" stroke-width="1">
            ${berth.status === 'occupied' ? '<animate attributeName="r" values="4;5;4" dur="2s" repeatCount="indefinite" begin="1s"/>' : ''}
          </circle>
        </svg>
        <div style="
          text-align: center;
          font-size: 10px;
          font-weight: 600;
          color: white;
          margin-top: 3px;
          font-family: 'IBM Plex Sans', sans-serif;
          text-shadow: 0 2px 4px rgba(0,0,0,0.9);
          background: rgba(10, 25, 41, 0.8);
          padding: 2px 6px;
          border-radius: 4px;
        ">${berth.name.split(' - ')[0]}</div>
      </div>
    `;
    
    el.onmouseenter = () => setHoveredEntity(berth.id);
    el.onmouseleave = () => setHoveredEntity(null);
    el.onclick = () => setSelectedBerth(berth);
    
    return el;
  }, [selectedBerth, hoveredEntity, setSelectedBerth]);

  // Create crane marker element
  const createCraneMarker = useCallback((crane: Crane) => {
    const isHovered = hoveredEntity === crane.id;
    
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        cursor: pointer;
        transition: all 0.3s ease;
        transform: scale(${isHovered ? 1.15 : 1});
      ">
        <svg width="24" height="32" viewBox="0 0 24 32" style="
          filter: drop-shadow(0 0 4px ${getCraneColor(crane)});
        ">
          <!-- Crane base -->
          <rect x="10" y="24" width="4" height="8" fill="${getCraneColor(crane)}"/>
          <!-- Crane tower -->
          <rect x="9" y="8" width="6" height="16" fill="${getCraneColor(crane)}" stroke="white" stroke-width="0.5"/>
          <!-- Crane arm -->
          <rect x="0" y="4" width="24" height="4" rx="1" fill="${getCraneColor(crane)}" stroke="white" stroke-width="0.5"/>
          <!-- Hook line -->
          <line x1="20" y1="8" x2="20" y2="20" stroke="white" stroke-width="1"/>
          <circle cx="20" cy="22" r="2" fill="white"/>
        </svg>
        <div style="
          text-align: center;
          font-size: 8px;
          color: ${getCraneColor(crane)};
          font-family: 'IBM Plex Mono', monospace;
        ">${crane.id}</div>
      </div>
    `;
    
    el.onmouseenter = () => setHoveredEntity(crane.id);
    el.onmouseleave = () => setHoveredEntity(null);
    
    return el;
  }, [hoveredEntity]);

  // Create train marker element - with better positioning
  const createTrainMarker = useCallback((train: TrainType) => {
    const isHovered = hoveredEntity === train.id;
    const isAffected = disruptionCascade.includes(train.id);
    
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        cursor: pointer;
        transition: all 0.3s ease;
        transform: scale(${isHovered ? 1.2 : 1});
        animation: ${isAffected ? 'pulse-red 0.5s ease-in-out' : train.status === 'loading' ? 'pulse-train 1.5s ease-in-out infinite' : 'none'};
      ">
        <svg width="56" height="28" viewBox="0 0 56 28" style="
          filter: drop-shadow(0 0 ${isAffected ? '8px' : '5px'} ${isAffected ? '#FF2E63' : getTrainColor(train)});
        ">
          <!-- Engine -->
          <rect x="0" y="4" width="20" height="16" rx="3" fill="${isAffected ? '#FF2E63' : getTrainColor(train)}" stroke="white" stroke-width="1.5"/>
          <rect x="3" y="7" width="6" height="5" rx="1" fill="#0A1929"/>
          <!-- Headlight -->
          <circle cx="17" cy="10" r="2" fill="#FFD93D">
            <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite"/>
          </circle>
          <!-- Cars -->
          <rect x="22" y="6" width="14" height="14" rx="2" fill="${isAffected ? '#FF2E63' : getTrainColor(train)}" opacity="0.85" stroke="white" stroke-width="1"/>
          <rect x="38" y="6" width="14" height="14" rx="2" fill="${isAffected ? '#FF2E63' : getTrainColor(train)}" opacity="0.7" stroke="white" stroke-width="1"/>
          <!-- Wheels -->
          <circle cx="6" cy="22" r="3" fill="#333" stroke="#666" stroke-width="1"/>
          <circle cx="14" cy="22" r="3" fill="#333" stroke="#666" stroke-width="1"/>
          <circle cx="29" cy="22" r="2.5" fill="#333" stroke="#666" stroke-width="1"/>
          <circle cx="45" cy="22" r="2.5" fill="#333" stroke="#666" stroke-width="1"/>
          <!-- Rail track indication -->
          <line x1="0" y1="25" x2="56" y2="25" stroke="#666" stroke-width="2"/>
        </svg>
        <div style="
          text-align: center;
          font-size: 10px;
          font-weight: 600;
          color: white;
          margin-top: 4px;
          font-family: 'IBM Plex Sans', sans-serif;
          background: ${isAffected ? 'rgba(255, 46, 99, 0.9)' : 'rgba(10, 25, 41, 0.9)'};
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid ${isAffected ? '#FF2E63' : getTrainColor(train)};
        ">${train.name}</div>
      </div>
    `;
    
    el.onmouseenter = () => setHoveredEntity(train.id);
    el.onmouseleave = () => setHoveredEntity(null);
    
    return el;
  }, [hoveredEntity, disruptionCascade]);

  // Update markers when port state or visibility changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    clearMarkers();

    // Add vessel markers
    if (visibleLayers.vessels) {
      portState.vessels.forEach((vessel) => {
        const el = createVesselMarker(vessel);
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([vessel.position.lon, vessel.position.lat])
          .setPopup(
            new maplibregl.Popup({ 
              offset: 30, 
              className: 'qradha-popup',
              closeButton: false,
            }).setHTML(createVesselPopup(vessel))
          )
          .addTo(map.current!);
        markersRef.current[vessel.id] = marker;
      });
    }

    // Add berth markers
    if (visibleLayers.berths) {
      portState.berths.forEach((berth) => {
        const el = createBerthMarker(berth);
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([berth.position.lon, berth.position.lat])
          .setPopup(
            new maplibregl.Popup({ 
              offset: 20, 
              className: 'qradha-popup',
              closeButton: false,
            }).setHTML(createBerthPopup(berth))
          )
          .addTo(map.current!);
        markersRef.current[berth.id] = marker;
      });
    }

    // Add crane markers
    if (visibleLayers.cranes) {
      portState.cranes.forEach((crane) => {
        if (crane.position) {
          const el = createCraneMarker(crane);
          const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([crane.position.lon, crane.position.lat])
            .setPopup(
              new maplibregl.Popup({ 
                offset: 25, 
                className: 'qradha-popup',
                closeButton: false,
              }).setHTML(createCranePopup(crane))
            )
            .addTo(map.current!);
          markersRef.current[crane.id] = marker;
        }
      });
    }

    // Add train markers
    if (visibleLayers.trains) {
      portState.trains.forEach((train) => {
        const el = createTrainMarker(train);
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([train.position.lon, train.position.lat])
          .setPopup(
            new maplibregl.Popup({ 
              offset: 20, 
              className: 'qradha-popup',
              closeButton: false,
            }).setHTML(createTrainPopup(train))
          )
          .addTo(map.current!);
        markersRef.current[train.id] = marker;
      });
    }
  }, [portState, mapLoaded, visibleLayers, createVesselMarker, createBerthMarker, createCraneMarker, createTrainMarker, clearMarkers]);

  // Fly to selected vessel
  useEffect(() => {
    if (map.current && selectedVessel) {
      map.current.flyTo({
        center: [selectedVessel.position.lon, selectedVessel.position.lat],
        zoom: 14,
        duration: 1500,
        pitch: 45,
      });
    }
  }, [selectedVessel]);

  // Fly to selected berth
  useEffect(() => {
    if (map.current && selectedBerth) {
      map.current.flyTo({
        center: [selectedBerth.position.lon, selectedBerth.position.lat],
        zoom: 15,
        duration: 1500,
        pitch: 45,
      });
    }
  }, [selectedBerth]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Layer Controls */}
      <div className="absolute top-4 left-4 glass rounded-lg p-3">
        <div className="font-semibold text-accent-cyan text-sm mb-2 flex items-center gap-2">
          <span>Layers</span>
        </div>
        <div className="space-y-2">
          {[
            { key: 'vessels' as LayerType, label: 'Vessels', icon: '🚢', count: portState.vessels.length },
            { key: 'berths' as LayerType, label: 'Berths', icon: '⚓', count: portState.berths.length },
            { key: 'trains' as LayerType, label: 'Trains', icon: '🚂', count: portState.trains.length },
            { key: 'cranes' as LayerType, label: 'Cranes', icon: '🏗️', count: portState.cranes.length },
          ].map(({ key, label, icon, count }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={visibleLayers[key]}
                onChange={() => toggleLayer(key)}
                className="w-4 h-4 rounded border-gray-500 text-accent-cyan focus:ring-accent-cyan bg-navy-400"
              />
              <span className="text-sm group-hover:text-white transition-colors">
                {icon} {label}
              </span>
              <span className="text-xs text-gray-500 ml-auto">({count})</span>
            </label>
          ))}
        </div>
        
        {/* Disruption Simulation Button */}
        <div className="mt-4 pt-3 border-t border-navy-300">
          <button
            onClick={simulateDisruptionCascade}
            disabled={isSimulatingDisruption}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isSimulatingDisruption 
                ? 'bg-accent-red/20 text-accent-red cursor-wait' 
                : 'bg-accent-red/10 text-accent-red hover:bg-accent-red/20'
            }`}
          >
            {isSimulatingDisruption ? (
              <>
                <div className="w-4 h-4 border-2 border-accent-red border-t-transparent rounded-full animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                Simulate Delay
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Disruption Alert Banner */}
      <AnimatePresence>
        {isSimulatingDisruption && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20"
          >
            <div className="glass bg-accent-red/20 border border-accent-red rounded-lg px-6 py-3 flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-accent-red animate-pulse" />
              <span className="text-accent-red font-medium">⚠️ Disruption Cascade Simulation Active</span>
              <span className="text-gray-400 text-sm">({disruptionCascade.length} entities affected)</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 glass rounded-lg p-3 text-sm">
        <div className="font-semibold mb-2 text-accent-cyan">Status</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
            <span className="text-gray-300">Active / Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-cyan shadow-lg shadow-accent-cyan/50"></div>
            <span className="text-gray-300">Approaching</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-orange shadow-lg shadow-accent-orange/50"></div>
            <span className="text-gray-300">Waiting / Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-red shadow-lg shadow-accent-red/50"></div>
            <span className="text-gray-300">Maintenance / Delayed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50"></div>
            <span className="text-gray-300">Departing</span>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-navy-400 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading map...</p>
          </div>
        </div>
      )}

      {/* Popup styles */}
      <style jsx global>{`
        .qradha-popup .maplibregl-popup-content {
          background: rgba(10, 25, 41, 0.95);
          border: 1px solid #00D9FF;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 4px 20px rgba(0, 217, 255, 0.2);
        }
        .qradha-popup .maplibregl-popup-tip {
          border-top-color: #00D9FF;
        }
        
        @keyframes pulse-red {
          0%, 100% { filter: drop-shadow(0 0 8px #FF2E63); transform: scale(1); }
          50% { filter: drop-shadow(0 0 20px #FF2E63); transform: scale(1.1); }
        }
        
        @keyframes pulse-berth {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 1; }
        }
        
        @keyframes pulse-train {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .vessel-marker:hover {
          z-index: 1000 !important;
        }
      `}</style>
    </div>
  );
}

// Helper functions
function getVesselColor(vessel: Vessel): string {
  switch (vessel.status) {
    case 'berthed': return '#22c55e';
    case 'approaching': return '#00D9FF';
    case 'waiting': return '#FF6B35';
    case 'departing': return '#a855f7';
    default: return '#ffffff';
  }
}

function getBerthColor(berth: Berth): string {
  if (berth.status === 'maintenance') return '#FF2E63';
  if (berth.status === 'occupied') return '#FF6B35';
  if (berth.utilization > 70) return '#eab308';
  return '#22c55e';
}

function getCraneColor(crane: Crane): string {
  switch (crane.status) {
    case 'active': return '#22c55e';
    case 'idle': return '#eab308';
    case 'maintenance': return '#FF2E63';
    default: return '#888888';
  }
}

function getTrainColor(train: TrainType): string {
  switch (train.status) {
    case 'loading': return '#22c55e';
    case 'waiting': return '#eab308';
    case 'departing': return '#a855f7';
    case 'approaching': return '#00D9FF';
    default: return '#888888';
  }
}

function createVesselPopup(vessel: Vessel): string {
  return `
    <div style="color: white; font-family: 'IBM Plex Sans', sans-serif; min-width: 200px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${getVesselColor(vessel)}; box-shadow: 0 0 10px ${getVesselColor(vessel)};"></div>
        <strong style="color: #00D9FF; font-size: 15px;">${vessel.name}</strong>
      </div>
      <div style="font-size: 11px; color: #888; margin-bottom: 8px;">IMO: ${vessel.imo}</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px;">
        <div>Status:</div><div style="color: ${getVesselColor(vessel)}; font-weight: 600;">${vessel.status}</div>
        <div>ETA:</div><div>${new Date(vessel.eta).toLocaleTimeString()}</div>
        <div>Cargo:</div><div><strong>${vessel.cargo_teu.toLocaleString()}</strong> TEU</div>
        <div>Draft:</div><div>${vessel.draft_meters}m</div>
        <div>Berth:</div><div>${vessel.berth_assignment}</div>
        <div>Speed:</div><div>${vessel.speed || 0} kn</div>
      </div>
    </div>
  `;
}

function createBerthPopup(berth: Berth): string {
  return `
    <div style="color: white; font-family: 'IBM Plex Sans', sans-serif; min-width: 180px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${getBerthColor(berth)}; box-shadow: 0 0 10px ${getBerthColor(berth)};"></div>
        <strong style="color: #00D9FF; font-size: 15px;">${berth.name}</strong>
      </div>
      <div style="font-size: 11px; color: #888; margin-bottom: 8px;">${berth.terminal}</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px;">
        <div>Status:</div><div style="color: ${getBerthColor(berth)}; font-weight: 600;">${berth.status}</div>
        <div>Depth:</div><div>${berth.depth_meters}m</div>
        <div>Length:</div><div>${berth.length_meters}m</div>
        <div>Utilization:</div><div><strong>${berth.utilization}%</strong></div>
        <div>Cranes:</div><div>${berth.cranes.length}</div>
      </div>
    </div>
  `;
}

function createCranePopup(crane: Crane): string {
  return `
    <div style="color: white; font-family: 'IBM Plex Sans', sans-serif; min-width: 160px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${getCraneColor(crane)}; box-shadow: 0 0 10px ${getCraneColor(crane)};"></div>
        <strong style="color: #00D9FF; font-size: 15px;">${crane.id}</strong>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px;">
        <div>Type:</div><div>${crane.type}</div>
        <div>Status:</div><div style="color: ${getCraneColor(crane)}; font-weight: 600;">${crane.status}</div>
        <div>Moves/hr:</div><div><strong>${crane.moves_per_hour}</strong></div>
        <div>Energy:</div><div>${crane.energy_consumption_kwh} kWh</div>
        <div>Berth:</div><div>${crane.berth_id}</div>
      </div>
    </div>
  `;
}

function createTrainPopup(train: TrainType): string {
  return `
    <div style="color: white; font-family: 'IBM Plex Sans', sans-serif; min-width: 180px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${getTrainColor(train)}; box-shadow: 0 0 10px ${getTrainColor(train)};"></div>
        <strong style="color: #00D9FF; font-size: 15px;">${train.name}</strong>
      </div>
      <div style="font-size: 11px; color: #888; margin-bottom: 8px;">${train.operator}</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px;">
        <div>Status:</div><div style="color: ${getTrainColor(train)}; font-weight: 600;">${train.status}</div>
        <div>Track:</div><div>${train.track}</div>
        <div>Cargo:</div><div><strong>${train.containers_teu}</strong> TEU</div>
        <div>Departure:</div><div>${new Date(train.scheduled_departure).toLocaleTimeString()}</div>
        <div>Destination:</div><div style="font-size: 10px;">${train.destination}</div>
      </div>
    </div>
  `;
}
