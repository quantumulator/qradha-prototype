// Groq AI Agent Service for Qradha
// Uses Tauri backend for secure API key handling

import type { Disruption, OptimizationResult, PortState, Scenario, RiskAlert } from './types';

// Tauri invoke helper - lazy loaded to work with SSR
let tauriInvoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;

async function getTauriInvoke() {
  if (tauriInvoke) return tauriInvoke;
  
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    try {
      const tauri = await import('@tauri-apps/api/core');
      tauriInvoke = tauri.invoke;
      return tauriInvoke;
    } catch {
      console.warn('Tauri API not available');
    }
  }
  return null;
}

// Agent Types
export interface AgentResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  latency_ms: number;
  model_used?: string;
}

export interface DisruptionParserResponse {
  disruption: Disruption;
  parsed_text: string;
}

export interface ScenarioGeneratorResponse {
  scenarios: Scenario[];
}

export interface OptimizationInsightResponse {
  insights: string;
  trade_offs: string[];
  quantum_insight: string;
}

export interface PredictiveResilienceResponse {
  risk_alerts: RiskAlert[];
  resilience_score: number;
  explanation: string;
}

export interface ReportSynthesisResponse {
  report: string;
  key_metrics: Record<string, number>;
}

// Streaming callback type
export type StreamCallback = (chunk: string, done: boolean) => void;

// Rate limiting state
interface RateLimitState {
  lastRequest: number;
  requestCount: number;
  resetTime: number;
}

// Fallback browser-based API for development
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RATE_LIMIT_REQUESTS = 25; // Groq free tier limit
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

class GroqAgent {
  private browserApiKey: string | null = null;
  private tauriAvailable: boolean | null = null;
  private rateLimitState: RateLimitState = {
    lastRequest: 0,
    requestCount: 0,
    resetTime: 0,
  };

  // Check rate limit before making request
  private checkRateLimit(): { allowed: boolean; waitMs: number } {
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now > this.rateLimitState.resetTime) {
      this.rateLimitState.requestCount = 0;
      this.rateLimitState.resetTime = now + RATE_LIMIT_WINDOW_MS;
    }
    
    if (this.rateLimitState.requestCount >= RATE_LIMIT_REQUESTS) {
      return { allowed: false, waitMs: this.rateLimitState.resetTime - now };
    }
    
