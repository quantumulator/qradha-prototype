'use client';

import { useState, useRef, useEffect } from 'react';
import { useQradhaStore } from '@/lib/store';
import { Send, X, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '@/lib/types';

export default function ChatPanel() {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
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
    lastOptimization
  } = useQradhaStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

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
    setInput('');
    setIsProcessing(true);

    try {
      // Check if this is a disruption report
      const isDisruption = /delay|late|stuck|miss|fail|broken|storm|fog|weather/i.test(input);
      
      if (isDisruption) {
        // Parse disruption
        const disruption = await simulateDisruption(input);
        
        const parseResponse: ChatMessage = {
          id: `msg_${Date.now()}_parse`,
          role: 'assistant',
          content: `I've parsed your disruption report:\n\n**Type:** ${disruption.disruption_type}\n**Vessel:** ${disruption.vessel_id}\n**Delay:** ${disruption.delay_minutes} minutes\n**Cause:** ${disruption.cause.replace(/_/g, ' ')}\n**Confidence:** ${(disruption.confidence * 100).toFixed(0)}%\n\nWould you like me to run the optimization engine to re-schedule operations?`,
          timestamp: new Date().toISOString(),
          metadata: { disruption },
        };
        addChatMessage(parseResponse);
      } else if (/optimize|yes|run|proceed/i.test(input) && currentDisruption) {
        // Run optimization
        addChatMessage({
          id: `msg_${Date.now()}_opt_start`,
          role: 'assistant',
          content: '🔄 Running quantum-inspired optimization engine...',
          timestamp: new Date().toISOString(),
        });
        
        const result = await runOptimization(currentDisruption);
        
        addChatMessage({
          id: `msg_${Date.now()}_opt_result`,
          role: 'assistant',
          content: result.insights,
          timestamp: new Date().toISOString(),
          metadata: { optimization: result },
        });
      } else if (/what if|scenario|simulate/i.test(input)) {
        // Scenario generation
        await new Promise(r => setTimeout(r, 1500));
        addChatMessage({
          id: `msg_${Date.now()}_scenario`,
          role: 'assistant',
          content: `**Scenario Analysis:**\n\nI've generated a stress-test scenario based on your query:\n\n**Scenario:** ${input}\n\n**Estimated Impact:**\n- Affected containers: ~12,500 TEU\n- Rail delay cascade: 180 minutes\n- Truck queue increase: 45%\n\n**Resilience Assessment:** Current schedule could absorb this with minor adjustments. Recommend pre-allocating 2 backup rail slots.\n\nWould you like me to simulate the full optimization for this scenario?`,
          timestamp: new Date().toISOString(),
        });
      } else if (/report|summary|performance/i.test(input)) {
        // Report generation
        await new Promise(r => setTimeout(r, 2000));
        addChatMessage({
          id: `msg_${Date.now()}_report`,
          role: 'assistant',
          content: `## Qradha Daily Performance Report\n**February 2, 2026**\n\n### Key Metrics\n- **Throughput:** 38,450 TEU (+9.2%)\n- **Energy Reduction:** -13.8% (12,340 kWh saved)\n- **Rail Modal Share:** 52.3% (above 50% target)\n- **CO₂ Avoided:** 18.7 tons\n- **Avg Turnaround:** 22.1 hours (-10.9%)\n\n### Optimization Runs: 3\n- Total cost reduction: €147,000\n- Demurrage avoided: €42,000\n- Energy savings: €3,200\n\n### Sustainability\nPrioritized 18 additional rail slots over truck alternatives.`,
          timestamp: new Date().toISOString(),
        });
      } else {
        // General response
        await new Promise(r => setTimeout(r, 1000));
        addChatMessage({
          id: `msg_${Date.now()}_general`,
          role: 'assistant',
          content: `I understand you're asking about "${input}". I can help you with:\n\n• **Disruption handling:** "MSC Mia delayed 4 hours due to fog"\n• **Scenario analysis:** "What if 3 vessels miss the morning tide?"\n• **Performance reports:** "Generate weekly summary"\n• **Optimization insights:** "Why was berth 3 chosen?"\n\nHow can I assist you?`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      addChatMessage({
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const quickActions = [
    { label: 'Weather delay', text: 'MSC Mia delayed 4 hours due to fog' },
    { label: 'Crane failure', text: 'QC4 crane at Berth 2 has mechanical failure' },
    { label: 'What-if scenario', text: 'What if 3 vessels miss the 06:00 tide?' },
    { label: 'Daily report', text: 'Generate daily performance report' },
  ];

  return (
    <AnimatePresence>
      {isChatOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-96 glass border-l border-accent-cyan/30 flex flex-col z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-navy-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent-cyan" />
              <h2 className="font-semibold">AI Assistant</h2>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="p-1 hover:bg-navy-300 rounded"
            >
              <X className="w-5 h-5" />
            </button>
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
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-accent-cyan/20 text-white'
                      : 'bg-navy-300 text-gray-100'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {(isProcessing || isOptimizing) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-gray-400"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">
                  {isOptimizing ? 'Running optimization...' : 'Processing...'}
                </span>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="p-2 border-t border-navy-300">
            <div className="flex flex-wrap gap-1">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => setInput(action.text)}
                  className="text-xs px-2 py-1 rounded bg-navy-300 hover:bg-navy-200 text-gray-400 hover:text-white transition-colors"
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
                placeholder="Describe a disruption or ask a question..."
                className="flex-1 bg-navy-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-cyan"
                disabled={isProcessing || isOptimizing}
              />
              <button
                type="submit"
                disabled={!input.trim() || isProcessing || isOptimizing}
                className="p-2 bg-accent-cyan text-navy rounded-lg hover:bg-accent-cyan/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
