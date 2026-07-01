'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { ChartDataPoint } from '@/lib/types'

export const darkTooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#fafafa',
  fontSize: 12,
}

interface SimpleBarChartProps {
  data: ChartDataPoint[]
  title: string
  color?: string
}

export function SimpleBarChart({ data, title, color = '#f59e0b' }: SimpleBarChartProps) {
  return (
    <div className="min-w-0 overflow-hidden">
      <h3 className="text-sm font-medium text-zinc-300 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={12} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={darkTooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
