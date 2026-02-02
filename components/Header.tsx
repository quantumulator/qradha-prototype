'use client';

import { useQradhaStore } from '@/lib/store';
import { 
  Ship, 
  Map, 
  BarChart3, 
  Box,
  MessageSquare,
  AlertTriangle,
  Settings,
  Bell
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Header() {
  const { 
    activePanel, 
    setActivePanel, 
    setIsChatOpen, 
    isChatOpen,
    setIsDisruptionPanelOpen,
    portState
  } = useQradhaStore();

  const navItems = [
    { id: 'map', label: 'Live Map', icon: Map },
    { id: '3d', label: '3D View', icon: Box },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  ] as const;

  const alertCount = portState.alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length;

  return (
    <header className="h-16 glass border-b border-accent-cyan/30 flex items-center justify-between px-6">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-orange flex items-center justify-center">
          <Ship className="w-6 h-6 text-navy" />
        </div>
        <div>
          <h1 className="text-xl font-bold gradient-text">QRADHA</h1>
          <p className="text-xs text-gray-500">Port of Hamburg</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePanel(item.id)}
            className={`relative px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              activePanel === item.id
                ? 'text-accent-cyan'
                : 'text-gray-400 hover:text-white hover:bg-navy-300'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{item.label}</span>
            {activePanel === item.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-accent-cyan/10 rounded-lg border border-accent-cyan/30"
                style={{ zIndex: -1 }}
              />
            )}
          </button>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Disruption Button */}
        <button
          onClick={() => setIsDisruptionPanelOpen(true)}
          className="px-4 py-2 bg-accent-orange text-navy font-semibold rounded-lg hover:bg-accent-orange/80 transition-colors flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Report Disruption</span>
        </button>

        {/* Alerts */}
        <button className="relative p-2 rounded-lg hover:bg-navy-300 transition-colors">
          <Bell className="w-5 h-5 text-gray-400" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-red text-white text-xs rounded-full flex items-center justify-center">
              {alertCount}
            </span>
          )}
        </button>

        {/* Chat Toggle */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`p-2 rounded-lg transition-colors ${
            isChatOpen ? 'bg-accent-cyan text-navy' : 'hover:bg-navy-300 text-gray-400'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Settings */}
        <button className="p-2 rounded-lg hover:bg-navy-300 transition-colors">
          <Settings className="w-5 h-5 text-gray-400" />
        </button>

        {/* Time */}
        <div className="ml-4 text-right">
          <div className="text-sm font-mono text-accent-cyan">
            {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-xs text-gray-500">
            {new Date().toLocaleDateString('de-DE', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>
    </header>
  );
}
