# 🔍 INVESTIGAÇÃO PROFUNDA: Filtro de Data nas Automações

## 📋 **CONTEXTO:**
- **Problema:** Filtro de data nas automações não retorna dados
- **URL de teste:** `?from=2025-12-23&to=2025-12-23`
- **Sintoma:** Apenas 1 automação mostra dados (`[SHEIN-BV] 00 - Boas Vindas`), todas as outras mostram "—" nas colunas de emails

---

## 🔍 **DESCOBERTAS DA INVESTIGAÇÃO:**

### 1. **Arquitetura de Dados:**

#### **Tabela `automations`:**
- Armazena apenas:
  - `id`, `name`, `status`
  - `entered` (contatos que entraram)
  - `completed` (contatos que saíram)
  - `active` (entered - completed)
- **⚠️ NÃO TEM RELAÇÃO DIRETA COM CAMPANHAS/EMAILS**

#### **Tabela `campaigns`:**
- Armazena os emails enviados
- Campos relevantes:
  - `sendDate` (DateTime) - **CRUCIAL PARA FILTRO**
  - `isAutomation` (Boolean)
  - `name` (String) - **ÚNICO LINK COM AUTOMAÇÃO**
  - `sent`, `uniqueOpens`, `uniqueClicks`, etc.

#### **⚠️ PROBLEMA ESTRUTURAL:**
```
Automation (tabela) <-- [SEM RELAÇÃO] --> Campaign (tabela)
                        ↓
              Associação por HEURÍSTICA DE NOME
```

---

### 2. **Fluxo de Sincronização:**

```typescript
// sync-service.ts - Linha 149-167
for (const acAutomation of automationsBatch) {
  const normalized = normalizeAutomation(acAutomation, accountId)
  await prisma.automation.upsert({ ... })
}
```

**O que a API do ActiveCampaign retorna:**
```typescript
// types.ts - ACAutomation
{
  id: string
  name: string
  status: string  // "0" ou "1"
  entered: string // "305", "3", etc
  exited: string  // "0", "1", etc
  cdate: string
  mdate: string
}
```

**⚠️ API NÃO RETORNA:**
- ❌ Lista de emails/campanhas da automação
- ❌ Datas de envio
- ❌ Métricas de emails (opens, clicks)
- ❌ Relação com messages/campaigns

---

### 3. **Heurística de Associação:**

```typescript
// automation-metrics-service.ts - Linha 78-104
const prefixMatch = autoName.match(/^(\[[\w\s-]+\])/)
const prefix = prefixMatch ? prefixMatch[1] : null

if (prefix) {
  // Busca campanhas que COMEÇAM com o prefixo
  patterns.push({ 
    name: { startsWith: prefix, mode: 'insensitive' } 
  })
} else {
  // Fallback: busca por nome completo ou código numérico
  patterns.push({ name: { contains: autoName, mode: 'insensitive' } })
}

// Busca no banco
const campaigns = await prisma.campaign.findMany({
  where: {
    accountId: automation.accountId,
    isAutomation: true,
    OR: patterns,
  },
  select: { sent, uniqueOpens, uniqueClicks, sendDate }
})
```

**Depois aplica filtro de data:**
```typescript
if (filters.dateFrom || filters.dateTo) {
  filteredCampaigns = campaigns.filter(campaign => {
    if (!campaign.sendDate) return false
    // Lógica de comparação de datas...
  })
}
```

---

### 4. **PONTOS CRÍTICOS IDENTIFICADOS:**

#### **A) Dependência de `sendDate`:**
```typescript
if (!campaign.sendDate) return false
```
**Hipótese 1:** Campanhas podem não ter `sendDate` populado?

#### **B) Ordem de operações:**
1. **Busca TODAS** as campanhas que correspondem ao nome
2. **Depois** filtra por data em memória (JavaScript)
3. Se nenhuma campanha passar no filtro → "—"

**Problema potencial:** Se `sendDate` está como `null`, a campanha é eliminada antes mesmo de checar o período.

#### **C) Normalização de `sendDate`:**
```typescript
// normalizer.ts - Linha 53
const sendDate = acCampaign.sdate ? new Date(acCampaign.sdate) : null
```
**Se `sdate` vier vazio/null da API → `sendDate = null` no banco!**

---

### 5. **COMPARAÇÃO COM PÁGINA PRINCIPAL:**

**Dashboard (`metrics-service.ts`):**
```typescript
// Filtra DIRETO NO PRISMA (banco de dados)
if (filter.dateFrom || filter.dateTo) {
  where.sendDate = {}
  if (filter.dateFrom) {
    where.sendDate.gte = dateFrom  // PostgreSQL faz o filtro
  }
  if (filter.dateTo) {
    where.sendDate.lte = dateTo    // PostgreSQL faz o filtro
  }
}

const campaigns = await prisma.campaign.findMany({ where })
```

**Automações (`automation-metrics-service.ts`):**
```typescript
// Busca TUDO primeiro
const campaigns = await prisma.campaign.findMany({
  where: { accountId, isAutomation: true, OR: patterns }
  // ⚠️ SEM FILTRO DE DATA AQUI!
})

// Depois filtra em JavaScript
filteredCampaigns = campaigns.filter(c => {
  if (!c.sendDate) return false
  // ...
})
```

---

## 🎯 **HIPÓTESES SOBRE O PROBLEMA:**

### **Hipótese 1: `sendDate` está NULL no banco**
- **Causa:** Campanhas de automação não têm `sdate` na API
- **Efeito:** Filtro elimina TODAS as campanhas
- **Teste:** Verificar se `campaign.sendDate IS NOT NULL` para campanhas com `isAutomation = true`

