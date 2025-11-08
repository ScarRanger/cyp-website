'use client';

import React from 'react';

type SpinnerProps = {
  size?: number; // px
  ringWidth?: number; // px
  className?: string;
  label?: string;
  trackClassName?: string; // e.g., 'border-gray-300'
  ringClassName?: string; // e.g., 'border-t-gray-900'
};

export default function Spinner({
  size = 40,
  ringWidth = 4,
  className = '',
  label = 'Loading',
  trackClassName = 'border-gray-300',
  ringClassName = 'border-t-gray-900',
}: SpinnerProps) {
  const style: React.CSSProperties = { width: size, height: size, borderWidth: ringWidth };
  return (
    <div className={`inline-flex flex-col items-center ${className}`} role="status" aria-live="polite" aria-busy="true">
      <div
        className={`rounded-full animate-spin border ${trackClassName} ${ringClassName}`}
        style={style}
        aria-hidden="true"
      />
      {label ? <div className="mt-3 text-sm text-gray-700">{label}</div> : null}
    </div>
  );
}
