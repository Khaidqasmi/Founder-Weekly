'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { ChartDataPoint } from '@/lib/types'
import { darkTooltipStyle } from './bar-chart'

const COLORS = ['#f59e0b', '#fbbf24', '#78716c', '#d97706', '#a8a29e']

interface SimplePieChartProps {
  data: ChartDataPoint[]
  title: string
}

export function SimplePieChart({ data, title }: SimplePieChartProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-300 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2} dataKey="value" nameKey="label" stroke="none" label={{ fill: '#a1a1aa', fontSize: 11 }}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={darkTooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
