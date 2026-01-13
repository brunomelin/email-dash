# 🔍 Como o Projeto Lida com o Problema de Filtro de Data

**Data:** 13 de Janeiro de 2026

---

## ✅ Resumo Executivo

O projeto **JÁ implementa** a solução usando **API v1** em **2 lugares**:

1. ✅ Dashboard principal (`/`)
2. ✅ Página de automações (`/automations`)

**Mas ainda há discrepâncias** → Possíveis causas identificadas abaixo.

---

## 📍 Onde a API v1 é Usada

### **Uso 1: Dashboard Principal** 

**Arquivo**: `src/app/page.tsx`  
**Linhas**: 122-199

#### Lógica Implementada

```typescript
// ✅ SEM filtro de data
if (!filters.dateFrom && !filters.dateTo) {
  // Usa métricas do banco (acumuladas)
  const kpiData = campaigns.reduce(...)
}

// ✅ COM filtro de data
if (filters.dateFrom || filters.dateTo) {
  // 1. Converte datas para formato YYYY-MM-DD
  const sdate = filters.dateFrom?.toISOString().split('T')[0]
  let ldate = filters.dateTo?.toISOString().split('T')[0]

  // 2. FIX: Bug da API v1 (sdate = ldate retorna 0)
  if (sdate === ldate) {
    ldate = sdate + 1 dia
  }

  // 3. Para CADA campanha, buscar métricas via API v1
  const campaignsWithMetrics = await Promise.all(
    campaigns.map(async (campaign) => {
      const apiv1 = new ActiveCampaignAPIv1({
        baseUrl: campaign.account.baseUrl,
        apiKey: campaign.account.apiKey
      })

      const metrics = await apiv1.getCampaignReportTotals(
        campaign.id, 
        { sdate, ldate }
      )

      // 4. Substituir métricas do banco pelas da API
      return {
        ...campaign,
        sent: metrics.sent,           // ← Valor REAL do período
        uniqueOpens: metrics.opens,
        uniqueClicks: metrics.clicks,
        // ... recalcular rates
      }
    })
  )

  // 5. Filtrar campanhas com sent > 0
  const campaignsWithSends = campaignsWithMetrics.filter(c => c.sent > 0)
}
```

#### Comportamento

| Situação | Fonte de Dados | Velocidade | Precisão |
|----------|----------------|------------|----------|
| Sem filtro de data | Banco de dados | ⚡ Rápido | Total acumulado |
| Com filtro de data | API v1 | 🐌 Lento | ✅ Preciso do período |

---

### **Uso 2: Página de Automações**

**Arquivo**: `src/lib/services/automation-metrics-service.ts`  
**Método**: `getAutomationsWithMetricsV2()`  
**Linhas**: 439-489

#### Lógica Implementada

```typescript
async getAutomationsWithMetricsV2(filters) {
  // 1. Buscar automações do banco
  const automations = await prisma.automation.findMany(...)

  // 2. Para cada automação, buscar campanhas associadas (heurística)
  const allCampaigns = []
  for (const automation of automations) {
    // Extrair prefixo (ex: "[SHEIN-BV]")
    const prefixMatch = automation.name.match(/^(\[[\w\s-]+\])/)
    
    // Buscar campanhas que começam com esse prefixo
    const campaigns = await prisma.campaign.findMany({
      where: {
        accountId: automation.accountId,
        isAutomation: true,
        name: { startsWith: prefix }
      }
    })
    
    allCampaigns.push(...campaigns)
  }

  // 3. Se houver filtro de data, buscar métricas via API v1
  if (filters.dateFrom || filters.dateTo) {
    const sdate = filters.dateFrom?.toISOString().split('T')[0]
    let ldate = filters.dateTo?.toISOString().split('T')[0]

    // FIX: Bug da API v1 (mesmo que no dashboard)
    if (sdate === ldate) {
      ldate = sdate + 1 dia
    }

    // Para CADA campanha, buscar métricas da API v1
    campaignsWithMetrics = await Promise.all(
      allCampaigns.map(async (campaign) => {
        const apiv1 = new ActiveCampaignAPIv1({
          baseUrl: automation.account.baseUrl,
          apiKey: automation.account.apiKey
        })

        const metrics = await apiv1.getCampaignReportTotals(
          campaign.id,
          { sdate, ldate }
        )

        return {
          ...campaign,
          sent: metrics.sent,        // ← Valor REAL do período
          uniqueOpens: metrics.opens,
          uniqueClicks: metrics.clicks
        }
      })
    )
  }

  // 4. Agrupar campanhas por prefixo (voltar para automações)
  const campaignsByPrefix = groupCampaignsByPrefix(campaignsWithMetrics)

  // 5. Para cada automação, somar métricas das campanhas associadas
  for (const automation of automations) {
    const prefix = extractPrefix(automation.name)
    const campaigns = campaignsByPrefix.get(prefix) || []

    automation.totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0)
    automation.totalOpens = campaigns.reduce((sum, c) => sum + c.uniqueOpens, 0)
    // ...
  }

  return automations
}
```

