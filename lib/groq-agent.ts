// Groq AI Agent Service for Qradha
// Implements the 5 AI agents from agents.md

import type { Disruption, OptimizationResult, PortState, Scenario, RiskAlert } from './types';

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

// Groq API Configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Model selection per agent (from agents.md)
const AGENT_MODELS = {
  disruption_parser: 'llama-3.1-70b-versatile',    // Accuracy for complex parsing
  scenario_generator: 'mixtral-8x7b-32768',         // Creative scenario generation
  optimization_insight: 'llama-3.1-70b-versatile', // Reasoning depth
  predictive_resilience: 'llama-3.1-8b-instant',   // Fast inference for real-time
  report_synthesis: 'llama-3.1-70b-versatile',     // Comprehensive synthesis
};

// Agent prompts
const PROMPTS = {
  disruption_parser: `You are an expert port operations assistant for Hamburg Port. Your task is to parse natural language disruption descriptions into structured JSON.

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
  "delay_minutes": number,
  "cause": "category",
  "berth_change": {"from": "berth_X", "to": "berth_Y"} | null,
  "confidence": 0.0-1.0,
  "clarifications_needed": ["question1", "question2"]
}

EXAMPLES:
Input: "MSC Mia delayed by 4 hours due to fog, arriving at berth 3 instead of berth 1"
Output: {"disruption_type": "vessel_delay", "vessel_id": "MSC_MIA", "delay_minutes": 240, "cause": "weather_fog", "berth_change": {"from": "berth_1", "to": "berth_3"}, "confidence": 0.95, "clarifications_needed": []}`,

  scenario_generator: `You are a port operations scenario planner for Hamburg Port. Generate realistic "what-if" scenarios to stress-test port resilience.

Based on the current port state, generate plausible disruption scenarios. Consider:
- Weather patterns (North Sea storms, fog, ice)
- Equipment failures (crane breakdowns, rail issues)
- Vessel delays (tidal misses, mechanical problems)
- Cascading effects

OUTPUT FORMAT (JSON):
{
  "scenarios": [
    {
      "scenario_id": "scenario_YYYY_MM_DD_XXX",
      "name": "Brief scenario name",
      "description": "Detailed description",
      "disruptions": [...],
      "estimated_impact": {
        "affected_containers": number,
        "rail_delays_minutes": number,
        "truck_queue_increase": "percentage%"
      },
      "probability": "low" | "moderate" | "high"
    }
  ]
}`,

  optimization_insight: `You are an optimization insights specialist for Hamburg Port's quantum-inspired optimization system.

Explain optimization decisions in operator-friendly language. For each optimization run:
1. Summarize the throughput/cost improvement achieved
2. Explain key changes (berth reassignments, crane reallocations, rail slot changes)
3. Highlight trade-offs operators should be aware of
4. Provide the "Quantum Insight" - what the algorithm discovered that wasn't obvious

Format as markdown with headers and bullet points for readability.`,

  predictive_resilience: `You are a predictive resilience agent for Hamburg Port. Monitor incoming data and anticipate disruptions.

Analyze the current port state and identify:
1. Vessels at risk of missing tidal windows
2. Potential congestion points
3. Equipment that may need attention
4. Rail capacity constraints

OUTPUT FORMAT (JSON):
{
  "risk_alerts": [
    {
      "type": "tidal_risk" | "weather_risk" | "congestion_risk" | "equipment_risk" | "rail_saturation",
      "severity": "low" | "medium" | "high" | "critical",
      "vessel": "optional vessel name",
      "message": "Human-readable alert message",
      "recommendation": "Suggested action",
      "probability": 0.0-1.0
    }
  ],
  "resilience_score": 0.0-1.0,
  "explanation": "Brief explanation of overall port resilience"
}`,

  report_synthesis: `You are a report synthesis agent for Hamburg Port. Generate executive summaries and performance reports.

Create well-formatted markdown reports including:
- Key performance metrics (throughput, energy, emissions)
- Major events and how they were handled
- Sustainability impact (CO2 saved, modal shift to rail)
- Recommendations for future operations

Use headers, bullet points, and tables for clarity.`,
};

class GroqAgent {
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
    if (typeof window !== 'undefined') {
      localStorage.setItem('groq_api_key', key);
    }
  }

  getApiKey(): string | null {
    if (this.apiKey) return this.apiKey;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('groq_api_key');
    }
    return null;
  }

  isConfigured(): boolean {
    return !!this.getApiKey();
  }

  private async callGroq(
    model: string,
    systemPrompt: string,
    userMessage: string,
    temperature: number = 0.2,
    maxTokens: number = 2048
  ): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Groq API key not configured. Please set your API key in settings.');
    }

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
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
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

      const response = await this.callGroq(
        AGENT_MODELS.disruption_parser,
        PROMPTS.disruption_parser + '\n\nCONTEXT:\n' + context,
        userInput,
        0.2,
        1024
      );

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
- Current alerts: ${portState.alerts.length}
${focus ? `\nFocus area: ${focus}` : ''}`;

      const response = await this.callGroq(
        AGENT_MODELS.scenario_generator,
        PROMPTS.scenario_generator,
        context,
        0.7,
        2048
      );

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
- Active cranes: ${portState.cranes.filter(c => c.status === 'active').length}
- Rail capacity utilization: ~60%`;

      const response = await this.callGroq(
        AGENT_MODELS.optimization_insight,
        PROMPTS.optimization_insight,
        context,
        0.3,
        1536
      );

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

Weather: Wind ${portState.weather.wind_speed_kmh}km/h, Visibility ${portState.weather.visibility_km}km, Fog probability ${(portState.weather.fog_probability * 100).toFixed(0)}%

Tides:
${portState.tides.slice(0, 3).map(t => `- ${t.type} tide at ${t.timestamp}, Height ${t.height_m}m`).join('\n')}

Current alerts: ${portState.alerts.length}`;

      const response = await this.callGroq(
        AGENT_MODELS.predictive_resilience,
        PROMPTS.predictive_resilience,
        context,
        0.2,
        1024
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse resilience analysis');
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

      const response = await this.callGroq(
        AGENT_MODELS.report_synthesis,
        PROMPTS.report_synthesis,
        context,
        0.4,
        2048
      );

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
      const systemPrompt = `You are Qradha AI, an intelligent assistant for Hamburg Port operations. You help operators:
- Understand and handle disruptions
- Interpret optimization results
- Monitor port resilience
- Generate reports and insights

Current port state:
- ${portState.vessels.length} vessels (${portState.vessels.filter(v => v.status === 'approaching').length} approaching)
- ${portState.berths.filter(b => b.status === 'available').length}/${portState.berths.length} berths available
- ${portState.trains.length} trains in system
- Resilience score: ${(portState.resilience_score * 100).toFixed(0)}%
- Active alerts: ${portState.alerts.length}

Be concise, professional, and actionable in your responses. Use markdown formatting.`;

      const apiKey = this.getApiKey();
      if (!apiKey) {
        throw new Error('Groq API key not configured');
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6), // Keep last 6 messages for context
        { role: 'user', content: message },
      ];

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AGENT_MODELS.disruption_parser,
          messages,
          temperature: 0.4,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return {
        success: true,
        data: { response: content },
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
