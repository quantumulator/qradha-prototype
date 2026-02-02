# Qradha AI Agents System

## Overview

Qradha employs specialized AI agents working in concert to transform port operations through intelligent disruption handling, optimization, and decision support. Each agent leverages Groq's language models for natural language understanding, reasoning, and synthesis.

---

## Agent Architecture

### 1. Disruption Parser Agent

**Role:** Natural language interface for disruption input and scenario creation

**Responsibilities:**
- Parse natural language disruption descriptions from operators
- Extract structured data: vessel ID, delay duration, berth assignment, cause category
- Validate inputs against current port state
- Generate multiple interpretation options when ambiguous
- Support multi-disruption scenarios (cascading events)

**Input:**
- Free-text disruption descriptions
- Quick templates (weather delay, mechanical failure, tidal miss, congestion)

**Output Structure:**
```json
{
  "disruption_type": "vessel_delay",
  "vessel_id": "MSC_MIA_IMO9876543",
  "original_eta": "2026-02-02T14:30:00Z",
  "new_eta": "2026-02-02T18:30:00Z",
  "delay_minutes": 240,
  "cause": "weather_fog",
  "berth_change": {"from": "berth_1", "to": "berth_3"},
  "confidence": 0.95,
  "clarifications_needed": []
}
```

**Model:** Groq Llama 3.1 70B (accuracy for complex parsing)
**Latency Target:** <2 seconds

---

### 2. Scenario Generator Agent

**Role:** Create realistic "what-if" scenarios and stress-test port resilience

**Responsibilities:**
- Generate plausible disruption scenarios based on historical patterns
- Combine multiple disruptions (e.g., "What if 3 vessels miss tide AND crane breaks?")
- Suggest edge cases operators might not consider
- Parameterize scenarios (severity: minor/moderate/severe/catastrophic)

**Input:**
- Historical disruption database
- Current port state (vessel queue, berth occupancy, tidal windows)
- User-specified constraints (focus on rail operations, weather events only, etc.)

**Output Structure:**
```json
{
  "scenario_id": "scenario_2026_02_02_001",
  "name": "Triple Tide Miss + Crane Failure",
  "description": "Three mega-ships miss 06:00 tide due to North Sea storm. QC4 crane at Terminal Burchardkai fails during overnight maintenance.",
  "disruptions": [
    {"type": "tidal_miss", "vessels": ["EVER_ACE", "MSC_GULSUN", "HMM_ALGECIRAS"], "delay_hours": 12},
    {"type": "equipment_failure", "equipment": "QC4", "terminal": "CTB", "downtime_hours": 8}
  ],
  "estimated_impact": {
    "affected_containers": 18500,
    "rail_delays_minutes": 340,
    "truck_queue_increase": "65%"
  },
  "probability": "moderate"
}
```

**Model:** Groq Mixtral 8x7B (creative scenario generation)
**Latency Target:** <5 seconds

---

### 3. Optimization Insight Agent

**Role:** Explain optimization decisions and communicate trade-offs in natural language

**Responsibilities:**
- Translate quantum-inspired algorithm outputs into operator-friendly insights
- Explain why specific berth/crane/rail assignments were chosen
- Highlight trade-offs (e.g., "Prioritizing rail slot sacrifices 15 min vessel turnaround but saves 2.4 tons CO2")
- Identify unexpected solutions the optimizer discovered
- Warn about solution fragility (small margins, high sensitivity)

**Input:**
- Before/after optimization state
- Cost function breakdown (energy, time, emissions, revenue)
- Constraint violations avoided
- Alternative solutions explored (local optima)

**Output Format (Natural Language):**
```text
**Optimization Summary:**

The re-optimized schedule achieves **8.3% throughput increase** by:

1. **Berth Reallocation:** Moving MSC Mia from Berth 1 → Berth 3 frees critical deep-water access for EVER ACE (draft 16.5m), avoiding a 6-hour tidal delay.

2. **Rail Prioritization:** Allocated 3 priority rail slots to outbound containers for DB Cargo trains, preventing €42K in demurrage penalties.

3. **Energy Arbitrage:** Shifted 40% of crane operations to off-peak hours (22:00-06:00), reducing grid load and saving 1,850 kWh (~€480).

**Trade-offs:**
- Truck gate congestion increases by 12 min average during 14:00-16:00 peak.
- Berth 3 utilization rises to 94% (tight margin for next disruption).

**Quantum Insight:** Algorithm tunneled through a local optimum that favored immediate vessel discharge but created rail bottleneck 8 hours downstream.
```

**Model:** Groq Llama 3.1 70B (reasoning depth)
**Latency Target:** <3 seconds

---

### 4. Predictive Resilience Agent

**Role:** Anticipate future disruptions and recommend proactive adjustments