### **Hipótese 2: Campanhas não estão sendo associadas corretamente**
- **Causa:** Nome da automação não corresponde ao nome da campanha
- **Efeito:** Array `campaigns` já vem vazio
- **Teste:** Verificar quantas campanhas correspondem ao padrão de nome

### **Hipótese 3: Comparação de datas está incorreta** ❌ (JÁ DESCARTADA)
- Já corrigimos a lógica de comparação
- Mas se `sendDate` for `null`, nunca chega na comparação

### **Hipótese 4: Timezone/Horário está causando problemas**
- **Causa:** `sendDate` pode estar em UTC e comparação em local time
- **Efeito:** Datas não "batem" com o período esperado
- **Teste:** Verificar timezone de `sendDate` vs `dateFrom/dateTo`

---

## 📊 **EVIDÊNCIAS VISUAIS:**

Na screenshot fornecida:

```
✅ [SHEIN-BV] 00 - Boas Vindas | gactv17 | 1 email | 64 enviados | 42.2% OR
❌ [BR] 00 - Brasil            | gactv10 | — | — | —
❌ [BR] 00 - Brasil            | gactv6  | — | — | —
❌ [CO] Email 00               | gactv1  | — | — | —
❌ [DE] 00 - Alemanha          | gactv2  | — | — | —
```

**Observações:**
1. Apenas `[SHEIN-BV]` tem dados de email
2. `[SHEIN-BV]` mostra "1 email" mas 64 enviados (suspeito)
3. Todas as outras mostram "—" em todas as colunas de email
4. Mas todas mostram "Entraram" (3, 5, 418, 238...) - isso vem da API

**⚠️ CONCLUSÃO:** O problema NÃO é com os dados de automação da API, mas sim com a associação/filtro de campanhas!

---

## 🔧 **PRÓXIMOS PASSOS PARA DIAGNÓSTICO:**

### **Teste 1: Verificar se campanhas têm `sendDate`**
```sql
SELECT 
  a.name as automation_name,
  c.name as campaign_name,
  c.send_date,
  c.sent,
  c.is_automation
FROM automations a
LEFT JOIN campaigns c ON 
  c.account_id = a.account_id AND
  c.is_automation = true AND
  c.name ILIKE a.name || '%'
WHERE a.account_id = 'gactv10'  -- Ex: conta com [BR]
ORDER BY a.name, c.send_date DESC
LIMIT 50;
```

### **Teste 2: Verificar campanhas no período**
```sql
SELECT 
  account_id,
  name,
  send_date,
  is_automation,
  sent
FROM campaigns
WHERE 
  account_id IN ('gactv10', 'gactv6', 'gactv1')
  AND is_automation = true
  AND send_date >= '2025-12-23 00:00:00'
  AND send_date <= '2025-12-23 23:59:59'
ORDER BY send_date DESC;
```

### **Teste 3: Verificar padrão de nomes**
```sql
SELECT 
  account_id,
  name,
  send_date,
  sent
FROM campaigns
WHERE 
  is_automation = true
  AND (
    name ILIKE '[BR]%' OR
    name ILIKE '[CO]%' OR
    name ILIKE '[DE]%'
  )
ORDER BY name, send_date DESC
LIMIT 100;
```

---

## 💡 **SOLUÇÕES POTENCIAIS:**

### **Solução A: Filtrar no banco (mais eficiente)**
```typescript
const campaigns = await prisma.campaign.findMany({
  where: {
    accountId: automation.accountId,
    isAutomation: true,
    OR: patterns,
    // ✅ ADICIONAR FILTRO DE DATA AQUI
    ...(filters.dateFrom && { sendDate: { gte: dateFrom } }),
    ...(filters.dateTo && { sendDate: { lte: dateTo } }),
    // ✅ GARANTIR QUE sendDate NÃO É NULL
    sendDate: { not: null }
  }
})
```

### **Solução B: Tratar campanhas sem data**
```typescript
// Incluir campanhas sem data no total, mas marcá-las
filteredCampaigns = campaigns.map(c => ({
  ...c,
  sendDate: c.sendDate || new Date(0) // Default para data antiga
}))
```

### **Solução C: Logging para debug**
```typescript
console.log(`[DEBUG] Automation: ${autoName}`)
console.log(`  - Prefix: ${prefix}`)
console.log(`  - Campaigns found: ${campaigns.length}`)
console.log(`  - After date filter: ${filteredCampaigns.length}`)
console.log(`  - Sample: ${campaigns[0]?.name} (${campaigns[0]?.sendDate})`)
```

---

## ⚠️ **LIMITAÇÕES DA API IDENTIFICADAS:**

1. **Automações não retornam lista de emails:**
   - Impossível saber quais campanhas pertencem a uma automação
   - Dependemos de convenção de nomenclatura

2. **Campanhas de automação podem não ter `sdate`:**
   - Emails enviados via automação podem ter data null
   - Precisamos investigar se há campo alternativo

3. **Sem métricas por período na API:**
   - API só retorna métricas acumuladas
   - Impossível saber "quantos emails foram enviados ontem"

---

## 🎯 **RECOMENDAÇÃO:**

**ANTES de implementar correção:**
1. ✅ Executar queries SQL de teste
2. ✅ Verificar se campanhas têm `sendDate` populado
3. ✅ Verificar padrão de nomenclatura real no banco
4. ✅ Adicionar logging temporário para debug

**DEPOIS:**
- Implementar solução baseada nos resultados dos testes
- Documentar limitações para o usuário
- Considerar estratégia alternativa se API não fornecer datas

