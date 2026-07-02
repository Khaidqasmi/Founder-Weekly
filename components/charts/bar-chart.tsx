'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { ChartDataPoint } from '@/lib/types'

export const darkTooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #eeeaf9',
  borderRadius: 14,
  color: '#312b63',
  fontSize: 12,
  boxShadow: '0 8px 30px rgba(93,77,190,0.15)',
}

interface SimpleBarChartProps {
  data: ChartDataPoint[]
  title: string
  color?: string
}

export function SimpleBarChart({ data, title, color = '#8b5cf6' }: SimpleBarChartProps) {
  return (
    <div className="min-w-0 overflow-hidden">
      <h3 className="text-sm font-medium text-[#4a4477] mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#efeafb" vertical={false} />
          <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={12} tick={{ fontSize: 10, fill: '#8d87b8' }} axisLine={{ stroke: '#e6e0f7' }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#8d87b8' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={darkTooltipStyle} cursor={{ fill: 'rgba(139,92,246,0.06)' }} />
          <Bar dataKey="value" fill={color} radius={[8, 8, 8, 8]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
