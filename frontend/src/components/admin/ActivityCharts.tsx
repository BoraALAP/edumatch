/**
 * Activity Charts Component
 *
 * Client component for displaying analytics charts.
 * Uses recharts library which requires client-side rendering.
 */

'use client';

import { Card } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

interface ActivityChartsProps {
  messagesPerDay: Array<{ day: string; messages: number }>;
  practicePerDay: Array<{ day: string; minutes: number }>;
}

export function ActivityCharts({ messagesPerDay, practicePerDay }: ActivityChartsProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      {/* Messages Chart */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground">Message Activity</h3>
          <p className="text-sm text-muted-foreground">Student messages over the last 7 days</p>
        </div>
        <ChartContainer
          config={{
            messages: {
              label: 'Messages',
              color: 'hsl(var(--chart-1))',
            },
          }}
          className="h-[250px] w-full"
        >
          <BarChart data={messagesPerDay}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="day" className="text-xs" />
            <YAxis className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </Card>

      {/* Practice Time Chart */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground">Practice Time</h3>
          <p className="text-sm text-muted-foreground">Solo practice minutes over the last 7 days</p>
        </div>
        <ChartContainer
          config={{
            minutes: {
              label: 'Minutes',
              color: 'hsl(var(--chart-2))',
            },
          }}
          className="h-[250px] w-full"
        >
          <LineChart data={practicePerDay}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="day" className="text-xs" />
            <YAxis className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="minutes"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </Card>
    </section>
  );
}
