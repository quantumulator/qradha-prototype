'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQradhaStore } from '@/lib/store';
import type { Vessel, Berth, Crane, Train } from '@/lib/types';

// Hamburg Port coordinates
const HAMBURG_CENTER: [number, number] = [9.9537, 53.5311];

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
  
  const { 
    portState, 
    setSelectedVessel, 
    setSelectedBerth, 
    selectedVessel,
    selectedBerth 
  } = useQradhaStore();

  // Toggle layer visibility
  const toggleLayer = useCallback((layer: LayerType) => {
    setVisibleLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

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

  // Create vessel marker element
  const createVesselMarker = useCallback((vessel: Vessel) => {
    const isSelected = selectedVessel?.id === vessel.id;
    const isHovered = hoveredEntity === vessel.id;
    
    const el = document.createElement('div');
    el.className = 'vessel-marker';
    el.innerHTML = `
      <div style="
        position: relative;
        cursor: pointer;
        transform: rotate(${vessel.heading || 0}deg);
        transition: transform 0.3s ease;
      ">
        <svg width="40" height="40" viewBox="0 0 40 40" style="
          filter: drop-shadow(0 0 ${isSelected ? '12px' : '6px'} ${getVesselColor(vessel)});
          transition: all 0.3s ease;
          transform: scale(${isSelected || isHovered ? 1.2 : 1});
        ">
          <!-- Ship hull -->
          <path d="M20 5 L35 30 L32 35 L8 35 L5 30 Z" 
            fill="${getVesselColor(vessel)}" 
            stroke="white" 
            stroke-width="2"
          />
          <!-- Bridge -->
          <rect x="15" y="18" width="10" height="8" rx="1" fill="#0A1929" stroke="white" stroke-width="1"/>
          <!-- Containers (if cargo ship) -->
          <rect x="12" y="26" width="16" height="5" rx="1" fill="${getVesselColor(vessel)}" stroke="white" stroke-width="0.5"/>
        </svg>
        <div style="
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(10, 25, 41, 0.9);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          color: white;
          white-space: nowrap;
          font-family: 'IBM Plex Sans', sans-serif;
          border: 1px solid ${getVesselColor(vessel)};
        ">${vessel.name}</div>
      </div>
    `;
    
    el.onmouseenter = () => setHoveredEntity(vessel.id);
    el.onmouseleave = () => setHoveredEntity(null);
    el.onclick = () => setSelectedVessel(vessel);
    
    return el;
  }, [selectedVessel, hoveredEntity, setSelectedVessel]);

  // Create berth marker element
  const createBerthMarker = useCallback((berth: Berth) => {
    const isSelected = selectedBerth?.id === berth.id;
    const isHovered = hoveredEntity === berth.id;
    
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        cursor: pointer;
        transition: all 0.3s ease;
        transform: scale(${isSelected || isHovered ? 1.1 : 1});
      ">
        <svg width="50" height="20" viewBox="0 0 50 20" style="
          filter: drop-shadow(0 0 ${isSelected ? '8px' : '4px'} ${getBerthColor(berth)});
        ">
          <!-- Berth dock -->
          <rect x="0" y="0" width="50" height="14" rx="2" 
            fill="${getBerthColor(berth)}" 
            stroke="white" 
            stroke-width="1.5"
            opacity="0.9"
          />
          <!-- Fenders -->
          <circle cx="8" cy="7" r="3" fill="#0A1929"/>
          <circle cx="25" cy="7" r="3" fill="#0A1929"/>
          <circle cx="42" cy="7" r="3" fill="#0A1929"/>
        </svg>
        <div style="
          text-align: center;
          font-size: 9px;
          color: white;
          margin-top: 2px;
          font-family: 'IBM Plex Sans', sans-serif;
          text-shadow: 0 1px 3px rgba(0,0,0,0.8);
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

  // Create train marker element
  const createTrainMarker = useCallback((train: Train) => {
    const isHovered = hoveredEntity === train.id;
    
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        cursor: pointer;
        transition: all 0.3s ease;
        transform: scale(${isHovered ? 1.15 : 1});
      ">
        <svg width="48" height="20" viewBox="0 0 48 20" style="
          filter: drop-shadow(0 0 4px ${getTrainColor(train)});
        ">
          <!-- Engine -->
          <rect x="0" y="4" width="16" height="12" rx="2" fill="${getTrainColor(train)}" stroke="white" stroke-width="1"/>
          <rect x="2" y="6" width="4" height="4" rx="1" fill="#0A1929"/>
          <!-- Cars -->
          <rect x="18" y="6" width="12" height="10" rx="1" fill="${getTrainColor(train)}" opacity="0.8" stroke="white" stroke-width="0.5"/>
          <rect x="32" y="6" width="12" height="10" rx="1" fill="${getTrainColor(train)}" opacity="0.6" stroke="white" stroke-width="0.5"/>
          <!-- Wheels -->
          <circle cx="5" cy="16" r="2" fill="#333"/>
          <circle cx="11" cy="16" r="2" fill="#333"/>
          <circle cx="24" cy="16" r="1.5" fill="#333"/>
          <circle cx="38" cy="16" r="1.5" fill="#333"/>
        </svg>
        <div style="
          text-align: center;
          font-size: 9px;
          color: white;
          margin-top: 2px;
          font-family: 'IBM Plex Sans', sans-serif;
          background: rgba(10, 25, 41, 0.8);
          padding: 1px 4px;
          border-radius: 3px;
        ">${train.name}</div>
      </div>
    `;
    
    el.onmouseenter = () => setHoveredEntity(train.id);
    el.onmouseleave = () => setHoveredEntity(null);
    
    return el;
  }, [hoveredEntity]);

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
        <div className="font-semibold text-accent-cyan text-sm mb-2">Layers</div>
        <div className="space-y-2">
          {[
            { key: 'vessels' as LayerType, label: '🚢 Vessels', count: portState.vessels.length },
            { key: 'berths' as LayerType, label: '⚓ Berths', count: portState.berths.length },
            { key: 'trains' as LayerType, label: '🚂 Trains', count: portState.trains.length },
            { key: 'cranes' as LayerType, label: '🏗️ Cranes', count: portState.cranes.length },
          ].map(({ key, label, count }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={visibleLayers[key]}
                onChange={() => toggleLayer(key)}
                className="w-4 h-4 rounded border-gray-500 text-accent-cyan focus:ring-accent-cyan bg-navy-400"
              />
              <span className="text-sm group-hover:text-white transition-colors">
                {label}
              </span>
              <span className="text-xs text-gray-500 ml-auto">({count})</span>
            </label>
          ))}
        </div>
      </div>
      
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

function getTrainColor(train: Train): string {
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
    <div style="color: white; font-family: 'IBM Plex Sans', sans-serif; min-width: 180px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${getVesselColor(vessel)}; box-shadow: 0 0 8px ${getVesselColor(vessel)};"></div>
        <strong style="color: #00D9FF; font-size: 14px;">${vessel.name}</strong>
      </div>
      <div style="font-size: 11px; color: #888; margin-bottom: 8px;">IMO: ${vessel.imo}</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
        <div>Status:</div><div style="color: ${getVesselColor(vessel)}; font-weight: 500;">${vessel.status}</div>
        <div>ETA:</div><div>${new Date(vessel.eta).toLocaleTimeString()}</div>
        <div>Cargo:</div><div>${vessel.cargo_teu.toLocaleString()} TEU</div>
        <div>Draft:</div><div>${vessel.draft_meters}m</div>
        <div>Berth:</div><div>${vessel.berth_assignment}</div>
        <div>Speed:</div><div>${vessel.speed || 0} kn</div>
      </div>
    </div>
  `;
}

function createBerthPopup(berth: Berth): string {
  return `
    <div style="color: white; font-family: 'IBM Plex Sans', sans-serif; min-width: 160px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${getBerthColor(berth)}; box-shadow: 0 0 8px ${getBerthColor(berth)};"></div>
        <strong style="color: #00D9FF; font-size: 14px;">${berth.name}</strong>
      </div>
      <div style="font-size: 11px; color: #888; margin-bottom: 8px;">${berth.terminal}</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
        <div>Status:</div><div style="color: ${getBerthColor(berth)}; font-weight: 500;">${berth.status}</div>
        <div>Depth:</div><div>${berth.depth_meters}m</div>
        <div>Length:</div><div>${berth.length_meters}m</div>
        <div>Utilization:</div><div>${berth.utilization}%</div>
        <div>Cranes:</div><div>${berth.cranes.length}</div>
      </div>
    </div>
  `;
}

function createCranePopup(crane: Crane): string {
  return `
    <div style="color: white; font-family: 'IBM Plex Sans', sans-serif; min-width: 140px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${getCraneColor(crane)}; box-shadow: 0 0 8px ${getCraneColor(crane)};"></div>
        <strong style="color: #00D9FF; font-size: 14px;">${crane.id}</strong>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
        <div>Type:</div><div>${crane.type}</div>
        <div>Status:</div><div style="color: ${getCraneColor(crane)}; font-weight: 500;">${crane.status}</div>
        <div>Moves/hr:</div><div>${crane.moves_per_hour}</div>
        <div>Energy:</div><div>${crane.energy_consumption_kwh} kWh</div>
        <div>Berth:</div><div>${crane.berth_id}</div>
      </div>
    </div>
  `;
}

function createTrainPopup(train: Train): string {
  return `
    <div style="color: white; font-family: 'IBM Plex Sans', sans-serif; min-width: 160px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${getTrainColor(train)}; box-shadow: 0 0 8px ${getTrainColor(train)};"></div>
        <strong style="color: #00D9FF; font-size: 14px;">${train.name}</strong>
      </div>
      <div style="font-size: 11px; color: #888; margin-bottom: 8px;">${train.operator}</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
        <div>Status:</div><div style="color: ${getTrainColor(train)}; font-weight: 500;">${train.status}</div>
        <div>Track:</div><div>${train.track}</div>
        <div>Cargo:</div><div>${train.containers_teu} TEU</div>
        <div>Departure:</div><div>${new Date(train.scheduled_departure).toLocaleTimeString()}</div>
        <div>Destination:</div><div style="font-size: 10px;">${train.destination}</div>
      </div>
    </div>
  `;
}
