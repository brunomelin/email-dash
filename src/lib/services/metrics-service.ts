/**
 * Service para calcular métricas agregadas
 * Usa a camada de metrics-definitions para extensibilidade
 */

import { prisma } from '@/lib/db'
import { calculateAggregatedMetrics } from '@/lib/metrics-definitions'

export interface MetricsFilter {
  accountIds?: string[]
  listIds?: string[]
  campaignIds?: string[]
  dateFrom?: Date
  dateTo?: Date
  status?: string[]
}

export interface AggregatedMetrics {
  sent: number
  opens: number
  uniqueOpens: number
  clicks: number
  uniqueClicks: number
  bounces: number
  unsubscribes: number
  openRate: number
  clickRate: number
  clickToOpenRate: number
  bounceRate: number
  unsubscribeRate: number
}

export class MetricsService {
  /**
   * Calcula métricas agregadas de campanhas com filtros
   */
  async getAggregatedCampaignMetrics(
    filter: MetricsFilter = {}
  ): Promise<AggregatedMetrics> {
    const where: any = {}

    // Aplicar filtros
    if (filter.accountIds && filter.accountIds.length > 0) {
      where.accountId = { in: filter.accountIds }
    }

    if (filter.status && filter.status.length > 0) {
      where.status = { in: filter.status }
    }

    if (filter.dateFrom || filter.dateTo) {
      where.sendDate = {}
      if (filter.dateFrom) {
        where.sendDate.gte = filter.dateFrom
      }
      if (filter.dateTo) {
        where.sendDate.lte = filter.dateTo
      }
    }

    // Se filtrar por listas, usar join table
    if (filter.listIds && filter.listIds.length > 0) {
      where.listLinks = {
        some: {
          listId: { in: filter.listIds },
        },
      }
    }

    // Se filtrar por IDs de campanha específicos
    if (filter.campaignIds && filter.campaignIds.length > 0) {
      where.id = { in: filter.campaignIds }
    }

    // Buscar campanhas
    const campaigns = await prisma.campaign.findMany({
      where,
      select: {
        sent: true,
        opens: true,
        uniqueOpens: true,
        clicks: true,
        uniqueClicks: true,
        bounces: true,
        unsubscribes: true,
      },
    })

    // Usar a camada de metrics-definitions para calcular
    const metricKeys = [
      'sent',
      'opens',
      'uniqueOpens',
      'clicks',
      'uniqueClicks',
      'bounces',
      'unsubscribes',
      'openRate',
      'clickRate',
      'clickToOpenRate',
      'bounceRate',
      'unsubscribeRate',
    ]

    const aggregated = calculateAggregatedMetrics(campaigns, metricKeys)

    return aggregated as AggregatedMetrics
  }

  /**
   * Métricas por conta (breakdown)
   */
  async getMetricsByAccount(filter: Omit<MetricsFilter, 'accountIds'> = {}) {
    const accountsRaw = await prisma.account.findMany({
      where: { isActive: true },
    })
    
    // Ordenação natural (case-insensitive + numeric)
    const accounts = accountsRaw.sort((a, b) => 
      a.name.localeCompare(b.name, 'pt-BR', {
        numeric: true,      // gactv2 < gactv10
        sensitivity: 'base' // ignora maiúsculas/minúsculas
      })
    )

    const results = await Promise.all(
      accounts.map(async (account) => {
        const metrics = await this.getAggregatedCampaignMetrics({
          ...filter,
          accountIds: [account.id],
        })

        return {
          accountId: account.id,
          accountName: account.name,
          metrics,
        }
      })
    )

    return results
  }

  /**
   * Métricas por lista
   */
  async getMetricsByList(filter: MetricsFilter = {}) {
    const whereAccount: any = {}
    if (filter.accountIds && filter.accountIds.length > 0) {
      whereAccount.accountId = { in: filter.accountIds }
    }

    const lists = await prisma.list.findMany({
      where: whereAccount,
      orderBy: { name: 'asc' },
    })

    const results = await Promise.all(
      lists.map(async (list) => {
        const metrics = await this.getAggregatedCampaignMetrics({
          ...filter,
          listIds: [list.id],
        })

        return {
          listId: list.id,
          listName: list.name,
          accountId: list.accountId,
          activeContacts: list.activeContacts || 0,
          metrics,
        }
      })
    )

    return results
  }

  /**
   * Top campanhas por métrica
   */
  async getTopCampaigns(
    metricKey: keyof AggregatedMetrics,
    limit: number = 10,
    filter: MetricsFilter = {}
  ) {
    const where: any = {}

    if (filter.accountIds && filter.accountIds.length > 0) {
      where.accountId = { in: filter.accountIds }
    }

    if (filter.dateFrom || filter.dateTo) {
      where.sendDate = {}
      if (filter.dateFrom) where.sendDate.gte = filter.dateFrom
      if (filter.dateTo) where.sendDate.lte = filter.dateTo
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: {
        [metricKey]: 'desc',
      },
      take: limit,
      include: {
        account: {
          select: {
            name: true,
          },
        },
      },
    })

    return campaigns
  }

  /**
   * Histórico de sincronizações
   */
  async getSyncHistory(accountId?: string, limit: number = 10) {
    const where: any = {}
    if (accountId) {
      where.accountId = accountId
    }

    const syncJobs = await prisma.syncJob.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        account: {
          select: {
            name: true,
          },
        },
      },
    })

    return syncJobs
  }

  /**
   * Estatísticas gerais do sistema
   */
  async getSystemStats() {
    const [
      accountsCount,
      campaignsCount,
      listsCount,
      automationsCount,
      totalSent,
    ] = await Promise.all([
      prisma.account.count({ where: { isActive: true } }),
      prisma.campaign.count(),
      prisma.list.count(),
      prisma.automation.count(),
      prisma.campaign.aggregate({
        _sum: { sent: true },
      }),
    ])

    return {
      accounts: accountsCount,
      campaigns: campaignsCount,
      lists: listsCount,
      automations: automationsCount,
      totalEmailsSent: totalSent._sum.sent || 0,
    }
  }
}

