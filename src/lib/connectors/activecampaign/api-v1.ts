/**
 * Connector para ActiveCampaign API v1
 * 
 * A API v1 suporta filtros de data através do endpoint campaign_report_totals,
 * permitindo buscar métricas específicas de um período.
 */

export interface CampaignReportTotals {
  sent: number
  opens: number
  clicks: number
  bounces: number
  unsubscribes: number
  forwards: number
  openRate: number
  clickRate: number
}

interface APIv1Response {
  result_code: number
  result_message: string
  send_amt?: string
  total_amt?: string
  uniqueopens?: string
  subscriberclicks?: string
  uniquelinkclicks?: string
  totalbounces?: string
  unsubscribes?: string
  forwards?: string
  open_rate?: string
  clickthrough_rate?: string
  [key: string]: any
}

export class ActiveCampaignAPIv1 {
  private baseUrl: string
  private apiKey: string

  constructor(config: { baseUrl: string; apiKey: string }) {
    // Remover /api/3 se existir para obter base URL limpa
    this.baseUrl = config.baseUrl.replace(/\/api\/3.*/, '')
    this.apiKey = config.apiKey
  }

  /**
   * Busca métricas de uma campanha com filtro de data
   * 
   * @param campaignId - ID da campanha
   * @param options - Opções de filtro (sdate e ldate no formato YYYY-MM-DD)
   * @returns Métricas da campanha no período especificado
   */
  async getCampaignReportTotals(
    campaignId: string,
    options?: {
      sdate?: string  // Data início (YYYY-MM-DD)
      ldate?: string  // Data fim (YYYY-MM-DD)
    }
  ): Promise<CampaignReportTotals> {
    const params = new URLSearchParams({
      api_action: 'campaign_report_totals',
      api_output: 'json',
      campaignid: campaignId,
      api_key: this.apiKey,
    })

    // Adicionar filtros de data se fornecidos
    if (options?.sdate) {
      params.append('sdate', options.sdate)
    }

    if (options?.ldate) {
      params.append('ldate', options.ldate)
    }

    const url = `${this.baseUrl}/admin/api.php?${params.toString()}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: APIv1Response = await response.json()

      // Verificar se a API retornou erro
      if (data.result_code !== 1) {
        throw new Error(data.result_message || 'Erro desconhecido da API v1')
      }

      // Parse dos valores (API v1 retorna strings)
      const sent = parseInt(data.send_amt || '0', 10)
      const opens = parseInt(data.uniqueopens || '0', 10)
      const clicks = parseInt(data.subscriberclicks || data.uniquelinkclicks || '0', 10)
      const bounces = parseInt(data.totalbounces || '0', 10)
      const unsubscribes = parseInt(data.unsubscribes || '0', 10)
      const forwards = parseInt(data.forwards || '0', 10)

      // Calcular rates
      const openRate = sent > 0 ? opens / sent : 0
      const clickRate = sent > 0 ? clicks / sent : 0

      return {
        sent,
        opens,
        clicks,
        bounces,
        unsubscribes,
        forwards,
        openRate,
        clickRate,
      }
    } catch (error) {
      console.error(`Erro ao buscar métricas da campanha ${campaignId}:`, error)
      
      // Retornar métricas zeradas em caso de erro
      return {
        sent: 0,
        opens: 0,
        clicks: 0,
        bounces: 0,
        unsubscribes: 0,
        forwards: 0,
        openRate: 0,
        clickRate: 0,
      }
    }
  }

  /**
   * Busca métricas de múltiplas campanhas em paralelo
   */
  async getBulkCampaignReportTotals(
    campaignIds: string[],
    options?: {
      sdate?: string
      ldate?: string
    }
  ): Promise<Map<string, CampaignReportTotals>> {
    const results = await Promise.all(
      campaignIds.map(async (id) => {
        const metrics = await this.getCampaignReportTotals(id, options)
        return { id, metrics }
      })
    )

    return new Map(results.map(r => [r.id, r.metrics]))
  }
}

