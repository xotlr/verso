'use client';

import React, { ReactNode, Component } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', {
      error: error.message,
      componentStack: errorInfo.componentStack,
      componentName: this.props.componentName,
    });

    this.setState({
      errorInfo: errorInfo.componentStack || undefined,
    });
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
        <div className="flex items-center justify-center min-h-[200px] p-8 h-full bg-background">
          <div className="text-center space-y-4 max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              {this.props.componentName
                ? `Error in ${this.props.componentName}`
                : 'Something went wrong'}
            </h2>
            <p className="text-muted-foreground">
              An unexpected error occurred. Please try again.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-2 text-left">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Technical details
                </summary>
                <pre className="mt-2 p-2 text-xs bg-muted rounded overflow-auto max-h-[200px]">
                  {this.state.error.message}
                  {this.state.errorInfo && (
                    <>
                      {'\n\nComponent Stack:'}
                      {this.state.errorInfo}
                    </>
                  )}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={this.handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
interface WithErrorBoundaryOptions {
  componentName?: string;
  fallback?: ReactNode;
  onReset?: () => void;
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary
      componentName={options.componentName || displayName}
      fallback={options.fallback}
      onReset={options.onReset}
    >
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

export default ErrorBoundary;
