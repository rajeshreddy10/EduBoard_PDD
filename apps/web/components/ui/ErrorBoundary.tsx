'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-amber-500/20 text-center space-y-4 shadow-lg my-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {this.props.fallbackTitle || 'Something went wrong with this component'}
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-1 max-w-md mx-auto leading-relaxed">
              {this.props.fallbackMessage ||
                'Something went wrong with this part of the whiteboard. Your existing work is safe. Try refreshing this section.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary-500)] text-white text-xs font-bold hover:bg-[var(--color-primary-600)] transition-all shadow-md cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
