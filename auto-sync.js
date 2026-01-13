#!/usr/bin/env node
/**
 * Auto-Sync Script
 * 
 * Este script é executado automaticamente via cron job a cada 2 horas
 * para sincronizar dados de todas as contas ativas do ActiveCampaign.
 * 
 * Configuração do Cron (no servidor):
 * Executar: crontab -e
 * Adicionar: 0 (asterisco)/2 (asterisco) (asterisco) (asterisco) (asterisco) cd /home/deploy/apps/email-dash && node auto-sync.js >> /home/deploy/logs/auto-sync.log 2>&1
 * 
 * Isso executará a cada 2 horas: 00:00, 02:00, 04:00, etc.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function autoSync() {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  
  console.log('\n' + '='.repeat(80))
  console.log(`🔄 [AUTO-SYNC] Iniciado em ${timestamp}`)
  console.log('='.repeat(80))

  try {
    // 1. Buscar todas as contas ativas
    console.log('\n📊 Buscando contas ativas...')
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      select: { 
        id: true, 
        name: true,
        baseUrl: true,
      },
      orderBy: { name: 'asc' },
    })

    if (accounts.length === 0) {
      console.log('⚠️  Nenhuma conta ativa encontrada')
      await prisma.$disconnect()
      return
    }

    console.log(`✅ Encontradas ${accounts.length} contas ativas:`)
    accounts.forEach((acc, idx) => {
      console.log(`   ${idx + 1}. ${acc.name}`)
    })

    // 2. Importar SyncService dinamicamente
    let SyncService
    try {
      // Tentar carregar com TypeScript
      require('tsx/cjs')
      const module = require('./src/lib/services/sync-service.ts')
      SyncService = module.SyncService
    } catch (error) {
      console.error('❌ Erro ao carregar SyncService:', error.message)
      console.error('💡 Instale tsx com: npm install -D tsx')
      console.error('💡 Ou certifique-se de que o TypeScript está configurado')
      await prisma.$disconnect()
      process.exit(1)
    }

    if (!SyncService) {
      console.error('❌ SyncService não encontrado no módulo')
      await prisma.$disconnect()
      process.exit(1)
    }

    const syncService = new SyncService()

    // 3. Sincronizar todas as contas em PARALELO (muito mais rápido!)
    console.log('\n🔄 Iniciando sincronização em PARALELO de todas as contas...\n')
    console.log('⚡ Isso vai ser MUITO mais rápido que antes!\n')
    
    // Executar todas em paralelo
    const syncPromises = accounts.map(async (account, index) => {
      const accountStartTime = Date.now()
      
      console.log(`[${index + 1}/${accounts.length}] 🚀 Iniciando: ${account.name}`)
      
      try {
        const result = await syncService.syncAccount(account.id, true) // isAutomatic = true
        
        const duration = ((Date.now() - accountStartTime) / 1000).toFixed(1)
        
        if (result.success) {
          console.log(`[${index + 1}/${accounts.length}] ✅ ${account.name} concluída em ${duration}s`)
        } else {
          console.error(`[${index + 1}/${accounts.length}] ❌ ${account.name} falhou: ${result.error}`)
        }
        
        return {
          account: account.name,
          success: result.success,
          duration,
          ...result,
        }
      } catch (error) {
        const duration = ((Date.now() - accountStartTime) / 1000).toFixed(1)
        console.error(`[${index + 1}/${accounts.length}] ❌ ${account.name} exceção: ${error.message}`)
        
        return {
          account: account.name,
          success: false,
          duration,
          error: error.message,
          campaignsSynced: 0,
          listsSynced: 0,
          automationsSynced: 0,
          messagesSynced: 0,
        }
      }
    })
    
    // Aguardar todas terminarem
    console.log('\n⏳ Aguardando todas as sincronizações terminarem...\n')
    const results = await Promise.allSettled(syncPromises)
    
    // Processar resultados
    const finalResults = results.map(r => r.status === 'fulfilled' ? r.value : {
      account: 'Desconhecido',
      success: false,
      duration: '0',
      error: r.reason?.message || 'Erro desconhecido',
      campaignsSynced: 0,
      listsSynced: 0,
      automationsSynced: 0,
      messagesSynced: 0,
    })
    
    const successCount = finalResults.filter(r => r.success).length
    const errorCount = finalResults.filter(r => !r.success).length

    // 4. Resumo final
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1)
    
    console.log('\n' + '='.repeat(80))
    console.log('📊 RESUMO DA SINCRONIZAÇÃO')
    console.log('='.repeat(80))
    console.log(`✅ Sucesso: ${successCount} contas`)
    console.log(`❌ Erros: ${errorCount} contas`)
    console.log(`⏱️  Duração total: ${totalDuration}s`)
    console.log(`🕐 Finalizado em: ${new Date().toISOString()}`)
    
    if (successCount > 0) {
      const totals = finalResults
        .filter(r => r.success)
        .reduce((acc, r) => ({
          campaigns: acc.campaigns + (r.campaignsSynced || 0),
          lists: acc.lists + (r.listsSynced || 0),
          automations: acc.automations + (r.automationsSynced || 0),
          messages: acc.messages + (r.messagesSynced || 0),
        }), { campaigns: 0, lists: 0, automations: 0, messages: 0 })
      
      console.log('\n📈 Totais sincronizados:')
      console.log(`   - Campanhas: ${totals.campaigns}`)
      console.log(`   - Listas: ${totals.lists}`)
      console.log(`   - Automações: ${totals.automations}`)
      console.log(`   - Mensagens: ${totals.messages}`)
    }
    
    if (errorCount > 0) {
      console.log('\n⚠️  Contas com erro:')
      finalResults
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.account}: ${r.error || 'Erro desconhecido'}`)
        })
    }
    
    console.log('='.repeat(80) + '\n')

  } catch (error) {
    console.error('\n💥 ERRO CRÍTICO no auto-sync:', error)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
autoSync().catch((error) => {
  console.error('💥 Erro fatal:', error)
  process.exit(1)
})

