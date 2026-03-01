'use client';

import React from 'react';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    label?: string; // for identifying which section failed
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error(`[ErrorBoundary${this.props.label ? ` — ${this.props.label}` : ''}]`, error, info);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="rounded-xl border border-border bg-card p-6 text-center space-y-2">
                    <p className="text-sm font-semibold text-foreground">Failed to load {this.props.label || 'this section'}</p>
                    <p className="text-xs text-muted-foreground">
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </p>
                    <button
                        className="text-xs text-primary hover:underline mt-1"
                        onClick={() => this.setState({ hasError: false })}
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
