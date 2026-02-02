'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-full flex items-center justify-center bg-navy-500 p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
            <p className="text-gray-400 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-cyan text-navy rounded-lg hover:bg-accent-cyan/80 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Try Again
            </button>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer">Stack trace</summary>
                <pre className="mt-2 p-4 bg-navy-400 rounded-lg text-xs text-gray-400 overflow-auto max-h-48">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading skeleton components
export function MapSkeleton() {
  return (
    <div className="w-full h-full bg-navy-400 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading map...</p>
      </div>
    </div>
  );
}

export function VisualizationSkeleton() {
  return (
    <div className="w-full h-full bg-navy-400 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-accent-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading 3D visualization...</p>
      </div>
    </div>
  );
}

export function PanelSkeleton({ title }: { title?: string }) {
  return (
    <div className="w-full h-full bg-navy-400 animate-pulse">
      <div className="p-4 border-b border-navy-300">
        <div className="h-6 w-32 bg-navy-300 rounded" />
      </div>
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-navy-300 rounded w-3/4" />
            <div className="h-3 bg-navy-300 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Toast notification component
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  const colors = {
    success: 'bg-green-500/20 border-green-500 text-green-400',
    error: 'bg-red-500/20 border-red-500 text-red-400',
    warning: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
    info: 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan',
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg border ${colors[type]} animate-slide-up`}>
      <div className="flex items-center gap-3">
        <span>{message}</span>
        {onClose && (
          <button onClick={onClose} className="hover:opacity-70">×</button>
        )}
      </div>
    </div>
  );
}

// Empty state component
export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: { 
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Icon className="w-12 h-12 text-gray-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4 max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-accent-cyan text-navy rounded-lg hover:bg-accent-cyan/80 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
