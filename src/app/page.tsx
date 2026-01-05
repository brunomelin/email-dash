import { prisma } from '@/lib/db'
import { KPICards } from '@/components/dashboard/kpi-cards'
import { CampaignsTable } from '@/components/dashboard/campaigns-table'
import { SyncButton } from '@/components/dashboard/sync-button'
import { LastAutoSync } from '@/components/dashboard/last-auto-sync'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GlobalFilters } from '@/components/filters/global-filters'
import { ActiveCampaignAPIv1 } from '@/lib/connectors/activecampaign/api-v1'
import Link from 'next/link'
import { Settings, List as ListIcon, Bot, Users, AlertTriangle } from 'lucide-react'

interface DashboardFilters {
  accountIds?: string[]
  status?: string
  dateFrom?: Date
  dateTo?: Date
  listIds?: string[]
}

async function getDashboardData(filters: DashboardFilters = {}) {
  // Buscar todas as contas ativas
  const accountsRaw = await prisma.account.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      baseUrl: true,
      isActive: true,
      contactCount: true,
      contactLimit: true,
      lastContactSync: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  
  // Ordenação natural (case-insensitive + numeric)
  const accounts = accountsRaw.sort((a: { name: string }, b: { name: string }) => 
    a.name.localeCompare(b.name, 'pt-BR', {
      numeric: true,      // gactv2 < gactv10
      sensitivity: 'base' // ignora maiúsculas/minúsculas
    })
  )

  // Construir where clause baseado nos filtros
  const where: any = {}

  // Filtro por contas (múltiplas)
  if (filters.accountIds && filters.accountIds.length > 0) {
    where.accountId = { in: filters.accountIds }
  } else {
    where.accountId = { in: accounts.map((a: { id: string }) => a.id) }
  }

  // Filtro por status
  if (filters.status) {
    where.status = filters.status
  }

  // Filtro por listas (via join table CampaignList) - Suporta múltiplas listas
  if (filters.listIds && filters.listIds.length > 0) {
    // Coletar pares (accountId, campaignId) ao invés de só campaignId
    const campaignKeys: Array<{ accountId: string; campaignId: string }> = []
    
    // Para cada lista selecionada, buscar campanhas
    for (const listId of filters.listIds) {
      // Parse listId (formato: "accountId:listId")
      const [listAccountId, listActualId] = listId.split(':')
      
      // Buscar IDs de campanhas que pertencem a esta lista
      const campaignLinks = await prisma.campaignList.findMany({
        where: {
          accountId: listAccountId,
          listId: listActualId,
        },
        select: {
          accountId: true,
          campaignId: true,
        },
      })

      campaignKeys.push(...campaignLinks.map((link: { accountId: string; campaignId: string }) => ({
        accountId: link.accountId,
        campaignId: link.campaignId,
      })))
    }
    
    // Remover duplicatas baseado em accountId + campaignId
    const uniqueKeys = campaignKeys.filter((key, index, self) =>
      index === self.findIndex((k) => k.accountId === key.accountId && k.campaignId === key.campaignId)
    )
    
    // Adicionar ao where clause usando OR para cada par (accountId, id)
    if (uniqueKeys.length > 0) {
      where.OR = uniqueKeys.map(key => ({
        accountId: key.accountId,
        id: key.campaignId,
      }))
    } else {
      // Se nenhuma campanha foi encontrada, retornar vazio
      where.id = { in: [] }
    }
  }

  // Buscar campanhas
  const campaigns = await prisma.campaign.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100, // Limitar para performance
    include: {
      account: {
        select: {
          name: true,
          baseUrl: true,
          apiKey: true,
        },
      },
    },
  })

  // Se houver filtro de data, buscar métricas reais da API v1
  if (filters.dateFrom || filters.dateTo) {
    const sdate = filters.dateFrom?.toISOString().split('T')[0]
    let ldate = filters.dateTo?.toISOString().split('T')[0]

    // FIX: A API v1 do ActiveCampaign retorna 0 quando sdate = ldate
    // Solução: Adicionar +1 dia ao ldate quando forem iguais
    if (sdate && ldate && sdate === ldate) {
      const nextDay = new Date(filters.dateTo!)
      nextDay.setDate(nextDay.getDate() + 1)
      ldate = nextDay.toISOString().split('T')[0]
      console.log(`⚠️  Ajustando ldate: ${sdate} → ${ldate} (API v1 requer intervalo)`)
    }

    console.log(`📊 Buscando métricas da API v1 para período: ${sdate} até ${ldate}`)

    // Buscar métricas por período para cada campanha via API v1
    const campaignsWithMetrics = await Promise.all(
      campaigns.map(async (campaign: any) => {
        try {
          const apiv1 = new ActiveCampaignAPIv1({
            baseUrl: campaign.account.baseUrl,
            apiKey: campaign.account.apiKey,
          })

          const metrics = await apiv1.getCampaignReportTotals(campaign.id, {
            sdate,
            ldate,
          })

          return {
            ...campaign,
            sent: metrics.sent,
            uniqueOpens: metrics.opens,
            uniqueClicks: metrics.clicks,
            bounces: metrics.bounces,
            unsubscribes: metrics.unsubscribes,
            openRate: metrics.openRate,
            clickRate: metrics.clickRate,
            clickToOpenRate: metrics.opens > 0 ? metrics.clicks / metrics.opens : 0,
          }
        } catch (error) {
          console.error(`Erro ao buscar métricas da campanha ${campaign.id}:`, error)
          // Em caso de erro, retornar campanha com métricas zeradas
          return {
            ...campaign,
            sent: 0,
            uniqueOpens: 0,
            uniqueClicks: 0,
            bounces: 0,
            unsubscribes: 0,
            openRate: 0,
            clickRate: 0,
            clickToOpenRate: 0,
          }
        }
      })
    )

    // Filtrar campanhas sem envios no período
    const campaignsWithSends = campaignsWithMetrics.filter(c => c.sent > 0)

    // Calcular KPIs consolidados
    const kpiData = campaignsWithSends.reduce(
      (acc: any, campaign: any) => ({
        sent: acc.sent + campaign.sent,
        uniqueOpens: acc.uniqueOpens + campaign.uniqueOpens,
        uniqueClicks: acc.uniqueClicks + campaign.uniqueClicks,
        openRate: 0,
        clickRate: 0,
        clickToOpenRate: 0,
      }),
      { sent: 0, uniqueOpens: 0, uniqueClicks: 0, openRate: 0, clickRate: 0, clickToOpenRate: 0 }
    )

    // Calcular rates agregados
    kpiData.openRate = kpiData.sent > 0 ? kpiData.uniqueOpens / kpiData.sent : 0
    kpiData.clickRate = kpiData.sent > 0 ? kpiData.uniqueClicks / kpiData.sent : 0
    kpiData.clickToOpenRate = kpiData.uniqueOpens > 0 ? kpiData.uniqueClicks / kpiData.uniqueOpens : 0

    // Formatar campanhas para tabela
    const campaignsForTable = campaignsWithSends.map((campaign: any) => ({
      id: campaign.id,
      accountId: campaign.accountId,
      name: campaign.name,
      status: campaign.status,
      isAutomation: campaign.isAutomation,
      sendDate: campaign.sendDate,
      sent: campaign.sent,
      uniqueOpens: campaign.uniqueOpens,
      openRate: campaign.openRate,
      uniqueClicks: campaign.uniqueClicks,
      clickRate: campaign.clickRate,
      clickToOpenRate: campaign.clickToOpenRate,
      accountName: campaign.account.name,
    }))

    return {
      accounts,
      kpiData,
      campaigns: campaignsForTable,
      totalCampaigns: campaignsForTable.length,
    }
  }

  // Sem filtro de data: usar métricas do banco (totais acumulados)
  const kpiData = campaigns.reduce(
    (acc: any, campaign: any) => ({
      sent: acc.sent + campaign.sent,
      uniqueOpens: acc.uniqueOpens + campaign.uniqueOpens,
      uniqueClicks: acc.uniqueClicks + campaign.uniqueClicks,
      openRate: 0,
      clickRate: 0,
      clickToOpenRate: 0,
    }),
    { sent: 0, uniqueOpens: 0, uniqueClicks: 0, openRate: 0, clickRate: 0, clickToOpenRate: 0 }
  )

  // Calcular rates
  kpiData.openRate = kpiData.sent > 0 ? kpiData.uniqueOpens / kpiData.sent : 0
  kpiData.clickRate = kpiData.sent > 0 ? kpiData.uniqueClicks / kpiData.sent : 0
  kpiData.clickToOpenRate = kpiData.uniqueOpens > 0 ? kpiData.uniqueClicks / kpiData.uniqueOpens : 0

  // Formatar campanhas para tabela
  const campaignsForTable = campaigns.map((campaign: any) => ({
    id: campaign.id,
    accountId: campaign.accountId,
    name: campaign.name,
    status: campaign.status,
    isAutomation: campaign.isAutomation,
    sendDate: campaign.sendDate,
    sent: campaign.sent,
    uniqueOpens: campaign.uniqueOpens,
    openRate: campaign.openRate,
    uniqueClicks: campaign.uniqueClicks,
    clickRate: campaign.clickRate,
    clickToOpenRate: campaign.clickToOpenRate,
    accountName: campaign.account.name,
  }))

  return {
    accounts,
    kpiData,
    campaigns: campaignsForTable,
    totalCampaigns: campaignsForTable.length,
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Await searchParams (Next.js 15+)
  const params = await searchParams

  // Parsear filtros dos query params
  const filters: DashboardFilters = {}

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

  if (params.listIds && typeof params.listIds === 'string') {
    filters.listIds = params.listIds.split(',')
  } else if (params.listIds && Array.isArray(params.listIds)) {
    filters.listIds = params.listIds
  }

  const { accounts, kpiData, campaigns, totalCampaigns } = await getDashboardData(filters)

  // Buscar listas para o filtro
  const lists = await prisma.list.findMany({
    where: {
      accountId: { in: accounts.map((a: { id: string }) => a.id) },
    },
    select: {
      id: true,
      accountId: true,
      name: true,
      account: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { account: { name: 'asc' } },
      { name: 'asc' },
    ],
  })

  // Passar filtros para o componente
  const hasDateFilter = filters.dateFrom || filters.dateTo

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Email Dashboard</h1>
              <p className="text-muted-foreground">
                ActiveCampaign Multi-Account Analytics
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/lists">
                <Button variant="outline">
                  <ListIcon className="h-4 w-4 mr-2" />
                  Listas
                </Button>
              </Link>
              <Link href="/automations">
                <Button variant="outline">
                  <Bot className="h-4 w-4 mr-2" />
                  Automações
                </Button>
              </Link>
              <Link href="/settings/accounts">
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Gerenciar Contas
                </Button>
              </Link>
              {accounts.length > 0 && (
                <>
                  <SyncButton />
                  {accounts.map((account: any) => (
                    <SyncButton
                      key={account.id}
                      accountId={account.id}
                      accountName={account.name}
                      variant="outline"
                    />
                  ))}
                </>
              )}
            </div>
          </div>
          
          {/* Status da sincronização automática */}
          <LastAutoSync />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Filtros Globais */}
        {accounts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <GlobalFilters 
                accounts={accounts} 
                lists={lists.map((list: any) => ({
                  id: list.id,
                  accountId: list.accountId,
                  name: list.name,
                  accountName: list.account.name,
                }))} 
              />
            </CardContent>
          </Card>
        )}

        {/* Contas Ativas */}
        <Card>
          <CardHeader>
            <CardTitle>Contas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {accounts.length === 0 ? (
                <div className="w-full text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Nenhuma conta configurada. Adicione sua primeira conta do ActiveCampaign para começar.
                  </p>
                  <Link href="/settings/accounts">
                    <Button>
                      <Settings className="h-4 w-4" />
                      Adicionar Conta
                    </Button>
                  </Link>
                </div>
              ) : (
                accounts.map((account: any) => {
                  // Calcular percentual de uso e cor
                  const hasContactData = account.contactCount !== null && account.contactCount !== undefined
                  const hasLimit = account.contactLimit !== null && account.contactLimit !== undefined
                  const percentage = hasLimit && hasContactData 
                    ? (account.contactCount / account.contactLimit) * 100 
                    : 0
                  
                  let contactColorClass = 'text-muted-foreground'
                  if (hasLimit && hasContactData) {
                    if (percentage >= 90) {
                      contactColorClass = 'text-red-600 font-semibold'
                    } else if (percentage >= 70) {
                      contactColorClass = 'text-yellow-600 font-semibold'
                    } else {
                      contactColorClass = 'text-green-600 font-medium'
                    }
                  }

                  return (
                    <div
                      key={account.id}
                      className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm min-w-[200px]"
                    >
                      <p className="font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{account.baseUrl}</p>
                      
                      {/* Contador de contatos */}
                      {hasContactData && (
                        <div className="mt-2 flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className={`text-sm ${contactColorClass}`}>
                            {account.contactCount.toLocaleString('pt-BR')}
                            {hasLimit && ` / ${account.contactLimit.toLocaleString('pt-BR')}`}
                          </span>
                          {percentage >= 90 && (
                            <span title="Limite próximo!">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Métricas Consolidadas</h2>
          <KPICards data={kpiData} />
        </div>

        {/* Tabela de Campanhas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Campanhas Recentes</h2>
            <p className="text-sm text-muted-foreground">
              Mostrando {totalCampaigns} {totalCampaigns === 1 ? 'campanha' : 'campanhas'}
              {hasDateFilter && totalCampaigns === 0 && (
                <span className="ml-2 text-orange-600 font-medium">
                  - Nenhuma campanha neste período. Tente expandir as datas ou clique em "Limpar Filtros".
                </span>
              )}
            </p>
          </div>
          <CampaignsTable campaigns={campaigns} />
        </div>
      </main>
    </div>
  )
}

