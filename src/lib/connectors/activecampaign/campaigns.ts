import type { ActiveCampaignClient } from './client'
import type { ACCampaign, ACMessage } from './types'

export class CampaignsAPI {
  constructor(private client: ActiveCampaignClient) {}

  /**
   * Lista todas as campanhas
   */
  async *listCampaigns(): AsyncGenerator<ACCampaign[], void, unknown> {
    // Ordenar por data de envio decrescente
    for await (const campaigns of this.client.paginate<ACCampaign>(
      '/campaigns?orders[sdate]=DESC'
    )) {
      yield campaigns
    }
  }

  /**
   * Obtém detalhes de uma campanha específica
   */
  async getCampaign(campaignId: string): Promise<ACCampaign> {
    const response = await this.client.get<{ campaign: ACCampaign }>(`/campaigns/${campaignId}`)
    return response.campaign as ACCampaign
  }

  /**
   * NOTA: ActiveCampaign v3 não tem endpoint direto de métricas agregadas por campanha.
   * As métricas já vêm nos objetos de campanha (opens, clicks, etc).
   * 
   * Para métricas mais detalhadas, seria necessário:
   * 1. Usar endpoint /messages para emails individuais
   * 2. Ou usar relatórios do endpoint /reports (se disponível na conta)
   * 
   * Por enquanto, usamos as métricas que já vêm em ACCampaign.
   */

  /**
   * Lista messages (emails individuais) de uma campanha
   * Útil para métricas mais detalhadas se necessário
   */
  async *listMessages(campaignId?: string): AsyncGenerator<ACMessage[], void, unknown> {
    const endpoint = campaignId 
      ? `/messages?filters[campaignid]=${campaignId}`
      : '/messages'
    
    for await (const messages of this.client.paginate<ACMessage>(endpoint)) {
      yield messages
    }
  }

  /**
   * Busca as listas associadas a uma campanha
   */
  async getCampaignLists(campaignId: string): Promise<string[]> {
    try {
      const response = await this.client.get<{ campaignLists: Array<{ list: string; listid: string }> }>(
        `/campaigns/${campaignId}/campaignLists`
      )
      
      // Verificar se response tem campaignLists e é um array
      if ('campaignLists' in response && Array.isArray(response.campaignLists)) {
        // Retornar array de IDs de listas
        return response.campaignLists.map((cl: { list: string; listid: string }) => cl.list || cl.listid)
      }
      
      return []
    } catch (error) {
      // Se der erro, retornar array vazio (campanha pode não ter lista)
      console.warn(`Erro ao buscar listas da campanha ${campaignId}:`, error)
      return []
    }
  }
}

