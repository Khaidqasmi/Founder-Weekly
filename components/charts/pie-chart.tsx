'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { ChartDataPoint } from '@/lib/types'
import { darkTooltipStyle } from './bar-chart'

const COLORS = ['#8b5cf6', '#ec4899', '#d946ef', '#6d64b8', '#f0abfc']

interface SimplePieChartProps {
  data: ChartDataPoint[]
  title: string
}

export function SimplePieChart({ data, title }: SimplePieChartProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-[#4a4477] mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3} cornerRadius={8} dataKey="value" nameKey="label" stroke="none" label={{ fill: '#8d87b8', fontSize: 11 }}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={darkTooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#6d64b8' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
