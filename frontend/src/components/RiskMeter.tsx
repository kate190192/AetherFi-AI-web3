'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';

interface RiskMeterProps {
  score: number;
  maxScore?: number;
}

const RiskMeter: React.FC<RiskMeterProps> = ({ score, maxScore = 100 }) => {
  const { t } = useI18n();
  const percentage = Math.min(Math.max(score / maxScore, 0), 1);
  const angle = percentage * 180;
  const radians = ((180 - angle) * Math.PI) / 180;

  const needleX = 100 + 80 * Math.cos(radians);
  const needleY = 80 - 80 * Math.sin(radians);

  const getColor = (pct: number) => {
    if (pct < 0.33) return '#10b981';
    if (pct < 0.66) return '#f59e0b';
    return '#ef4444';
  };

  const getLabel = (pct: number) => {
    if (pct < 0.33) return t.risk.low;
    if (pct < 0.66) return t.risk.medium;
    return t.risk.high;
  };

  const color = getColor(percentage);
  const label = getLabel(percentage);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 110" className="w-full max-w-[200px]">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id="needleGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background arc */}
        <path
          d="M 20 80 A 80 80 0 0 1 180 80"
          fill="none"
          stroke="rgba(148, 163, 184, 0.1)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Colored arc */}
        <path
          d="M 20 80 A 80 80 0 0 1 180 80"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${percentage * 251.3} 251.3`}
          opacity={0.8}
        />

        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
          const tickAngle = tick * 180;
          const tickRadians = ((180 - tickAngle) * Math.PI) / 180;
          const innerR = 62;
          const outerR = 68;
          const x1 = 100 + innerR * Math.cos(tickRadians);
          const y1 = 80 - innerR * Math.sin(tickRadians);
          const x2 = 100 + outerR * Math.cos(tickRadians);
          const y2 = 80 - outerR * Math.sin(tickRadians);
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(148, 163, 184, 0.3)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}

        {/* Needle */}
        <line
          x1="100" y1="80" x2={needleX} y2={needleY}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#needleGlow)"
        />

        {/* Center dot */}
        <circle cx="100" cy="80" r="5" fill={color} />
        <circle cx="100" cy="80" r="3" fill="#0f172a" />

        {/* Score text */}
        <text x="100" y="72" textAnchor="middle" fill="#e2e8f0" fontSize="18" fontWeight="700" fontFamily="var(--font-space-grotesk), monospace">
          {score}
        </text>
      </svg>

      <div className="flex items-center gap-2 -mt-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-medium" style={{ color }}>{label} {t.risk.risk}</span>
      </div>
    </div>
  );
};

export default RiskMeter;
