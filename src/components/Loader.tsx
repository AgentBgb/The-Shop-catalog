import React from 'react';

interface LoaderProps {
  fullPage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export default function Loader({ fullPage = false, size = 'md', message = 'Loading details...' }: LoaderProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  const loaderContent = (
    <div className="flex flex-col items-center justify-center p-6 space-y-3">
      <div
        className={`${sizeClasses[size]} border-slate-200 border-t-indigo-600 rounded-full animate-spin`}
        role="status"
        id="spinner-icon"
      />
      {message && <p className="text-sm font-medium text-slate-500 animate-pulse">{message}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs">
        <div className="p-8 bg-white shadow-xl rounded-2xl border border-slate-100 flex flex-col items-center">
          {loaderContent}
        </div>
      </div>
    );
  }

  return loaderContent;
}
