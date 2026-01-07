'use client'

import { useEffect, useState } from 'react'
import { getLastAutoSyncAction, type LastAutoSyncInfo } from '@/app/actions/auto-sync'
import { Clock, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function LastAutoSync() {
  const [syncInfo, setSyncInfo] = useState<LastAutoSyncInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchLastSync = async () => {
    try {
      const info = await getLastAutoSyncAction()
      setSyncInfo(info)
    } catch (error) {
      console.error('Erro ao buscar último auto-sync:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLastSync()
    
    // Atualizar a cada 1 minuto para manter o "há X minutos" atualizado
    const interval = setInterval(fetchLastSync, 60000)
    
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Carregando...</span>
      </div>
    )
  }

  if (!syncInfo?.lastSyncAt) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/50 px-4 py-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-muted-foreground">
            Aguardando primeira sincronização automática
          </span>
          <span className="text-xs text-muted-foreground">
            O cron job sincroniza a cada 2 horas
          </span>
        </div>
      </div>
    )
  }

  // Calcular tempo desde último sync
  const syncDate = new Date(syncInfo.lastSyncAt)
  const now = new Date()
  const hoursAgo = Math.floor((now.getTime() - syncDate.getTime()) / (1000 * 60 * 60))
  
  // Determinar cor baseado no tempo
  let statusColor = 'text-green-600 bg-green-50 border-green-200'
  let statusText = 'Atualizado'
  
  if (hoursAgo >= 3) {
    statusColor = 'text-yellow-600 bg-yellow-50 border-yellow-200'
    statusText = 'Atrasado'
  }
  
  if (hoursAgo >= 6) {
    statusColor = 'text-red-600 bg-red-50 border-red-200'
    statusText = 'Muito atrasado'
  }

  const relativeTime = formatDistanceToNow(syncDate, {
    addSuffix: true,
    locale: ptBR,
  })

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-2 ${statusColor}`}>
      <Clock className="h-4 w-4 flex-shrink-0" />
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Última atualização automática: {relativeTime}
          </span>
          <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium">
            {statusText}
          </span>
        </div>
        {syncInfo.accountsSynced > 0 && (
          <span className="text-xs opacity-75">
            {syncInfo.accountsSynced} {syncInfo.accountsSynced === 1 ? 'conta' : 'contas'} sincronizada
            {syncInfo.accountsSynced !== 1 ? 's' : ''}
            {' • '}
            Próxima em ~{2 - (hoursAgo % 2)} {2 - (hoursAgo % 2) === 1 ? 'hora' : 'horas'}
          </span>
        )}
      </div>
    </div>
  )
}


