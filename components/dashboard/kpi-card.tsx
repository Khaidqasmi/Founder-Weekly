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
        <p className="text-sm text-[#6d64b8]">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtitle && <p className="text-xs text-[#8d87b8] mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
