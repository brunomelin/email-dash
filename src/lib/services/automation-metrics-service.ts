import { prisma } from '@/lib/db'
import { Automation, Campaign } from '@prisma/client'

export interface AutomationMetrics {
  id: string
  accountId: string
  accountName: string
  name: string
  status: string
  entered: number
  totalCampaigns: number
  totalSent: number
  totalOpens: number
  totalClicks: number
  openRate: number
  clickRate: number
  clickToOpenRate: number
  lastUpdated: Date | null
  createdAt: Date
  performanceBadge: 'excellent' | 'good' | 'average' | 'low' | 'none'
}

export interface AutomationStats {
  totalAutomations: number
  activeAutomations: number
  totalEntered: number
  automationsWithEmails: number
}

interface AutomationFilters {
  accountIds?: string[]
  status?: string
  dateFrom?: Date
  dateTo?: Date
}

export class AutomationMetricsService {
  /**
   * Busca todas as automações com métricas agregadas
   */
  async getAutomationsWithMetrics(filters: AutomationFilters = {}): Promise<AutomationMetrics[]> {
    const whereClause: any = {}

    if (filters.accountIds && filters.accountIds.length > 0) {
      whereClause.accountId = { in: filters.accountIds }
    }

    if (filters.status) {
      whereClause.status = filters.status
    }

    // Buscar todas as automações
    const automations = await prisma.automation.findMany({
      where: whereClause,
      include: {
        account: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    const automationsWithMetrics: AutomationMetrics[] = []

    for (const automation of automations) {
      // Buscar campanhas associadas a esta automação
      // HEURÍSTICA SIMPLIFICADA: Apenas o prefixo entre colchetes é suficiente
      
      const autoName = automation.name
      const patterns = []
      
      // Extrair prefixo entre colchetes no início do nome (se houver)
      // Incluindo hífens para suportar prefixos como [SHEIN-BV]
      const prefixMatch = autoName.match(/^(\[[\w\s-]+\])/)
      const prefix = prefixMatch ? prefixMatch[1] : null
      
      if (prefix) {
        // Se tem prefixo entre colchetes, buscar TODOS os emails que começam com esse prefixo
        // Exemplos:
        // - Automação "[SK] email 00" → pega TODOS emails que começam com "[SK]"
        // - Automação "[SHEIN] qualquer coisa" → pega TODOS emails que começam com "[SHEIN]"
        // Isso simplifica muito e agrupa por marca/produto
        patterns.push({ 
          name: { 
            startsWith: prefix, 
            mode: 'insensitive' as const
          } 
        })
      } else {
        // SEM prefixo entre colchetes: usar lógica antiga
        // Padrão 1: Nome completo
        patterns.push({ name: { contains: autoName, mode: 'insensitive' as const } })
        
        // Padrão 2: Código numérico no início (ex: "00 - Boas Vindas")
        const codeMatch = autoName.match(/^(\d+)/)
        if (codeMatch) {
          const code = codeMatch[1]
          patterns.push({ name: { contains: `email ${code}`, mode: 'insensitive' as const } })
        }
      }

      const campaigns = await prisma.campaign.findMany({
        where: {
          accountId: automation.accountId,
          isAutomation: true,
          OR: patterns,
        },
        select: {
          sent: true,
          uniqueOpens: true,
          uniqueClicks: true,
          sendDate: true,
        },
      })

      // Aplicar filtro de data nas campanhas
      let filteredCampaigns = campaigns
      if (filters.dateFrom || filters.dateTo) {
        filteredCampaigns = campaigns.filter(campaign => {
          if (!campaign.sendDate) return false
          
          // Comparar datas (início do dia para dateFrom, fim do dia para dateTo)
          if (filters.dateFrom) {
            const dateFrom = new Date(filters.dateFrom)
            dateFrom.setHours(0, 0, 0, 0)
            if (campaign.sendDate < dateFrom) return false
          }
          
          if (filters.dateTo) {
            const dateTo = new Date(filters.dateTo)
            dateTo.setHours(23, 59, 59, 999) // Incluir o dia inteiro
            if (campaign.sendDate > dateTo) return false
          }
          
          return true
        })
      }

      // Calcular métricas agregadas
      let totalSent = 0
      let totalOpens = 0
      let totalClicks = 0

      for (const campaign of filteredCampaigns) {
        totalSent += campaign.sent
        totalOpens += campaign.uniqueOpens
        totalClicks += campaign.uniqueClicks
      }

      const openRate = totalSent > 0 ? totalOpens / totalSent : 0
      const clickRate = totalSent > 0 ? totalClicks / totalSent : 0
      const clickToOpenRate = totalOpens > 0 ? totalClicks / totalOpens : 0

      const entered = automation.entered || 0

      // Badge de performance (baseado em open rate)
      let performanceBadge: 'excellent' | 'good' | 'average' | 'low' | 'none' = 'none'
      if (filteredCampaigns.length > 0) {
        if (openRate >= 0.4) performanceBadge = 'excellent' // 40%+
        else if (openRate >= 0.3) performanceBadge = 'good' // 30-39%
        else if (openRate >= 0.2) performanceBadge = 'average' // 20-29%
        else performanceBadge = 'low' // <20%
      }

      automationsWithMetrics.push({
        id: automation.id,
        accountId: automation.accountId,
        accountName: automation.account.name,
        name: automation.name,
        status: automation.status,
        entered,
        totalCampaigns: filteredCampaigns.length,
        totalSent,
        totalOpens,
        totalClicks,
        openRate,
        clickRate,
        clickToOpenRate,
        lastUpdated: automation.updatedAt,
        createdAt: automation.createdAt,
        performanceBadge,
      })
    }

    // Ordenar por performance (open rate decrescente)
    return automationsWithMetrics.sort((a, b) => b.openRate - a.openRate)
  }

  /**
   * Busca estatísticas gerais de automações
   */
  async getAutomationsStats(filters: AutomationFilters = {}): Promise<AutomationStats> {
    const automations = await this.getAutomationsWithMetrics(filters)

    const totalAutomations = automations.length
    const activeAutomations = automations.filter(a => a.status === '1').length
    const totalEntered = automations.reduce((sum, a) => sum + a.entered, 0)
    const automationsWithEmails = automations.filter(a => a.totalCampaigns > 0).length

    return {
      totalAutomations,
      activeAutomations,
      totalEntered,
      automationsWithEmails,
    }
  }

  /**
   * Busca métricas de uma automação específica
   */
  async getAutomationMetrics(
    accountId: string, 
    automationId: string,
    filters: { dateFrom?: Date; dateTo?: Date } = {}
  ): Promise<AutomationMetrics | null> {
    const automations = await this.getAutomationsWithMetrics({
      accountIds: [accountId],
      ...filters,
    })

    return automations.find(a => a.id === automationId && a.accountId === accountId) || null
  }

  /**
   * Busca campanhas de uma automação específica
   */
  async getAutomationCampaigns(
    accountId: string,
    automationId: string,
    filters: { dateFrom?: Date; dateTo?: Date } = {}
  ) {
    const automation = await prisma.automation.findUnique({
      where: {
        accountId_id: {
          accountId,
          id: automationId,
        },
      },
    })

    if (!automation) return []

    const whereClause: any = {
      accountId,
      isAutomation: true,
      OR: [
        { name: { contains: automation.name, mode: 'insensitive' } },
        { name: { startsWith: automation.name.substring(0, 10), mode: 'insensitive' } },
      ],
    }

    if (filters.dateFrom) {
      whereClause.sendDate = { gte: filters.dateFrom }
    }
    if (filters.dateTo) {
      if (whereClause.sendDate) {
        whereClause.sendDate.lte = filters.dateTo
      } else {
        whereClause.sendDate = { lte: filters.dateTo }
      }
    }

    return prisma.campaign.findMany({
      where: whereClause,
      orderBy: { sendDate: 'desc' },
      take: 50, // Limitar para performance
    })
  }

  /**
   * Busca top automações por métrica
   */
  async getTopAutomations(
    metric: 'openRate' | 'clickRate' | 'entered',
    limit: number = 5,
    filters: AutomationFilters = {}
  ) {
    const automations = await this.getAutomationsWithMetrics(filters)

    return automations
      .sort((a, b) => {
        const aValue = a[metric]
        const bValue = b[metric]
        return bValue - aValue
      })
      .slice(0, limit)
  }

  /**
   * ========================================================================
   * NOVA LÓGICA: Partir das campanhas (que têm data) para as automações
   * ========================================================================
   */

  /**
   * Agrupa campanhas por prefixo de automação
   * @private
   */
  private groupCampaignsByPrefix(campaigns: Campaign[]): Map<string, Campaign[]> {
    const groups = new Map<string, Campaign[]>()
    
    for (const campaign of campaigns) {
      // Extrair prefixo do nome
      const prefixMatch = campaign.name.match(/^(\[[\w\s-]+\])/)
      const prefix = prefixMatch ? prefixMatch[1] : null
      
      if (prefix) {
        const existing = groups.get(prefix) || []
        groups.set(prefix, [...existing, campaign])
      } else {
        // Campanhas sem prefixo vão para grupo especial
        const existing = groups.get('__sem_prefixo__') || []
        groups.set('__sem_prefixo__', [...existing, campaign])
      }
    }
    
    return groups
  }

  /**
   * Calcula métricas agregadas de campanhas para uma automação
   * @private
   */
  private calculateMetrics(
    automation: Automation & { account: { name: string } },
    campaigns: Array<{ sent: number; uniqueOpens: number; uniqueClicks: number }>
  ): AutomationMetrics {
    const totalCampaigns = campaigns.length
    const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0)
    const totalOpens = campaigns.reduce((sum, c) => sum + c.uniqueOpens, 0)
    const totalClicks = campaigns.reduce((sum, c) => sum + c.uniqueClicks, 0)
    
    const openRate = totalSent > 0 ? totalOpens / totalSent : 0
    const clickRate = totalSent > 0 ? totalClicks / totalSent : 0
    const clickToOpenRate = totalOpens > 0 ? totalClicks / totalOpens : 0
    
    let performanceBadge: 'excellent' | 'good' | 'average' | 'low' | 'none' = 'none'
    if (totalCampaigns > 0) {
      if (openRate >= 0.4) performanceBadge = 'excellent'
      else if (openRate >= 0.3) performanceBadge = 'good'
      else if (openRate >= 0.2) performanceBadge = 'average'
      else performanceBadge = 'low'
    }
    
    return {
      id: automation.id,
      accountId: automation.accountId,
      accountName: automation.account.name,
      name: automation.name,
      status: automation.status,
      entered: automation.entered || 0,
      totalCampaigns,
      totalSent,
      totalOpens,
      totalClicks,
      openRate,
      clickRate,
      clickToOpenRate,
      lastUpdated: automation.updatedAt,
      createdAt: automation.createdAt,
      performanceBadge
    }
  }

  /**
   * NOVA LÓGICA: Busca campanhas do período primeiro, depois agrupa por automação
   * Retorna automações separadas em "com atividade" e "sem atividade"
   */
  async getAutomationsWithMetricsV2(filters: AutomationFilters = {}): Promise<{
    withActivity: AutomationMetrics[]
    withoutActivity: AutomationMetrics[]
  }> {
    // 1. Buscar TODAS as automações (para ter entered/exited)
    const whereAutomations: any = {}
    
    if (filters.accountIds && filters.accountIds.length > 0) {
      whereAutomations.accountId = { in: filters.accountIds }
    }
    
    if (filters.status) {
      whereAutomations.status = filters.status
    }
    
    const automations = await prisma.automation.findMany({
      where: whereAutomations,
      include: {
        account: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })
    
    // 2. Buscar campanhas DO PERÍODO (filtro no banco!)
    const campaignsWhere: any = {
      isAutomation: true,
      sendDate: { not: null }  // Só campanhas com data
    }
    
    if (filters.accountIds && filters.accountIds.length > 0) {
      campaignsWhere.accountId = { in: filters.accountIds }
    }
    
    // Aplicar filtro de data DIRETO no banco
    if (filters.dateFrom || filters.dateTo) {
      campaignsWhere.sendDate = {}
      
      if (filters.dateFrom) {
        const dateFrom = new Date(filters.dateFrom)
        dateFrom.setHours(0, 0, 0, 0)
        campaignsWhere.sendDate.gte = dateFrom
      }
      
      if (filters.dateTo) {
        const dateTo = new Date(filters.dateTo)
        dateTo.setHours(23, 59, 59, 999)
        if (campaignsWhere.sendDate.gte) {
          campaignsWhere.sendDate.lte = dateTo
        } else {
          campaignsWhere.sendDate = { lte: dateTo }
        }
      }
    }
    
    const campaignsInPeriod = await prisma.campaign.findMany({
      where: campaignsWhere,
      select: {
        accountId: true,
        name: true,
        sent: true,
        uniqueOpens: true,
        uniqueClicks: true,
        sendDate: true,
      },
    })
    
    // 3. Agrupar campanhas por prefixo
    const campaignsByPrefix = this.groupCampaignsByPrefix(campaignsInPeriod as Campaign[])
    
    // 4. Criar métricas para cada automação
    const withActivity: AutomationMetrics[] = []
    const withoutActivity: AutomationMetrics[] = []
    
    for (const automation of automations) {
      // Extrair prefixo da automação
      const prefixMatch = automation.name.match(/^(\[[\w\s-]+\])/)
      const prefix = prefixMatch ? prefixMatch[1] : null
      
      // Buscar campanhas desse prefixo
      const campaigns = prefix ? (campaignsByPrefix.get(prefix) || []) : []
      
      // Filtrar apenas campanhas da mesma conta
      const sameCampaigns = campaigns.filter(c => c.accountId === automation.accountId)
      
      // Calcular métricas
      const metrics = this.calculateMetrics(automation, sameCampaigns)
      
      // Separar em "com atividade" vs "sem atividade"
      if (sameCampaigns.length > 0) {
        withActivity.push(metrics)
      } else {
        withoutActivity.push(metrics)
      }
    }
    
    return {
      withActivity: withActivity.sort((a, b) => b.openRate - a.openRate),
      withoutActivity: withoutActivity.sort((a, b) => 
        a.name.localeCompare(b.name, 'pt-BR', { numeric: true, sensitivity: 'base' })
      )
    }
  }

  /**
   * NOVA: Busca estatísticas considerando a separação com/sem atividade
   */
  async getAutomationsStatsV2(filters: AutomationFilters = {}): Promise<{
    total: AutomationStats
    withActivity: AutomationStats
    withoutActivity: AutomationStats
  }> {
    const { withActivity, withoutActivity } = await this.getAutomationsWithMetricsV2(filters)
    
    const calculateStats = (automations: AutomationMetrics[]): AutomationStats => ({
      totalAutomations: automations.length,
      activeAutomations: automations.filter(a => a.status === '1' || a.status === 'active').length,
      totalEntered: automations.reduce((sum, a) => sum + a.entered, 0),
      automationsWithEmails: automations.filter(a => a.totalCampaigns > 0).length
    })
    
    const allAutomations = [...withActivity, ...withoutActivity]
    
    return {
      total: calculateStats(allAutomations),
      withActivity: calculateStats(withActivity),
      withoutActivity: calculateStats(withoutActivity)
    }
  }
}

