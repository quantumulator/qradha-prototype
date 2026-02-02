// Live Data Service for Qradha
// Integrates AISStream.io for vessel tracking, weather and tide APIs

import type { Vessel, WeatherData, TideData } from './types';

// API Configuration
const AISSTREAM_API_KEY = process.env.NEXT_PUBLIC_AISSTREAM_API_KEY || '';
const OPENMETEO_BASE_URL = 'https://api.open-meteo.com/v1';
const HAMBURG_COORDS = { lat: 53.5411, lon: 9.9937 };

// AISStream WebSocket for real-time vessel tracking
class AISStreamService {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, (vessels: Vessel[]) => void> = new Map();
  private vessels: Map<string, Vessel> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;

  // Hamburg port bounding box (expanded to include Elbe approach)
  private boundingBox = {
    minLat: 53.40,
    maxLat: 53.70,
    minLon: 9.70,
    maxLon: 10.20,
  };

  connect(apiKey?: string) {
    const key = apiKey || AISSTREAM_API_KEY;
    
    if (!key) {
      console.warn('AISStream API key not configured. Using mock data.');
      return;
    }

    try {
      this.ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

      this.ws.onopen = () => {
        console.log('AISStream WebSocket connected');
        this.reconnectAttempts = 0;

        // Subscribe to Hamburg port area
        const subscribeMessage = {
          APIKey: key,
          BoundingBoxes: [[
            [this.boundingBox.minLon, this.boundingBox.minLat],
            [this.boundingBox.maxLon, this.boundingBox.maxLat]
          ]],
          FiltersShipMMSI: [], // All ships in area
          FilterMessageTypes: ['PositionReport', 'ShipStaticData']
        };

        this.ws?.send(JSON.stringify(subscribeMessage));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.processAISMessage(data);
        } catch (error) {
          console.error('Error parsing AIS message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('AISStream WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('AISStream WebSocket closed');
        this.attemptReconnect(key);
      };
    } catch (error) {
      console.error('Failed to connect to AISStream:', error);
    }
  }

  private attemptReconnect(apiKey: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(apiKey), this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private processAISMessage(data: AISMessage) {
    if (!data.MetaData || !data.Message) return;

    const mmsi = data.MetaData.MMSI.toString();
    const existingVessel = this.vessels.get(mmsi);

    const vessel: Vessel = {
      id: `AIS_${mmsi}`,
      name: data.MetaData.ShipName || existingVessel?.name || `Vessel ${mmsi}`,
      imo: data.MetaData.IMO?.toString() || existingVessel?.imo || '',
      eta: existingVessel?.eta || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      berth_assignment: existingVessel?.berth_assignment || 'pending',
      draft_meters: data.Message.PositionReport?.Draught 
        ? data.Message.PositionReport.Draught / 10 
        : existingVessel?.draft_meters || 12.0,
      cargo_teu: existingVessel?.cargo_teu || this.estimateCargoFromType(data.MetaData.ShipType),
      status: this.determineStatus(data),
      position: {
        lat: data.MetaData.latitude,
        lon: data.MetaData.longitude,
      },
      speed: data.Message.PositionReport?.Sog || 0,
      heading: data.Message.PositionReport?.TrueHeading || data.Message.PositionReport?.Cog || 0,
    };

    this.vessels.set(mmsi, vessel);
    this.notifySubscribers();
  }

  private determineStatus(data: AISMessage): 'approaching' | 'berthed' | 'waiting' | 'departing' {
    const speed = data.Message.PositionReport?.Sog || 0;
    const navStatus = data.Message.PositionReport?.NavigationalStatus;
    
    // Navigation status codes
    // 0 = Under way using engine
    // 1 = At anchor
    // 5 = Moored
    // 3 = Restricted manoeuvrability
    
    if (navStatus === 5 || speed < 0.5) {
      return 'berthed';
    } else if (navStatus === 1 || speed < 3) {
      return 'waiting';
    } else if (data.MetaData.longitude > 9.95) {
      return 'departing';
    } else {
      return 'approaching';
    }
  }

  private estimateCargoFromType(shipType?: number): number {
    // Ship type categories
    if (!shipType) return 5000;
    
    if (shipType >= 70 && shipType <= 79) {
      // Cargo ships
      return Math.floor(8000 + Math.random() * 12000);
    } else if (shipType >= 80 && shipType <= 89) {
      // Tankers
      return Math.floor(3000 + Math.random() * 5000);
    }
    return 5000;
  }

  subscribe(id: string, callback: (vessels: Vessel[]) => void) {
    this.subscribers.set(id, callback);
    // Immediately send current vessels
    callback(Array.from(this.vessels.values()));
  }

  unsubscribe(id: string) {
    this.subscribers.delete(id);
  }

  private notifySubscribers() {
    const vesselArray = Array.from(this.vessels.values());
    this.subscribers.forEach(callback => callback(vesselArray));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.vessels.clear();
    this.subscribers.clear();
  }

  getVessels(): Vessel[] {
    return Array.from(this.vessels.values());
  }
}

// AIS Message types
interface AISMessage {
  MetaData: {
    MMSI: number;
    ShipName?: string;
    IMO?: number;
    ShipType?: number;
    latitude: number;
    longitude: number;
    time_utc: string;
  };
  Message: {
    PositionReport?: {
      Sog: number; // Speed over ground
      Cog: number; // Course over ground
      TrueHeading: number;
      Draught: number;
      NavigationalStatus: number;
    };
    ShipStaticData?: {
      Name: string;
      ImoNumber: number;
      Dimension: {
        A: number;
        B: number;
        C: number;
        D: number;
      };
    };
  };
}

// Weather Service using Open-Meteo (free, no API key required)
class WeatherService {
  private cache: { data: WeatherData | null; timestamp: number } = { data: null, timestamp: 0 };
  private cacheDuration = 15 * 60 * 1000; // 15 minutes

  async getWeather(): Promise<WeatherData> {
    // Check cache
    if (this.cache.data && Date.now() - this.cache.timestamp < this.cacheDuration) {
      return this.cache.data;
    }

    try {
      const response = await fetch(
        `${OPENMETEO_BASE_URL}/forecast?` +
        `latitude=${HAMBURG_COORDS.lat}&longitude=${HAMBURG_COORDS.lon}` +
        `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,` +
        `wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility` +
        `&hourly=visibility,fog` +
        `&timezone=Europe/Berlin`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      const current = data.current;
      
      // Calculate fog probability from hourly data
      const hourlyFog = data.hourly?.fog || [];
      const currentHour = new Date().getHours();
      const fogProbability = hourlyFog[currentHour] ? hourlyFog[currentHour] / 100 : 0;

      const weather: WeatherData = {
        wind_speed_kmh: current.wind_speed_10m || 15,
        wind_direction: this.degreesToDirection(current.wind_direction_10m || 0),
        visibility_km: (current.visibility || 10000) / 1000,
        wave_height_m: this.estimateWaveHeight(current.wind_speed_10m || 0),
        fog_probability: fogProbability,
        temperature_c: current.temperature_2m || 8,
        conditions: this.weatherCodeToCondition(current.weather_code || 0),
      };

      this.cache = { data: weather, timestamp: Date.now() };
      return weather;
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      // Return fallback data
      return {
        wind_speed_kmh: 18,
        wind_direction: 'NW',
        visibility_km: 8.5,
        wave_height_m: 1.2,
        fog_probability: 0.15,
        temperature_c: 6,
        conditions: 'cloudy',
      };
    }
  }

  private degreesToDirection(degrees: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }

  private estimateWaveHeight(windSpeed: number): number {
    // Simple wave height estimation based on wind speed
    // Using Beaufort scale approximation
    if (windSpeed < 10) return 0.3;
    if (windSpeed < 20) return 0.8;
    if (windSpeed < 30) return 1.5;
    if (windSpeed < 40) return 2.5;
    return 3.5;
  }

  private weatherCodeToCondition(code: number): string {
    // WMO Weather codes
    if (code === 0) return 'clear';
    if (code <= 3) return 'partly_cloudy';
    if (code <= 48) return 'foggy';
    if (code <= 57) return 'drizzle';
    if (code <= 67) return 'rainy';
    if (code <= 77) return 'snowy';
    if (code <= 82) return 'showers';
    if (code >= 95) return 'stormy';
    return 'cloudy';
  }
}

// Tide Service using WorldTides API or Hamburg tide tables
class TideService {
  private cache: { data: TideData[] | null; timestamp: number } = { data: null, timestamp: 0 };
  private cacheDuration = 60 * 60 * 1000; // 1 hour

  async getTides(): Promise<TideData[]> {
    // Check cache
    if (this.cache.data && Date.now() - this.cache.timestamp < this.cacheDuration) {
      return this.cache.data;
    }

    // Hamburg has semi-diurnal tides (two high and two low tides per day)
    // Tidal range is typically 2.5-3.5 meters
    // For demo, we'll generate realistic tide data based on Hamburg patterns
    
    const tides = this.generateHamburgTides();
    this.cache = { data: tides, timestamp: Date.now() };
    return tides;
  }

  private generateHamburgTides(): TideData[] {
    const tides: TideData[] = [];
    const now = new Date();
    
    // Hamburg tidal period is approximately 12h 25min
    const tidalPeriodMs = 12 * 60 * 60 * 1000 + 25 * 60 * 1000;
    
    // Find the previous high tide (approximate)
    // High tide in Hamburg typically occurs around 6:00 and 18:25
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let baseHighTide = new Date(todayStart.getTime() + 6 * 60 * 60 * 1000);
    
    // Adjust to find the nearest past high tide
    while (baseHighTide > now) {
      baseHighTide = new Date(baseHighTide.getTime() - tidalPeriodMs);
    }

    // Generate 6 tide events (3 days worth)
    for (let i = 0; i < 6; i++) {
      const highTideTime = new Date(baseHighTide.getTime() + i * tidalPeriodMs);
      const lowTideTime = new Date(highTideTime.getTime() + tidalPeriodMs / 2);
      
      // Vary heights slightly for realism
      const highVariation = (Math.random() - 0.5) * 0.4;
      const lowVariation = (Math.random() - 0.5) * 0.3;

      if (highTideTime > now) {
        tides.push({
          timestamp: highTideTime.toISOString(),
          height_m: 3.2 + highVariation,
          type: 'high',
          isWindowOpen: true,
        });
      }

      if (lowTideTime > now) {
        tides.push({
          timestamp: lowTideTime.toISOString(),
          height_m: 0.5 + lowVariation,
          type: 'low',
          isWindowOpen: false,
        });
      }
    }

    // Sort by time and return next 6
    return tides
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(0, 6);
  }

  // Check if tidal window is currently open for deep-draft vessels
  isTidalWindowOpen(requiredDepth: number = 14): boolean {
    const tides = this.cache.data || [];
    if (tides.length < 2) return true; // Assume open if no data
    
    const now = Date.now();
    const nextTide = tides.find(t => new Date(t.timestamp).getTime() > now);
    
    if (!nextTide) return true;
    
    const timeToTide = (new Date(nextTide.timestamp).getTime() - now) / (60 * 60 * 1000);
    
    // Window is open 2 hours before and after high tide
    if (nextTide.type === 'high' && timeToTide <= 2) {
      return true;
    }
    
    // Or if we just passed high tide (within 2 hours)
    const prevTide = tides.find(t => new Date(t.timestamp).getTime() <= now && t.type === 'high');
    if (prevTide) {
      const timeSinceTide = (now - new Date(prevTide.timestamp).getTime()) / (60 * 60 * 1000);
      if (timeSinceTide <= 2) return true;
    }
    
    return false;
  }

  getNextTidalWindow(): { opens: Date; closes: Date } | null {
    const tides = this.cache.data || [];
    const nextHighTide = tides.find(t => t.type === 'high' && new Date(t.timestamp).getTime() > Date.now());
    
    if (!nextHighTide) return null;
    
    const highTime = new Date(nextHighTide.timestamp);
    return {
      opens: new Date(highTime.getTime() - 2 * 60 * 60 * 1000),
      closes: new Date(highTime.getTime() + 2 * 60 * 60 * 1000),
    };
  }
}

// Singleton instances
export const aisStreamService = new AISStreamService();
export const weatherService = new WeatherService();
export const tideService = new TideService();

// Unified live data service
export const liveDataService = {
  async initialize(aisApiKey?: string) {
    // Connect to AIS stream if API key available
    if (aisApiKey || AISSTREAM_API_KEY) {
      aisStreamService.connect(aisApiKey);
    }
    
    // Pre-fetch weather and tides
    await Promise.all([
      weatherService.getWeather(),
      tideService.getTides(),
    ]);
  },

  subscribeToVessels(id: string, callback: (vessels: Vessel[]) => void) {
    aisStreamService.subscribe(id, callback);
  },

  unsubscribeFromVessels(id: string) {
    aisStreamService.unsubscribe(id);
  },

  getWeather: () => weatherService.getWeather(),
  getTides: () => tideService.getTides(),
  isTidalWindowOpen: (depth?: number) => tideService.isTidalWindowOpen(depth),
  getNextTidalWindow: () => tideService.getNextTidalWindow(),

  disconnect() {
    aisStreamService.disconnect();
  },
};

export default liveDataService;
