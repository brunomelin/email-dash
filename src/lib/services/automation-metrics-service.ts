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
          if (filters.dateFrom && campaign.sendDate < filters.dateFrom) return false
          if (filters.dateTo && campaign.sendDate > filters.dateTo) return false
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
}

