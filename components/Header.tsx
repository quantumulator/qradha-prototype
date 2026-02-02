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
  Bell,
  Waves,
  Cloud,
  Wind
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

  // Get current tide status
  const currentTime = new Date();
  const nextTide = portState.tides.find(t => new Date(t.timestamp) > currentTime);
  const tidalWindowOpen = nextTide?.window_open && nextTide?.window_close 
    ? new Date(nextTide.window_open) <= currentTime && currentTime <= new Date(nextTide.window_close)
    : false;

  return (
    <header className="h-16 glass border-b border-accent-cyan/30 flex items-center justify-between px-6">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <motion.div 
          className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-orange flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Ship className="w-6 h-6 text-navy" />
        </motion.div>
        <div>
          <h1 className="text-xl font-bold gradient-text">QRADHA</h1>
          <p className="text-xs text-gray-500">Quantum-Inspired Port Synchronization</p>
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

      {/* Weather & Tide Status */}
      <div className="hidden lg:flex items-center gap-4 text-xs">
        {/* Tidal Window */}
        <motion.div 
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            tidalWindowOpen ? 'bg-green-500/20 text-green-400' : 'bg-navy-400 text-gray-400'
          }`}
          animate={{ scale: tidalWindowOpen ? [1, 1.02, 1] : 1 }}
          transition={{ repeat: tidalWindowOpen ? Infinity : 0, duration: 2 }}
        >
          <Waves className="w-4 h-4" />
          <span className="font-medium">
            {tidalWindowOpen ? 'Tidal Window: Open' : 'Tidal Window: Closed'}
          </span>
          {nextTide && (
            <span className="text-gray-500">
              (Next: {nextTide.type} {new Date(nextTide.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})
            </span>
          )}
        </motion.div>

        {/* Weather */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-400 text-gray-400">
          <Wind className="w-4 h-4" />
          <span>{portState.weather.wind_speed_kmh} km/h</span>
          <Cloud className="w-4 h-4 ml-2" />
          <span>{portState.weather.visibility_km} km vis</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Disruption Button */}
        <motion.button
          onClick={() => setIsDisruptionPanelOpen(true)}
          className="px-4 py-2 bg-accent-orange text-navy font-semibold rounded-lg hover:bg-accent-orange/80 transition-colors flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Report Disruption</span>
        </motion.button>

        {/* Alerts */}
        <motion.button 
          className="relative p-2 rounded-lg hover:bg-navy-300 transition-colors"
          animate={alertCount > 0 ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: alertCount > 0 ? Infinity : 0, duration: 2 }}
        >
          <Bell className="w-5 h-5 text-gray-400" />
          {alertCount > 0 && (
            <motion.span 
              className="absolute -top-1 -right-1 w-5 h-5 bg-accent-red text-white text-xs rounded-full flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              {alertCount}
            </motion.span>
          )}
        </motion.button>

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
