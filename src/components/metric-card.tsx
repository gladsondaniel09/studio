
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactElement } from "react";

interface MetricCardProps {
  title: string;
  value: number;
  icon: ReactElement;
  unit?: string;
}

export default function MetricCard({ title, value, icon, unit }: MetricCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  }

  return (
    <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-4xl font-bold ${getScoreColor(value)}`}>
          {value}{unit}
        </div>
      </CardContent>
    </Card>
  );
}
