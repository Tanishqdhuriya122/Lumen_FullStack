import React from 'react';

export default function PulseLoader({ size = 64 }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Expanding rings */}
      <span className="absolute inset-0 rounded-full bg-white/20 animate-pulse-ring" />
      <span
        className="absolute inset-0 rounded-full bg-white/20 animate-pulse-ring"
        style={{ animationDelay: '0.6s' }}
      />
      <span
        className="absolute inset-0 rounded-full bg-white/20 animate-pulse-ring"
        style={{ animationDelay: '1.2s' }}
      />
      {/* Solid core */}
      <span className="relative w-3 h-3 rounded-full bg-white" />
    </div>
  );
}