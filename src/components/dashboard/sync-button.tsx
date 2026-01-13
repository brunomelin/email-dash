'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { syncAccountAction, syncAllAccountsAction } from '@/app/actions/sync'
import { RefreshCw } from 'lucide-react'

interface SyncButtonProps {
  accountId?: string
  accountName?: string
  variant?: 'default' | 'outline' | 'secondary'
}

export function SyncButton({ accountId, accountName, variant = 'default' }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    try {
      console.log('🚀 [SYNC] Iniciando sincronização...', { accountId, accountName })
      
      if (accountId) {
        console.log('🔄 [SYNC] Sincronizando conta individual:', accountId)
        const result = await syncAccountAction(accountId)
        console.log('📊 [SYNC] Resultado da sincronização:', result)
        
        if (result.success) {
          alert(`✅ Sincronização de ${accountName} concluída!\n\nCampanhas: ${result.campaignsSynced}\nListas: ${result.listsSynced}\nAutomações: ${result.automationsSynced}\nMessages: ${result.messagesSynced}`)
          window.location.reload() // Recarregar para mostrar novos dados
        } else {
          console.error('❌ [SYNC] Erro na sincronização:', result.error)
          alert(`❌ Erro na sincronização: ${result.error}`)
        }
      } else {
        // Usar API Route para evitar timeout de Server Actions
        // API Routes permitem timeouts mais longos (até 180s)
        console.log('🔄 [SYNC] Sincronizando todas as contas via API...')
        
        const response = await fetch('/api/sync/all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()
        console.log('📊 [SYNC] Resultado da sincronização de todas:', result)
        
        if (result.success || result.successCount > 0) {
          const msg = result.errorCount > 0
            ? `✅ Sincronização concluída com avisos!\n\n` +
              `Sucesso: ${result.successCount}/${result.totalAccounts} contas\n\n` +
              `Campanhas: ${result.totals.campaigns}\n` +
              `Listas: ${result.totals.lists}\n` +
              `Automações: ${result.totals.automations}\n` +
              `Messages: ${result.totals.messages}\n\n` +
              `⚠️ ${result.errorCount} conta(s) com erro`
            : `✅ Sincronização de todas as contas concluída!\n\n` +
              `${result.totalAccounts} contas sincronizadas\n\n` +
              `Campanhas: ${result.totals.campaigns}\n` +
              `Listas: ${result.totals.lists}\n` +
              `Automações: ${result.totals.automations}\n` +
              `Messages: ${result.totals.messages}`
          
          alert(msg)
          window.location.reload() // Recarregar para mostrar novos dados
        } else {
          console.error('❌ [SYNC] Erro na sincronização de todas:', result.error || 'Erro desconhecido')
          alert(`❌ Erro na sincronização: ${result.error || 'Erro desconhecido'}`)
        }
      }
    } catch (error) {
      console.error('💥 [SYNC] Erro crítico:', error)
      alert(`❌ Erro: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      console.log('✅ [SYNC] Finalizado')
      setSyncing(false)
    }
  }

  return (
    <Button
      onClick={handleSync}
      disabled={syncing}
      variant={variant}
    >
      <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Sincronizando...' : accountName ? `Sync ${accountName}` : 'Sync Todas'}
    </Button>
  )
}

