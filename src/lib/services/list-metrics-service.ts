/**
 * Service para calcular métricas agregadas por lista
 */

import { prisma } from '@/lib/db'

export interface ListMetrics {
  listId: string
  listName: string
  accountId: string
  accountName: string
  totalContacts: number
  activeContacts: number
  totalCampaigns: number
  totalSent: number
  totalOpens: number
  totalClicks: number
  totalBounces: number
  totalUnsubscribes: number
  openRate: number
  clickRate: number
  clickToOpenRate: number
  bounceRate: number
  unsubscribeRate: number
}

export interface ListFilters {
  accountId?: string
  dateFrom?: Date
  dateTo?: Date
}

export class ListMetricsService {
  /**
   * Busca todas as listas com métricas agregadas
   */
  async getListsWithMetrics(filters: ListFilters = {}): Promise<ListMetrics[]> {
    // Buscar todas as listas
    const lists = await prisma.list.findMany({
      where: {
        ...(filters.accountId && { accountId: filters.accountId }),
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        account: {
          select: {
            name: true,
          },
        },
        campaignLinks: {
          include: {
            campaign: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Calcular métricas para cada lista
    const metricsPromises = lists.map(async (list) => {
      // Filtrar campanhas por data se necessário
      let campaigns = list.campaignLinks.map(link => link.campaign)
      
      if (filters.dateFrom || filters.dateTo) {
        campaigns = campaigns.filter(campaign => {
          if (!campaign.sendDate) return false
          
          const sendDate = new Date(campaign.sendDate)
          
          if (filters.dateFrom && sendDate < filters.dateFrom) return false
          if (filters.dateTo && sendDate > filters.dateTo) return false
          
          return true
        })
      }

      // Agregar métricas
      const totalCampaigns = campaigns.length
      const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0)
      const totalOpens = campaigns.reduce((sum, c) => sum + c.uniqueOpens, 0)
      const totalClicks = campaigns.reduce((sum, c) => sum + c.uniqueClicks, 0)
      const totalBounces = campaigns.reduce((sum, c) => sum + c.bounces, 0)
      const totalUnsubscribes = campaigns.reduce((sum, c) => sum + c.unsubscribes, 0)

      // Calcular rates
      const openRate = totalSent > 0 ? totalOpens / totalSent : 0
      const clickRate = totalSent > 0 ? totalClicks / totalSent : 0
      const clickToOpenRate = totalOpens > 0 ? totalClicks / totalOpens : 0
      const bounceRate = totalSent > 0 ? totalBounces / totalSent : 0
      const unsubscribeRate = totalSent > 0 ? totalUnsubscribes / totalSent : 0

      return {
        listId: list.id,
        listName: list.name,
        accountId: list.accountId,
        accountName: list.account.name,
        totalContacts: list.totalContacts || 0,
        activeContacts: list.activeContacts || 0,
        totalCampaigns,
        totalSent,
        totalOpens,
        totalClicks,
        totalBounces,
        totalUnsubscribes,
        openRate,
        clickRate,
        clickToOpenRate,
        bounceRate,
        unsubscribeRate,
      }
    })

    return Promise.all(metricsPromises)
  }

  /**
   * Busca métricas de uma lista específica
   */
  async getListMetrics(
    accountId: string,
    listId: string,
    filters: { dateFrom?: Date; dateTo?: Date } = {}
  ): Promise<ListMetrics | null> {
    const list = await prisma.list.findUnique({
      where: {
        accountId_id: {
          accountId,
          id: listId,
        },
      },
      include: {
        account: {
          select: {
            name: true,
          },
        },
        campaignLinks: {
          include: {
            campaign: true,
          },
        },
      },
    })

    if (!list) return null

    // Filtrar campanhas por data se necessário
    let campaigns = list.campaignLinks.map(link => link.campaign)
    
    if (filters.dateFrom || filters.dateTo) {
      campaigns = campaigns.filter(campaign => {
        if (!campaign.sendDate) return false
        
        const sendDate = new Date(campaign.sendDate)
        
        if (filters.dateFrom && sendDate < filters.dateFrom) return false
        if (filters.dateTo && sendDate > filters.dateTo) return false
        
        return true
      })
    }

    // Agregar métricas
    const totalCampaigns = campaigns.length
    const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0)
    const totalOpens = campaigns.reduce((sum, c) => sum + c.uniqueOpens, 0)
    const totalClicks = campaigns.reduce((sum, c) => sum + c.uniqueClicks, 0)
    const totalBounces = campaigns.reduce((sum, c) => sum + c.bounces, 0)
    const totalUnsubscribes = campaigns.reduce((sum, c) => sum + c.unsubscribes, 0)

    // Calcular rates
    const openRate = totalSent > 0 ? totalOpens / totalSent : 0
    const clickRate = totalSent > 0 ? totalClicks / totalSent : 0
    const clickToOpenRate = totalOpens > 0 ? totalClicks / totalOpens : 0
    const bounceRate = totalSent > 0 ? totalBounces / totalSent : 0
    const unsubscribeRate = totalSent > 0 ? totalUnsubscribes / totalSent : 0

    return {
      listId: list.id,
      listName: list.name,
      accountId: list.accountId,
      accountName: list.account.name,
      totalContacts: list.totalContacts || 0,
      activeContacts: list.activeContacts || 0,
      totalCampaigns,
      totalSent,
      totalOpens,
      totalClicks,
      totalBounces,
      totalUnsubscribes,
      openRate,
      clickRate,
      clickToOpenRate,
      bounceRate,
      unsubscribeRate,
    }
  }

  /**
   * Busca campanhas de uma lista específica
   */
  async getListCampaigns(
    accountId: string,
    listId: string,
    filters: { dateFrom?: Date; dateTo?: Date } = {}
  ) {
    const campaignLinks = await prisma.campaignList.findMany({
      where: {
        accountId,
        listId,
      },
      include: {
        campaign: {
          include: {
            account: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        campaign: {
          sendDate: 'desc',
        },
      },
    })

    let campaigns = campaignLinks.map(link => ({
      ...link.campaign,
      accountName: link.campaign.account.name,
    }))

    // Filtrar por data se necessário
    if (filters.dateFrom || filters.dateTo) {
      campaigns = campaigns.filter(campaign => {
        if (!campaign.sendDate) return false
        
        const sendDate = new Date(campaign.sendDate)
        
        if (filters.dateFrom && sendDate < filters.dateFrom) return false
        if (filters.dateTo && sendDate > filters.dateTo) return false
        
        return true
      })
    }

    return campaigns
  }

  /**
   * Busca top N listas por métrica
   */
  async getTopLists(
    metric: 'openRate' | 'clickRate' | 'clickToOpenRate' | 'totalCampaigns',
    limit: number = 5,
    filters: ListFilters = {}
  ): Promise<ListMetrics[]> {
    const allMetrics = await this.getListsWithMetrics(filters)

    // Filtrar listas sem envios
    const listsWithData = allMetrics.filter(m => m.totalSent > 0)

    // Ordenar pela métrica escolhida
    const sorted = listsWithData.sort((a, b) => {
      return b[metric] - a[metric]
    })

    return sorted.slice(0, limit)
  }

  /**
   * Calcula estatísticas gerais de listas
   */
  async getListsStats(filters: ListFilters = {}) {
    const metrics = await this.getListsWithMetrics(filters)

    const totalLists = metrics.length
    const totalContacts = metrics.reduce((sum, m) => sum + m.totalContacts, 0)
    const totalActiveContacts = metrics.reduce((sum, m) => sum + m.activeContacts, 0)
    const totalCampaigns = metrics.reduce((sum, m) => sum + m.totalCampaigns, 0)
    const totalSent = metrics.reduce((sum, m) => sum + m.totalSent, 0)
    
    const avgOpenRate = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.openRate, 0) / metrics.length
      : 0
    
    const avgClickRate = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.clickRate, 0) / metrics.length
      : 0

    return {
      totalLists,
      totalContacts,
      totalActiveContacts,
      totalCampaigns,
      totalSent,
      avgOpenRate,
      avgClickRate,
    }
  }
}

