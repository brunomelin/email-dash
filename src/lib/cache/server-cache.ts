import { unstable_cache } from 'next/cache'
import { ActiveCampaignClient } from '@/lib/connectors/activecampaign/client'
import { ActiveCampaignAPIv1 } from '@/lib/connectors/activecampaign/api-v1'
import { prisma } from '@/lib/db'

/**
 * Cache para chamadas de API do ActiveCampaign
 * TTL: 5 minutos (300 segundos)
 */

/**
 * Cache para buscar campanhas de uma automação
 */
export const getCachedAutomationCampaigns = unstable_cache(
  async (automationId: string, baseUrl: string, apiKey: string) => {
    console.log(`📡 [CACHE MISS] Buscando campanhas da automação ${automationId} via API`)
    const client = new ActiveCampaignClient({ baseUrl, apiKey })
    return await client.getAutomationCampaigns(automationId)
  },
  ['automation-campaigns'],
  {
    revalidate: 300, // 5 minutos
    tags: ['automation-campaigns']
  }
)

/**
 * Cache para buscar métricas de campanha (API v1)
 */
export const getCachedCampaignMetrics = unstable_cache(
  async (
    campaignId: string,
    sdate: string,
    ldate: string,
    baseUrl: string,
    apiKey: string
  ) => {
    console.log(`📡 [CACHE MISS] Buscando métricas da campanha ${campaignId} para ${sdate}-${ldate}`)
    const apiv1 = new ActiveCampaignAPIv1({ baseUrl, apiKey })
    const metrics = await apiv1.getCampaignReportTotals(campaignId, { sdate, ldate })
    return {
      sent: metrics.sent,
      opens: metrics.opens,
      clicks: metrics.clicks
    }
  },
  ['campaign-metrics'],
  {
    revalidate: 300,
    tags: ['campaign-metrics']
  }
)

/**
 * Cache para lista de automações do banco
 */
export const getCachedAutomations = unstable_cache(
  async (accountIds: string[]) => {
    console.log(`📡 [CACHE MISS] Buscando ${accountIds.length} automações do banco`)
    return await prisma.automation.findMany({
      where: { accountId: { in: accountIds } },
      include: {
        account: {
          select: {
            name: true,
            baseUrl: true,
            apiKey: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })
  },
  ['automations-list'],
  {
    revalidate: 300,
    tags: ['automations']
  }
)

/**
 * Cache para campanhas do banco
 */
export const getCachedCampaigns = unstable_cache(
  async (accountId: string, campaignIds: string[]) => {
    console.log(`📡 [CACHE MISS] Buscando ${campaignIds.length} campanhas do banco`)
    return await prisma.campaign.findMany({
      where: {
        accountId,
        id: { in: campaignIds }
      },
      select: {
        id: true,
        accountId: true,
        name: true,
        sent: true,
        uniqueOpens: true,
        uniqueClicks: true,
        sendDate: true
      }
    })
  },
  ['campaigns-data'],
  {
    revalidate: 300,
    tags: ['campaigns']
  }
)

/**
 * Utilitário: Invalidar todos os caches
 */
export function invalidateAllCaches() {
  console.log('🔄 Invalidando todos os caches...')
  // As tags serão revalidadas quando chamadas via revalidateTag
}

