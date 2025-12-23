import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, Users, UserCheck, TrendingUp } from 'lucide-react'
import { AutomationStats } from '@/lib/services/automation-metrics-service'

interface AutomationsStatsCardsProps {
  stats: AutomationStats
}

export function AutomationsStatsCards({ stats }: AutomationsStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total de Automações */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Automações</CardTitle>
          <Bot className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAutomations}</div>
          <p className="text-xs text-muted-foreground">
            {stats.activeAutomations} ativas
          </p>
        </CardContent>
      </Card>

      {/* Contatos em Automações */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contatos Entraram</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.totalEntered.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.totalExited.toLocaleString('pt-BR')} saíram
          </p>
        </CardContent>
      </Card>

      {/* Taxa de Retenção Média */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Retenção Média</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(stats.avgRetentionRate * 100).toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Contatos ainda na automação
          </p>
        </CardContent>
      </Card>

      {/* Automações com Emails */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Com Emails Associados</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.automationsWithEmails}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalAutomations > 0
              ? ((stats.automationsWithEmails / stats.totalAutomations) * 100).toFixed(0)
              : 0}% do total
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

