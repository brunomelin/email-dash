import type { ActiveCampaignClient } from './client'
import type { ACContact } from './types'

interface AccountInfo {
  contactCount: number
  contactLimit: number
}

export class ContactsAPI {
  constructor(private client: ActiveCampaignClient) {}

  /**
   * Obtém o total de contatos ATIVOS da conta (excluindo deletados)
   * 
   * IMPORTANTE: Usa status=1 para filtrar apenas contatos ativos
   * e remove contatos com deleted="1" (soft-deleted) do total.
   * 
   * Isso garante que o número corresponda ao mostrado no painel do ActiveCampaign.
   */
  async getTotalContacts(): Promise<number> {
    try {
      // Buscar contatos com status=1 (ativos) em lotes de 100
      // Precisamos buscar alguns contatos para poder filtrar os deletados
      const response = await this.client.get<ACContact[]>('/contacts?status=1&limit=100')
      
      // O total de contatos está em meta.total
      if (response.meta && response.meta.total !== undefined) {
        const total = typeof response.meta.total === 'string' 
          ? parseInt(response.meta.total, 10)
          : response.meta.total
        
        if (isNaN(total) || total < 0) {
          console.warn('⚠️  Total de contatos inválido:', total)
          return 0
        }

        // Filtrar contatos deletados (soft-deleted)
        // O ActiveCampaign marca contatos como deleted="1" mas ainda os inclui no total
        const contacts = (response.contacts as ACContact[] | undefined) || []
        const deletedCount = contacts.filter(contact => contact.deleted === "1").length
        
        const activeContacts = total - deletedCount
        
        if (deletedCount > 0) {
          console.log(`   📊 Total bruto: ${total}, Deletados: ${deletedCount}, Ativos: ${activeContacts}`)
        }
        
        return activeContacts
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
   * Obtém o limite de contatos da conta
   * Usa API v1 (account_view) - única API que retorna subscriber_limit
   */
  async getContactLimit(): Promise<number> {
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
        
        if (!isNaN(contactLimit) && contactLimit >= 0) {
          return contactLimit
        }
      }

      console.warn('⚠️  API v1 não retornou subscriber_limit válido')
      return 0
    } catch (error) {
      console.error('❌ Erro ao buscar limite de contatos (API v1):', error)
      return 0
    }
  }

  /**
   * Obtém informações da conta (total + limite)
   * 
   * ESTRATÉGIA HÍBRIDA (mais confiável):
   * - Usa API v3 para buscar total de contatos (mais moderna e confiável)
   * - Usa API v1 APENAS para buscar limite (único lugar que tem essa info)
   */
  async getAccountInfo(): Promise<AccountInfo> {
    console.log('📊 Buscando informações da conta (estratégia híbrida v3 + v1)...')
    
    try {
      // 1. Buscar total de contatos via API v3 (mais confiável)
      console.log('   → API v3: buscando total de contatos...')
      const contactCount = await this.getTotalContacts()
      console.log(`   ✅ API v3: ${contactCount.toLocaleString()} contatos encontrados`)
      
      // 2. Buscar limite via API v1 (única que tem essa informação)
      console.log('   → API v1: buscando limite de contatos...')
      const contactLimit = await this.getContactLimit()
      
      if (contactLimit > 0) {
        const percentage = ((contactCount / contactLimit) * 100).toFixed(1)
        console.log(`   ✅ API v1: limite de ${contactLimit.toLocaleString()} contatos (${percentage}% usado)`)
      } else {
        console.log('   ⚠️  API v1: limite não disponível')
      }

      return {
        contactCount,
        contactLimit,
      }
    } catch (error) {
      console.error('❌ Erro ao buscar informações da conta:', error)
      
      // Fallback: retornar zeros
      return {
        contactCount: 0,
        contactLimit: 0,
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

