// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use serde::{Deserialize, Serialize};
use once_cell::sync::Lazy;

// Groq API configuration
static GROQ_API_KEY: Lazy<String> = Lazy::new(|| {
    // Try .env file first, then system environment
    dotenv::dotenv().ok();
    env::var("GROQ_API_KEY").unwrap_or_default()
});

const GROQ_API_URL: &str = "https://api.groq.com/openai/v1/chat/completions";

#[derive(Debug, Serialize, Deserialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct GroqRequest {
    model: String,
    messages: Vec<Message>,
    temperature: f32,
    max_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct GroqChoice {
    message: Message,
}

#[derive(Debug, Deserialize)]
struct GroqResponse {
    choices: Vec<GroqChoice>,
}

/// Get the AI API key status (not the actual key for security)
#[tauri::command]
fn get_groq_status() -> Result<bool, String> {
    let key = GROQ_API_KEY.as_str();
    Ok(!key.is_empty() && key.starts_with("gsk_"))
}

/// Call AI API with the specified agent type
#[tauri::command]
async fn call_groq_agent(
    agent_type: String,
    user_message: String,
    context: Option<String>,
) -> Result<String, String> {
    let api_key = GROQ_API_KEY.as_str();
    
    if api_key.is_empty() {
        return Err("AI API key not configured. Please set it in .env file.".to_string());
    }

    // Select model based on agent type - Updated to current Groq models (2026)
    let (model, temperature) = match agent_type.as_str() {
        "disruption_parser" => ("llama-3.3-70b-versatile", 0.2),
        "scenario_generator" => ("llama-3.3-70b-versatile", 0.7),
        "optimization_insight" => ("llama-3.3-70b-versatile", 0.3),
        "predictive_resilience" => ("llama-3.1-8b-instant", 0.2),
        "report_synthesis" => ("llama-3.3-70b-versatile", 0.4),
        _ => ("llama-3.3-70b-versatile", 0.5),
    };

    // Build system prompt based on agent type
    let system_prompt = get_system_prompt(&agent_type, context.as_deref());

    let request = GroqRequest {
        model: model.to_string(),
        messages: vec![
            Message {
                role: "system".to_string(),
                content: system_prompt,
            },
            Message {
                role: "user".to_string(),
                content: user_message,
            },
        ],
        temperature,
        max_tokens: 2048,
    };

    let client = reqwest::Client::new();
    
    let response = client
        .post(GROQ_API_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Groq API error ({}): {}", status, error_text));
    }

    let groq_response: GroqResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    groq_response
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .ok_or_else(|| "No response from Groq".to_string())
}

fn get_system_prompt(agent_type: &str, context: Option<&str>) -> String {
    let port_context = context.unwrap_or("Port of Hamburg - Current operations normal");
    
    match agent_type {
        "disruption_parser" => format!(
            r#"You are an expert port operations assistant for the Port of Hamburg. Parse natural language disruption descriptions into structured JSON.

Current Context: {}

RULES:
1. Extract vessel identifiers (name, IMO number if mentioned)
2. Calculate delay in minutes from original ETA
3. Categorize cause: weather_fog, weather_storm, weather_ice, mechanical_failure, tidal_miss, congestion, customs_delay, other
4. Identify any berth changes mentioned
5. Set confidence score (0.0-1.0) based on clarity of input

OUTPUT FORMAT (JSON only):
{{
  "disruption_type": "vessel_delay" | "equipment_failure" | "weather_event" | "rail_delay",
  "vessel_id": "VESSEL_NAME",
  "delay_minutes": number,
  "cause": "category",
  "berth_change": {{"from": "berth_X", "to": "berth_Y"}} | null,
  "confidence": 0.0-1.0,
  "recommendations": ["action1", "action2"]
}}"#,
            port_context
        ),
        
        "scenario_generator" => format!(
            r#"You are a port operations scenario planner for the Port of Hamburg. Generate realistic disruption scenarios for stress-testing port resilience.

Current Context: {}

Create plausible scenarios based on:
- Historical disruption patterns
- Weather events (fog, storms, ice)
- Equipment failures
- Tidal constraints
- Rail/truck congestion

OUTPUT FORMAT (JSON):
{{
  "scenario_name": "string",
  "description": "string",
  "severity": "minor" | "moderate" | "severe" | "catastrophic",
  "disruptions": [{{...}}],
  "estimated_impact": {{
    "affected_containers": number,
    "delay_hours": number,
    "cost_estimate_eur": number
  }},
  "probability": "low" | "moderate" | "high"
}}"#,
            port_context
        ),
        
        "optimization_insight" => format!(
            r#"You are an optimization analyst for the Port of Hamburg's quantum-inspired scheduling system. Explain optimization decisions in clear, operator-friendly language.

Current Context: {}

When explaining optimizations:
1. Highlight key trade-offs (time vs energy vs cost)
2. Explain why specific berth/crane/rail assignments were chosen
3. Identify CO2 savings and sustainability benefits
4. Warn about solution fragility or tight margins
5. Suggest contingency plans

Use bullet points and clear headers. Include specific numbers when available."#,
            port_context
        ),
        
        "predictive_resilience" => format!(
            r#"You are a predictive analytics agent for the Port of Hamburg. Monitor operations and anticipate disruptions.

Current Context: {}

Analyze:
1. Weather forecasts and tidal windows
2. Vessel arrival patterns
3. Equipment utilization rates
4. Rail/truck capacity trends

OUTPUT FORMAT (JSON):
{{
  "risk_level": "low" | "medium" | "high" | "critical",
  "risk_alerts": [{{
    "type": "string",
    "description": "string",
    "probability": 0.0-1.0,
    "recommendation": "string"
  }}],
  "resilience_score": 0.0-1.0,
  "next_critical_window": "ISO timestamp"
}}"#,
            port_context
        ),
        
        "report_synthesis" => format!(
            r#"You are a report generator for the Port of Hamburg's Qradha optimization system. Create professional reports for stakeholders.

Current Context: {}

Generate reports with:
1. Executive summary
2. Key performance indicators (KPIs)
3. Disruptions handled and their resolution
4. Sustainability metrics (CO2 saved, modal shift)
5. Recommendations for improvement

Use Markdown formatting with headers, bullet points, and tables where appropriate."#,
            port_context
        ),
        
        _ => format!(
            r#"You are Qradha, an intelligent assistant for the Port of Hamburg's quantum-inspired port optimization system. You help operators manage vessel scheduling, berth allocation, crane operations, and rail coordination.

Current Context: {}

Provide helpful, concise answers about:
- Port operations and logistics
- Disruption handling
- Schedule optimization
- Sustainability and emissions
- Equipment and resource management

Be professional, accurate, and actionable in your responses."#,
            port_context
        ),
    }
}

fn main() {
    // Load .env file at startup
    dotenv::dotenv().ok();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_groq_status,
            call_groq_agent,
        ])
        .setup(|_app| {
            // Log API key status on startup (not the key itself)
            let has_key = !GROQ_API_KEY.is_empty();
            println!("Qradha starting... Groq API configured: {}", has_key);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
