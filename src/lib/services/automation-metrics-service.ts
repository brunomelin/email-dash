import { prisma } from '@/lib/db'
import { Automation, Campaign } from '@prisma/client'
import { ActiveCampaignAPIv1 } from '@/lib/connectors/activecampaign/api-v1'
import { ActiveCampaignClient } from '@/lib/connectors/activecampaign/client'

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
   * NOVA LÓGICA V2: Funciona igual à página principal
   * - Busca TODAS as campanhas de automação (SEM filtro de sendDate no banco)
   * - Se houver filtro de data, busca métricas da API v1
   * - Agrupa por automação usando prefixo
   * - Retorna automações separadas em "com atividade" e "sem atividade"
   */
  async getAutomationsWithMetricsV2(filters: AutomationFilters = {}): Promise<{
    withActivity: AutomationMetrics[]
    withoutActivity: AutomationMetrics[]
  }> {
    console.log('🚀 [V2] Iniciando getAutomationsWithMetricsV2', filters)
    
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
            baseUrl: true,
            apiKey: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })
    
    console.log(`📊 [V2] Encontradas ${automations.length} automações`)
    
    // 2. HÍBRIDO: Tentar endpoint direto, se falhar usar heurística por prefixo
    const automationsWithCampaigns = await Promise.all(
      automations.map(async (automation) => {
        try {
          // Criar cliente da API para esta conta
          const client = new ActiveCampaignClient({
            baseUrl: automation.account.baseUrl,
            apiKey: automation.account.apiKey,
          })
          
          // Tentar buscar campanhas via endpoint direto
          const apiCampaigns = await client.getAutomationCampaigns(automation.id)
          
          if (apiCampaigns.length > 0) {
            console.log(`📧 [V2] Automação "${automation.name}": ${apiCampaigns.length} campanhas via API direta`)
            
            // Converter IDs para buscar no banco
            const campaignIds = apiCampaigns.map((c: any) => c.id)
            
            const campaigns = await prisma.campaign.findMany({
              where: {
                accountId: automation.accountId,
                id: { in: campaignIds },
              },
              select: {
                id: true,
                accountId: true,
                name: true,
                sent: true,
                uniqueOpens: true,
                uniqueClicks: true,
                sendDate: true,
              },
            })
            
            return { automation, campaigns }
          }
          
          // Se não retornou campanhas da API, cair no fallback
          throw new Error('No campaigns from API endpoint')
          
        } catch (error) {
          // FALLBACK: Usar heurística por prefixo (lógica antiga)
          const autoName = automation.name
          const patterns = []
          
          // Extrair prefixo entre colchetes
          const prefixMatch = autoName.match(/^(\[[\w\s-]+\])/)
          const prefix = prefixMatch ? prefixMatch[1] : null
          
          if (prefix) {
            patterns.push({ 
              name: { 
                startsWith: prefix, 
                mode: 'insensitive' as const
              } 
            })
          } else {
            // Sem prefixo: usar nome completo
            patterns.push({ name: { contains: autoName, mode: 'insensitive' as const } })
          }
          
          const campaigns = await prisma.campaign.findMany({
            where: {
              accountId: automation.accountId,
              isAutomation: true,
              OR: patterns,
            },
            select: {
              id: true,
              accountId: true,
              name: true,
              sent: true,
              uniqueOpens: true,
              uniqueClicks: true,
              sendDate: true,
            },
          })
          
          console.log(`📧 [V2] Automação "${automation.name}": ${campaigns.length} campanhas via heurística (fallback)`)
          
          return { automation, campaigns }
        }
      })
    )
    
    const totalCampaigns = automationsWithCampaigns.reduce((sum, a) => sum + a.campaigns.length, 0)
    console.log(`📧 [V2] Total de ${totalCampaigns} campanhas associadas às automações`)
    
    // 3. Se houver filtro de data, buscar métricas da API v1 para cada campanha
    if (filters.dateFrom || filters.dateTo) {
      console.log('📅 [V2] Filtro de data ativo, buscando métricas da API v1...')
      
      const sdate = filters.dateFrom?.toISOString().split('T')[0]
      let ldate = filters.dateTo?.toISOString().split('T')[0]
      
      // FIX: A API v1 do ActiveCampaign retorna 0 quando sdate = ldate
      // Solução: Adicionar +1 dia ao ldate quando forem iguais
      if (sdate && ldate && sdate === ldate) {
        const nextDay = new Date(filters.dateTo!)
        nextDay.setDate(nextDay.getDate() + 1)
        ldate = nextDay.toISOString().split('T')[0]
        console.log(`⚠️  [V2] Ajustando ldate: ${sdate} → ${ldate} (API v1 requer intervalo)`)
      }
      
      console.log(`📅 [V2] Período API v1: ${sdate} até ${ldate}`)
      
      // Atualizar métricas de cada automação com dados da API v1
      for (const item of automationsWithCampaigns) {
        if (item.campaigns.length === 0) continue
        
        const apiv1 = new ActiveCampaignAPIv1({
          baseUrl: item.automation.account.baseUrl,
          apiKey: item.automation.account.apiKey,
        })
        
        // Buscar métricas para cada campanha
        item.campaigns = await Promise.all(
          item.campaigns.map(async (campaign) => {
            try {
              const metrics = await apiv1.getCampaignReportTotals(campaign.id, {
                sdate,
                ldate,
              })
              
              return {
                ...campaign,
                sent: metrics.sent,
                uniqueOpens: metrics.opens,
                uniqueClicks: metrics.clicks,
              }
            } catch (error) {
              // Manter métricas originais em caso de erro
              return campaign
            }
          })
        )
      }
      
      console.log(`✅ [V2] Métricas da API v1 obtidas`)
    }
    
    // 4. Criar métricas para cada automação
    const withActivity: AutomationMetrics[] = []
    const withoutActivity: AutomationMetrics[] = []
    
    for (const item of automationsWithCampaigns) {
      // Calcular métricas
      const metrics = this.calculateMetrics(item.automation, item.campaigns)
      
      // Separar em "com atividade" vs "sem atividade"
      // Se houver filtro de data, considera "com atividade" apenas se tiver enviados > 0
      const hasActivity = filters.dateFrom || filters.dateTo
        ? metrics.totalSent > 0
        : item.campaigns.length > 0
      
      if (hasActivity) {
        withActivity.push(metrics)
      } else {
        withoutActivity.push(metrics)
      }
    }
    
    console.log(`✅ [V2] Com atividade: ${withActivity.length}, Sem atividade: ${withoutActivity.length}`)
    
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

