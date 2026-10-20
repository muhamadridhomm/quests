import React from 'react';

export function StatusBadge({ status }) {
  if (!status) return null;
  const s = status.toLowerCase();
  
  let color = 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  
  if (s === 'complete' || s === 'dev - deployed') {
    color = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  } else if (s === 'in progress' || s.includes('dev')) {
    color = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  } else if (s === 'at risk' || s === 'cancelled') {
    color = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  } else if (s === 'to do' || s === 'planning') {
    color = 'bg-sky-500/20 text-sky-400 border-sky-500/30';
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${color} uppercase tracking-wider`}>
      {status}
    </span>
  );
}

export function ProgressRing({ percentage, colorClass = 'text-indigo-500', size = 60, strokeWidth = 4 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-slate-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${colorClass} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-xs font-bold text-slate-300">
        {percentage}%
      </span>
    </div>
  );
}
