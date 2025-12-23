import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber, formatPercent } from '@/lib/utils'
import { TrendingUp, Mail, MousePointerClick, EyeIcon } from 'lucide-react'

interface KPIData {
  sent: number
  opens: number
  uniqueOpens: number
  clicks: number
  uniqueClicks: number
  openRate: number
  clickRate: number
  clickToOpenRate: number
}

interface KPICardsProps {
  data: KPIData
}

export function KPICards({ data }: KPICardsProps) {
  const cards = [
    {
      title: 'Emails Enviados',
      value: formatNumber(data.sent),
      icon: Mail,
      color: 'text-blue-600',
    },
    {
      title: 'Aberturas',
      value: formatNumber(data.uniqueOpens),
      subtitle: `${formatPercent(data.openRate)} taxa`,
      icon: EyeIcon,
      color: 'text-green-600',
    },
    {
      title: 'Cliques',
      value: formatNumber(data.uniqueClicks),
      subtitle: `${formatPercent(data.clickRate)} CTR`,
      icon: MousePointerClick,
      color: 'text-purple-600',
    },
    {
      title: 'CTOR',
      value: formatPercent(data.clickToOpenRate),
      subtitle: 'Click-to-Open Rate',
      icon: TrendingUp,
      color: 'text-orange-600',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            {card.subtitle && (
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

