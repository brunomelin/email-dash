import type { ActiveCampaignClient } from './client'
import type { ACMessage } from './types'

export class MessagesAPI {
  constructor(private client: ActiveCampaignClient) {}

  /**
   * Lista todas as mensagens (envios individuais)
   * Pode filtrar por campanha, período, etc.
   */
  async *listMessages(options?: {
    campaignId?: string
    fromDate?: Date
    toDate?: Date
  }): AsyncGenerator<ACMessage[], void, unknown> {
    const params = new URLSearchParams()

    if (options?.campaignId) {
      params.append('filters[campaignid]', options.campaignId)
    }

    // Filtro de data (se suportado pela API)
    // Nota: ActiveCampaign API v3 pode não suportar filtro de data direto em messages
    // Vamos tentar usando cdate (created date)
    if (options?.fromDate) {
      const isoDate = options.fromDate.toISOString()
      params.append('filters[cdate_gte]', isoDate)
    }

    if (options?.toDate) {
      const isoDate = options.toDate.toISOString()
      params.append('filters[cdate_lte]', isoDate)
    }

    // Ordenar por data de criação decrescente
    params.append('orders[cdate]', 'DESC')

    const endpoint = `/messages${params.toString() ? '?' + params.toString() : ''}`

    for await (const messages of this.client.paginate<ACMessage>(endpoint)) {
      yield messages
    }
  }

  /**
   * Lista mensagens de uma campanha específica
   */
  async *listCampaignMessages(campaignId: string): AsyncGenerator<ACMessage[], void, unknown> {
    yield* this.listMessages({ campaignId })
  }

  /**
   * Obtém uma mensagem específica
   */
  async getMessage(messageId: string): Promise<ACMessage> {
    const response = await this.client.get(`/messages/${messageId}`) as { message: ACMessage }
    return response.message
  }

  /**
   * Lista mensagens recentes (últimos N dias)
   */
  async *listRecentMessages(daysBack: number = 30): AsyncGenerator<ACMessage[], void, unknown> {
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - daysBack)

    yield* this.listMessages({ fromDate })
  }
}

