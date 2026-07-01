import { Card, CardContent } from '@/components/ui/card'

interface KPICardProps {
  title: string
  value: string
  subtitle?: string
}

export function KPICard({ title, value, subtitle }: KPICardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-zinc-400">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
