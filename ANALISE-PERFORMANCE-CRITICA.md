# 🚨 ANÁLISE CRÍTICA: Performance Degradada Após Otimizações

**Data:** 13 de Janeiro de 2026  
**Severidade:** 🔴 **CRÍTICO**

---

## 🔍 **Problema Identificado**

Após implementar endpoint direto para associar campanhas a automações, a página ficou **extremamente lenta**:

- ❌ **Entrar na aba de automações**: 10-30 segundos
- ❌ **Aplicar filtro de datas**: 15-40 segundos

---

## 🐛 **Causa Raiz**

### **Código Atual (`automation-metrics-service.ts` linhas 414-542)**

```typescript
// 2. HÍBRIDO: Tentar endpoint direto
const automationsWithCampaigns = await Promise.all(
  automations.map(async (automation) => {
    // ❌ PROBLEMA 1: Para CADA automação (87x):
    const client = new ActiveCampaignClient(...)
    const apiCampaigns = await client.getAutomationCampaigns(automation.id)
    // ^ Chamada HTTP para ActiveCampaign API!
    
    // Query no banco para pegar dados das campanhas
    const campaigns = await prisma.campaign.findMany(...)
  })
)

// 3. Se houver filtro de data:
if (filters.dateFrom || filters.dateTo) {
  for (const item of automationsWithCampaigns) {
    const apiv1 = new ActiveCampaignAPIv1(...)
    
    // ❌ PROBLEMA 2: Para CADA campanha de CADA automação:
    item.campaigns = await Promise.all(
      item.campaigns.map(async (campaign) => {
        const metrics = await apiv1.getCampaignReportTotals(campaign.id, ...)
        // ^ Outra chamada HTTP para API v1!
      })
    )
  }
}
```

### **Cálculo de Chamadas HTTP**

**Cenário Real (87 automações, ~3 campanhas cada):**

```
1. Buscar campanhas da automação:
   - 87 automações × 1 chamada = 87 chamadas HTTP
   - Em paralelo (Promise.all), mas limitado por rate limit
   
2. Buscar métricas de data (com filtro):
   - 87 automações × 3 campanhas = ~260 chamadas HTTP
   - SEQUENCIAIS (for loop), não paralelas!
   
TOTAL: ~347 chamadas HTTP
Tempo estimado: 15-40 segundos
```

### **Rate Limiting**

ActiveCampaign API tem limites:
- **5 requests/segundo** (default)
- Timeout de retry: **2-4 segundos**

Com 347 chamadas:
```
347 requests ÷ 5 req/s = 69 segundos (mínimo)
+ Retries e timeouts = 2-5 minutos (pior caso)
```

---

## 📊 **Comparação: Antes vs Depois**

### **ANTES (Heurística Antiga)**

```typescript
// 1. Buscar TODAS campanhas de uma vez (1 query)
const allCampaigns = await prisma.campaign.findMany({
  where: { isAutomation: true }
})

// 2. Agrupar por prefixo (em memória)
const grouped = groupByPrefix(allCampaigns)

// 3. Para cada campanha, buscar métricas API v1 (paralelo)
const withMetrics = await Promise.all(
  allCampaigns.map(c => getMetrics(c))
)
```

**Performance:**
- ✅ 1 query ao banco
- ✅ ~160 chamadas API (apenas para campanhas, não automações)
- ✅ Tempo: 3-8 segundos

---

### **DEPOIS (Endpoint Direto)**

```typescript
// 1. Para CADA automação, buscar campanhas (87 chamadas)
for each automation:
  client.getAutomationCampaigns(automation.id)  // HTTP!
  
// 2. Para CADA campanha, buscar métricas (260 chamadas)
for each automation:
  for each campaign:
    apiv1.getCampaignReportTotals(campaign.id)  // HTTP!
```

**Performance:**
- ❌ 0 queries otimizadas
- ❌ ~347 chamadas HTTP
- ❌ Tempo: 15-40 segundos (ou mais)

---

## 🎯 **Plano de Ação: 3 Soluções**

### **Solução 1: Cache + Batch Requests** ⭐ **RECOMENDADO**

**Ideia:** Cachear resultado de `/automations/{id}/campaigns` + fazer requests em batch.

**Implementação:**

```typescript
// Cache em memória (válido por 5 minutos)
const cache = new Map<string, { data: any[], timestamp: number }>()

async function getCampaignsWithCache(automationId: string, client: ACClient) {
  const cacheKey = `${automationId}`
  const cached = cache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.data
  }
  
  const data = await client.getAutomationCampaigns(automationId)
  cache.set(cacheKey, { data, timestamp: Date.now() })
  return data
}

// Batch de 10 requests por vez
async function processInBatches<T>(items: T[], batchSize: number, fn: (item: T) => Promise<any>) {
  const results = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
    
    // Evitar rate limit: aguardar 1s entre batches
    if (i + batchSize < items.length) {
      await sleep(1000)
    }
  }
  return results
}
```

**Benefícios:**
- ✅ Cache reduz chamadas repetidas
- ✅ Batch reduz tempo total (10 requests paralelos)
- ✅ Respeita rate limit

**Tempo estimado:**
```
87 automações ÷ 10 por batch = 9 batches
9 batches × 1s = 9 segundos (automações)
260 campanhas ÷ 10 por batch = 26 batches
26 batches × 1s = 26 segundos (métricas)
TOTAL: ~35 segundos (com cache: ~10 segundos)
```

---

