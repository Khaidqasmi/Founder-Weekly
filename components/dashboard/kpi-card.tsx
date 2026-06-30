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
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
