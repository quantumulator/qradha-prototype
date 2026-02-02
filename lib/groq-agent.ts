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

// Fallback browser-based API for development
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

class GroqAgent {
  private browserApiKey: string | null = null;
  private tauriAvailable: boolean | null = null;

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

  // Browser fallback for development mode
  private async browserFallback(
    agentType: string,
    userMessage: string,
    context?: string
  ): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Groq API key not configured. Please set your API key in settings or configure the .env file.');
    }

    const model = this.getModelForAgent(agentType);
    const temperature = this.getTemperatureForAgent(agentType);
    const systemPrompt = this.getSystemPrompt(agentType, context);

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
      throw new Error(error.error?.message || `Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private getModelForAgent(agentType: string): string {
    switch (agentType) {
      case 'disruption_parser':
      case 'optimization_insight':
      case 'report_synthesis':
        return 'llama-3.1-70b-versatile';
      case 'scenario_generator':
        return 'mixtral-8x7b-32768';
      case 'predictive_resilience':
        return 'llama-3.1-8b-instant';
      default:
        return 'llama-3.1-70b-versatile';
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
    
    switch (agentType) {
      case 'disruption_parser':
        return `You are an expert port operations assistant for Hamburg Port. Parse natural language disruption descriptions into structured JSON.

Current Context: ${portContext}

OUTPUT FORMAT (JSON only):
{
  "disruption_type": "vessel_delay" | "equipment_failure" | "weather_event" | "rail_delay",
  "vessel_id": "VESSEL_NAME",
  "delay_minutes": number,
  "cause": "category",
  "berth_change": {"from": "berth_X", "to": "berth_Y"} | null,
  "confidence": 0.0-1.0,
  "recommendations": ["action1", "action2"]
}`;

      case 'scenario_generator':
        return `You are a port operations scenario planner for Hamburg Port. Generate realistic disruption scenarios.

Current Context: ${portContext}

OUTPUT FORMAT (JSON):
{
  "scenarios": [
    {
      "scenario_id": "scenario_XXX",
      "name": "string",
      "description": "string",
      "severity": "minor" | "moderate" | "severe" | "catastrophic",
      "disruptions": [...],
      "estimated_impact": {...},
      "probability": "low" | "moderate" | "high"
    }
  ]
}`;

      case 'optimization_insight':
        return `You are an optimization analyst for Hamburg Port's quantum-inspired scheduling system. Explain optimization decisions clearly.

Current Context: ${portContext}

Provide:
1. Key improvements achieved
2. Trade-offs operators should know
3. Quantum algorithm insights
Use markdown formatting.`;

      case 'predictive_resilience':
        return `You are a predictive analytics agent for Hamburg Port. Monitor operations and anticipate disruptions.

Current Context: ${portContext}

OUTPUT FORMAT (JSON):
{
  "risk_level": "low" | "medium" | "high" | "critical",
  "risk_alerts": [...],
  "resilience_score": 0.0-1.0,
  "next_critical_window": "timestamp"
}`;

      case 'report_synthesis':
        return `You are a report generator for Hamburg Port's Qradha system. Create professional reports.

Current Context: ${portContext}

Include:
- Executive summary
- Key metrics
- Sustainability impact
- Recommendations
Use markdown formatting.`;

      default:
        return `You are Qradha, an intelligent assistant for Hamburg Port's quantum-inspired optimization system.

Current Context: ${portContext}

Help with port operations, disruptions, optimization, and sustainability.`;
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