### **Solução 2: Voltar para Heurística + Adicionar seriesId** ⚡ **MAIS RÁPIDO**

**Ideia:** Usar heurística antiga (mais rápida) + adicionar campo `seriesId` para precisão.

**Implementação:**

```sql
-- Migração
ALTER TABLE campaigns ADD COLUMN series_id VARCHAR(255);
CREATE INDEX idx_campaigns_series ON campaigns(account_id, series_id);
```

```typescript
// Normalizer: Popular seriesId no sync
export function normalizeCampaign(acCampaign, accountId) {
  return {
    ...
    seriesId: acCampaign.seriesid !== '0' ? acCampaign.seriesid : null,
  }
}

// Service: Usar seriesId quando disponível
async getAutomationsWithMetricsV2() {
  // 1. Buscar TODAS campanhas (1 query rápida)
  const allCampaigns = await prisma.campaign.findMany({
    where: { isAutomation: true, accountId: { in: accountIds } }
  })
  
  // 2. Agrupar por automação:
  //    - Preferir seriesId (mais preciso)
  //    - Fallback para prefixo
  const grouped = groupCampaignsByAutomation(automations, allCampaigns)
  
  // 3. API v1 apenas se filtro de data
  if (dateFilter) {
    // Batch requests...
  }
}
```

**Benefícios:**
- ✅ **Muito mais rápido** (1 query vs 87 HTTP)
- ✅ Precisão com `seriesId`
- ✅ Fallback para prefixo

**Tempo estimado:**
```
1 query ao banco: ~100ms
Agrupar em memória: ~50ms
API v1 (batch): ~10-15 segundos
TOTAL: ~10-15 segundos
```

---

### **Solução 3: Lazy Loading + Pagination** 🔄 **MAIS COMPLEXO**

**Ideia:** Carregar automações sob demanda, não todas de uma vez.

**Implementação:**

```typescript
// Frontend: Infinite scroll ou pagination
<AutomationsList 
  itemsPerPage={20}
  loadMore={loadMore}
/>

// Backend: Pagination + cursor
async getAutomationsWithMetricsV2(filters, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  
  const automations = await prisma.automation.findMany({
    where: ...,
    skip,
    take: limit,
  })
  
  // Buscar apenas para essas 20 automações
  ...
}
```

**Benefícios:**
- ✅ Carrega rápido (apenas 20 automações)
- ✅ Menos requests por vez
- ✅ Melhor UX (scroll infinito)

**Tempo estimado:**
```
Primeira carga (20 automações): ~3-5 segundos
Cada scroll: ~2-3 segundos
```

---

## 📈 **Comparação de Soluções**

| Solução | Tempo | Complexidade | Precisão | Manutenção |
|---------|-------|--------------|----------|------------|
| **1. Cache + Batch** | ~10s (cache) / ~35s (sem cache) | Média | Alta | Média |
| **2. Heurística + seriesId** ⭐ | ~10-15s | Baixa | Alta | Baixa |
| **3. Lazy Loading** | ~3-5s (inicial) | Alta | Alta | Alta |

---

## 🚀 **Recomendação Final**

### **Implementar Solução 2 AGORA**

**Por quê:**
- ✅ **Mais rápida** (~10-15s vs ~35s atual)
- ✅ **Mais simples** de implementar
- ✅ **Mais precisa** (usa `seriesId`)
- ✅ **Mais fácil** de manter

**Roadmap:**
1. **Fase 1 (AGORA):**
   - Reverter para heurística antiga
   - Adicionar campo `seriesId`
   - Otimizar queries

2. **Fase 2 (Futuro):**
   - Adicionar cache (se ainda precisar)
   - Considerar lazy loading

---

## 📋 **Checklist de Implementação**

### **Fase 1: Reverter + Otimizar (2-3 horas)**

- [ ] Criar migração para adicionar `seriesId`
- [ ] Atualizar normalizer para popular `seriesId`
- [ ] Rodar sync para popular campo
- [ ] Reverter lógica de `getAutomationsWithMetricsV2`:
  - [ ] Buscar TODAS campanhas (1 query)
  - [ ] Agrupar por `seriesId` primeiro, depois prefixo
  - [ ] Manter batch para API v1
- [ ] Testar performance
- [ ] Verificar precisão dos dados

### **Fase 2: Cache (Opcional, 1-2 horas)**

- [ ] Implementar cache em memória
- [ ] TTL de 5 minutos
- [ ] Invalidação ao sync

---

## 🧪 **Testes Necessários**

1. **Performance:**
   - [ ] Carregar /automations sem filtro: < 5s
   - [ ] Carregar /automations com filtro: < 15s
   - [ ] Aplicar novo filtro: < 10s

2. **Precisão:**
   - [ ] Verificar caso [SHEIN-BV] (50 envios)
   - [ ] Verificar casos sem prefixo
   - [ ] Verificar métricas de data

3. **Estresse:**
   - [ ] 100+ automações
   - [ ] 1000+ campanhas
   - [ ] Múltiplas contas

---

## 🎯 **Métricas de Sucesso**

**Antes (Atual - Ruim):**
- ❌ Carregamento inicial: 15-40s
- ❌ Filtro de data: 20-40s
- ❌ UX: Ruim (loading muito longo)

**Meta (Após Fix):**
- ✅ Carregamento inicial: < 5s
- ✅ Filtro de data: < 15s
- ✅ UX: Boa (feedback visual, tempo aceitável)

---

**PRÓXIMO PASSO:** Implementar Solução 2? Ou prefere outra abordagem?

