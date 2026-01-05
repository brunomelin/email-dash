import { prisma } from '@/lib/db'
import {
  ActiveCampaignClient,
  CampaignsAPI,
  ListsAPI,
  AutomationsAPI,
  MessagesAPI,
  ContactsAPI,
  normalizeCampaign,
  normalizeList,
  normalizeAutomation,
  normalizeMessage,
  extractListIds,
} from '@/lib/connectors/activecampaign'

export interface SyncResult {
  success: boolean
  campaignsSynced: number
  listsSynced: number
  automationsSynced: number
  messagesSynced: number
  contactCount?: number
  error?: string
}

export class SyncService {
  /**
   * Sincroniza todos os dados de uma conta
   */
  async syncAccount(accountId: string, isAutomatic = false): Promise<SyncResult> {
    // Criar job de sync
    const syncJob = await prisma.syncJob.create({
      data: {
        accountId,
        status: 'running',
        isAutomatic,
      },
    })

    try {
      // Buscar configuração da conta
      const account = await prisma.account.findUnique({
        where: { id: accountId },
      })

      if (!account) {
        throw new Error(`Account ${accountId} not found`)
      }

      if (!account.isActive) {
        throw new Error(`Account ${accountId} is not active`)
      }

      // Inicializar cliente ActiveCampaign
      const client = new ActiveCampaignClient({
        baseUrl: account.baseUrl,
        apiKey: account.apiKey,
      })

      const campaignsAPI = new CampaignsAPI(client)
      const listsAPI = new ListsAPI(client)
      const automationsAPI = new AutomationsAPI(client)
      const messagesAPI = new MessagesAPI(client)
      const contactsAPI = new ContactsAPI(client)

      let campaignsSynced = 0
      let listsSynced = 0
      let automationsSynced = 0
      let messagesSynced = 0
      let contactCount = 0

      // 1. Sincronizar Listas
      console.log(`📋 Sincronizando listas da conta ${account.name}...`)
      for await (const listsBatch of listsAPI.listLists()) {
        for (const acList of listsBatch) {
          const normalized = normalizeList(acList, accountId)
          
          await prisma.list.upsert({
            where: {
              accountId_id: {
                accountId,
                id: acList.id,
              },
            },
            create: normalized as any,
            update: normalized as any,
          })

          listsSynced++
        }
      }
      console.log(`✅ ${listsSynced} listas sincronizadas`)

      // 2. Sincronizar Informações de Contatos (total + limite)
      console.log(`👥 Sincronizando informações de contatos da conta ${account.name}...`)
      try {
        const accountInfo = await contactsAPI.getAccountInfo()
        contactCount = accountInfo.contactCount
        
        // Atualizar conta com informações de contatos
        await prisma.account.update({
          where: { id: accountId },
          data: {
            contactCount: accountInfo.contactCount,
            contactLimit: accountInfo.contactLimit > 0 ? accountInfo.contactLimit : undefined,
            lastContactSync: new Date(),
          },
        })
        
        console.log(`✅ Contatos: ${accountInfo.contactCount.toLocaleString()}`)
        if (accountInfo.contactLimit > 0) {
          const percentage = ((accountInfo.contactCount / accountInfo.contactLimit) * 100).toFixed(1)
          console.log(`✅ Limite: ${accountInfo.contactLimit.toLocaleString()} (${percentage}% usado)`)
        }
      } catch (error) {
        console.warn(`⚠️  Não foi possível sincronizar informações de contatos:`, error)
        // Não falhar o sync por causa disso
      }

      // 3. Sincronizar Campanhas
      console.log(`📧 Sincronizando campanhas da conta ${account.name}...`)
      for await (const campaignsBatch of campaignsAPI.listCampaigns()) {
        for (const acCampaign of campaignsBatch) {
          const normalized = normalizeCampaign(acCampaign, accountId)

          // Upsert campanha
          await prisma.campaign.upsert({
            where: {
              accountId_id: {
                accountId,
                id: acCampaign.id,
              },
            },
            create: normalized as any,
            update: normalized as any,
          })

          // Buscar listas da campanha via API (endpoint separado)
          const listIds = await campaignsAPI.getCampaignLists(acCampaign.id)

          // Sincronizar relacionamentos com listas
          // Primeiro, remover relacionamentos antigos
          await prisma.campaignList.deleteMany({
            where: {
              accountId,
              campaignId: acCampaign.id,
            },
          })

          // Criar novos relacionamentos
          for (const listId of listIds) {
            // Verificar se a lista existe antes de criar relacionamento
            const listExists = await prisma.list.findUnique({
              where: {
                accountId_id: {
                  accountId,
                  id: listId,
                },
              },
            })

            if (listExists) {
              await prisma.campaignList.create({
                data: {
                  accountId,
                  campaignId: acCampaign.id,
                  listId,
                },
              })
            }
          }

          campaignsSynced++
        }
      }
      console.log(`✅ ${campaignsSynced} campanhas sincronizadas`)

      // 4. Sincronizar Automações
      console.log(`🤖 Sincronizando automações da conta ${account.name}...`)
      for await (const automationsBatch of automationsAPI.listAutomations()) {
        for (const acAutomation of automationsBatch) {
          const normalized = normalizeAutomation(acAutomation, accountId)

          await prisma.automation.upsert({
            where: {
              accountId_id: {
                accountId,
                id: acAutomation.id,
              },
            },
            create: normalized as any,
            update: normalized as any,
          })

          automationsSynced++
        }
      }
      console.log(`✅ ${automationsSynced} automações sincronizadas`)

      // 5. Sincronizar Messages (últimos 90 dias para não sobrecarregar)
      console.log(`📬 Sincronizando mensagens dos últimos 90 dias da conta ${account.name}...`)
      
      // Buscar mensagens recentes (últimos 90 dias)
      for await (const messagesBatch of messagesAPI.listRecentMessages(90)) {
        for (const acMessage of messagesBatch) {
          // Verificar se a campanha existe antes de criar a message
          if (!acMessage.campaignid) {
            continue // Pular messages sem campanha associada
          }

          const campaignExists = await prisma.campaign.findUnique({
            where: {
              accountId_id: {
                accountId,
                id: acMessage.campaignid,
              },
            },
          })

          if (!campaignExists) {
            continue // Pular se a campanha não existe
          }

          const normalized = normalizeMessage(acMessage, accountId)

          await prisma.campaignMessage.upsert({
            where: {
              accountId_id: {
                accountId,
                id: acMessage.id,
              },
            },
            create: normalized as any,
            update: normalized as any,
          })

          messagesSynced++
        }
      }
      console.log(`✅ ${messagesSynced} mensagens sincronizadas`)

      // Atualizar job como completo
      await prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: 'completed',
          finishedAt: new Date(),
          campaignsSynced,
          listsSynced,
          automationsSynced,
          messagesSynced,
        },
      })

      return {
        success: true,
        campaignsSynced,
        listsSynced,
        automationsSynced,
        messagesSynced,
        contactCount,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Atualizar job como falho
      await prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          error: errorMessage,
        },
      })

      console.error(`❌ Erro na sincronização da conta ${accountId}:`, error)

      return {
        success: false,
        campaignsSynced: 0,
        listsSynced: 0,
        automationsSynced: 0,
        messagesSynced: 0,
        error: errorMessage,
      }
    }
  }

  /**
   * Sincroniza múltiplas contas em paralelo
   */
  async syncMultipleAccounts(accountIds: string[], isAutomatic = false): Promise<SyncResult[]> {
    const results = await Promise.allSettled(
      accountIds.map(id => this.syncAccount(id, isAutomatic))
    )

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          success: false,
          campaignsSynced: 0,
          listsSynced: 0,
          automationsSynced: 0,
          messagesSynced: 0,
          error: result.reason?.message || 'Unknown error',
        }
      }
    })
  }
}

