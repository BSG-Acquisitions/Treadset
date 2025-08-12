import React from "react";

interface CapacityGaugeProps {
  value: number; // 0-100
  size?: number;
  label?: string;
  showValue?: boolean;
}

export function CapacityGauge({ value, size = 64, label, showValue = true }: CapacityGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - 8) / 2; // Account for stroke width
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;
  
  // Color based on capacity
  const getColor = (value: number) => {
    if (value >= 90) return 'hsl(var(--destructive))';
    if (value >= 70) return 'hsl(45 93% 47%)'; // Warning orange
    return 'hsl(var(--primary))';
  };

  return (
    <div 
      className="relative flex-shrink-0" 
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `Capacity ${clamped}%`}
    >
      {/* Background circle */}
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ overflow: 'visible' }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="4"
          className="opacity-20"
        />
        
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(clamped)}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.3))',
          }}
        />
      </svg>
      
      {/* Center content */}
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-foreground tabular-nums">
            {clamped}%
          </span>
        </div>
      )}
    </div>
  );
}
