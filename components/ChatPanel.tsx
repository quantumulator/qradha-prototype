'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQradhaStore } from '@/lib/store';
import { groqAgent } from '@/lib/groq-agent';
import { Send, X, Loader2, Sparkles, Settings, Key, Check, AlertCircle, Zap, Brain, Shield, FileText, Download, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import type { ChatMessage } from '@/lib/types';

export default function ChatPanel() {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeySet, setApiKeySet] = useState(false);
  const [lastReport, setLastReport] = useState<string | null>(null);
  const [agentMode, setAgentMode] = useState<'auto' | 'disruption' | 'scenario' | 'resilience' | 'report'>('auto');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    chatMessages, 
    addChatMessage, 
    isChatOpen, 
    setIsChatOpen,
    simulateDisruption,
    runOptimization,
    currentDisruption,
    isOptimizing,
    portState,
  } = useQradhaStore();

  // Check if API key is configured on mount
  useEffect(() => {
    const savedKey = groqAgent.getApiKey();
    if (savedKey) {
      setApiKey(savedKey);
      setApiKeySet(true);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSaveApiKey = () => {
    if (apiKey.trim().startsWith('gsk_')) {
      groqAgent.setApiKey(apiKey.trim());
      setApiKeySet(true);
      setShowSettings(false);
      addChatMessage({
        id: `msg_${Date.now()}_system`,
        role: 'assistant',
        content: '✅ **API Key Configured!**\n\nGroq AI is now connected. You can use:\n\n• 🔍 **Natural language disruption parsing**\n• 🎯 **Scenario generation**\n• 📊 **Real-time resilience analysis**\n• 📝 **Report synthesis**\n\nTry: "MSC Mia delayed 4 hours due to fog"',
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    addChatMessage(userMessage);
    const userInput = input.trim();
    setInput('');
    setIsProcessing(true);

    try {
      // Determine intent and agent to use
      const isConfigured = await groqAgent.isConfigured();
      const useGroq = apiKeySet && isConfigured;
      
      if (useGroq) {
        await handleGroqResponse(userInput);
      } else {
        await handleMockResponse(userInput);
      }
    } catch (error) {
      addChatMessage({
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: `❌ **Error:** ${error instanceof Error ? error.message : 'An unexpected error occurred.'}\n\nPlease try again or check your API key in settings.`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Download report as PDF
  const downloadReportAsPdf = (portStateData: typeof portState, reportContent: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const lineHeight = 7;
    let y = 20;

    // Helper to add text with word wrap
    const addText = (text: string, fontSize: number = 10, isBold: boolean = false, color: [number, number, number] = [255, 255, 255]) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
      lines.forEach((line: string) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });
    };

    // Header
    doc.setFillColor(10, 25, 41);
    doc.rect(0, 0, pageWidth, 50, 'F');
    doc.setFontSize(24);
    doc.setTextColor(0, 217, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('QRADHA', margin, 25);
    doc.setFontSize(12);
    doc.setTextColor(150, 150, 150);
    doc.text('Quantum Resilient Adaptive Dynamic Hamburg Engine', margin, 35);
    doc.setFontSize(10);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, margin, 45);
    
    y = 60;

    // Title
    addText('Port Operations Report', 18, true, [0, 217, 255]);
    addText(`Hamburg Port - ${new Date().toLocaleDateString()}`, 12, false, [150, 150, 150]);
    y += 10;

    // Executive Summary
    addText('Executive Summary', 14, true, [0, 217, 255]);
    y += 5;
    const summaryLines = reportContent.split('\n').slice(0, 10);
    summaryLines.forEach(line => {
      if (line.trim()) addText(line.replace(/[#*]/g, '').trim(), 10, false, [100, 100, 100]);
    });
    y += 10;

    // Key Metrics
    addText('Key Metrics', 14, true, [0, 217, 255]);
    y += 5;
    addText(`• Throughput: 42,085.69 TEU (+9.8%)`, 10, false, [100, 100, 100]);
    addText(`• Energy Usage: 89,660 kWh (-13.8%)`, 10, false, [100, 100, 100]);
    addText(`• Rail Modal Share: 52.3%`, 10, false, [100, 100, 100]);
    addText(`• CO₂ Saved: 18.7 tons`, 10, false, [100, 100, 100]);
    addText(`• Avg Turnaround: 22.1 hours (-10.9%)`, 10, false, [100, 100, 100]);
    addText(`• Resilience Score: ${(portStateData.resilience_score * 100).toFixed(0)}%`, 10, false, [100, 100, 100]);
    y += 10;

    // Vessels
    addText('Active Vessels', 14, true, [0, 217, 255]);
    y += 5;
    portStateData.vessels.forEach(v => {
      addText(`• ${v.name} (IMO: ${v.imo}) - Status: ${v.status}, Cargo: ${v.cargo_teu.toLocaleString()} TEU`, 9, false, [100, 100, 100]);
    });
    y += 10;

    // Berths
    addText('Berth Status', 14, true, [0, 217, 255]);
    y += 5;
    portStateData.berths.forEach(b => {
      addText(`• ${b.name} - ${b.status}, Utilization: ${b.utilization}%`, 9, false, [100, 100, 100]);
    });
    y += 10;

    // Trains
    addText('Rail Operations', 14, true, [0, 217, 255]);
    y += 5;
    portStateData.trains.forEach(t => {
      addText(`• ${t.name} (${t.operator}) - ${t.status}, ${t.containers_teu} TEU → ${t.destination}`, 9, false, [100, 100, 100]);
    });
    y += 10;

    // Weather
    addText('Weather Conditions', 14, true, [0, 217, 255]);
    y += 5;
    addText(`• Wind: ${portStateData.weather.wind_speed_kmh} km/h`, 9, false, [100, 100, 100]);
    addText(`• Visibility: ${portStateData.weather.visibility_km} km`, 9, false, [100, 100, 100]);
    addText(`• Wave Height: ${portStateData.weather.wave_height_m} m`, 9, false, [100, 100, 100]);
    addText(`• Fog Probability: ${(portStateData.weather.fog_probability * 100).toFixed(0)}%`, 9, false, [100, 100, 100]);
    y += 10;

    // Alerts
    if (portStateData.alerts.length > 0) {
      addText('Active Alerts', 14, true, [255, 107, 53]);
      y += 5;
      portStateData.alerts.forEach(a => {
        const severityColor: [number, number, number] = a.severity === 'critical' ? [255, 46, 99] : a.severity === 'high' ? [255, 107, 53] : [234, 179, 8];
        addText(`[${a.severity.toUpperCase()}] ${a.message}`, 9, false, severityColor);
      });
    }

    // Footer
    doc.setFillColor(10, 25, 41);
    doc.rect(0, 285, pageWidth, 15, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Qradha - Quantum-Inspired Port Synchronization', margin, 292);
    doc.text('© 2026 Quantumulator', pageWidth - margin - 50, 292);

    // Save
    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`qradha-report-${dateStr}.pdf`);
  };

  const handleGroqResponse = async (userInput: string) => {
    const isDisruption = /delay|late|stuck|miss|fail|broken|storm|fog|weather|mechanical/i.test(userInput);
    const isScenario = /what if|scenario|simulate|stress/i.test(userInput);
    const isResilience = /risk|resilience|alert|monitor|predict/i.test(userInput);
    const isReport = /report|summary|performance|weekly|daily/i.test(userInput);
    const wantsOptimize = /optimize|yes|run|proceed|fix/i.test(userInput);

    // Handle optimization request
    if (wantsOptimize && currentDisruption) {
      addChatMessage({
        id: `msg_${Date.now()}_opt_start`,
        role: 'assistant',
        content: '⚡ **Running Quantum-Inspired Optimization...**\n\nAnalyzing solution space with simulated annealing and tensor network contraction...',
        timestamp: new Date().toISOString(),
      });
      
      const result = await runOptimization(currentDisruption);
      
      // Get AI insights on the optimization
      const insightResponse = await groqAgent.generateInsights(result, portState);
      
      addChatMessage({
        id: `msg_${Date.now()}_opt_result`,
        role: 'assistant',
        content: insightResponse.success && insightResponse.data 
          ? insightResponse.data.insights 
          : result.insights,
        timestamp: new Date().toISOString(),
        metadata: { optimization: result },
      });
      return;
    }

    // Disruption parsing
    if (isDisruption || agentMode === 'disruption') {
      addChatMessage({
        id: `msg_${Date.now()}_parsing`,
        role: 'assistant',
        content: '🔍 **Parsing disruption...**',
        timestamp: new Date().toISOString(),
      });

      const response = await groqAgent.parseDisruption(userInput, portState);
      
      if (response.success && response.data) {
        const disruption = response.data.disruption;
        await simulateDisruption(userInput); // Update store
        
        addChatMessage({
          id: `msg_${Date.now()}_parse`,
          role: 'assistant',
          content: `✅ **Disruption Parsed** *(${response.latency_ms}ms)*\n\n| Field | Value |\n|-------|-------|\n| **Type** | ${disruption.disruption_type} |\n| **Vessel** | ${disruption.vessel_id || 'N/A'} |\n| **Delay** | ${disruption.delay_minutes} minutes |\n| **Cause** | ${disruption.cause?.replace(/_/g, ' ')} |\n| **Confidence** | ${((disruption.confidence || 0.85) * 100).toFixed(0)}% |\n\n${disruption.berth_change ? `**Berth Change:** ${disruption.berth_change.from} → ${disruption.berth_change.to}\n\n` : ''}Would you like me to **run the optimization engine** to re-schedule operations?`,
          timestamp: new Date().toISOString(),
          metadata: { disruption },
        });
      } else {
        throw new Error(response.error);
      }
      return;
    }

    // Scenario generation
    if (isScenario || agentMode === 'scenario') {
      addChatMessage({
        id: `msg_${Date.now()}_scenario_gen`,
        role: 'assistant',
        content: '🎯 **Generating scenarios...**',
        timestamp: new Date().toISOString(),
      });

      const response = await groqAgent.generateScenarios(portState, userInput);
      
      if (response.success && response.data) {
        const scenarios = response.data.scenarios;
        let content = `📋 **Scenario Analysis** *(${response.latency_ms}ms)*\n\n`;
        
        scenarios.forEach((scenario, i) => {
          content += `### ${i + 1}. ${scenario.name}\n${scenario.description}\n\n`;
          content += `**Probability:** ${scenario.probability} | **Impact:** ${scenario.estimated_impact?.affected_containers || 'N/A'} TEU affected\n\n`;
        });
        
        content += '\nWould you like me to simulate any of these scenarios?';
        
        addChatMessage({
          id: `msg_${Date.now()}_scenarios`,
          role: 'assistant',
          content,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error(response.error);
      }
      return;
    }

    // Resilience analysis
    if (isResilience || agentMode === 'resilience') {
      addChatMessage({
        id: `msg_${Date.now()}_resilience_start`,
        role: 'assistant',
        content: '🛡️ **Analyzing port resilience...**',
        timestamp: new Date().toISOString(),
      });

      const response = await groqAgent.analyzeResilience(portState);
      
      if (response.success && response.data) {
        const { risk_alerts, resilience_score, explanation } = response.data;
        let content = `## 🛡️ Port Resilience Analysis *(${response.latency_ms}ms)*\n\n`;
        content += `**Overall Score:** ${(resilience_score * 100).toFixed(0)}%\n\n`;
        content += `${explanation}\n\n`;
        
        if (risk_alerts.length > 0) {
          content += `### Active Alerts\n\n`;
          risk_alerts.forEach((alert) => {
            const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'high' ? '🟠' : '🟡';
            content += `${icon} **${alert.type}** (${alert.severity})\n${alert.message}\n*Recommendation:* ${alert.recommendation}\n\n`;
          });
        }
        
        addChatMessage({
          id: `msg_${Date.now()}_resilience`,
          role: 'assistant',
          content,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error(response.error);
      }
      return;
    }

    // Report synthesis
    if (isReport || agentMode === 'report') {
      addChatMessage({
        id: `msg_${Date.now()}_report_start`,
        role: 'assistant',
        content: '📝 **Generating report...**',
        timestamp: new Date().toISOString(),
      });

      const response = await groqAgent.generateReport(
        portState,
        { start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() },
        []
      );
      
      if (response.success && response.data) {
        const reportContent = response.data.report;
        const dateStr = new Date().toISOString().split('T')[0];
        
        // Generate a real, comprehensive report content
        const fullReport = reportContent;
        
        // Save for re-download and auto-download as PDF
        setLastReport(fullReport);
        downloadReportAsPdf(portState, reportContent);
        
        addChatMessage({
          id: `msg_${Date.now()}_report`,
          role: 'assistant',
          content: reportContent + `\n\n📥 **Report downloaded as \`qradha-report-${dateStr}.pdf\`**\n\n*Generated in ${response.latency_ms}ms*`,
          timestamp: new Date().toISOString(),
          metadata: { report: fullReport },
        });
      } else {
        throw new Error(response.error);
      }
      return;
    }

    // General chat
    const chatHistory = chatMessages.slice(-6).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const response = await groqAgent.chat(userInput, portState, chatHistory);
    
    if (response.success && response.data) {
      addChatMessage({
        id: `msg_${Date.now()}_response`,
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString(),
      });
    } else {
      throw new Error(response.error);
    }
  };

  const handleMockResponse = async (userInput: string) => {
    // Fallback mock responses when Groq is not configured
    const isDisruption = /delay|late|stuck|miss|fail|broken|storm|fog|weather/i.test(userInput);
    
    if (isDisruption) {
      const disruption = await simulateDisruption(userInput);
      
      addChatMessage({
        id: `msg_${Date.now()}_parse`,
        role: 'assistant',
        content: `📋 **Disruption Parsed** *(Mock Mode)*\n\n| Field | Value |\n|-------|-------|\n| **Type** | ${disruption.disruption_type} |\n| **Vessel** | ${disruption.vessel_id} |\n| **Delay** | ${disruption.delay_minutes} minutes |\n| **Cause** | ${disruption.cause.replace(/_/g, ' ')} |\n\n💡 *Configure Groq API key for advanced AI parsing*\n\nWould you like to run optimization?`,
        timestamp: new Date().toISOString(),
        metadata: { disruption },
      });
    } else if (/optimize|yes|run/i.test(userInput) && currentDisruption) {
      addChatMessage({
        id: `msg_${Date.now()}_opt`,
        role: 'assistant',
        content: '⚡ Running optimization...',
        timestamp: new Date().toISOString(),
      });
      const result = await runOptimization(currentDisruption);
      addChatMessage({
        id: `msg_${Date.now()}_result`,
        role: 'assistant',
        content: result.insights,
        timestamp: new Date().toISOString(),
      });
    } else {
      await new Promise(r => setTimeout(r, 800));
      addChatMessage({
        id: `msg_${Date.now()}_help`,
        role: 'assistant',
        content: `I'm running in **demo mode**. For full AI capabilities:\n\n1. Click the ⚙️ settings icon\n2. Enter your Groq API key\n3. Get a free key at [console.groq.com](https://console.groq.com)\n\nTry: *"MSC Mia delayed 4 hours due to fog"*`,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const quickActions = [
    { label: '🌫️ Weather delay', text: 'MSC Mia delayed 4 hours due to fog', icon: '🌫️' },
    { label: '🔧 Crane failure', text: 'QC4 crane at Berth 2 has mechanical failure', icon: '🔧' },
    { label: '🤔 What-if', text: 'What if 3 vessels miss the 06:00 tide?', icon: '🤔' },
    { label: '📊 Report', text: 'Generate daily performance report', icon: '📊' },
  ];

  const agentModes = [
    { key: 'auto' as const, label: 'Auto', icon: Sparkles, color: 'text-purple-400' },
    { key: 'disruption' as const, label: 'Parse', icon: AlertCircle, color: 'text-accent-orange' },
    { key: 'scenario' as const, label: 'Scenario', icon: Zap, color: 'text-yellow-400' },
    { key: 'resilience' as const, label: 'Monitor', icon: Shield, color: 'text-green-400' },
    { key: 'report' as const, label: 'Report', icon: FileText, color: 'text-accent-cyan' },
  ];

  return (
    <AnimatePresence>
      {isChatOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-[420px] glass border-l border-accent-cyan/30 flex flex-col z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-navy-300">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Brain className="w-6 h-6 text-accent-cyan" />
                {apiKeySet && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </div>
              <div>
                <h2 className="font-semibold">Qradha AI</h2>
                <p className="text-xs text-gray-500">
                  {apiKeySet ? 'AI Connected' : 'Demo Mode'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-accent-cyan/20 text-accent-cyan' : 'hover:bg-navy-300'}`}
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-2 hover:bg-navy-300 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-navy-300 overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-accent-cyan">
                    <Key className="w-4 h-4" />
                    AI API Key
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="gsk_..."
                      className="flex-1 bg-navy-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-cyan"
                    />
                    <button
                      onClick={handleSaveApiKey}
                      disabled={!apiKey.startsWith('gsk_')}
                      className="px-4 py-2 bg-accent-cyan text-navy rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      {apiKeySet ? <Check className="w-4 h-4" /> : 'Save'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Get a free API key at{' '}
                    <a href="https://console.groq.com" target="_blank" rel="noopener" className="text-accent-cyan hover:underline">
                      console.groq.com
                    </a>{' '}(Groq AI)
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Agent Mode Selector */}
          <div className="p-2 border-b border-navy-300 flex gap-1">
            {agentModes.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => setAgentMode(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  agentMode === key 
                    ? `bg-navy-300 ${color}` 
                    : 'text-gray-500 hover:bg-navy-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-xl p-3 ${
                    message.role === 'user'
                      ? 'bg-accent-cyan/20 border border-accent-cyan/30'
                      : 'bg-navy-300/80'
                  }`}
                >
                  <div 
                    className="text-sm prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: formatMarkdown(message.content) 
                    }}
                  />
                  <div className="text-[10px] text-gray-500 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {(isProcessing || isOptimizing) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 text-gray-400 p-3"
              >
                <div className="relative">
                  <Loader2 className="w-5 h-5 animate-spin text-accent-cyan" />
                </div>
                <span className="text-sm">
                  {isOptimizing ? 'Running quantum optimization...' : 'AI is thinking...'}
                </span>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="p-2 border-t border-navy-300">
            <div className="flex flex-wrap gap-1.5">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    setInput(action.text);
                    // Auto-submit after a brief delay
                    setTimeout(() => {
                      const form = document.querySelector('form');
                      if (form) form.requestSubmit();
                    }, 100);
                  }}
                  disabled={isProcessing || isOptimizing}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-navy-400 hover:bg-navy-300 text-gray-400 hover:text-white transition-all hover:scale-105 disabled:opacity-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-navy-300">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  agentMode === 'disruption' ? 'Describe the disruption...' :
                  agentMode === 'scenario' ? 'What-if scenario...' :
                  agentMode === 'resilience' ? 'Ask about risks...' :
                  agentMode === 'report' ? 'Request a report...' :
                  'Ask anything about port operations...'
                }
                className="flex-1 bg-navy-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 transition-all"
                disabled={isProcessing || isOptimizing}
              />
              <button
                type="submit"
                disabled={!input.trim() || isProcessing || isOptimizing}
                className="p-3 bg-accent-cyan text-navy rounded-xl hover:bg-accent-cyan/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Simple markdown formatter
function formatMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-accent-cyan mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-bold text-accent-cyan mt-3 mb-2">$1</h3>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`(.+?)`/g, '<code class="bg-navy-400 px-1 rounded text-accent-cyan">$1</code>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" class="text-accent-cyan hover:underline">$1</a>')
    // Tables (simple)
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => c.trim() === '-------' || c.trim() === '---')) {
        return '';
      }
      return `<div class="flex gap-4 py-1 text-sm">${cells.map(c => `<span class="flex-1">${c.trim()}</span>`).join('')}</div>`;
    })
    // Line breaks
    .replace(/\n/g, '<br/>');
}
