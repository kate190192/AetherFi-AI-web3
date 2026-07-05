'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useI18n } from '@/lib/i18n';

interface PortfolioChartProps {
  allocation: Record<string, number>;
}

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { name: string; value: number; percent: number };
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="glass-card-inner px-3 py-2 text-xs">
        <p className="t-primary font-medium">{data.name}</p>
        <p className="t-label">{data.payload.percent.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

const PortfolioChart: React.FC<PortfolioChartProps> = ({ allocation }) => {
  const { t } = useI18n();
  const total = Object.values(allocation).reduce((sum, v) => sum + v, 0);
  const data = Object.entries(allocation).map(([name, value]) => ({
    name,
    value,
    percent: (value / total) * 100,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] t-muted text-sm">
        {t.result.noAllocation}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                opacity={0.85}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full mt-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2 text-xs">
            <div
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="t-label truncate">{item.name}</span>
            <span className="t-primary font-medium ml-auto">{item.percent.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioChart;
