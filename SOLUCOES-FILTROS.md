# 💡 Soluções para Filtros de Data

## Problema Identificado

Estamos usando o endpoint **`/messages`** (templates) ao invés de **`/campaignMessages`** (envios individuais).

---

## 🎯 Solução 1: Usar Endpoint `/campaignMessages` (RECOMENDADO) ⭐

### Descrição

Implementar um novo connector para buscar envios individuais do endpoint correto da API do ActiveCampaign.

### Como Funciona

```
/api/3/campaignMessages
  ↓
Retorna envios individuais:
- contactid
- campaignid  
- mailingid (message template)
- opened (true/false)
- clicked (true/false)
- sdate (data de envio real)
```

### Vantagens

✅ **Dados reais de envio** - Data exata que cada email foi enviado
✅ **Métricas por contato** - Sabe quem abriu/clicou
✅ **Filtros por período funcionam** - Pode filtrar por `sdate`
✅ **Suporta todos os KPIs** - Opens, clicks, bounces tudo disponível
✅ **Escalável** - Solução definitiva e robusta

### Desvantagens

⚠️ **Mais dados para armazenar** - Um registro por envio (pode ser milhares)
⚠️ **Sync mais lento** - Mais requests para API
⚠️ **Rate limiting** - Pode atingir limites da API mais rápido

### Implementação

**Passo 1: Atualizar Types**

```typescript
// src/lib/connectors/activecampaign/types.ts
export interface ACCampaignMessage {
  id: string
  campaignid: string
  messageid: string // ID do template
  contactid: string
  mailingid: string
  
  // Datas
  sdate: string // Data de envio real!
  
  // Métricas
  opened_date?: string
  opened_count: string
  link_clicked_date?: string
  link_clicked_count: string
  
  // Status
  bounce?: string
  bounce_reason?: string
  
  links: {
    campaign: string
    message: string
    contact: string
  }
}
```

**Passo 2: Criar CampaignMessagesAPI**

```typescript
// src/lib/connectors/activecampaign/campaign-messages.ts
export class CampaignMessagesAPI {
  constructor(private client: ActiveCampaignClient) {}

  /**
   * Lista envios individuais (campaign messages)
   */
  async *listCampaignMessages(options?: {
    campaignId?: string
    fromDate?: Date
    toDate?: Date
  }): AsyncGenerator<ACCampaignMessage[], void, unknown> {
    const params = new URLSearchParams()

    if (options?.campaignId) {
      params.append('filters[campaign]', options.campaignId)
    }

    // Filtro por data de envio
    if (options?.fromDate) {
      params.append('filters[sdate_gte]', options.fromDate.toISOString())
    }

    if (options?.toDate) {
      params.append('filters[sdate_lte]', options.toDate.toISOString())
    }

    // Ordenar por data de envio
    params.append('orders[sdate]', 'DESC')

    const endpoint = `/campaignMessages${params.toString() ? '?' + params.toString() : ''}`

    for await (const messages of this.client.paginate<ACCampaignMessage>(endpoint)) {
      yield messages
    }
  }
}
```

**Passo 3: Atualizar Normalizer**

```typescript
// src/lib/connectors/activecampaign/normalizer.ts
export function normalizeCampaignMessage(
  acCampaignMessage: ACCampaignMessage,
  accountId: string
): Omit<CampaignMessage, 'createdAt' | 'updatedAt'> {
  // Parse data de envio REAL
  const sentAt = new Date(acCampaignMessage.sdate)

  // Parse métricas
  const wasOpened = 
    parseInt(acCampaignMessage.opened_count || '0', 10) > 0 ||
    !!acCampaignMessage.opened_date

  const wasClicked = 
    parseInt(acCampaignMessage.link_clicked_count || '0', 10) > 0 ||
    !!acCampaignMessage.link_clicked_date

  const wasBounced = !!acCampaignMessage.bounce

  return {
    id: acCampaignMessage.id,
    accountId,
    campaignId: acCampaignMessage.campaignid,
    sentAt, // Data REAL de envio!
    wasOpened,
    wasClicked,
    wasBounced,
    contactId: acCampaignMessage.contactid,
    rawPayload: acCampaignMessage as unknown as Record<string, unknown>,
  }
}
```

