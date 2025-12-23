import { ListMetricsService } from '@/lib/services/list-metrics-service'
import { ListsTable } from '@/components/lists/lists-table'
import { ListsStatsCards } from '@/components/lists/lists-stats-cards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface ListsPageSearchParams {
  accountId?: string
  from?: string
  to?: string
}

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<ListsPageSearchParams>
}) {
  const params = await searchParams

  // Parsear filtros
  const filters: any = {}

  if (params.accountId) {
    filters.accountId = params.accountId
  }

  if (params.from) {
    filters.dateFrom = new Date(params.from)
  }

  if (params.to) {
    filters.dateTo = new Date(params.to)
  }

  // Buscar dados
  const service = new ListMetricsService()
  const lists = await service.getListsWithMetrics(filters)
  const stats = await service.getListsStats(filters)

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
              <h1 className="text-3xl font-bold tracking-tight">Listas</h1>
              <p className="text-muted-foreground">
                Análise de performance por lista e segmento
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Estatísticas Gerais */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Visão Geral</h2>
          <ListsStatsCards stats={stats} />
        </div>

        {/* Tabela de Listas */}
        <Card>
          <CardHeader>
            <CardTitle>Todas as Listas</CardTitle>
          </CardHeader>
          <CardContent>
            {lists.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Nenhuma lista sincronizada ainda.
                </p>
                <Link href="/">
                  <Button>
                    Voltar ao Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <ListsTable lists={lists} />
            )}
          </CardContent>
        </Card>

        {/* Top Listas */}
        {lists.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>🔥 Top 5 - Open Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(await service.getTopLists('openRate', 5, filters)).map((list, index) => (
                    <div
                      key={`${list.accountId}-${list.listId}`}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <div>
                          <Link
                            href={`/lists/${list.accountId}/${list.listId}`}
                            className="font-medium hover:underline"
                          >
                            {list.listName}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {list.totalCampaigns} campanhas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-green-600">
                          {(list.openRate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>⭐ Top 5 - Click Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(await service.getTopLists('clickRate', 5, filters)).map((list, index) => (
                    <div
                      key={`${list.accountId}-${list.listId}`}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <div>
                          <Link
                            href={`/lists/${list.accountId}/${list.listId}`}
                            className="font-medium hover:underline"
                          >
                            {list.listName}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {list.totalCampaigns} campanhas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-blue-600">
                          {(list.clickRate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

