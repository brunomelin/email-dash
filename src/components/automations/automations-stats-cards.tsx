import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, Users, UserCheck, TrendingUp, Flame, BarChart3 } from 'lucide-react'
import { AutomationStats } from '@/lib/services/automation-metrics-service'

interface AutomationsStatsCardsProps {
  stats: AutomationStats
  withActivity?: AutomationStats
  withoutActivity?: AutomationStats
}

export function AutomationsStatsCards({ stats, withActivity, withoutActivity }: AutomationsStatsCardsProps) {
  return (
    <div className="space-y-6">
      {/* Cards Principais (3 cards) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              Total de entradas
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

      {/* Cards Secundários (Com/Sem Atividade) */}
      {withActivity && withoutActivity && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Com Atividade */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-900">
                🔥 Com Atividade no Período
              </CardTitle>
              <Flame className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">
                {withActivity.totalAutomations}
              </div>
              <p className="text-xs text-orange-700">
                {withActivity.automationsWithEmails} com emails enviados
              </p>
            </CardContent>
          </Card>

          {/* Sem Atividade */}
          <Card className="border-slate-200 bg-slate-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-900">
                📊 Outras Automações
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {withoutActivity.totalAutomations}
              </div>
              <p className="text-xs text-slate-700">
                Sem emails no período filtrado
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

