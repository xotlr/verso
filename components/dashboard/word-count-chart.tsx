'use client';

import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface HeatmapCell {
  date: string;
  wordCount: number;
  level: number;
}

interface WordCountChartProps {
  data: HeatmapCell[];
}

const chartConfig = {
  wordCount: {
    label: 'Words',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export function WordCountChart({ data }: WordCountChartProps) {
  // Use last 30 days for the chart
  const chartData = data.slice(-30).map((cell) => ({
    date: cell.date,
    wordCount: cell.wordCount,
    displayDate: new Date(cell.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  const totalWords = chartData.reduce((sum, d) => sum + d.wordCount, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Last 30 Days</h3>
        <p className="text-xs text-muted-foreground">
          {totalWords.toLocaleString()} words total
        </p>
      </div>

      <ChartContainer config={chartConfig} className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="wordCountGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="displayDate"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
            />
            <YAxis hide />
            <Tooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => value}
                  formatter={(value) => [`${Number(value).toLocaleString()} words`, 'Words']}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="wordCount"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#wordCountGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
