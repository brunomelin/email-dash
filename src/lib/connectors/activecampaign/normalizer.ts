import type { ACCampaign, ACList, ACAutomation, ACMessage } from './types'
import type { Campaign, List, Automation, CampaignMessage } from '@prisma/client'

/**
 * Normaliza dados do ActiveCampaign para o schema interno
 */

export function normalizeCampaign(
  acCampaign: ACCampaign,
  accountId: string
): Omit<Campaign, 'createdAt' | 'updatedAt'> {
  // Detectar se é automação
  const rawPayload = acCampaign as unknown as Record<string, unknown>
  const isAutomation = 
    rawPayload.automation === '1' || 
    rawPayload.automation === 1 ||
    (rawPayload.seriesid && rawPayload.seriesid !== '0')

  // Mapear status numérico para string
  const statusMap: Record<number, string> = {
    0: 'draft',
    1: 'scheduled',
    2: 'sending',
    3: 'paused',
    4: 'stopped',
    5: 'completed',
  }

  let status = statusMap[acCampaign.status] || 'unknown'
  
  // Override status se for automação
  if (isAutomation) {
    status = 'automation'
  }

  // Parse números que vêm como string
  const sent = parseInt(acCampaign.send_amt || '0', 10)
  const opens = parseInt(acCampaign.opens || '0', 10)
  const uniqueOpens = parseInt(acCampaign.uniqueopens || '0', 10)
  const clicks = parseInt(acCampaign.linkclicks || '0', 10)
  const uniqueClicks = parseInt(acCampaign.uniquelinkclicks || '0', 10)
  const bounces = 
    parseInt(acCampaign.hardbounces || '0', 10) +
    parseInt(acCampaign.softbounces || '0', 10)
  const unsubscribes = parseInt(acCampaign.unsubscribes || '0', 10)

  // Calcular rates
  const openRate = sent > 0 ? uniqueOpens / sent : 0
  const clickRate = sent > 0 ? uniqueClicks / sent : 0
  const clickToOpenRate = uniqueOpens > 0 ? uniqueClicks / uniqueOpens : 0

  // Parse data de envio
  const sendDate = acCampaign.sdate ? new Date(acCampaign.sdate) : null

  // Tipo: automation se detectado, senão usa o tipo da campanha
  const type = isAutomation ? 'automation' : acCampaign.type

  return {
    id: acCampaign.id,
    accountId,
    name: acCampaign.name,
    status,
    type,
    sendDate,
    isAutomation,
    sent,
    opens,
    uniqueOpens,
    openRate,
    clicks,
    uniqueClicks,
    clickRate,
    clickToOpenRate,
    bounces,
    unsubscribes,
    rawPayload: acCampaign as unknown as Record<string, unknown>,
  }
}

export function normalizeList(
  acList: ACList,
  accountId: string
): Omit<List, 'createdAt' | 'updatedAt'> {
  const activeContacts = acList.subscriber_count
    ? parseInt(acList.subscriber_count, 10)
    : null

  return {
    id: acList.id,
    accountId,
    name: acList.name,
    activeContacts,
    totalContacts: activeContacts, // AC não diferencia por padrão
    rawPayload: acList as unknown as Record<string, unknown>,
  }
}

export function normalizeAutomation(
  acAutomation: ACAutomation,
  accountId: string
): Omit<Automation, 'createdAt' | 'updatedAt'> {
  const entered = parseInt(acAutomation.entered || '0', 10)
  const exited = parseInt(acAutomation.exited || '0', 10)
  const active = Math.max(0, entered - exited) // aproximação

  // Mapear status
  const status = acAutomation.status === '1' ? 'active' : 'inactive'

  return {
    id: acAutomation.id,
    accountId,
    name: acAutomation.name,
    status,
    entered,
    completed: exited, // aproximação: exited = completed
    active,
    rawPayload: acAutomation as unknown as Record<string, unknown>,
  }
}

/**
 * Normaliza uma mensagem (envio individual) do ActiveCampaign
 */
export function normalizeMessage(
  acMessage: ACMessage,
  accountId: string
): Omit<CampaignMessage, 'createdAt' | 'updatedAt'> {
  // Parse data de envio
  const sentAt = new Date(acMessage.cdate || acMessage.sent || new Date())

  // Parse flags de interação (podem vir como string "1"/"0" ou boolean)
  const wasOpened = 
    acMessage.opened === true || 
    acMessage.opened === '1' || 
    parseInt(acMessage.opened_count || '0', 10) > 0

  const wasClicked = 
    acMessage.clicked === true || 
    acMessage.clicked === '1' || 
    parseInt(acMessage.clicked_count || '0', 10) > 0

  const wasBounced = 
    acMessage.bounced === true || 
    acMessage.bounced === '1' ||
    !!acMessage.bounce_type

  return {
    id: acMessage.id,
    accountId,
    campaignId: acMessage.campaignid || '',
    sentAt,
    wasOpened,
    wasClicked,
    wasBounced,
    contactId: acMessage.contactid || null,
    rawPayload: acMessage as unknown as Record<string, unknown>,
  }
}

/**
 * Extrai IDs de listas de uma campanha AC
 */
export function extractListIds(acCampaign: ACCampaign): string[] {
  // As listas vêm no campo "lists" (array de strings)
  return acCampaign.lists || []
}

