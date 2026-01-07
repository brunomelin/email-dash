'use server'

import { prisma } from '@/lib/db'

export interface LastAutoSyncInfo {
  lastSyncAt: Date | null
  accountsSynced: number
  totalRecordsSynced: number
}

/**
 * Busca informações do último auto-sync concluído com sucesso
 */
export async function getLastAutoSyncAction(): Promise<LastAutoSyncInfo> {
  try {
    // Buscar o último sync automático concluído
    const lastSync = await prisma.syncJob.findFirst({
      where: {
        isAutomatic: true,
        status: 'completed',
      },
      orderBy: {
        finishedAt: 'desc',
      },
      select: {
        finishedAt: true,
        campaignsSynced: true,
        listsSynced: true,
        automationsSynced: true,
        messagesSynced: true,
      },
    })

    if (!lastSync || !lastSync.finishedAt) {
      return {
        lastSyncAt: null,
        accountsSynced: 0,
        totalRecordsSynced: 0,
      }
    }

    // Contar quantas contas foram sincronizadas nesse batch
    // (todos os syncs automáticos que finalizaram próximo ao mesmo tempo)
    const syncWindow = new Date(lastSync.finishedAt)
    syncWindow.setMinutes(syncWindow.getMinutes() - 30) // 30 minutos de janela

    const accountsSynced = await prisma.syncJob.count({
      where: {
        isAutomatic: true,
        status: 'completed',
        finishedAt: {
          gte: syncWindow,
          lte: lastSync.finishedAt,
        },
      },
    })

    const totalRecordsSynced = 
      lastSync.campaignsSynced +
      lastSync.listsSynced +
      lastSync.automationsSynced +
      lastSync.messagesSynced

    return {
      lastSyncAt: lastSync.finishedAt,
      accountsSynced,
      totalRecordsSynced,
    }
  } catch (error) {
    console.error('Erro ao buscar último auto-sync:', error)
    return {
      lastSyncAt: null,
      accountsSynced: 0,
      totalRecordsSynced: 0,
    }
  }
}


