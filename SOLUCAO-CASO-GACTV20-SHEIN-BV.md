# ✅ SOLUÇÃO: Caso gactv20 - [SHEIN-BV] 00 - Boas Vindas

**Data:** 13 de Janeiro de 2026  
**Status:** 🎯 **PROBLEMA IDENTIFICADO E SOLUÇÃO PROPOSTA**

---

## 🔍 Investigação Completa

### **Problema Relatado**

No ActiveCampaign: 50 envios ontem  
No Dashboard: 0 envios (aparece em "Outras Automações" sem emails)

---

### **Descobertas**

#### **1. Automação no Banco**

```sql
Automação: [SHEIN-BV] 00 - Boas Vindas
Conta: gactv20
Entered: 1,114
Status: active
```

✅ Automação está sincronizada

---

#### **2. Emails da Série (seriesid=1)**

A automação tem **3 emails** na série:

| ID | Nome | Prefixo [SHEIN-BV]? | Acumulado | Ontem |
|----|------|---------------------|-----------|-------|
| 1 | Email 00 - Boas Vindas - Entrada - V2 | ❌ NÃO | 939 | **50** |
| 4 | Email 00 - Boas Vindas - Entrada - V6 | ❌ NÃO | 18 | 0 |
| 5 | [SHEIN-BV] Email 00 - Boas Vindas - V23 | ✅ SIM | 662 | 0 |

---

#### **3. Heurística Atual**

```typescript
// automation-metrics-service.ts
const prefixMatch = autoName.match(/^(\[[\w\s-]+\])/)
if (prefix) {
  // Busca campanhas que começam com [SHEIN-BV]
  campaigns = await prisma.campaign.findMany({
    where: {
      name: { startsWith: '[SHEIN-BV]' }
    }
  })
}
```

**Problema**: Apenas o email ID 5 tem o prefixo!

**Resultado**: Emails 1 e 4 **NÃO são associados**!

---

## 🎯 Causa Raiz

1. ✅ Todos os 3 emails estão sincronizados no banco
2. ✅ API v1 retorna corretamente (50 envios ontem do email ID 1)
3. ❌ **Heurística de associação falha** (busca apenas por prefixo no nome)
4. ❌ Email ID 1 (com 50 envios) **não é associado** à automação
5. ❌ Dashboard mostra 0 envios

---

## 💡 Solução

### **Opção 1: Associar por `seriesid`** ⭐ **RECOMENDADO**

Emails de automação têm campo `seriesid` no `raw_payload`:

```typescript
// automation-metrics-service.ts

async getAutomationsWithMetricsV2(filters) {
  // ... buscar automações
  
  for (const automation of automations) {
    // 1. Buscar campanhas associadas por seriesid (NOVO!)
    const campaigns = await prisma.campaign.findMany({
      where: {
        accountId: automation.accountId,
        isAutomation: true,
        OR: [
          // Padrão NOVO: Por seriesid
          {
            rawPayload: {
              path: ['seriesid'],
              not: { equals: '0' }
            }
          },
          // Padrão antigo: Por nome (fallback)
          { name: { startsWith: prefix } }
        ]
      }
    })
    
    // ... resto do código
  }
}
```

**Vantagens**:
- ✅ Associa TODOS os emails da série
- ✅ Independente da nomenclatura
- ✅ Mais preciso

**Desvantagens**:
- ⚠️ Precisa do `seriesid` no `raw_payload` (já temos!)
- ⚠️ Mais complexo de implementar

---

### **Opção 2: Melhorar Heurística de Nome** (Mais Simples)

Adicionar mais padrões de matching:

```typescript
const patterns = []

// Padrão 1: Prefixo entre colchetes
if (prefix) {
  patterns.push({ name: { startsWith: prefix } })
}

// Padrão 2: NOVO - Código numérico
// Automação: "[SHEIN-BV] 00 - Boas Vindas"
// Match: "Email 00 - Boas Vindas"
const codeMatch = autoName.match(/\b(\d{2})\b/)
if (codeMatch) {
  const code = codeMatch[1]
  patterns.push({ 
    name: { 
      contains: `Email ${code}`,
      mode: 'insensitive' 
    } 
  })
}

// Padrão 3: NOVO - Palavras-chave principais
const keywords = autoName
  .replace(/\[.*?\]/g, '') // Remove prefixos
  .replace(/\d+/g, '')     // Remove números
  .trim()
  
if (keywords.length > 5) {
  patterns.push({ 
    name: { 
      contains: keywords,
      mode: 'insensitive' 
    } 
  })
}
```

