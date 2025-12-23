import { prisma } from '@/lib/db'
import { AutomationMetricsService } from '@/lib/services/automation-metrics-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AutomationsTable } from '@/components/automations/automations-table'
import { AutomationsStatsCards } from '@/components/automations/automations-stats-cards'
import { AutomationsFilters } from '@/components/automations/automations-filters'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Bot } from 'lucide-react'

interface AutomationsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AutomationsPage({ searchParams }: AutomationsPageProps) {
  const params = await searchParams

  // Parsear filtros
  const filters: any = {}

  if (params.accountIds && typeof params.accountIds === 'string') {
    filters.accountIds = params.accountIds.split(',')
  } else if (params.accountIds && Array.isArray(params.accountIds)) {
    filters.accountIds = params.accountIds
  }

  if (params.status && typeof params.status === 'string') {
    filters.status = params.status
  }

  if (params.from && typeof params.from === 'string') {
    filters.dateFrom = new Date(params.from)
  }

  if (params.to && typeof params.to === 'string') {
    filters.dateTo = new Date(params.to)
  }

  // Buscar contas ativas para exibir info
  const accountsRaw = await prisma.account.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
    },
  })

  // Ordenação natural
  const accounts = accountsRaw.sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    })
  )

  // Se não há filtro de contas, usar todas
  if (!filters.accountIds) {
    filters.accountIds = accounts.map(a => a.id)
  }

  // Buscar métricas
  const service = new AutomationMetricsService()
  const automations = await service.getAutomationsWithMetrics(filters)
  const stats = await service.getAutomationsStats(filters)

  // Top 5 por diferentes métricas
  const topByOpenRate = automations
    .filter(a => a.totalSent > 0)
    .sort((a, b) => b.openRate - a.openRate)
    .slice(0, 5)

  const topByRetention = automations
    .filter(a => a.entered > 0)
    .sort((a, b) => b.retentionRate - a.retentionRate)
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <Bot className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Automações</h1>
                  <p className="text-muted-foreground">
                    Análise de performance das suas automações do ActiveCampaign
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Filtros */}
        {accounts.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <AutomationsFilters accounts={accounts} />
            </CardContent>
          </Card>
        )}

        {/* Estatísticas Gerais */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Visão Geral</h2>
          <AutomationsStatsCards stats={stats} />
        </div>

        {/* Nota sobre Limitações da API */}
        {automations.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900 text-sm">ℹ️ Sobre as Métricas de Emails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-blue-900">
              <div>
                <p className="font-semibold mb-1">✅ Métricas Precisas (da API):</p>
                <ul className="list-disc list-inside pl-2">
                  <li><strong>Entraram/Saíram:</strong> Contatos que entraram e saíram da automação</li>
                  <li><strong>Retenção:</strong> <code>(entered - exited) / entered</code></li>
                  <li><strong>Status:</strong> Ativa ou pausada</li>
                </ul>
              </div>
              
              <div>
                <p className="font-semibold mb-1">⚠️ Métricas Aproximadas (heurística):</p>
                <ul className="list-disc list-inside pl-2">
                  <li><strong>Emails/Enviados/Aberturas:</strong> Identificados por nome similar</li>
                  <li>Exemplo: Automação "00 - Clique" → Emails "Email 00 ..."</li>
                  <li>Se o nome da automação não corresponder ao nome dos emails, não conseguimos associar</li>
                </ul>
              </div>
              
              <div className="bg-white/50 p-2 rounded border border-blue-300">
                <p className="font-semibold">💡 Dica:</p>
                <p>Para melhor rastreamento, nomeie os emails da automação com um prefixo comum ao nome da automação.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Todas as Automações */}
        <Card>
          <CardHeader>
            <CardTitle>Todas as Automações ({automations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {automations.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhuma automação sincronizada ainda.
                </p>
                <Link href="/">
                  <Button>
                    Voltar ao Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <AutomationsTable automations={automations} />
            )}
          </CardContent>
        </Card>

        {/* Top Rankings */}
        {automations.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top 5 - Open Rate */}
            <Card>
              <CardHeader>
                <CardTitle>🔥 Top 5 - Open Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {topByOpenRate.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma automação com emails enviados ainda
                  </p>
                ) : (
                  <div className="space-y-4">
                    {topByOpenRate.map((automation, index) => (
                      <div
                        key={`${automation.accountId}-${automation.id}`}
                        className="flex items-center justify-between border-b pb-2 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-muted-foreground">
                            #{index + 1}
                          </span>
                          <div>
                            <div className="font-medium">{automation.name}</div>
                            <p className="text-xs text-muted-foreground">
                              {automation.accountName} • {automation.totalCampaigns} emails
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-semibold text-green-600">
                            {(automation.openRate * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top 5 - Retenção */}
            <Card>
              <CardHeader>
                <CardTitle>⭐ Top 5 - Retenção</CardTitle>
              </CardHeader>
              <CardContent>
                {topByRetention.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma automação com contatos ainda
                  </p>
                ) : (
                  <div className="space-y-4">
                    {topByRetention.map((automation, index) => (
                      <div
                        key={`${automation.accountId}-${automation.id}`}
                        className="flex items-center justify-between border-b pb-2 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-muted-foreground">
                            #{index + 1}
                          </span>
                          <div>
                            <div className="font-medium">{automation.name}</div>
                            <p className="text-xs text-muted-foreground">
                              {automation.accountName} • {automation.entered.toLocaleString('pt-BR')} entraram
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-semibold text-blue-600">
                            {(automation.retentionRate * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

