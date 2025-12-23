import type { ActiveCampaignClient } from './client'
import type { ACAutomation } from './types'

export class AutomationsAPI {
  constructor(private client: ActiveCampaignClient) {}

  /**
   * Lista todas as automações
   */
  async *listAutomations(): AsyncGenerator<ACAutomation[], void, unknown> {
    for await (const automations of this.client.paginate<ACAutomation>('/automations')) {
      yield automations
    }
  }

  /**
   * Obtém detalhes de uma automação específica
   */
  async getAutomation(automationId: string): Promise<ACAutomation> {
    const response = await this.client.get<{ automation: ACAutomation }>(
      `/automations/${automationId}`
    )
    return response.automation as ACAutomation
  }

  /**
   * LIMITAÇÃO: A API v3 do ActiveCampaign não fornece métricas detalhadas
   * de emails enviados por automações (opens, clicks, etc).
   * 
   * Métricas disponíveis:
   * - entered: quantos contatos entraram na automação
   * - exited: quantos contatos saíram
   * 
   * Para métricas de email seria necessário:
   * 1. Identificar messages/emails associados à automação (não trivial)
   * 2. Ou usar webhooks para trackear em tempo real
   * 3. Ou usar API de relatórios avançados (se disponível)
   * 
   * Estratégia atual: capturar apenas entered/exited e documentar limitação.
   */
}