**Responsibilities:**
- Monitor incoming vessels, weather forecasts, and historical patterns
- Predict likely disruptions (tide misses, weather delays, congestion buildups)
- Suggest preemptive schedule adjustments
- Calculate resilience scores for current schedule
- Alert operators to emerging risks

**Input:**
- Real-time AIS vessel tracking
- Weather forecasts (Open-Meteo, Stormglass)
- Historical delay patterns
- Current schedule state and slack capacity

**Output Structure:**
```json
{
  "timestamp": "2026-02-02T12:00:00Z",
  "risk_alerts": [
    {
      "type": "tidal_risk",
      "vessel": "MAERSK_ESSEX",
      "current_eta": "2026-02-02T17:45:00Z",
      "tidal_window_close": "2026-02-02T18:00:00Z",
      "margin_minutes": 15,
      "probability_miss": 0.68,
      "recommendation": "Delay berth assignment by 12 hours to next tide (06:00) to avoid rushed operations."
    },
    {
      "type": "rail_saturation",
      "time_window": "2026-02-02T19:00:00Z to 22:00:00Z",
      "trains_scheduled": 14,
      "capacity": 12,
      "overflow_containers": 280,
      "recommendation": "Redistribute 140 TEU to truck gate or delay 2 trains to post-22:00 off-peak."
    }
  ],
  "resilience_score": 0.62,
  "explanation": "Current schedule has limited slack. One additional major vessel delay would trigger cascading rail/truck bottlenecks."
}
```

**Model:** Groq Llama 3.1 8B (fast inference for real-time monitoring)
**Latency Target:** <1 second
**Update Frequency:** Every 5 minutes (background monitoring)

---

### 5. Report Synthesis Agent

**Role:** Generate executive summaries and exportable reports for stakeholders

**Responsibilities:**
- Create daily/weekly performance reports (KPIs: throughput, energy, emissions, delays)
- Compare actual vs. optimized outcomes (ROI of using Qradha)
- Summarize optimization runs for auditing
- Generate sustainability reports (CO2 saved, rail vs. truck modal split)
- Customize language for different audiences

**Input:**
- Optimization history database
- Actual operational data (from port APIs)
- User-specified report parameters (date range, focus areas, KPIs)

**Output Format (Markdown):**
```markdown
## Qradha Weekly Performance Report
**Week of January 27 - February 2, 2026**

### Key Metrics
- **Throughput Increase:** +9.2% (38,450 TEU vs. baseline 35,200 TEU)
- **Gantry Crane Energy Reduction:** -13.8% (12,340 kWh saved)
- **Rail Modal Share:** 52.3% (target: 50%, up from 47% previous week)
- **CO2 Emissions Avoided:** 18.7 tons
- **Average Vessel Turnaround:** 22.1 hours (down from 24.8 hours)

### Major Disruptions Handled
1. **Feb 1, 14:30:** Triple tide miss (storm delay) → Re-optimized 47 vessel operations in 18 seconds, avoiding €180K in demurrage.
2. **Jan 29, 08:15:** QC7 crane hydraulic failure → Redistributed workload to QC5/QC6, maintained 94% throughput.

### Sustainability Impact
Qradha's optimization prioritized 18 additional rail slots over truck alternatives, reducing port-related road congestion by an estimated 340 truck movements.
```

**Model:** Groq Llama 3.1 70B (comprehensive synthesis)
**Latency Target:** <10 seconds

---

## Agent Orchestration

### Communication Flow

```
User Input (Natural Language)
    ↓
Disruption Parser Agent → Structured Disruption Data
    ↓
Rust Optimization Engine (Simulated Annealing + Tensor Networks)
    ↓
Optimization Results
    ↓
    ├→ Optimization Insight Agent → Explanations & Trade-offs
    ├→ Predictive Resilience Agent → Risk Alerts & Proactive Suggestions
    └→ Report Synthesis Agent → Exportable Reports
    ↓
Frontend Dashboard (Next.js + Three.js Visualizations)
```

### Agent Coordination

- **Sequential Processing:** Disruption Parser → Optimizer → Insight/Resilience agents (parallel)
- **Background Monitoring:** Predictive Resilience Agent polls APIs every 5 minutes
- **On-Demand Invocation:** Scenario Generator and Report Synthesis agents activate on user request
- **Shared Context:** All agents access SQLite cache (optimization history, port state, vessel data)

---

## Technical Implementation

### Groq Integration (Tauri Rust Backend)

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

#[derive(Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct GroqResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: Message,
}

