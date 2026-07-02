'use client'

import { memo, useId } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import { DashboardCard, ChartLegend, PASTEL } from '@/components/dashboard/widgets'

const DONUT_COLORS = ['#8b5cf6', '#ec4899', '#d946ef', '#6d64b8', '#f0abfc']

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #eeeaf9',
  borderRadius: 14,
  color: '#312b63',
  fontSize: 12,
  boxShadow: '0 8px 30px rgba(93,77,190,0.15)',
}

const tickStyle = { fontSize: 11, fill: '#8d87b8' }

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <DashboardCard className="p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#312b63]">{title}</h3>
      {children}
    </DashboardCard>
  )
}

/* ---------- BarChartWidget: rounded gradient bars ---------- */

export const BarChartWidget = memo(function BarChartWidget({
  data,
  title,
  from = PASTEL.violet,
  to = PASTEL.magenta,
}: {
  data: any[]
  title: string
  from?: string
  to?: string
}) {
  const id = useId()
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={from} />
              <stop offset="100%" stopColor={to} stopOpacity={0.75} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#efeafb" vertical={false} />
          <XAxis dataKey="label" tick={tickStyle} axisLine={{ stroke: '#e6e0f7' }} tickLine={false} />
          <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(139,92,246,0.06)' }} />
          <Bar dataKey="value" fill={`url(#${id})`} radius={[8, 8, 8, 8]} maxBarSize={34} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
})

/* ---------- AreaChartWidget: smooth gradient area ---------- */

export const AreaChartWidget = memo(function AreaChartWidget({
  data,
  title,
  color = PASTEL.violet,
}: {
  data: any[]
  title: string
  color?: string
}) {
  const id = useId()
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#efeafb" vertical={false} />
          <XAxis dataKey="label" tick={tickStyle} axisLine={{ stroke: '#e6e0f7' }} tickLine={false} />
          <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: color, strokeOpacity: 0.25 }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${id})`}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
})

/* ---------- DonutChartWidget: donut with center total + legend ---------- */

export const DonutChartWidget = memo(function DonutChartWidget({
  data,
  title,
  centerLabel = 'Total',
}: {
  data: any[]
  title: string
  centerLabel?: string
}) {
  const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0)
  return (
    <ChartCard title={title}>
      <div className="relative">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={88}
              innerRadius={62}
              paddingAngle={3}
              cornerRadius={8}
              dataKey="value"
              nameKey="label"
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[#312b63]">{total.toLocaleString()}</span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#8d87b8]">{centerLabel}</span>
        </div>
      </div>
      <ChartLegend items={data.map((d, i) => ({ label: d.label, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} />
    </ChartCard>
  )
})