---

## 🔴 Por que Ainda Há Discrepâncias?

### **Causa 1: Heurística de Associação** ⚠️ **PRINCIPAL SUSPEITA**

A associação entre automações e campanhas é feita por **matching de nomes**:

```typescript
// Exemplo:
Automação: "[SHEIN-BV] 00 - Boas Vindas"
  ↓ Extrai prefixo
Prefixo: "[SHEIN-BV]"
  ↓ Busca campanhas
Campanhas encontradas:
  ✅ "[SHEIN-BV] Email 00 - Boas Vindas"
  ✅ "[SHEIN-BV] Email 01 - Welcome"
  ✅ "[SHEIN-BV] Email 02 - Offer"

// Mas e se...
Automação: "Welcome Series"  (sem prefixo entre colchetes)
  ↓ Tenta match por nome completo
Campanhas encontradas:
  ❌ Nenhuma! (se os emails não contêm "Welcome Series" no nome)
```

**Problema**: Se a nomenclatura não seguir o padrão, a associação falha.

#### Ver código da heurística

```typescript:72:106:src/lib/services/automation-metrics-service.ts
const autoName = automation.name

// Extrair prefixo entre colchetes no início do nome (se houver)
const prefixMatch = autoName.match(/^(\[[\w\s-]+\])/)
const prefix = prefixMatch ? prefixMatch[1] : null

if (prefix) {
  // Se tem prefixo entre colchetes, buscar TODOS os emails que começam com esse prefixo
  patterns.push({ 
    name: { 
      startsWith: prefix, 
      mode: 'insensitive' as const
    } 
  })
} else {
  // SEM prefixo entre colchetes: usar lógica antiga
  // Padrão 1: Nome completo
  patterns.push({ name: { contains: autoName, mode: 'insensitive' as const } })
  
  // Padrão 2: Código numérico no início (ex: "00 - Boas Vindas")
  const codeMatch = autoName.match(/^(\d+)/)
  if (codeMatch) {
    const code = codeMatch[1]
    patterns.push({ name: { contains: `email ${code}`, mode: 'insensitive' as const } })
  }
}
```

---

### **Causa 2: Erros na API v1** ⚠️

Algumas campanhas podem retornar erro na API v1:

```typescript
try {
  const metrics = await apiv1.getCampaignReportTotals(campaign.id, { sdate, ldate })
} catch (error) {
  console.error(`❌ [V2] Erro ao buscar métricas da campanha ${campaign.id}:`, error)
  return campaign  // ← Retorna com métricas do banco (acumuladas)
}
```

**Possíveis erros**:
- Campanha foi deletada no ActiveCampaign
- API Key sem permissão
- Rate limit atingido
- Timeout

**Resultado**: Campanha aparece com métricas erradas (acumuladas ao invés do período).

---

### **Causa 3: Campanhas Não Sincronizadas**

Se uma campanha está no ActiveCampaign mas não foi sincronizada:
- ❌ Não está no banco de dados
- ❌ Não aparece na query `prisma.campaign.findMany()`
- ❌ Não é buscada via API v1

**Motivo**: Última sincronização foi antes da campanha ser criada.

---

### **Causa 4: Filtro de `isAutomation`**

```typescript
const campaigns = await prisma.campaign.findMany({
  where: {
    accountId: automation.accountId,
    isAutomation: true,  // ← Pode estar false erroneamente
    name: { startsWith: prefix }
  }
})
```

Se a flag `isAutomation` não foi detectada corretamente:
- Campanha existe no banco
- Mas não é encontrada pela query
- Logo, não busca métricas via API v1

---

## 🔍 Como Diagnosticar

### **1. Verificar Logs da API v1**

Quando você filtra por data, deve aparecer nos logs do servidor:

```
📅 [V2] Filtro de data ativo, buscando métricas da API v1...
📅 [V2] Período API v1: 2026-01-12 até 2026-01-13
✅ [V2] Métricas da API v1 obtidas
```

**Se NÃO aparecer**: Filtro não está sendo aplicado corretamente.

---

### **2. Verificar Associação de Campanhas**

Execute no banco:

