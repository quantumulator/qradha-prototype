'use client';

import { useQradhaStore } from '@/lib/store';
import { 
  Ship, 
  Anchor, 
  Zap, 
  Train, 
  Leaf, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function MetricsPanel() {
  const { metrics, portState } = useQradhaStore();

  const cards = [
    {
      title: 'Throughput',
      value: metrics.throughput_teu.toLocaleString(),
      unit: 'TEU',
      change: metrics.throughput_change,
      icon: Ship,
      color: 'cyan',
    },
    {
      title: 'Energy Usage',
      value: metrics.energy_kwh.toLocaleString(),
      unit: 'kWh',
      change: metrics.energy_change,
      icon: Zap,
      color: 'orange',
    },
    {
      title: 'Rail Share',
      value: metrics.rail_share_percent.toFixed(1),
      unit: '%',
      change: metrics.rail_share_percent - metrics.rail_target_percent,
      icon: Train,
      color: 'cyan',
      target: `Target: ${metrics.rail_target_percent}%`,
    },
    {
      title: 'CO₂ Saved',
      value: metrics.co2_saved_tons.toFixed(1),
      unit: 'tons',
      change: null,
      icon: Leaf,
      color: 'green',
    },
    {
      title: 'Avg Turnaround',
      value: metrics.avg_turnaround_hours.toFixed(1),
      unit: 'hours',
      change: metrics.turnaround_change,
      icon: Clock,
      color: 'cyan',
    },
    {
      title: 'Current Delays',
      value: metrics.delays_hours.toFixed(1),
      unit: 'hours',
      change: null,
      icon: AlertTriangle,
      color: metrics.delays_hours > 5 ? 'red' : 'orange',
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="text-xl font-semibold mb-4 gradient-text">Real-Time Metrics</h2>
      
      {/* Resilience Score */}
      <motion.div 
        className="glass rounded-xl p-4 mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400">Resilience Score</span>
          <span className={`text-2xl font-bold ${getResilienceColor(portState.resilience_score)}`}>
            {(portState.resilience_score * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-navy-300 rounded-full h-2">
          <motion.div 
            className={`h-2 rounded-full ${getResilienceBarColor(portState.resilience_score)}`}
            initial={{ width: 0 }}
            animate={{ width: `${portState.resilience_score * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {portState.resilience_score < 0.5 
            ? 'Schedule at risk. Consider preemptive optimization.'
            : portState.resilience_score < 0.7
            ? 'Limited slack. One major disruption may cause cascading delays.'
            : 'Healthy buffer capacity available.'
          }
        </p>
      </motion.div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            className="glass rounded-xl p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 text-accent-${card.color}`} />
              <span className="text-xs text-gray-400">{card.title}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{card.value}</span>
              <span className="text-sm text-gray-400">{card.unit}</span>
            </div>
            {card.change !== null && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${
                card.change > 0 
                  ? card.title === 'Current Delays' || card.title === 'Energy Usage' 
                    ? 'text-accent-red' 
                    : 'text-green-500'
                  : card.title === 'Current Delays' || card.title === 'Energy Usage'
                    ? 'text-green-500'
                    : 'text-accent-red'
              }`}>
                {card.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{Math.abs(card.change).toFixed(1)}%</span>
              </div>
            )}
            {card.target && (
              <div className="text-xs text-gray-500 mt-1">{card.target}</div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Active Alerts */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Active Alerts</h3>
        <div className="space-y-2">
          {portState.alerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              className={`glass rounded-lg p-3 border-l-4 ${getSeverityBorder(alert.severity)}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className={`w-4 h-4 mt-0.5 ${getSeverityColor(alert.severity)}`} />
                <div className="flex-1">
                  <p className="text-sm">{alert.message}</p>
                  <p className="text-xs text-accent-cyan mt-1">{alert.recommendation}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Weather & Tide Summary */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-3">
          <h4 className="text-xs text-gray-400 mb-2">Weather</h4>
          <div className="space-y-1 text-sm">
            <div>Wind: {portState.weather.wind_speed_kmh} km/h</div>
            <div>Visibility: {portState.weather.visibility_km} km</div>
            <div>Fog Risk: {(portState.weather.fog_probability * 100).toFixed(0)}%</div>
          </div>
        </div>
        <div className="glass rounded-xl p-3">
          <h4 className="text-xs text-gray-400 mb-2">Next Tide</h4>
          {portState.tides[0] && (
            <div className="space-y-1 text-sm">
              <div className="text-accent-cyan font-semibold">
                {portState.tides[0].type.toUpperCase()}
              </div>
              <div>{new Date(portState.tides[0].timestamp).toLocaleTimeString()}</div>
              <div>{portState.tides[0].height_m}m</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getResilienceColor(score: number): string {
  if (score >= 0.7) return 'text-green-500';
  if (score >= 0.5) return 'text-accent-orange';
  return 'text-accent-red';
}

function getResilienceBarColor(score: number): string {
  if (score >= 0.7) return 'bg-green-500';
  if (score >= 0.5) return 'bg-accent-orange';
  return 'bg-accent-red';
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-accent-red';
    case 'high': return 'text-accent-orange';
    case 'medium': return 'text-yellow-500';
    default: return 'text-gray-400';
  }
}

function getSeverityBorder(severity: string): string {
  switch (severity) {
    case 'critical': return 'border-accent-red';
    case 'high': return 'border-accent-orange';
    case 'medium': return 'border-yellow-500';
    default: return 'border-gray-500';
  }
}
