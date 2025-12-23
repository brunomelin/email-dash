import type { ActiveCampaignClient } from './client'
import type { ACList } from './types'

export class ListsAPI {
  constructor(private client: ActiveCampaignClient) {}

  /**
   * Lista todas as listas
   */
  async *listLists(): AsyncGenerator<ACList[], void, unknown> {
    for await (const lists of this.client.paginate<ACList>('/lists')) {
      yield lists
    }
  }

  /**
   * Obtém detalhes de uma lista específica
   */
  async getList(listId: string): Promise<ACList> {
    const response = await this.client.get<{ list: ACList }>(`/lists/${listId}`)
    return response.list as ACList
  }
}