**Passo 4: Atualizar SyncService**

```typescript
// src/lib/services/sync-service.ts (substituir MessagesAPI)
import { CampaignMessagesAPI } from '@/lib/connectors/activecampaign/campaign-messages'

// No sync:
const campaignMessagesAPI = new CampaignMessagesAPI(client)

// Sincronizar campaign messages (últimos 90 dias)
for await (const messagesBatch of campaignMessagesAPI.listCampaignMessages({
  fromDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
})) {
  for (const acMessage of messagesBatch) {
    // ... normalizar e salvar
  }
}
```

### Tempo de Implementação

⏱️ **~30 minutos**

### Resultado Esperado

```
Filtro: Last 7 days
Enviados: 45  ← Soma de campaign messages dos últimos 7 dias
Aberturas: 12 ← Contagem onde wasOpened = true
Cliques: 5    ← Contagem onde wasClicked = true
```

---

## 🎯 Solução 2: Usar Métricas da Campanha + Proporção (RÁPIDO) 🚀

### Descrição

Em vez de buscar envios individuais, usar as métricas agregadas das campanhas e aplicar proporção baseada em período.

### Como Funciona

```
1. Campanhas têm métricas totais:
   - sent: 100 (total desde sempre)
   - opens: 30 (total desde sempre)
   
2. Não sabemos quais foram ontem, mas sabemos:
   - Campanha foi criada há 30 dias
   - Se distribuirmos uniformemente: ~3.3 envios/dia
   
3. Para filtro "últimos 7 dias":
   - Estimamos: 3.3 * 7 = ~23 envios
   - Proporção: 23/100 = 23%
   - Opens estimados: 30 * 23% = ~7 opens
```

### Vantagens

✅ **Implementação rápida** - ~15 minutos
✅ **Sem mudanças no banco** - Usa dados existentes
✅ **Sem chamadas extras à API** - Usa dados já sincronizados
✅ **Leve e rápido** - Sem armazenar milhões de messages

### Desvantagens

⚠️ **Estimativa, não dados reais** - Pode não ser preciso
⚠️ **Assume distribuição uniforme** - Pode não ser verdade
⚠️ **Não funciona para automações** - Envios variam muito
⚠️ **Não permite drill-down** - Não pode ver detalhes por contato

### Implementação

```typescript
// src/app/page.tsx
async function getDashboardData(filters: DashboardFilters = {}) {
  // ... buscar campanhas ...

  // Para cada campanha, estimar métricas no período
  const campaignsWithEstimates = campaigns.map(campaign => {
    // Se não houver filtro de data, usar métricas reais
    if (!filters.dateFrom && !filters.dateTo) {
      return {
        ...campaign,
        sent: campaign.sent,
        opens: campaign.uniqueOpens,
        // ...
      }
    }

    // Calcular proporção do período
    const totalDays = differenceInDays(new Date(), campaign.createdAt)
    const filterDays = filters.dateTo && filters.dateFrom 
      ? differenceInDays(filters.dateTo, filters.dateFrom)
      : 7 // default

    const proportion = Math.min(filterDays / totalDays, 1)

    // Aplicar proporção às métricas
    return {
      ...campaign,
      sent: Math.round(campaign.sent * proportion),
      opens: Math.round(campaign.uniqueOpens * proportion),
      clicks: Math.round(campaign.uniqueClicks * proportion),
      // ...
    }
  })

  // Calcular KPIs com métricas estimadas
  // ...
}
```

### Tempo de Implementação

⏱️ **~15 minutos**

### Resultado Esperado

```
Filtro: Last 7 days
Enviados: ~42  ← Estimativa baseada em proporção
Aberturas: ~11 ← Estimativa
Cliques: ~4    ← Estimativa

⚠️ Nota: Valores estimados com base em distribuição uniforme
```

---

## 🎯 Solução 3: Híbrida - Métricas Agregadas + Cache (EQUILIBRADA) ⚖️

### Descrição

Combinar métricas agregadas das campanhas com snapshots periódicos para melhor precisão.

### Como Funciona

