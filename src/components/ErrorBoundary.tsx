import React, { useState, useEffect } from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const formatErr = (e: unknown) => {
    if (!e) return 'Unknown error';
    if (typeof e === 'string') return e;
    if (e instanceof Error) return e.message;
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  };

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      setHasError(true);
      setError(event.reason instanceof Error ? event.reason : new Error(formatErr(event.reason)));
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  if (hasError) {
    let message = "Something went wrong. Please try again later.";
    const details = error ? formatErr(error) : null;
    
    try {
      if (error?.message) {
        const parsed = JSON.parse(error.message);
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          message = "You don't have permission to perform this action. Please make sure you're logged in correctly.";
        }
      }
    } catch (e) {
      // Not a JSON error message
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl max-w-md w-full text-center border border-stone-100">
          <div className="bg-red-50 text-red-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-4">Oops!</h2>
          <p className="text-stone-600 mb-8 leading-relaxed">{message}</p>
          {details && (
            <div className="text-left bg-stone-50 border border-stone-100 rounded-2xl p-4 mb-6 text-xs text-stone-700 whitespace-pre-wrap break-words">
              {details}
            </div>
          )}
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
