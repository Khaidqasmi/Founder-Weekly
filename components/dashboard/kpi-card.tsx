import { Card, CardContent } from '@/components/ui/card'

interface KPICardProps {
  title: string
  value: string
  subtitle?: string
}

export function KPICard({ title, value, subtitle }: KPICardProps) {
  return (
    <Card>
      <CardContent className="min-w-0 pt-6">
        <p className="text-sm text-[#6d64b8]">{title}</p>
        <p className="mt-1 min-w-0 break-words text-[clamp(1rem,1.55vw,1.5rem)] font-bold leading-tight">{value}</p>
        {subtitle && <p className="text-xs text-[#8d87b8] mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
