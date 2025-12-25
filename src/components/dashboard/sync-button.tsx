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
        console.log('🔄 [SYNC] Sincronizando todas as contas...')
        const result = await syncAllAccountsAction()
        console.log('📊 [SYNC] Resultado da sincronização de todas:', result)
        
        if (result.success) {
          const total = result.results.reduce((acc, r) => ({
            campaigns: acc.campaigns + r.campaignsSynced,
            lists: acc.lists + r.listsSynced,
            automations: acc.automations + r.automationsSynced,
            messages: acc.messages + r.messagesSynced,
          }), { campaigns: 0, lists: 0, automations: 0, messages: 0 })
          
          alert(`✅ Sincronização de todas as contas concluída!\n\nCampanhas: ${total.campaigns}\nListas: ${total.lists}\nAutomações: ${total.automations}\nMessages: ${total.messages}`)
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

