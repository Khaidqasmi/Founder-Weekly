'use client'

import { memo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const AMBER = '#f59e0b'
const PIE_COLORS = ['#f59e0b', '#fbbf24', '#78716c', '#d97706', '#a8a29e']

const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#fafafa',
  fontSize: 12,
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-zinc-900/70 p-5 backdrop-blur-sm shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]">
      {children}
    </div>
  )
}

export const DarkBarChart = memo(function DarkBarChart({ data, title, color = AMBER }: { data: any[]; title: string; color?: string }) {
  return (
    <Panel>
      <h3 className="mb-4 text-sm font-medium text-zinc-300">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  )
})

export const DarkPieChart = memo(function DarkPieChart({ data, title }: { data: any[]; title: string }) {
  return (
    <Panel>
      <h3 className="mb-4 text-sm font-medium text-zinc-300">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2} dataKey="value" nameKey="label" stroke="none" label={{ fill: '#a1a1aa', fontSize: 11 }}>
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
        </PieChart>
      </ResponsiveContainer>
    </Panel>
  )
})
