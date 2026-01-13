# 🚨 RESUMO: Por que Automações não aparecem com Filtro de Data

**TL;DR**: O dashboard filtra por `sendDate` (data de criação), mas emails de automação são enviados continuamente. A data REAL dos envios está em `campaign_messages.sent_at`.

---

## 🔴 O Problema em 3 Imagens

### 1. O que você vê no ActiveCampaign
```
Automação "Boas Vindas"
├─ Email 1: enviou 20 emails ONTEM
├─ Email 2: enviou 15 emails ONTEM
└─ Email 3: enviou 10 emails ONTEM
Total: 45 emails ontem
```

### 2. O que está no banco (tabela `campaigns`)
```sql
SELECT name, send_date, sent
FROM campaigns
WHERE is_automation = true;

-- Resultado:
-- "Email 1 - Boas Vindas", send_date: 2025-12-15, sent: 450 (total acumulado)
-- "Email 2 - Boas Vindas", send_date: 2025-12-15, sent: 380 (total acumulado)
-- "Email 3 - Boas Vindas", send_date: 2025-12-15, sent: 290 (total acumulado)
```

**Problema**: `send_date` = quando o email FOI CRIADO, não quando foi enviado!

### 3. Quando você filtra "ontem" no dashboard
```sql
WHERE send_date >= '2026-01-12' AND send_date <= '2026-01-12'
```

❌ **Retorna 0 resultados** porque `send_date = 2025-12-15` (data de criação)

---

## ✅ A Solução: Tabela `campaign_messages`

O projeto **já sincroniza** envios individuais com data REAL:

```sql
SELECT 
  c.name,
  cm.sent_at,          -- ✅ Data REAL do envio
  cm.was_opened
FROM campaign_messages cm
JOIN campaigns c ON c.id = cm.campaign_id
WHERE c.is_automation = true
  AND cm.sent_at >= '2026-01-12'
  AND cm.sent_at < '2026-01-13';

-- Resultado: 45 messages (correto!)
```

---

## 📋 Passo a Passo para Resolver

### **PASSO 1: Diagnóstico** (2 minutos)

Execute o script SQL de diagnóstico:

```bash
psql -h localhost -U email_dash_user -d email_dash < diagnostico-automacoes.sql
```

**Verifique**:
- Se há `campaign_messages` dos últimos 7 dias
- Se `messages_synced > 0` nos últimos syncs

**Cenário A**: Tem messages ✅
→ Ir para PASSO 2 (Implementar solução)

**Cenário B**: Não tem messages ❌
→ Ir para PASSO 3 (Corrigir sync)

---

### **PASSO 2: Implementar Solução** (30 minutos)

Modificar `AutomationMetricsService` para usar `campaign_messages` quando há filtro de data.

**Arquivo**: `src/lib/services/automation-metrics-service.ts`

**Mudança**: Substituir lógica de filtro por data (linhas 121-142) por:

```typescript
// Se há filtro de data, usar campaign_messages
if (filters.dateFrom || filters.dateTo) {
  const messagesWhere: any = {
    accountId: automation.accountId,
    campaignId: { in: campaigns.map(c => c.id) },
  }
  
  if (filters.dateFrom) {
    messagesWhere.sentAt = { gte: filters.dateFrom }
  }
  if (filters.dateTo) {
    const dateTo = new Date(filters.dateTo)
    dateTo.setHours(23, 59, 59, 999)
    messagesWhere.sentAt = { ...messagesWhere.sentAt, lte: dateTo }
  }
  
  const messages = await prisma.campaignMessage.findMany({
    where: messagesWhere,
    select: { campaignId: true, wasOpened: true, wasClicked: true }
  })
  
  // Agregar por campanha
  const messagesByCampaign = new Map<string, any>()
  for (const msg of messages) {
    const key = msg.campaignId
    if (!messagesByCampaign.has(key)) {
      messagesByCampaign.set(key, { sent: 0, opens: 0, clicks: 0 })
    }
    const stats = messagesByCampaign.get(key)!
    stats.sent++
    if (msg.wasOpened) stats.opens++
    if (msg.wasClicked) stats.clicks++
  }
  
  // Usar essas métricas ao invés de filteredCampaigns
}
```

---

### **PASSO 3: Corrigir Sync** (se necessário)

Se o diagnóstico mostrou que não há `campaign_messages`:

**Verificar logs do último sync**:
```bash
# No servidor
tail -100 ~/logs/auto-sync.log

# Ou ver últimos syncs no banco:
SELECT * FROM sync_jobs ORDER BY started_at DESC LIMIT 5;
```

**Causas possíveis**:
1. Sync de messages está sendo pulado (verificar `sync-service.ts` linha 200-240)
2. API retorna 0 messages (conta sem envios?)
3. Erro durante sync de messages (ver campo `error` em `sync_jobs`)

**Solução**: Rodar sync manual e verificar logs:
```bash
cd ~/apps/email-dash
npx tsx auto-sync.js
# Verificar se aparece: "✅ X mensagens sincronizadas"
```

---

## 🎯 Resultado Esperado

**Antes**:
- Filtro "ontem" → 0 automações
- Filtro "última semana" → 0 automações

**Depois**:
- Filtro "ontem" → Automações que REALMENTE enviaram emails ontem
- Filtro "última semana" → Automações com envios nos últimos 7 dias
- Métricas PRECISAS do período (não acumuladas)

---

## ⏱️ Timeline de Implementação

**Diagnóstico**: 2 minutos  
**Implementação**: 30 minutos  
**Testes**: 15 minutos  
**Total**: ~1 hora

---

## 📞 Próximos Passos

1. ✅ Execute `diagnostico-automacoes.sql`
2. ✅ Me envie os resultados
3. ✅ Eu implemento a solução baseado no diagnóstico

---

**Criado em**: 13 de Janeiro de 2026

