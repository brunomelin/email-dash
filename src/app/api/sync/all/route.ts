import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SyncService } from '@/lib/services/sync-service'

export const maxDuration = 180 // 3 minutos (máximo permitido no Vercel Hobby)
export const dynamic = 'force-dynamic'

/**
 * API Route para sincronizar todas as contas
 * 
 * Esta route é usada em vez de Server Action porque:
 * - Permite timeouts mais longos (até 180s)
 * - Melhor controle de streaming/progress
 * - Mais adequada para operações longas
 */
export async function POST() {
  try {
    console.log('🚀 [API] Sync All iniciado')
    
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    })
    
    console.log(`✅ [API] Encontradas ${accounts.length} contas ativas`)

    const syncService = new SyncService()
    const results = await syncService.syncMultipleAccounts(
      accounts.map(a => a.id),
      false // isAutomatic = false (sync manual via botão)
    )
    
    console.log('✅ [API] Sync concluído')
    
    // Calcular totais
    const totals = results.reduce((acc, r) => ({
      campaigns: acc.campaigns + (r.campaignsSynced || 0),
      lists: acc.lists + (r.listsSynced || 0),
      automations: acc.automations + (r.automationsSynced || 0),
      messages: acc.messages + (r.messagesSynced || 0),
    }), { campaigns: 0, lists: 0, automations: 0, messages: 0 })

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: errorCount === 0,
      totalAccounts: accounts.length,
      successCount,
      errorCount,
      totals,
      results: results.map((r, i) => ({
        account: accounts[i].name,
        success: r.success,
        error: r.error,
        campaignsSynced: r.campaignsSynced,
        listsSynced: r.listsSynced,
        automationsSynced: r.automationsSynced,
        messagesSynced: r.messagesSynced,
      })),
    })
  } catch (error) {
    console.error('💥 [API] Erro crítico:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 500 }
    )
  }
}