```
1. Criar tabela CampaignMetricsSnapshot:
   - campaignId
   - date (diário)
   - sent, opens, clicks (deltas do dia)

2. Durante sync:
   - Calcular diferença desde último snapshot
   - Armazenar delta diário

3. Para filtros:
   - Somar snapshots do período
```

### Vantagens

✅ **Precisão melhor que Solução 2** - Snapshots reais
✅ **Menos dados que Solução 1** - Agregado por dia, não por envio
✅ **Funciona para automações** - Captura variações
✅ **Permite análise de tendências** - Histórico por dia

### Desvantagens

⚠️ **Complexidade moderada** - Nova tabela e lógica
⚠️ **Requer syncs diários** - Para manter snapshots atualizados
⚠️ **Não tem detalhes individuais** - Ainda é agregado

### Implementação

**Schema:**

```prisma
model CampaignMetricsSnapshot {
  campaignId String
  accountId  String
  date       DateTime @db.Date
  
  // Deltas do dia
  sentDelta    Int @default(0)
  opensDelta   Int @default(0)
  clicksDelta  Int @default(0)
  bouncesDelta Int @default(0)
  
  createdAt DateTime @default(now())
  
  campaign Campaign @relation(fields: [accountId, campaignId], references: [accountId, id], onDelete: Cascade)
  
  @@id([accountId, campaignId, date])
  @@index([date])
}
```

**Sync:**

```typescript
// Durante sync diário, calcular deltas
const yesterday = startOfDay(subDays(new Date(), 1))
const snapshot = await calculateMetricsDelta(campaign, yesterday)

await prisma.campaignMetricsSnapshot.upsert({
  where: {
    accountId_campaignId_date: {
      accountId,
      campaignId: campaign.id,
      date: yesterday,
    },
  },
  create: snapshot,
  update: snapshot,
})
```

**Query:**

```typescript
// Buscar métricas do período
const snapshots = await prisma.campaignMetricsSnapshot.findMany({
  where: {
    accountId,
    date: {
      gte: filters.dateFrom,
      lte: filters.dateTo,
    },
  },
})

// Somar deltas
const metrics = snapshots.reduce((acc, s) => ({
  sent: acc.sent + s.sentDelta,
  opens: acc.opens + s.opensDelta,
  // ...
}), { sent: 0, opens: 0, ... })
```

### Tempo de Implementação

⏱️ **~45 minutos**

### Resultado Esperado

```
Filtro: Last 7 days
Enviados: 43   ← Soma real de snapshots diários
Aberturas: 11  ← Soma real
Cliques: 5     ← Soma real

✅ Baseado em dados reais capturados diariamente
```

---

## 📊 Comparação das Soluções

| Critério | Solução 1 (campaignMessages) | Solução 2 (Proporção) | Solução 3 (Híbrida) |
|----------|------------------------------|------------------------|----------------------|
| **Precisão** | 🟢 Perfeita (100%) | 🟡 Estimada (~70%) | 🟢 Alta (~90%) |
| **Tempo Impl.** | 🟡 30min | 🟢 15min | 🟡 45min |
| **Performance** | 🟡 Moderada | 🟢 Rápida | 🟢 Rápida |
| **Armazenamento** | 🔴 Alto (milhões) | 🟢 Zero extra | 🟢 Baixo (centenas) |
| **Escalabilidade** | 🟡 Moderada | 🟢 Alta | 🟢 Alta |
| **Drill-down** | 🟢 Total | 🔴 Nenhum | 🟡 Limitado |
| **Automações** | 🟢 Funciona | 🔴 Impreciso | 🟢 Funciona |
| **Análise Histórica** | 🟢 Total | 🔴 Limitada | 🟢 Boa |

---

## 🎯 Recomendação

### Para MVP Rápido:
👉 **Solução 2** (Proporção) - 15min, funciona agora

### Para Produção:
👉 **Solução 1** (campaignMessages) - Dados reais, escalável

### Para Equilíbrio:
👉 **Solução 3** (Híbrida) - Boa precisão, performance, escalabilidade

---

## 🚀 Próximos Passos

**Escolha uma solução e me avise!** Posso implementar qualquer uma delas agora.

Minha recomendação: **Solução 1** (campaignMessages) - é a mais robusta e definitiva! 🏆

