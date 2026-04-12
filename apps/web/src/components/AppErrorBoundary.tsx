import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AppErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl rounded-[28px] border border-rose-200 bg-white px-6 py-8 text-center shadow-[0_20px_80px_rgba(28,25,23,0.08)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-700">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <p className="mt-5 text-[11px] uppercase tracking-[0.22em] text-stone-400">Application Error</p>
          <h1 className="mt-3 text-2xl font-light text-stone-900">ระบบมีปัญหาระหว่างเปิดหน้าปัจจุบัน</h1>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            หน้านี้หยุดทำงานเพื่อป้องกันข้อมูลเสียหาย คุณสามารถรีโหลดแอปเพื่อกลับไปที่ workspace ล่าสุดได้
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--doc-primary)] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--doc-primary-hover)]"
            >
              <RefreshCw className="h-4 w-4" />
              โหลดแอปใหม่
            </button>
          </div>
        </div>
      </div>
    );
  }
}
