import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';
import { toggleDevTools, openLogsFolder } from '../utils/mobileBridge.js';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[DriveGram ErrorBoundary] Uncaught exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 select-text">
          <div className="max-w-lg w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur-sm space-y-5">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-3 bg-amber-400/10 rounded-xl">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Ops, algo deu errado</h1>
                <p className="text-xs text-slate-400">A interface encontrou uma falha de inicialização</p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 overflow-x-auto text-xs font-mono text-red-300 max-h-48 scrollbar-thin">
              <div className="font-semibold text-red-400 mb-1">
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Erro desconhecido'}
              </div>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[11px] text-slate-400 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/20"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar App
              </button>

              <button
                onClick={() => toggleDevTools()}
                className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 px-3.5 rounded-xl text-sm transition-colors"
                title="Abrir Console de Desenvolvedor (F12)"
              >
                <Terminal className="w-4 h-4" />
                DevTools (F12)
              </button>

              <button
                onClick={() => openLogsFolder()}
                className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 px-3.5 rounded-xl text-sm transition-colors"
                title="Abrir Pasta de Logs"
              >
                Ver Logs
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
