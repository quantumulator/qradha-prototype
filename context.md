# Qradha Technical Context

## Project Overview

**Qradha** (Quantum Resilient Adaptive Dynamic Hamburg Engine) is a real-time intermodal port synchronization and optimization platform for the Port of Hamburg. It enables dynamic rescheduling across vessels, berths, cranes, rail, trucks, and yard operations in response to disruptions.

**Core Goal:** Transform 12+ hour delay cascades into <30 second real-time re-optimizations, achieving 8-12% terminal throughput increases and 15% gantry crane energy reductions.

---

## The Problem

### Port Operations Challenges

**Fragmented Systems:**
- Vessel scheduling, berth allocation, crane dispatch, rail coordination, and truck gate management operate in silos
- Legacy Terminal Operating Systems (TOS) lack holistic optimization
- Manual coordination during disruptions (phone calls, emails, spreadsheets)

**Critical Constraints:**
- **Tidal Windows:** Mega-ships have only 2-hour windows twice daily (06:00, 18:00)
- **Rail Dependency:** 50% of containers via rail (200+ trains daily)
- **Weather Sensitivity:** North Sea storms, fog, ice cause frequent delays
- **Cascading Effects:** One missed tide triggers 12-hour delays across all systems

**Example Disruption Cascade:**
```
MSC Mia misses 06:00 tide (fog)
  ↓ Berth 1 remains occupied
  ↓ Cranes reassigned manually (40% efficiency loss)
  ↓ 3 rail trains miss departure slots
  ↓ 280 containers rerouted to trucks
  ↓ Truck queue increases 90 min
  ↓ 12-hour delay propagates to next day
```

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Qradha Frontend (Next.js)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Live Dashboard│  │ 3D Viz (Three)│  │ AI Chat UI   │     │
│  │ (Map + Metrics│  │ (Quantum Anim)│  │ (Disruptions)│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕ Tauri IPC
┌─────────────────────────────────────────────────────────────┐
│                 Qradha Backend (Rust + Tauri)               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Optimization Engine (Simulated Annealing + Tensors) │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ AI Agents    │  │ API Client   │  │ SQLite Cache │     │
│  │ (Groq LLMs)  │  │ (AIS, Weather│  │ (Offline Mode│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                     External Data Sources                   │
│  • HVCC Port-Call API (vessels)                             │
│  • AISstream.io (real-time positions)                       │
│  • Open-Meteo & Stormglass (weather, tides)                │
│  • OpenStreetMap (port geography)                           │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

**Rust (Tauri Backend):**
- Performance: Optimization runs in <30 seconds for 200+ variable problems
- Memory Safety: Zero-cost abstractions prevent crashes
- Parallelism: Multi-core tensor operations via Rayon

**Next.js (Frontend):**
- Server Components: Fast initial load with pre-fetched port data
- Real-time Updates: WebSocket integration for live vessel tracking
- 3D Visualization: React-Three-Fiber for quantum animations

**Groq (AI Agents):**
- Speed: 500+ tokens/sec inference (critical for <2 sec disruption parsing)
- Models: Llama 3.1 70B (reasoning), Mixtral 8x7B (creativity), Llama 3.1 8B (speed)

**SQLite (Local Cache):**
- Offline resilience during internet outages
- Audit trail for all optimization decisions
- Sub-millisecond historical pattern lookups

**MapLibre GL (Mapping):**
- Open-source fork of Mapbox GL (no vendor lock-in, EU data sovereignty)
- 3D capabilities for port infrastructure visualization
- Zero API keys required
- EU-hosted OSM tiles (German FOSSGIS primary, French OSM fallback)
- Offline Hamburg extract from OpenMapTiles for demo mode

---

## Required Dependencies

### Rust Backend (Cargo)

```toml
[dependencies]
reqwest = "0.11"           # HTTP client for API fetches
tokio = { version = "1.0", features = ["full"] }  # Async runtime
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"         # JSON parsing
sqlx = { version = "0.7", features = ["sqlite", "runtime-tokio-native-tls"] }
rayon = "1.7"              # Parallelism for optimization
ndarray = "0.15"           # Multi-dimensional arrays for tensors
rand = "0.8"               # Random number generation
chrono = "0.4"             # Date/time handling
chrono-tz = "0.8"          # Timezone support
tauri = { version = "1.5", features = ["api-all"] }
tauri-plugin-sql = { git = "https://github.com/tauri-apps/plugins-workspace", features = ["sqlite"] }
tauri-plugin-notification = { git = "https://github.com/tauri-apps/plugins-workspace" }
log = "0.4"
fern = "0.6"               # Logging
```

### Frontend (npm)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next": "^14.0.0",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "maplibre-gl": "^4.0.0",
    "@maplibre/maplibre-gl-js": "^4.0.0",
    "react-map-gl": "^7.1.7",
    "three": "^0.160.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.92.0",
    "framer-motion": "^10.16.0",
    "tailwindcss": "^3.4.0",
    "daisyui": "^4.5.0",
    "zod": "^3.22.0",
    "axios": "^1.6.0",
    "recharts": "^2.10.0",
    "lucide-react": "^0.300.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/node": "^20.10.0",
    "@types/three": "^0.160.0",
    "typescript": "^5.3.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0"
  }
}
```

---

## Data Sources & APIs

### 1. HVCC Hamburg Vessel Coordination Center
- **Endpoint:** `https://api.hvcc.de/port-call-data/v1/`
- **Data:** Vessel arrivals, departures, berth assignments, cargo manifests
- **Update Frequency:** Every 30 minutes
- **Coverage:** All commercial vessels >300 GT

### 2. AISstream.io
- **Protocol:** WebSocket (wss://stream.aisstream.io/v0/stream)
- **Data:** Real-time vessel positions (lat/lon), speed, heading, draft
- **Update Frequency:** 3-10 seconds per vessel

### 3. Open-Meteo Marine Weather API
- **Endpoint:** `https://marine-api.open-meteo.com/v1/marine`
- **Data:** Wave height, wind speed/direction, visibility, precipitation
- **Forecast:** 7-day hourly predictions
- **Free Tier:** Unlimited requests

### 4. Stormglass.io Tide API
- **Endpoint:** `https://api.stormglass.io/v2/tide/extremes/point`
- **Data:** High/low tide times and heights for Hamburg harbor entrance
- **Critical:** Determines 2-hour tidal windows for mega-ship access
- **Free Tier:** 50 requests/day (sufficient with caching)

### 5. OpenStreetMap (EU-Hosted Tiles + Nominatim)
- **Primary Tiles:** `https://tile.openstreetmap.de/{z}/{x}/{y}.png` (German FOSSGIS)
- **Fallback Tiles:** `https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png`
- **Geocoding:** Nominatim API for terminal names → coordinates
- **Offline Cache:** Hamburg port extract from OpenMapTiles (~50MB, zoom 10-16)

### Data Processing Pipeline

```rust
async fn fetch_and_cache_port_state() -> PortState {
    // Fetch from APIs in parallel
    let (vessels, weather, tides) = tokio::join!(
        fetch_hvcc_vessels(),
        fetch_weather(),
        fetch_tides()
    );
    
    // Enrich with AIS positions
    let ais_positions = subscribe_ais_stream().await;
    let vessels_with_positions = merge_vessel_data(vessels, ais_positions);
    
    // Cache to SQLite for offline access
    sqlx::query("INSERT INTO port_state_cache ...")
        .execute(&db_pool)
        .await?;
    
    PortState {
        vessels: vessels_with_positions,
        weather,
        tides,
        timestamp: Utc::now(),
    }
}
```

---

## Optimization Engine

### Cost Function

Minimize weighted multi-objective cost:

```
Total Cost = α(Vessel_Delays) + β(Energy_Consumption) + γ(Modal_Split_Penalty) + δ(Berth_Conflicts) + ε(Slack_Penalty)
```

**Components:**
1. **Vessel_Delays:** Sum of (actual berth time - scheduled berth time). Exponential penalty for delays >2 hours.
2. **Energy_Consumption:** Crane electricity usage. Off-peak hours (22:00-06:00) get 50% cost discount.
3. **Modal_Split_Penalty:** Deviation from 50% rail target. Formula: `|Rail_TEU / Total_TEU - 0.50| × CO2_Cost`
4. **Berth_Conflicts:** Binary penalty (∞ cost) if two vessels overlap at same berth.
5. **Slack_Penalty:** Encourages buffer time. Penalizes <15 min gaps between operations.

**Weights:**
- α = 1000 (vessel delays most expensive)
- β = 10 (energy costs)
- γ = 500 (EU compliance)
- δ = ∞ (hard constraint)
- ε = 50 (soft constraint)

### Simulated Annealing Implementation

```rust
fn simulated_annealing(
    initial_schedule: Schedule,
    max_iterations: usize,
) -> Schedule {
    let mut current = initial_schedule;
    let mut best = current.clone();
    let mut temperature = 1000.0;
    
    for iteration in 0..max_iterations {
        let neighbor = perturb_schedule(&current);
        let delta_cost = neighbor.cost() - current.cost();
        
        // Accept if better, or probabilistically if worse
        if delta_cost < 0.0 || random::<f64>() < (-delta_cost / temperature).exp() {
            current = neighbor;
            if current.cost() < best.cost() {
                best = current.clone();
            }
        }
        
        temperature *= 0.995; // Geometric cooling
    }
    
    best
}

fn perturb_schedule(schedule: &Schedule) -> Schedule {
    let mut new = schedule.clone();
    match random::<u8>() % 4 {
        0 => new.swap_berths(),
        1 => new.shift_time(),
        2 => new.reassign_crane(),
        3 => new.flip_rail_truck(),
        _ => unreachable!(),
    }
    new
}
```

### Tensor Network Representation

```rust
// Dependencies represented as tensor contractions
// T[vessel, berth, crane, rail_slot, time] = Binary assignment (0 or 1)
// Constraints:
//   ∑_berth T[v, b, ...] = 1  (each vessel → one berth)
//   ∑_vessel T[v, b, c, r, t] ≤ Capacity[b, t]  (berth capacity)
```

Using `ndarray` crate's BLAS-backed operations for 10x faster re-optimization vs. nested loops.

---

## User Interface Components

### 1. Live Port Map
- Leaflet or MapLibre GL base layer with real-time vessel positions (AIS data)
- EU-hosted OpenStreetMap tiles (German FOSSGIS or self-hosted Hamburg extract)
- MapLibre GL enables 3D tilt/overlay for port infrastructure—no API keys required
- Color-coded berths: Green (available), Yellow (occupied <50%), Red (congested)
- Animated vessel movement trails (past 24 hours)
- Click vessel → show details (ETA, cargo, assigned resources)

### 2. Disruption Control Panel
- Natural language input: "CMA CGM Vela stuck in Kiel Canal, arriving 6 hours late"
- AI agent parses → confirmation dialog with extracted data
- One-click "Optimize" button → triggers re-optimization
- Before/After comparison: Side-by-side Gantt charts, delta metrics

### 3. 3D Quantum Visualization
- **Energy Landscape:** 3D surface (x=berth allocation, y=time, z=cost)
  - Valleys = good schedules
  - Peaks = constraint violations
  - Animated ball (current solution) tunneling through barriers
- **Domino Cascade:** Falling dominos representing delays (before optimization)
- **Quantum State Yard:** Container grid as qubits (0=empty, 1=occupied), collapsing into optimized arrangement

### 4. Metrics Panel
- Real-time KPIs: Throughput (TEU/day), Energy (kWh), Modal Split (Rail %), Delays (hours)
- Sparklines (24-hour trends)
- Comparison to baseline

### 5. AI Chat Assistant
- Persistent sidebar for natural language queries
- Examples: "What if weather worsens?", "Why move vessel X to berth Y?", "Generate weekly report"
- Voice input support (future: Groq Whisper)

### Design Theme

**Colors:**
- Deep Navy (#0A1929): Background
- Vibrant Orange (#FF6B35): Accents, alerts
- Cyan (#00D9FF): Rail/sustainable actions
- Red (#FF2E63): Delays, warnings

**Typography:** IBM Plex Sans, IBM Plex Mono

---

## MapLibre Configuration

```tsx
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Direct MapLibre
const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.de/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      }
    },
    layers: [{
      id: 'osm',
      type: 'raster',
      source: 'osm'
    }]
  },
  center: [9.9937, 53.5511], // Hamburg coordinates
  zoom: 12
});

// react-map-gl wrapper (MapLibre mode)
import Map from 'react-map-gl/maplibre';

<Map
  initialViewState={{
    longitude: 9.9937,
    latitude: 53.5511,
    zoom: 12
  }}
  mapStyle={{
    version: 8,
    sources: { /* same as above */ },
    layers: [ /* same as above */ ]
  }}
/>
```

---

## Database Schema (SQLite)

```sql
-- Vessel cache
CREATE TABLE vessels (
    id TEXT PRIMARY KEY,
    name TEXT,
    imo TEXT,
    eta TIMESTAMP,
    berth_assignment TEXT,
    draft_meters REAL,
    cargo_teu INTEGER,
    timestamp TIMESTAMP
);

-- Optimization history
CREATE TABLE optimization_runs (
    id INTEGER PRIMARY KEY,
    trigger_type TEXT, -- 'disruption', 'scenario', 'scheduled'
    input_state TEXT, -- JSON snapshot
    output_schedule TEXT, -- JSON schedule
    cost_before REAL,
    cost_after REAL,
    runtime_ms INTEGER,
    timestamp TIMESTAMP
);

-- Port state cache
CREATE TABLE port_state_cache (
    timestamp TIMESTAMP PRIMARY KEY,
    weather_json TEXT,
    tide_json TEXT,
    berth_status_json TEXT
);

-- Tile cache for offline mode
CREATE TABLE map_tiles (
    z INTEGER,
    x INTEGER,
    y INTEGER,
    tile_data BLOB,
    PRIMARY KEY (z, x, y)
);
```

---

## AI Agent Integration (Groq)

### Rust Implementation

```rust
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct GroqRequest {
    model: String,
    messages: Vec<Message>,
    temperature: f32,
    max_tokens: u32,
}

#[derive(Deserialize)]
struct GroqResponse {
    choices: Vec<Choice>,
}

async fn call_disruption_parser(user_input: &str) -> Result<DisruptionData, Error> {
    let client = Client::new();
    let request = GroqRequest {
        model: "llama-3.1-70b-versatile".to_string(),
        messages: vec![
            Message { role: "system", content: DISRUPTION_PARSER_PROMPT.to_string() },
            Message { role: "user", content: user_input.to_string() },
        ],
        temperature: 0.2,
        max_tokens: 1024,
    };
    
    let response = client.post("https://api.groq.com/openai/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", GROQ_API_KEY))
        .json(&request)
        .send()
        .await?
        .json::<GroqResponse>()
        .await?;
    
    let parsed_json = response.choices[0].message.content;
    Ok(serde_json::from_str(&parsed_json)?)
}
```

### Agent Communication Flow

```
User Input (Natural Language)
    ↓
Disruption Parser Agent → Structured Disruption Data
    ↓
Rust Optimization Engine (Simulated Annealing + Tensors)
    ↓
Optimization Results
    ↓
    ├→ Optimization Insight Agent → Explanations
    ├→ Predictive Resilience Agent → Risk Alerts
    └→ Report Synthesis Agent → Exportable Reports
    ↓
Frontend Dashboard (Next.js + Three.js)
```

---

## Security & Performance

### API Key Management
- Groq API key stored in Tauri secure storage (encrypted keychain)
- No port operational data sent to Groq—only anonymized abstracts

### Performance Targets
| Component | Target |
|-----------|--------|
| Optimization Speed | <30 seconds for 200 variables |
| Disruption Parser | <2 seconds |
| UI Render | 60 FPS (3D animations) |
| API Fetch | <500ms (with caching) |

### Offline Fallback
- SQLite cache: 7-day retention
- Rule-based heuristics when internet unavailable
- Pre-downloaded Hamburg tile extract for map

---

## Development Setup

### Prerequisites
- Rust 1.70+
- Node.js 18+
- SQLite 3.35+

### Build Commands

```bash
# Backend (Tauri)
cargo build --release

# Frontend (Next.js)
npm install
npm run dev

# Full desktop app
npm run tauri dev
```

### Environment Variables

```env
GROQ_API_KEY=gsk_...
HVCC_API_URL=https://api.hvcc.de/port-call-data/v1/
AISSTREAM_API_KEY=...
STORMGLASS_API_KEY=...
```

---

## Deployment

**Desktop:** Tauri builds single executable with auto-updates
**Web:** Next.js on Vercel (qradha.com)

This completes the technical context needed to build the Qradha prototype.