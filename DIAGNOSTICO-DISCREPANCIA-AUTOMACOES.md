# 🔍 Diagnóstico: Discrepância de Dados em Automações

**Data:** 13 de Janeiro de 2026  
**Problema:** Automações que tiveram envios ontem no ActiveCampaign não aparecem no dashboard

---

## 🔴 Causa Raiz Identificada

A página de automações filtra por **`sendDate`** das campanhas, mas para emails de automação:

```typescript
sendDate = data de CRIAÇÃO da campanha/email
         ≠ data real dos envios individuais
```

### Exemplo do Problema

**ActiveCampaign (Real)**:
- Automação "Boas Vindas" enviou 50 emails **ontem** (12/01/2026)

**No Banco de Dados**:
```sql
SELECT name, send_date, sent
FROM campaigns
WHERE is_automation = true
AND name LIKE '%Boas Vindas%';

-- Resultado:
-- "Email 00 - Boas Vindas", send_date: 2025-12-15, sent: 150
-- ⬆️ send_date é quando o EMAIL foi criado, não quando foi enviado!
-- sent = 150 é o TOTAL acumulado desde 15/12, não de ontem
```

**Quando você filtra por data "ontem"**:
```sql
WHERE send_date >= '2026-01-12' AND send_date <= '2026-01-12'
```

❌ **Nada aparece**, porque `send_date = 2025-12-15`!

---

## 🧩 Arquitetura Atual

### 1. Tabela `automations`

```sql
-- O QUE TEM:
id, name, status, entered, completed, active

-- O QUE NÃO TEM:
❌ Envios de emails
❌ Datas de envio
❌ Métricas de email (opens, clicks)
```

**Motivo**: API v3 `/automations` não fornece essas informações.

### 2. Tabela `campaigns`

```sql
-- Emails de automação aparecem aqui:
id, name, is_automation=true, send_date, sent, unique_opens, ...

-- PROBLEMA:
send_date = data de CRIAÇÃO (sdate da API)
sent = total ACUMULADO desde criação
```

**Exemplo**:
```json
{
  "id": "123",
  "name": "Email 00 - Boas Vindas",
  "automation": "1",
  "sdate": "2025-12-15T14:10:24-06:00",  // ← Quando FOI CRIADO
  "send_amt": "150"                       // ← Total desde 15/12
}
```

### 3. Tabela `campaign_messages` ✅ **SOLUÇÃO**

```sql
-- Envios INDIVIDUAIS com data REAL:
id, campaign_id, sent_at, was_opened, was_clicked, ...

-- sent_at = data REAL do envio individual
```

**Exemplo**:
```sql
SELECT sent_at, was_opened
FROM campaign_messages
WHERE campaign_id = '123'
AND sent_at >= '2026-01-12'
AND sent_at < '2026-01-13';

-- Resultado: 50 messages enviados ontem!
```

---

## 🔧 Como a Página de Automações Funciona Atualmente

### Arquivo: `automation-metrics-service.ts`

**Etapa 1: Buscar Automações**
```typescript
const automations = await prisma.automation.findMany({ where })
```

**Etapa 2: Associar a Campanhas (Heurística)**
```typescript
// Linhas 72-106
const prefixMatch = autoName.match(/^(\[[\w\s-]+\])/)
if (prefix) {
  patterns.push({ 
    name: { startsWith: prefix, mode: 'insensitive' } 
  })
}

const campaigns = await prisma.campaign.findMany({
  where: {
    accountId: automation.accountId,
    isAutomation: true,
    OR: patterns  // Matching por nome
  }
})
```

**Etapa 3: Filtrar por Data** ⚠️ **AQUI ESTÁ O PROBLEMA**
```typescript
// Linhas 121-142
if (filters.dateFrom || filters.dateTo) {
  filteredCampaigns = campaigns.filter(campaign => {
    if (!campaign.sendDate) return false  // ⚠️ sendDate = data de criação!
    
    if (filters.dateFrom && campaign.sendDate < dateFrom) return false
    if (filters.dateTo && campaign.sendDate > dateTo) return false
    
    return true
  })
}
```

**Etapa 4: Agregar Métricas**
```typescript
// Linhas 144-151
for (const campaign of filteredCampaigns) {
  totalSent += campaign.sent      // ⚠️ Acumulado, não do período!
  totalOpens += campaign.uniqueOpens
  totalClicks += campaign.uniqueClicks
}
```

---

## 💡 Soluções Propostas

### **Solução 1: Usar `campaign_messages` para Filtro de Data** ⭐ **RECOMENDADO**

O projeto **já sincroniza** `campaign_messages` (últimos 90 dias) com a data REAL de envio.

**Modificação em `automation-metrics-service.ts`**:

```typescript
async getAutomationsWithMetricsV2(filters: AutomationFilters = {}) {
  // ... buscar automações e campanhas (igual)
  
  // NOVO: Se há filtro de data, usar campaign_messages
  if (filters.dateFrom || filters.dateTo) {
    // Buscar IDs das campanhas associadas
    const campaignIds = campaigns.map(c => c.id)
    
    // Buscar messages no período
    const messagesWhere: any = {
      accountId: automation.accountId,
      campaignId: { in: campaignIds },
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
      select: {
        campaignId: true,
        wasOpened: true,
        wasClicked: true,
      }
    })
    
    // Agregar métricas dos messages
    const totalSent = messages.length
    const totalOpens = messages.filter(m => m.wasOpened).length
    const totalClicks = messages.filter(m => m.wasClicked).length
    
    // ... calcular rates
  } else {
    // SEM filtro de data: usar métricas acumuladas das campanhas
    // (código atual)
  }
}
```

