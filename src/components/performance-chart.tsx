
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { AuditMetrics } from '@/app/actions';

interface PerformanceChartProps {
  metrics: AuditMetrics;
}

const chartConfig = {
  score: {
    label: 'Score',
  },
  performance: {
    label: 'Performance',
    color: 'hsl(var(--chart-1))',
  },
  accessibility: {
    label: 'Accessibility',
    color: 'hsl(var(--chart-2))',
  },
  bestPractices: {
    label: 'Best Practices',
    color: 'hsl(var(--chart-1))',
  },
  seo: {
    label: 'SEO',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export default function PerformanceChart({ metrics }: PerformanceChartProps) {
  const chartData = Object.entries(metrics).map(([name, score]) => ({
    name: name.replace(/ /g, '\n'), // Add newline for better label display
    score,
    fill: name.toLowerCase().includes('practice') || name.toLowerCase().includes('perform') ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))',
  }));

  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
      <ResponsiveContainer>
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 20,
            bottom: 5,
            left: -10,
          }}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}
          />
          <YAxis domain={[0, 100]} tickMargin={10} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar
            dataKey="score"
            radius={8}
            barSize={40}
            aria-label="Audit Score"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