```sql
-- Ver automações e campanhas associadas
SELECT 
  au.name as automacao,
  COUNT(c.id) as campanhas_associadas,
  STRING_AGG(c.name, ', ') as nomes_campanhas
FROM automations au
LEFT JOIN campaigns c ON 
  c.account_id = au.account_id
  AND c.is_automation = true
  AND (
    -- Lógica de matching
    c.name ILIKE '%' || SUBSTRING(au.name FROM 2 FOR POSITION(']' IN au.name) - 2) || '%'
    OR c.name ILIKE '%' || au.name || '%'
  )
WHERE au.account_id = 'SUA_CONTA_ID'
GROUP BY au.id, au.name
ORDER BY campanhas_associadas DESC;
```

**Se retornar 0 campanhas**: Heurística falhou (nomes não batem).

---

### **3. Verificar Erros da API v1**

Buscar nos logs por:

```
❌ [V2] Erro ao buscar métricas da campanha
```

**Se houver muitos erros**: Problema na API v1 (permissions, rate limit, etc).

---

### **4. Comparar com ActiveCampaign**

**No ActiveCampaign**:
1. Ir em Automações
2. Clicar em uma automação específica
3. Ver quantidade de emails enviados ontem

**No Dashboard**:
1. Filtrar por "ontem"
2. Verificar se a automação aparece
3. Comparar números

**Se os números diferirem**:
- Verificar se a automação tem prefixo entre colchetes
- Verificar se as campanhas têm o mesmo prefixo
- Verificar logs de erro da API v1

---

## ✅ Soluções

### **Solução 1: Melhorar Heurística** (Curto Prazo)

Adicionar mais padrões de matching:

```typescript
// Além dos padrões atuais, adicionar:

// Padrão 3: Primeiras 3 palavras
const firstWords = autoName.split(' ').slice(0, 3).join(' ')
patterns.push({ name: { contains: firstWords, mode: 'insensitive' } })

// Padrão 4: Remover stop words
const withoutStopWords = autoName.replace(/\b(email|series|automation)\b/gi, '').trim()
patterns.push({ name: { contains: withoutStopWords, mode: 'insensitive' } })
```

---

### **Solução 2: Campo `automationId` no Schema** (Médio Prazo)

**Problema**: API do ActiveCampaign não fornece link direto entre automação e campanha.

**Solução**: Adicionar campo manual ou usar webhooks:

```prisma
model Campaign {
  // ...
  automationId String? @map("automation_id")  // ← Novo campo
}
```

Isso requer:
- Migração do banco
- Lógica para preencher o campo (manual ou via webhook)

---

### **Solução 3: Usar `campaign_messages`** (Médio Prazo)

**Vantagem**: Data REAL dos envios, não precisa de API v1.

**Desvantagem**: Só funciona para últimos 90 dias (como está sincronizado).

**Implementação**: Ver `DIAGNOSTICO-DISCREPANCIA-AUTOMACOES.md`

---

### **Solução 4: Validação Pós-Sync** (Curto Prazo)

Após cada sync, validar associações:

```typescript
// Após sincronizar campanhas de automação
const orphanCampaigns = await prisma.campaign.findMany({
  where: {
    isAutomation: true,
    // Não tem automação associada via heurística
  }
})

if (orphanCampaigns.length > 0) {
  console.warn(`⚠️  ${orphanCampaigns.length} campanhas de automação sem associação`)
  // Log para investigar
}
```

---

## 🎯 Ação Imediata Recomendada

### **Passo 1: Executar Diagnóstico**

```bash
# No servidor
psql -h localhost -U email_dash_user -d email_dash

-- Executar queries de diagnóstico
\i diagnostico-automacoes.sql
```

### **Passo 2: Verificar Logs**

```bash
# Ver últimos logs do auto-sync
tail -100 ~/logs/auto-sync.log | grep -E '(V2|API v1|Erro)'
```

### **Passo 3: Identificar Padrão**

- Se TODAS as automações estão erradas → Problema na API v1
- Se ALGUMAS estão erradas → Problema na heurística (matching de nomes)
- Se uma automação específica está errada → Verificar nomenclatura

---

## 📊 Resumo

| Componente | Usa API v1? | Filtro por Data? | Status |
|------------|-------------|------------------|--------|
| Dashboard Principal | ✅ Sim | ✅ Sim | ✅ Funcionando |
| Página de Automações | ✅ Sim | ✅ Sim | ⚠️ Discrepâncias |
| Página de Listas | ❌ Não | ❌ Não | - |

**Conclusão**: A implementação da API v1 está correta. O problema está na **associação heurística** entre automações e campanhas.

---

**Próximo passo**: Execute o diagnóstico SQL e me envie os resultados! 🔍