**Vantagens**:
- ✅ Mais fácil de implementar
- ✅ Funciona com múltiplos padrões de nome

**Desvantagens**:
- ❌ Ainda depende de nomenclatura
- ❌ Pode ter falsos positivos

---

### **Opção 3: Usar API de Automações** (Ideal mas Complexo)

Buscar diretamente da API quais emails pertencem a qual automação:

```typescript
// API endpoint (se existir):
GET /api/3/automations/{id}/emails
```

**Problema**: API v3 **não tem** esse endpoint!

---

## 🎯 Implementação Recomendada

### **Passo 1: Adicionar campo `seriesId` no schema**

```prisma
model Campaign {
  // ... campos existentes
  
  seriesId String? @map("series_id")  // ← NOVO
  
  @@index([accountId, seriesId])      // ← NOVO índice
}
```

### **Passo 2: Popular campo na sincronização**

```typescript
// Em normalizer.ts
export function normalizeCampaign(acCampaign, accountId) {
  const seriesId = acCampaign.seriesid && acCampaign.seriesid !== '0' 
    ? acCampaign.seriesid 
    : null
    
  return {
    // ... campos existentes
    seriesId,  // ← NOVO
  }
}
```

### **Passo 3: Associar por seriesid**

```typescript
// Em automation-metrics-service.ts
async getAutomationsWithMetricsV2(filters) {
  for (const automation of automations) {
    // Buscar primeira campanha com prefixo para pegar o seriesId
    const sampleCampaign = await prisma.campaign.findFirst({
      where: {
        accountId: automation.accountId,
        isAutomation: true,
        name: { startsWith: prefix }
      },
      select: { seriesId: true }
    })
    
    if (sampleCampaign?.seriesId) {
      // Buscar TODAS as campanhas dessa série
      const campaigns = await prisma.campaign.findMany({
        where: {
          accountId: automation.accountId,
          seriesId: sampleCampaign.seriesId,
          isAutomation: true
        }
      })
    } else {
      // Fallback: usar heurística antiga
      const campaigns = await prisma.campaign.findMany({
        where: {
          accountId: automation.accountId,
          name: { startsWith: prefix }
        }
      })
    }
  }
}
```

---

## 📝 Checklist de Implementação

- [ ] Adicionar campo `seriesId` no schema Prisma
- [ ] Rodar migração do banco
- [ ] Atualizar normalizer para extrair `seriesId`
- [ ] Rodar sync completo (popular campo)
- [ ] Atualizar `automation-metrics-service.ts` para usar `seriesId`
- [ ] Testar com caso gactv20 - [SHEIN-BV]
- [ ] Verificar se agora mostra 50 envios ontem

---

## 🧪 Teste de Validação

**Após implementar**, executar:

```bash
# 1. Verificar se seriesId foi populado
psql -c "
SELECT id, name, series_id 
FROM campaigns 
WHERE account_id = (SELECT id FROM accounts WHERE name = 'gactv20')
  AND series_id = '1';
"
# Deve retornar os 3 emails

# 2. Testar dashboard com filtro ontem
# Acessar: /automations?from=2026-01-12&to=2026-01-12

# 3. Verificar se [SHEIN-BV] 00 - Boas Vindas aparece com:
#    - 50 envios
#    - 26 aberturas
#    - 52% open rate
```

---

## 📊 Resultado Esperado

**ANTES:**
```
[SHEIN-BV] 00 - Boas Vindas
├─ Emails: —
├─ Enviados: —
├─ Open Rate: —
└─ Aparece em "Outras Automações"
```

**DEPOIS:**
```
[SHEIN-BV] 00 - Boas Vindas
├─ Emails: 3
├─ Enviados: 50
├─ Open Rate: 52.0%
└─ Aparece em "Automações com Atividade"
```

---

## ⏱️ Timeline

**Implementação completa**: 1-2 horas
- Migração: 10 min
- Atualizar normalizer: 15 min
- Sync completo: 20 min
- Atualizar service: 30 min
- Testes: 15 min

---

**Quer que eu implemente a solução agora?** 🚀

