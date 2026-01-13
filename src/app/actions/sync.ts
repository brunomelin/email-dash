'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { SyncService } from '@/lib/services/sync-service'

export async function syncAccountAction(accountId: string) {
  try {
    const syncService = new SyncService()
    const result = await syncService.syncAccount(accountId)
    
    // Invalidar caches
    console.log('🔄 Invalidando caches após sync...')
    revalidatePath('/')
    revalidateTag('automations')
    revalidateTag('automation-campaigns')
    revalidateTag('campaign-metrics')
    revalidateTag('campaigns')
    
    // Warm cache em background (não aguardar)
    if (typeof window === 'undefined') {
      // Apenas no servidor
      try {
        const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL || 'http://localhost:3000'
        const cronSecret = process.env.CRON_SECRET
        
        if (cronSecret) {
          console.log('🔥 Iniciando warm cache em background...')
          fetch(`${baseUrl}/api/cron/warm-cache`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${cronSecret}`
            }
          }).catch(err => console.error('Erro ao warm cache:', err))
        }
      } catch (err) {
        console.error('Erro ao iniciar warm cache:', err)
      }
    }
    
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
    
    // Invalidar caches
    console.log('🔄 Invalidando caches após sync de todas contas...')
    revalidatePath('/')
    revalidateTag('automations')
    revalidateTag('automation-campaigns')
    revalidateTag('campaign-metrics')
    revalidateTag('campaigns')
    
    // Warm cache em background
    if (typeof window === 'undefined') {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL || 'http://localhost:3000'
        const cronSecret = process.env.CRON_SECRET
        
        if (cronSecret) {
          console.log('🔥 Iniciando warm cache em background...')
          fetch(`${baseUrl}/api/cron/warm-cache`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${cronSecret}`
            }
          }).catch(err => console.error('Erro ao warm cache:', err))
        }
      } catch (err) {
        console.error('Erro ao iniciar warm cache:', err)
      }
    }
    
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

