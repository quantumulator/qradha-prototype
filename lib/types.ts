// Qradha Type Definitions

// Vessel Types
export interface Vessel {
  id: string;
  name: string;
  imo: string;
  eta: string;
  etd?: string;
  berth_assignment: string;
  draft_meters: number;
  cargo_teu: number;
  status: 'approaching' | 'berthed' | 'departing' | 'waiting';
  position: {
    lat: number;
    lon: number;
  };
  speed?: number;
  heading?: number;
}

// Berth Types
export interface Berth {
  id: string;
  name: string;
  terminal: string;
  status: 'available' | 'occupied' | 'maintenance';
  depth_meters: number;
  length_meters: number;
  cranes: string[];
  position: {
    lat: number;
    lon: number;
  };
  utilization: number; // 0-100
  current_vessel?: string;
}

// Crane Types
export interface Crane {
  id: string;
  type: 'STS' | 'RTG' | 'RMG';
  status: 'active' | 'idle' | 'maintenance';
  berth_id: string;
  moves_per_hour: number;
  energy_consumption_kwh: number;
  position?: {
    lat: number;
    lon: number;
  };
}

// Train Types
export interface Train {
  id: string;
  name: string;
  operator: string;
  status: 'loading' | 'waiting' | 'departing' | 'approaching';
  scheduled_departure: string;
  scheduled_arrival?: string;
  containers_teu: number;
  destination: string;
  track: string;
  position: {
    lat: number;
    lon: number;
  };
}

// Disruption Types
export interface Disruption {
  disruption_type: 'vessel_delay' | 'equipment_failure' | 'weather_event' | 'rail_delay';
  vessel_id?: string;
  original_eta?: string;
  new_eta?: string;
  delay_minutes: number;
  cause: 'weather_fog' | 'weather_storm' | 'weather_ice' | 'mechanical_failure' | 'tidal_miss' | 'congestion' | 'customs_delay' | 'other';
  berth_change?: {
    from: string;
    to: string;
  } | null;
  confidence: number;
  clarifications_needed: string[];
}

// Optimization Types
export interface OptimizationResult {
  id: string;
  timestamp: string;
  cost_before: number;
  cost_after: number;
  improvement_percent: number;
  runtime_ms: number;
  changes: ScheduleChange[];
  insights: string;
}

export interface ScheduleChange {
  type: 'berth_reassignment' | 'crane_reallocation' | 'rail_slot_change' | 'time_shift';
  entity_id: string;
  from: string;
  to: string;
  reason: string;
}

// Weather Types
export interface WeatherData {
  timestamp: string;
  wind_speed_kmh: number;
  wind_direction: number;
  wave_height_m: number;
  visibility_km: number;
  fog_probability: number;
  precipitation_mm: number;
}

// Tide Types
export interface TideData {
  timestamp: string;
  type: 'high' | 'low';
  height_m: number;
  window_open?: string;
  window_close?: string;
}

// Risk Alert Types
export interface RiskAlert {
  id: string;
  type: 'tidal_risk' | 'weather_risk' | 'congestion_risk' | 'equipment_risk' | 'rail_saturation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  vessel?: string;
  message: string;
  recommendation: string;
  probability: number;
  timestamp: string;
}

// Port State
export interface PortState {
  vessels: Vessel[];
  berths: Berth[];
  cranes: Crane[];
  trains: Train[];
  weather: WeatherData;
  tides: TideData[];
  alerts: RiskAlert[];
  resilience_score: number;
  timestamp: string;
}

// Metrics Types
export interface Metrics {
  throughput_teu: number;
  throughput_change: number;
  energy_kwh: number;
  energy_change: number;
  rail_share_percent: number;
  rail_target_percent: number;
  co2_saved_tons: number;
  avg_turnaround_hours: number;
  turnaround_change: number;
  delays_hours: number;
}

// Scenario Types
export interface Scenario {
  scenario_id: string;
  name: string;
  description: string;
  disruptions: Disruption[];
  estimated_impact: {
    affected_containers: number;
    rail_delays_minutes: number;
    truck_queue_increase: string;
  };
  probability: 'low' | 'moderate' | 'high';
}

// Chat Message Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    disruption?: Disruption;
    optimization?: OptimizationResult;
    scenario?: Scenario;
  };
}