**Vantagens**:
- ✅ Data REAL dos envios
- ✅ Métricas PRECISAS do período
- ✅ Já está sendo sincronizado (últimos 90 dias)
- ✅ Não quebra queries sem filtro de data

**Desvantagens**:
- ⚠️ Só funciona para últimos 90 dias (limitação do sync)
- ⚠️ Mais queries ao banco

---

### **Solução 2: Usar API v1 para Métricas por Período**

Similar ao que é feito no dashboard principal (`page.tsx`):

```typescript
// Para cada campanha de automação
const apiv1 = new ActiveCampaignAPIv1({
  baseUrl: account.baseUrl,
  apiKey: account.apiKey
})

const metrics = await apiv1.getCampaignReportTotals(campaignId, {
  sdate: '2026-01-12',
  ldate: '2026-01-12'
})

// Usar metrics.sent, metrics.opens, etc (do período)
```

**Vantagens**:
- ✅ Métricas precisas de qualquer período
- ✅ Direto da API do ActiveCampaign

**Desvantagens**:
- ❌ Faz requisições HTTP (lento)
- ❌ Consome rate limit
- ❌ Pode dar timeout com muitas automações

---

### **Solução 3: Sincronizar Mais Messages**

Aumentar de 90 dias para 180 ou 365 dias:

```typescript
// Em sync-service.ts, linha 204
for await (const messagesBatch of messagesAPI.listRecentMessages(365)) {
  // ... (resto igual)
}
```

**Vantagens**:
- ✅ Solução 1 funciona para períodos maiores

**Desvantagens**:
- ❌ Mais dados no banco
- ❌ Sync mais lento
- ❌ Mais armazenamento

---

## 🎯 Recomendação

### **Implementar Solução 1** (Usar `campaign_messages`)

**Razão**: 
- Dados já estão no banco
- Precisão máxima
- Performance boa

**Com fallback**:
- Se filtro > 90 dias: mostrar aviso ou usar API v1
- Se filtro < 90 dias: usar messages (rápido e preciso)

---

## 📝 Checklist de Implementação

### Curto Prazo (1-2 dias)

- [ ] Modificar `AutomationMetricsService.getAutomationsWithMetricsV2()`
- [ ] Adicionar lógica para usar `campaign_messages` quando há filtro de data
- [ ] Testar com filtro "ontem"
- [ ] Testar com filtro "última semana"
- [ ] Verificar performance

### Médio Prazo (1 semana)

- [ ] Adicionar aviso na UI quando filtro > 90 dias
- [ ] Implementar fallback para API v1 (opcional)
- [ ] Aumentar sync para 180 dias (se necessário)
- [ ] Adicionar índices no banco:
  ```sql
  CREATE INDEX idx_messages_campaign_date 
  ON campaign_messages(account_id, campaign_id, sent_at);
  ```

### Longo Prazo (1 mês)

- [ ] Considerar sincronizar ALL messages (sem limite de dias)
- [ ] Implementar particionamento de `campaign_messages` por data
- [ ] Cache Redis para métricas frequentes

---

## 🧪 Como Testar Agora

### 1. Verificar se Messages Estão Sincronizados

```sql
-- Conectar ao banco
psql -h localhost -U email_dash_user -d email_dash

-- Ver messages de ontem
SELECT 
  c.name,
  COUNT(*) as messages_ontem,
  COUNT(*) FILTER (WHERE cm.was_opened) as abertos
FROM campaign_messages cm
JOIN campaigns c ON c.account_id = cm.account_id AND c.id = cm.campaign_id
WHERE 
  c.is_automation = true
  AND cm.sent_at >= CURRENT_DATE - INTERVAL '1 day'
  AND cm.sent_at < CURRENT_DATE
GROUP BY c.id, c.name
ORDER BY messages_ontem DESC;
```

**Se retornar dados**: Messages estão sendo sincronizados corretamente ✅  
**Se retornar vazio**: Problema no sync de messages ❌

### 2. Comparar com Métricas Acumuladas

```sql
-- Ver campanhas de automação (acumulado)
SELECT 
  name,
  send_date,
  sent as total_acumulado,
  unique_opens
FROM campaigns
WHERE 
  is_automation = true
  AND name LIKE '%Boas Vindas%'
ORDER BY send_date DESC;

-- Comparar com messages dos últimos 7 dias
SELECT 
  c.name,
  COUNT(*) as enviados_7dias,
  COUNT(*) FILTER (WHERE cm.was_opened) as abertos_7dias
FROM campaign_messages cm
JOIN campaigns c ON c.account_id = cm.account_id AND c.id = cm.campaign_id
WHERE 
  c.is_automation = true
  AND c.name LIKE '%Boas Vindas%'
  AND cm.sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY c.id, c.name;
```

---

## 🚨 Ações Imediatas

1. **Executar queries de teste** acima
2. **Verificar se há messages recentes** no banco
3. **Se sim**: Implementar Solução 1
4. **Se não**: Verificar por que sync de messages não está funcionando

---

## 📞 Próximos Passos

Quer que eu:
1. ✅ Implemente a Solução 1 agora?
2. ✅ Crie queries SQL de diagnóstico mais detalhadas?
3. ✅ Verifique por que messages não estão sendo sincronizados?

---

**Documentação criada por Claude (Cursor AI)**  
**Data:** 13 de Janeiro de 2026

