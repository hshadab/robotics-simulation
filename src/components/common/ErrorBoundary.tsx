import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { loggers } from '../../lib/logger';

const log = loggers.ai;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Name of the boundary for logging purposes */
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, name } = this.props;

    // Log the error
    log.error(`Error in ${name || 'component'}`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({ errorInfo });

    // Call optional error handler
    if (onError) {
      onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, name } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-slate-800/50 rounded-xl border border-red-500/30">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">
            {name ? `Error in ${name}` : 'Something went wrong'}
          </h2>
          <p className="text-sm text-slate-400 mb-4 text-center max-w-md">
            {error?.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500
                       text-white text-sm rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={this.handleGoHome}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600
                       text-white text-sm rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              Go Home
            </button>
          </div>
          {import.meta.env.DEV && error?.stack && (
            <details className="mt-4 w-full max-w-lg">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                Show error details
              </summary>
              <pre className="mt-2 p-3 bg-slate-900 rounded text-xs text-red-300 overflow-auto max-h-40">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return children;
  }
}

/**
 * Smaller error boundary for non-critical components
 * Shows a minimal error indicator without breaking layout
 */
export class MinimalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, name } = this.props;
    log.error(`Error in ${name || 'component'}`, { error: error.message });
    if (onError) {
      onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) return fallback;

      return (
        <div
          className="flex items-center gap-2 p-2 bg-red-500/10 rounded border border-red-500/30 cursor-pointer"
          onClick={this.handleRetry}
          title={error?.message || 'Click to retry'}
        >
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-400">Error loading component</span>
          <RefreshCw className="w-3 h-3 text-red-400" />
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
