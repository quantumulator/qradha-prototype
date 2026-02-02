'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQradhaStore } from '@/lib/store';
import type { Vessel, Berth } from '@/lib/types';

// Hamburg Port coordinates
const HAMBURG_CENTER: [number, number] = [9.9537, 53.5311];

export default function PortMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const { portState, setSelectedVessel, setSelectedBerth, selectedVessel } = useQradhaStore();

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

  // Update markers when port state changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add vessel markers
    portState.vessels.forEach((vessel) => {
      const el = document.createElement('div');
      el.className = 'vessel-marker';
      el.style.cssText = `
        width: 20px;
        height: 20px;
        background: ${getVesselColor(vessel)};
        border: 2px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px ${getVesselColor(vessel)};
        transform: rotate(${vessel.heading || 0}deg);
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([vessel.position.lon, vessel.position.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(`
            <div style="color: white; font-family: 'IBM Plex Sans', sans-serif;">
              <strong style="color: #00D9FF;">${vessel.name}</strong><br/>
              <span style="font-size: 12px; color: #aaa;">IMO: ${vessel.imo}</span><br/>
              <div style="margin-top: 8px;">
                <div>Status: <span style="color: ${getStatusColor(vessel.status)}">${vessel.status}</span></div>
                <div>ETA: ${new Date(vessel.eta).toLocaleTimeString()}</div>
                <div>Cargo: ${vessel.cargo_teu.toLocaleString()} TEU</div>
                <div>Draft: ${vessel.draft_meters}m</div>
                <div>Berth: ${vessel.berth_assignment}</div>
              </div>
            </div>
          `)
        )
        .addTo(map.current!);

      el.addEventListener('click', () => {
        setSelectedVessel(vessel);
      });

      markersRef.current.push(marker);
    });

    // Add berth markers
    portState.berths.forEach((berth) => {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 30px;
        height: 12px;
        background: ${getBerthColor(berth)};
        border: 1px solid white;
        border-radius: 3px;
        cursor: pointer;
        opacity: 0.8;
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([berth.position.lon, berth.position.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 15 }).setHTML(`
            <div style="color: white; font-family: 'IBM Plex Sans', sans-serif;">
              <strong style="color: #00D9FF;">${berth.name}</strong><br/>
              <span style="font-size: 12px; color: #aaa;">${berth.terminal}</span><br/>
              <div style="margin-top: 8px;">
                <div>Status: <span style="color: ${getBerthStatusColor(berth.status)}">${berth.status}</span></div>
                <div>Depth: ${berth.depth_meters}m</div>
                <div>Utilization: ${berth.utilization}%</div>
                <div>Cranes: ${berth.cranes.join(', ')}</div>
              </div>
            </div>
          `)
        )
        .addTo(map.current!);

      el.addEventListener('click', () => {
        setSelectedBerth(berth);
      });

      markersRef.current.push(marker);
    });
  }, [portState, mapLoaded, setSelectedVessel, setSelectedBerth]);

  // Fly to selected vessel
  useEffect(() => {
    if (map.current && selectedVessel) {
      map.current.flyTo({
        center: [selectedVessel.position.lon, selectedVessel.position.lat],
        zoom: 14,
        duration: 1500,
      });
    }
  }, [selectedVessel]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 glass rounded-lg p-3 text-sm">
        <div className="font-semibold mb-2 text-accent-cyan">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Berthed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-cyan"></div>
            <span>Approaching</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-orange"></div>
            <span>Waiting</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-red"></div>
            <span>Delayed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getVesselColor(vessel: Vessel): string {
  switch (vessel.status) {
    case 'berthed': return '#22c55e';
    case 'approaching': return '#00D9FF';
    case 'waiting': return '#FF6B35';
    case 'departing': return '#a855f7';
    default: return '#ffffff';
  }
}

function getStatusColor(status: Vessel['status']): string {
  switch (status) {
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

function getBerthStatusColor(status: Berth['status']): string {
  switch (status) {
    case 'available': return '#22c55e';
    case 'occupied': return '#FF6B35';
    case 'maintenance': return '#FF2E63';
    default: return '#ffffff';
  }
}