    return { allowed: true, waitMs: 0 };
  }

  // Update rate limit state after request
  private recordRequest(): void {
    const now = Date.now();
    if (now > this.rateLimitState.resetTime) {
      this.rateLimitState.requestCount = 1;
      this.rateLimitState.resetTime = now + RATE_LIMIT_WINDOW_MS;
    } else {
      this.rateLimitState.requestCount++;
    }
    this.rateLimitState.lastRequest = now;
  }

  // Check if Tauri backend is available
  async checkTauriAvailable(): Promise<boolean> {
    if (this.tauriAvailable !== null) return this.tauriAvailable;
    
    const invoke = await getTauriInvoke();
    if (!invoke) {
      this.tauriAvailable = false;
      return false;
    }
    
    try {
      const hasKey = await invoke('get_groq_status') as boolean;
      this.tauriAvailable = true;
      return hasKey;
    } catch {
      this.tauriAvailable = false;
      return false;
    }
  }

  // Set API key for browser fallback (development mode)
  setApiKey(key: string) {
    this.browserApiKey = key;
    if (typeof window !== 'undefined') {
      localStorage.setItem('groq_api_key', key);
    }
  }

  // Get API key from localStorage (browser fallback)
  getApiKey(): string | null {
    if (this.browserApiKey) return this.browserApiKey;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('groq_api_key');
    }
    return null;
  }

  // Check if configured (either Tauri or browser key)
  async isConfigured(): Promise<boolean> {
    // Check Tauri first
    const tauriConfigured = await this.checkTauriAvailable();
    if (tauriConfigured) return true;
    
    // Fallback to browser key
    return !!this.getApiKey();
  }

  // Main method to call Groq - uses Tauri backend if available, browser fallback otherwise
  private async callGroq(
    agentType: string,
    userMessage: string,
    context?: string
  ): Promise<string> {
    const invoke = await getTauriInvoke();
    
    // Try Tauri backend first
    if (invoke) {
      try {
        const response = await invoke('call_groq_agent', {
          agentType,
          userMessage,
          context: context || null,
        }) as string;
        return response;
      } catch (error) {
        console.warn('Tauri Groq call failed, falling back to browser:', error);
        // Fall through to browser fallback
      }
    }
    
    // Browser fallback for development
    return this.browserFallback(agentType, userMessage, context);
  }

  // Streaming method for real-time response
  async callGroqStreaming(
    agentType: string,
    userMessage: string,
    onChunk: StreamCallback,
    context?: string
  ): Promise<void> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Groq API key not configured.');
    }

    // Check rate limit
    const { allowed, waitMs } = this.checkRateLimit();
    if (!allowed) {
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitMs / 1000)} seconds.`);
    }

    const model = this.getModelForAgent(agentType);
    const temperature = this.getTemperatureForAgent(agentType);
    const systemPrompt = this.getSystemPrompt(agentType, context);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature,
          max_tokens: 2048,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Groq API error: ${response.status}`);
      }

      this.recordRequest();

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          onChunk('', true);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content, false);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }

  // Browser fallback for development mode with retry logic
  private async browserFallback(
    agentType: string,
    userMessage: string,
    context?: string,
    retryCount = 0
  ): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Groq API key not configured. Please set your API key in settings or configure the .env file.');
    }

    // Check rate limit
    const { allowed, waitMs } = this.checkRateLimit();
    if (!allowed) {
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, waitMs));
        return this.browserFallback(agentType, userMessage, context, retryCount + 1);
      }
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const model = this.getModelForAgent(agentType);
    const temperature = this.getTemperatureForAgent(agentType);
    const systemPrompt = this.getSystemPrompt(agentType, context);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const errorMessage = error.error?.message || `Groq API error: ${response.status}`;
        
        // Retry on rate limit or server errors
        if ((response.status === 429 || response.status >= 500) && retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
          console.warn(`Groq API error (${response.status}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.browserFallback(agentType, userMessage, context, retryCount + 1);
        }
        
        throw new Error(errorMessage);
      }

      this.recordRequest();
      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      // Retry on network errors
      if (error instanceof TypeError && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
        console.warn(`Network error, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.browserFallback(agentType, userMessage, context, retryCount + 1);
      }
      throw error;
    }
  }

  private getModelForAgent(agentType: string): string {
    switch (agentType) {
      case 'disruption_parser':
      case 'optimization_insight':
      case 'report_synthesis':
      case 'scenario_generator':
        return 'llama-3.3-70b-versatile';
      case 'predictive_resilience':
        return 'llama-3.1-8b-instant';
      default:
        return 'llama-3.3-70b-versatile';
    }
  }

  private getTemperatureForAgent(agentType: string): number {
    switch (agentType) {
      case 'disruption_parser':
      case 'predictive_resilience':
        return 0.2;
      case 'optimization_insight':
        return 0.3;
      case 'report_synthesis':
        return 0.4;
      case 'scenario_generator':
        return 0.7;
      default:
        return 0.5;
    }
  }

  private getSystemPrompt(agentType: string, context?: string): string {
    const portContext = context || 'Port of Hamburg - Current operations normal';
    const currentTime = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
    
    switch (agentType) {
      case 'disruption_parser':
        return `You are an expert maritime operations analyst for the Port of Hamburg (HHLA). Your task is to parse natural language disruption descriptions into structured JSON for the Qradha quantum-inspired optimization system.

CURRENT PORT STATE:
${portContext}
Timestamp: ${currentTime} (CET)

RULES:
1. Extract vessel identifiers (name, IMO number if mentioned)
2. Calculate delay in minutes from original ETA/ETD
3. Categorize cause: weather_fog, weather_storm, weather_ice, mechanical_failure, tidal_miss, congestion, customs_delay, labor_strike, crane_failure, rail_delay, other
4. Identify any berth changes mentioned
5. Set confidence score (0.0-1.0) based on input clarity
6. Provide actionable recommendations for operators
7. If information is ambiguous, include clarifying questions

OUTPUT FORMAT (JSON only, no additional text):
{
  "disruption_type": "vessel_delay" | "equipment_failure" | "weather_event" | "rail_delay" | "tidal_miss",
  "vessel_id": "VESSEL_NAME_OR_ID",
  "original_eta": "ISO8601_timestamp_if_known",
  "new_eta": "ISO8601_timestamp_if_known",
  "delay_minutes": number,
  "cause": "category_from_list_above",
  "severity": "minor" | "moderate" | "severe" | "critical",
  "berth_change": {"from": "berth_X", "to": "berth_Y"} | null,
  "affected_cargo_teu": number | null,
  "confidence": 0.0-1.0,
  "recommendations": ["action1", "action2", "action3"],
  "clarifications_needed": ["question1", "question2"]
}`;

      case 'scenario_generator':
        return `You are a port operations scenario planner and risk analyst for Hamburg Port (HHLA). Generate realistic "what-if" disruption scenarios to stress-test port resilience using the Qradha quantum optimization system.

CURRENT PORT STATE:
${portContext}
Timestamp: ${currentTime} (CET)

SCENARIO DESIGN PRINCIPLES:
1. Base scenarios on real-world maritime events (North Sea storms, Elbe river navigation challenges, seasonal ice, labor actions)
2. Consider cascading effects (vessel delay → berth conflict → crane reallocation → rail congestion → truck queue)
3. Include Hamburg-specific factors: tidal windows (6h cycles), draft restrictions (Elbe 14-15m), Burchardkai/CTB terminal interactions
4. Weight probabilities by historical patterns and current conditions
5. Generate diverse severity levels to test system response

OUTPUT FORMAT (JSON):
{
  "scenarios": [
    {
      "scenario_id": "scenario_YYYYMMDD_NNN",
      "name": "Short descriptive name",
      "description": "Detailed narrative of what happens and why",
      "severity": "minor" | "moderate" | "severe" | "catastrophic",
      "trigger_time": "ISO8601_timestamp",
      "disruptions": [
        {"type": "disruption_type", "target": "entity_id", "impact": "description", "duration_hours": number}
      ],
      "cascade_effects": ["effect1", "effect2"],
      "estimated_impact": {
        "affected_vessels": number,
        "delayed_containers_teu": number,
        "rail_delays_minutes": number,
        "truck_queue_increase_percent": number,
        "estimated_revenue_loss_eur": number
      },
      "probability": "low" | "moderate" | "high",
      "mitigation_options": ["option1", "option2"]
    }
  ]
}`;

      case 'optimization_insight':
        return `You are an optimization analyst for Hamburg Port's Qradha quantum-inspired scheduling system. Your role is to explain complex optimization decisions in clear, operator-friendly language.

OPTIMIZATION CONTEXT:
${portContext}
Timestamp: ${currentTime} (CET)

YOUR RESPONSIBILITIES:
1. Translate mathematical optimization outputs into actionable insights
2. Explain WHY specific berth/crane/rail assignments were chosen
3. Highlight trade-offs operators need to understand
4. Identify unexpected solutions the quantum-inspired algorithm discovered
5. Warn about solution fragility (tight margins, high sensitivity to further disruptions)
6. Quantify benefits in practical terms (TEU throughput, hours saved, € cost, CO2 emissions)

OUTPUT FORMAT (Markdown):
## Optimization Summary

**Key Achievement:** [One-line impact statement]

### Changes Made
1. **[Change Category]:** [Description with specific entities and numbers]
2. ...

### Trade-offs
- [Trade-off 1 with quantified impact]
- [Trade-off 2]

### Quantum Algorithm Insight
[Explain any non-obvious solutions discovered through simulated annealing/tensor network optimization]

### Risk Warnings
[Any tight margins or sensitivities operators should monitor]`;

      case 'predictive_resilience':
        return `You are a predictive analytics agent for Hamburg Port's Qradha system. Monitor real-time operations and anticipate disruptions before they cascade.

CURRENT PORT STATE:
${portContext}
Timestamp: ${currentTime} (CET)

MONITORING PRIORITIES:
1. Tidal window risks (vessels with tight ETA margins)
2. Weather-related delays (fog, storm, ice for Elbe navigation)
3. Berth congestion patterns
4. Rail slot saturation
5. Crane availability bottlenecks
6. Truck gate queue buildup

RESILIENCE SCORING:
- 0.0-0.3: Critical (cascading failures likely)
- 0.3-0.5: Poor (significant disruption risk)
- 0.5-0.7: Moderate (some buffer capacity)
- 0.7-0.9: Good (healthy slack in system)
- 0.9-1.0: Excellent (robust to multiple disruptions)

OUTPUT FORMAT (JSON):
{
  "risk_level": "low" | "medium" | "high" | "critical",
  "risk_alerts": [
    {
      "type": "tidal_risk" | "weather_risk" | "congestion_risk" | "equipment_risk" | "rail_saturation",
      "entity": "vessel_or_berth_or_crane_id",
      "description": "What might happen",
      "probability": 0.0-1.0,
      "time_window": "when this could occur",
      "recommendation": "Proactive action to take"
    }
  ],
  "resilience_score": 0.0-1.0,
  "resilience_breakdown": {
    "berth_capacity": 0.0-1.0,
    "crane_availability": 0.0-1.0,
    "rail_capacity": 0.0-1.0,
    "tidal_flexibility": 0.0-1.0
  },
  "next_critical_window": "ISO8601_timestamp",
  "explanation": "Natural language summary for operators"
}`;

      case 'report_synthesis':
        return `You are a professional report generator for Hamburg Port's Qradha quantum optimization system. Create executive-quality reports suitable for port authority leadership, shipping line partners, and sustainability auditors.

REPORT CONTEXT:
${portContext}
Generated: ${currentTime} (CET)

REPORT STANDARDS:
1. Lead with executive summary (3-4 sentences)
2. Present metrics in clear tables
3. Compare performance to baselines and targets
4. Highlight sustainability impact (CO2, modal shift, energy efficiency)
5. Include specific vessel/berth examples where relevant
6. Provide forward-looking recommendations
7. Use professional maritime terminology

OUTPUT FORMAT (Markdown):
## Qradha Performance Report

### Executive Summary
[3-4 sentence overview with key numbers]

### Key Performance Metrics
| Metric | Value | vs. Target | vs. Baseline |
|--------|-------|------------|--------------|
| ... | ... | ... | ... |

### Operational Highlights
1. **[Topic]:** [Details with specific examples]
2. ...

### Disruptions Handled
[List major disruptions and how Qradha responded]

### Sustainability Impact
- CO2 Emissions Avoided: [X] tons
- Rail Modal Share: [X]% (target: 50%)
- Energy Reduction: [X]%

### Recommendations
1. [Forward-looking recommendation]
2. ...`;

      default:
        return `You are Qradha, an intelligent AI assistant for Hamburg Port's quantum-inspired optimization system. You help port operators, planners, and managers with:

1. **Disruption Management:** Parsing and responding to vessel delays, equipment failures, weather events
2. **Optimization Insights:** Explaining how quantum-inspired algorithms improve berth/crane/rail assignments
3. **Predictive Analytics:** Anticipating risks and recommending proactive measures
4. **Sustainability:** Tracking CO2 reduction, rail modal shift, energy optimization
5. **Reporting:** Generating professional reports for stakeholders

CURRENT PORT STATE:
${portContext}
Timestamp: ${currentTime} (CET)

COMMUNICATION STYLE:
- Professional but approachable
- Use maritime terminology correctly
- Provide specific, actionable recommendations
- Quantify impacts when possible
- Acknowledge uncertainty when appropriate

You represent cutting-edge port technology combining quantum computing concepts with AI to achieve Europe's most efficient container terminal operations.`;
    }
  }

  // Disruption Parser Agent
  async parseDisruption(
    userInput: string,
    portState: PortState
  ): Promise<AgentResponse<DisruptionParserResponse>> {
    const startTime = Date.now();
    
    try {
      const context = `Current vessels: ${portState.vessels.map(v => v.name).join(', ')}
Current berths: ${portState.berths.map(b => b.name).join(', ')}
Current time: ${new Date().toISOString()}`;

      const response = await this.callGroq('disruption_parser', userInput, context);

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse agent response as JSON');
      }

      const disruption = JSON.parse(jsonMatch[0]) as Disruption;

      return {
        success: true,
        data: {
          disruption,
          parsed_text: response,
        },
        latency_ms: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency_ms: Date.now() - startTime,
      };
    }
  }

  // Scenario Generator Agent
  async generateScenarios(
    portState: PortState,
    focus?: string
  ): Promise<AgentResponse<ScenarioGeneratorResponse>> {
    const startTime = Date.now();
    
    try {
      const context = `Current port state:
- Vessels: ${portState.vessels.length} (${portState.vessels.filter(v => v.status === 'approaching').length} approaching)
- Berths: ${portState.berths.filter(b => b.status === 'available').length}/${portState.berths.length} available
- Weather: Wind ${portState.weather.wind_speed_kmh}km/h, Visibility ${portState.weather.visibility_km}km
- Next tide: ${portState.tides[0]?.type} at ${portState.tides[0]?.timestamp}
${focus ? `\nFocus area: ${focus}` : ''}`;

      const response = await this.callGroq('scenario_generator', context);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse scenarios');
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        data: { scenarios: result.scenarios || [] },
        latency_ms: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency_ms: Date.now() - startTime,
      };
    }
  }

  // Optimization Insight Agent
  async generateInsights(
    optimization: OptimizationResult,
    portState: PortState
  ): Promise<AgentResponse<OptimizationInsightResponse>> {
    const startTime = Date.now();
    
    try {
      const context = `Optimization result:
- Cost before: €${optimization.cost_before.toFixed(0)}
- Cost after: €${optimization.cost_after.toFixed(0)}
- Improvement: ${optimization.improvement_percent.toFixed(1)}%
- Runtime: ${optimization.runtime_ms}ms
- Changes made: ${JSON.stringify(optimization.changes, null, 2)}

Port context:
- Total vessels: ${portState.vessels.length}
- Active cranes: ${portState.cranes.filter(c => c.status === 'active').length}`;

      const response = await this.callGroq('optimization_insight', context);

      return {
        success: true,
        data: {
          insights: response,
          trade_offs: [],
          quantum_insight: '',
        },
        latency_ms: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency_ms: Date.now() - startTime,
      };
    }
  }

  // Predictive Resilience Agent
  async analyzeResilience(
    portState: PortState
  ): Promise<AgentResponse<PredictiveResilienceResponse>> {
    const startTime = Date.now();
    
    try {
      const context = `Current port state:
Vessels:
${portState.vessels.map(v => `- ${v.name}: ${v.status}, ETA ${v.eta}, Draft ${v.draft_meters}m`).join('\n')}

Berths:
${portState.berths.map(b => `- ${b.name}: ${b.status}, Depth ${b.depth_meters}m, Utilization ${b.utilization}%`).join('\n')}

Weather: Wind ${portState.weather.wind_speed_kmh}km/h, Visibility ${portState.weather.visibility_km}km

Tides:
${portState.tides.slice(0, 3).map(t => `- ${t.type} tide at ${t.timestamp}, Height ${t.height_m}m`).join('\n')}`;

      const response = await this.callGroq('predictive_resilience', context);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Return a basic response if JSON parsing fails
        return {
          success: true,
          data: {
            risk_alerts: [],
            resilience_score: 0.7,
            explanation: response,
          },
          latency_ms: Date.now() - startTime,
        };
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        data: {
          risk_alerts: result.risk_alerts || [],
          resilience_score: result.resilience_score || 0.5,
          explanation: result.explanation || '',
        },
        latency_ms: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency_ms: Date.now() - startTime,
      };
    }
  }

  // Report Synthesis Agent
  async generateReport(
    portState: PortState,
    timeRange: { start: string; end: string },
    optimizations: OptimizationResult[]
  ): Promise<AgentResponse<ReportSynthesisResponse>> {
    const startTime = Date.now();
    
    try {
      const context = `Report period: ${timeRange.start} to ${timeRange.end}

Port Operations Summary:
- Total vessels handled: ${portState.vessels.length}
- Average berth utilization: ${(portState.berths.reduce((a, b) => a + b.utilization, 0) / portState.berths.length).toFixed(0)}%
- Active cranes: ${portState.cranes.filter(c => c.status === 'active').length}/${portState.cranes.length}

Optimization runs: ${optimizations.length}
${optimizations.length > 0 ? `- Average improvement: ${(optimizations.reduce((a, b) => a + b.improvement_percent, 0) / optimizations.length).toFixed(1)}%` : ''}

Current resilience score: ${portState.resilience_score.toFixed(2)}`;

      const response = await this.callGroq('report_synthesis', context);

      return {
        success: true,
        data: {
          report: response,
          key_metrics: {
            vessels_handled: portState.vessels.length,
            avg_utilization: portState.berths.reduce((a, b) => a + b.utilization, 0) / portState.berths.length,
            resilience_score: portState.resilience_score,
          },
        },
        latency_ms: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency_ms: Date.now() - startTime,
      };
    }
  }

  // General chat with context
  async chat(
    message: string,
    portState: PortState,
    history: { role: 'user' | 'assistant'; content: string }[] = []
  ): Promise<AgentResponse<{ response: string }>> {
    const startTime = Date.now();
    
    try {
      const context = `Port state:
- ${portState.vessels.length} vessels (${portState.vessels.filter(v => v.status === 'approaching').length} approaching)
- ${portState.berths.filter(b => b.status === 'available').length}/${portState.berths.length} berths available
- ${portState.trains.length} trains in system
- Resilience score: ${(portState.resilience_score * 100).toFixed(0)}%
- Active alerts: ${portState.alerts.length}

Chat history:
${history.slice(-4).map(h => `${h.role}: ${h.content}`).join('\n')}`;

      const response = await this.callGroq('chat', message, context);

      return {
        success: true,
        data: { response },
        latency_ms: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency_ms: Date.now() - startTime,
      };
    }
  }
}

// Singleton instance
export const groqAgent = new GroqAgent();
