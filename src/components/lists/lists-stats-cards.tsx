import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { List, Users, Mail, TrendingUp } from 'lucide-react'

interface ListsStatsCardsProps {
  stats: {
    totalLists: number
    totalContacts: number
    totalActiveContacts: number
    totalCampaigns: number
    totalSent: number
    avgOpenRate: number
    avgClickRate: number
  }
}

export function ListsStatsCards({ stats }: ListsStatsCardsProps) {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num)
  }

  const formatPercent = (value: number) => {
    return (value * 100).toFixed(1) + '%'
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Listas</CardTitle>
          <List className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(stats.totalLists)}</div>
          <p className="text-xs text-muted-foreground">
            {formatNumber(stats.totalCampaigns)} campanhas enviadas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Contatos</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(stats.totalContacts)}</div>
          <p className="text-xs text-muted-foreground">
            {formatNumber(stats.totalActiveContacts)} ativos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Rate Médio</CardTitle>
          <Mail className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(stats.avgOpenRate)}</div>
          <p className="text-xs text-muted-foreground">
            {formatNumber(stats.totalSent)} emails enviados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Click Rate Médio</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(stats.avgClickRate)}</div>
          <p className="text-xs text-muted-foreground">
            Média de todas as listas
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

