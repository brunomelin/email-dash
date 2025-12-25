'use server'

import { revalidatePath } from 'next/cache'
import { SyncService } from '@/lib/services/sync-service'

export async function syncAccountAction(accountId: string) {
  try {
    const syncService = new SyncService()
    const result = await syncService.syncAccount(accountId)
    
    // Revalidar cache da página
    revalidatePath('/')
    
    return result
  } catch (error) {
    console.error('Erro no syncAccountAction:', error)
    return {
      success: false,
      campaignsSynced: 0,
      listsSynced: 0,
      automationsSynced: 0,
      messagesSynced: 0,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function syncAllAccountsAction() {
  try {
    console.log('🚀 [SERVER] syncAllAccountsAction iniciado')
    const { prisma } = await import('@/lib/db')
    
    console.log('📊 [SERVER] Buscando contas ativas...')
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      select: { id: true },
    })
    console.log(`✅ [SERVER] Encontradas ${accounts.length} contas ativas`)

    console.log('🔄 [SERVER] Iniciando sync...')
    const syncService = new SyncService()
    const results = await syncService.syncMultipleAccounts(
      accounts.map(a => a.id)
    )
    console.log('✅ [SERVER] Sync concluído:', results)
    
    revalidatePath('/')
    
    return {
      success: results.every(r => r.success),
      results,
    }
  } catch (error) {
    console.error('💥 [SERVER] Erro no syncAllAccountsAction:', error)
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