async fn call_disruption_parser(user_input: &str) -> Result<DisruptionData, Error> {
    let client = Client::new();
    let request = GroqRequest {
        model: "llama-3.1-70b-versatile".to_string(),
        messages: vec![
            Message { 
                role: "system".to_string(), 
                content: DISRUPTION_PARSER_PROMPT.to_string() 
            },
            Message { 
                role: "user".to_string(), 
                content: user_input.to_string() 
            },
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
    
    let parsed_json = &response.choices[0].message.content;
    Ok(serde_json::from_str(parsed_json)?)
}
```

### Agent Prompt Templates

Store in `/prompts` directory:

```
/prompts/
  disruption_parser.txt
  scenario_generator.txt
  optimization_insight.txt
  predictive_resilience.txt
  report_synthesis.txt
```

**Example: Disruption Parser Prompt**

```text
You are an expert port operations assistant. Your task is to parse natural language disruption descriptions into structured JSON.

RULES:
1. Extract vessel identifiers (name, IMO number if mentioned)
2. Calculate delay in minutes from original ETA
3. Categorize cause: weather_fog, weather_storm, weather_ice, mechanical_failure, tidal_miss, congestion, customs_delay, other
4. Identify any berth changes mentioned
5. Set confidence score (0.0-1.0) based on clarity of input
6. List clarifications needed if input is ambiguous

OUTPUT FORMAT (JSON only, no explanation):
{
  "disruption_type": "vessel_delay" | "equipment_failure" | "weather_event" | "rail_delay",
  "vessel_id": "VESSEL_NAME_IMO_NUMBER",
  "original_eta": "ISO8601_timestamp",
  "new_eta": "ISO8601_timestamp",
  "delay_minutes": number,
  "cause": "category",
  "berth_change": {"from": "berth_X", "to": "berth_Y"} | null,
  "confidence": 0.0-1.0,
  "clarifications_needed": ["question1", "question2"]
}

EXAMPLES:
Input: "MSC Mia delayed by 4 hours due to fog, arriving at berth 3 instead of berth 1"
Output: {"disruption_type": "vessel_delay", "vessel_id": "MSC_MIA", "delay_minutes": 240, "cause": "weather_fog", "berth_change": {"from": "berth_1", "to": "berth_3"}, "confidence": 0.95, "clarifications_needed": []}

Now process the following input:
```

---

## Security & Performance

### API Key Management
- Groq API key stored in Tauri secure storage (encrypted keychain)
- No port operational data sent to Groq—only anonymized abstracts

### Rate Limiting
- Groq free tier: 30 requests/min, 14K requests/day
- Agents share token budget, queue requests during peak optimization runs

### Performance Targets

| Agent | Latency Target | Update Frequency |
|-------|---------------|-----------------|
| Disruption Parser | <2 seconds | On-demand |
| Scenario Generator | <5 seconds | On-demand |
| Optimization Insight | <3 seconds | Post-optimization |
| Predictive Resilience | <1 second | Every 5 min (background) |
| Report Synthesis | <10 seconds | On-demand |

---

## Offline Fallback

When internet unavailable:
- Agents use cached templates and rule-based fallbacks
- Disruption Parser: Simple regex-based extraction
- Optimization Insight: Pre-generated explanation templates
- Predictive Resilience: Historical pattern matching (no real-time forecasts)

---

## Development Notes

### Testing Agents

```bash
# Test disruption parser
curl -X POST https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.1-70b-versatile",
    "messages": [
      {"role": "system", "content": "You are a port operations assistant..."},
      {"role": "user", "content": "Container ship delayed 6 hours by storm"}
    ],
    "temperature": 0.2,
    "max_tokens": 1024
  }'
```

### Logging Agent Interactions

```rust
use log::{info, warn, error};

async fn call_agent(prompt: &str) -> Result<String, Error> {
    info!("Calling Groq API with prompt length: {}", prompt.len());
    
    let start = std::time::Instant::now();
    let response = groq_api_call(prompt).await?;
    let duration = start.elapsed();
    
    info!("Agent response received in {:?}", duration);
    
    if duration > std::time::Duration::from_secs(5) {
        warn!("Agent response slow: {:?}", duration);
    }
    
    Ok(response)
}
```

---

## Integration with Optimization Engine

```rust
// Main workflow
async fn handle_disruption(user_input: String) -> Result<OptimizationResult, Error> {
    // 1. Parse disruption
    let disruption = call_disruption_parser(&user_input).await?;
    
    // 2. Validate and show confirmation to user
    let confirmed = show_confirmation_dialog(disruption.clone())?;
    if !confirmed {
        return Err(Error::UserCancelled);
    }
    
    // 3. Run optimization
    let current_state = fetch_current_port_state().await?;
    let optimized_schedule = run_simulated_annealing(current_state, disruption).await?;
    
    // 4. Generate insights in parallel
    let (insights, risks, report) = tokio::join!(
        call_optimization_insight(&optimized_schedule),
        call_predictive_resilience(&optimized_schedule),
        call_report_synthesis(&optimized_schedule)
    );
    
    // 5. Return combined result
    Ok(OptimizationResult {
        schedule: optimized_schedule,
        insights: insights?,
        risks: risks?,
        report: report?,
    })
}
```

This completes the AI agents implementation documentation for Qradha.