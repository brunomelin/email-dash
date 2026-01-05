import type { ActiveCampaignClient } from './client'
import type { ACContact } from './types'

interface AccountInfo {
  contactCount: number
  contactLimit: number
}

export class ContactsAPI {
  constructor(private client: ActiveCampaignClient) {}

  /**
   * Obtém o total de contatos da conta
   * Usa limit=1 para performance (só precisamos do meta.total)
   */
  async getTotalContacts(): Promise<number> {
    try {
      const response = await this.client.get<ACContact[]>('/contacts?limit=1')
      
      // O total de contatos está em meta.total
      // A API retorna como string, então precisamos fazer parse
      if (response.meta && response.meta.total !== undefined) {
        const total = typeof response.meta.total === 'string' 
          ? parseInt(response.meta.total, 10)
          : response.meta.total
        
        if (!isNaN(total) && total >= 0) {
          return total
        }
      }

      console.warn('⚠️  Não foi possível obter total de contatos da API')
      console.warn('Resposta recebida:', JSON.stringify(response))
      return 0
    } catch (error) {
      console.error('❌ Erro ao buscar total de contatos:', error)
      return 0
    }
  }

  /**
   * Obtém informações da conta incluindo limite de contatos
   * Usa API v1 (account_view) que retorna subscriber_limit e subscriber_total
   */
  async getAccountInfo(): Promise<AccountInfo> {
    try {
      const baseUrl = this.client.getBaseUrl()
      const apiKey = this.client.getApiKey()
      
      // API v1 usa formato diferente: /admin/api.php?api_key=X&api_action=account_view
      const params = new URLSearchParams({
        api_key: apiKey,
        api_action: 'account_view',
        api_output: 'json',
      })
      
      const url = `${baseUrl}/admin/api.php?${params.toString()}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.result_code === 1) {
        const contactLimit = parseInt(data.subscriber_limit || '0', 10)
        const contactCount = parseInt(data.subscriber_total || '0', 10)

        return {
          contactCount,
          contactLimit,
        }
      } else {
        throw new Error(data.result_message || 'Erro ao buscar informações da conta')
      }
    } catch (error) {
      console.error('❌ Erro ao buscar informações da conta (API v1):', error)
      
      // Fallback: retornar apenas o total via API v3
      const contactCount = await this.getTotalContacts()
      return {
        contactCount,
        contactLimit: 0, // Não conseguiu buscar o limite
      }
    }
  }

  /**
   * Lista contatos com paginação (se necessário no futuro)
   */
  async *listContacts(limit: number = 100): AsyncGenerator<ACContact[], void, unknown> {
    yield* this.client.paginate<ACContact>('/contacts', limit)
  }
}

