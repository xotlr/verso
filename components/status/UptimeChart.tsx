'use client';

import { useMemo } from 'react';
import type { UptimeData } from './types';

interface UptimeChartProps {
  data: UptimeData[];
  label: string;
  overallPercent: number;
}

export function UptimeChart({ data, label, overallPercent }: UptimeChartProps) {
  // Fill in missing days with 100% uptime (no data = no issues)
  const filledData = useMemo(() => {
    const today = new Date();
    const days: { date: string; percent: number }[] = [];

    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const record = data.find((d) => d.date === dateStr);
      days.push({
        date: dateStr,
        percent: record?.uptimePercent ?? 100,
      });
    }

    return days;
  }, [data]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {overallPercent.toFixed(2)}% uptime
        </span>
      </div>
      <div className="flex gap-px h-8">
        {filledData.map((day) => (
          <div
            key={day.date}
            className="flex-1 rounded-sm transition-colors"
            style={{
              backgroundColor:
                day.percent >= 99.9
                  ? 'rgb(34, 197, 94)' // green-500
                  : day.percent >= 95
                    ? 'rgb(234, 179, 8)' // yellow-500
                    : 'rgb(239, 68, 68)', // red-500
              opacity: 0.8,
            }}
            title={`${day.date}: ${day.percent.toFixed(2)}%`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>90 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}
