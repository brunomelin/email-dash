# 🏗️ ARQUITETURA: Automações vs Campanhas

## 📊 **VISÃO GERAL:**

```
┌─────────────────────────────────────────────────────────────┐
│              ACTIVECAMPAIGN API (Fonte de Dados)            │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
         ┌──────▼──────┐         ┌─────▼──────┐
         │ /automations│         │ /campaigns │
         │  endpoint   │         │  endpoint  │
         └──────┬──────┘         └─────┬──────┘
                │                      │
                │                      │
    ┌───────────▼────────┐   ┌────────▼────────────┐
    │  Automations API   │   │   Campaigns API     │
    │  (sync-service.ts) │   │  (sync-service.ts)  │
    └───────────┬────────┘   └────────┬────────────┘
                │                      │
                │                      │
    ┌───────────▼────────┐   ┌────────▼────────────┐
    │ normalizeAutomation│   │ normalizeCampaign   │
    │  (normalizer.ts)   │   │  (normalizer.ts)    │
    └───────────┬────────┘   └────────┬────────────┘
                │                      │
                │                      │
    ┌───────────▼────────┐   ┌────────▼────────────┐
    │  BANCO: automations│   │  BANCO: campaigns   │
    │  (tabela separada) │   │  (tabela separada)  │
    └────────────────────┘   └─────────────────────┘
              │                        │
              │                        │
              │   ❌ SEM RELAÇÃO FK! ❌│
              │                        │
              └───────────┬────────────┘
                          │
              ┌───────────▼────────────┐
              │ HEURÍSTICA DE NOME     │
              │ (runtime, em memória)  │
              │ automation-metrics-    │
              │ service.ts             │
              └────────────────────────┘
```

---

## 📋 **TABELA 1: AUTOMATIONS**

### **Fonte:** `GET /api/3/automations`

### **Dados que a API retorna:**
```json
{
  "id": "1",
  "name": "[SHEIN-BV] 00 - Boas Vindas",
  "status": "1",
  "cdate": "2025-01-01T00:00:00",
  "mdate": "2025-12-01T00:00:00",
  "entered": "820",      ← Quantos contatos ENTRARAM
  "exited": "817",       ← Quantos contatos SAÍRAM
  "defaultscreenshot": "..."
}
```

### **Dados que SALVAMOS no banco:**
```sql
CREATE TABLE automations (
  id           VARCHAR,
  account_id   VARCHAR,
  name         VARCHAR,          ← ÚNICO LINK COM CAMPANHAS!
  status       VARCHAR,          ← "active" | "inactive"
  entered      INTEGER,          ← Da API
  completed    INTEGER,          ← Da API (exited)
  active       INTEGER,          ← Calculado (entered - exited)
  raw_payload  JSONB,
  created_at   TIMESTAMP,
  updated_at   TIMESTAMP,
  
  PRIMARY KEY (account_id, id)
);
```

### **⚠️ O QUE NÃO TEM:**
```
❌ Lista de emails/campanhas da automação
❌ Métricas de email (opens, clicks, sent)
❌ Datas de envio
❌ Relação com tabela campaigns
```

---

## 📋 **TABELA 2: CAMPAIGNS**

### **Fonte:** `GET /api/3/campaigns`

### **Dados que a API retorna:**
```json
{
  "id": "27",
  "name": "Email 00 - Boas Vindas - Entrada - V6",  ← Nome livre!
  "type": "single",
  "status": 5,                    ← 5 = completed
  "sdate": "2025-12-17T14:06:41", ← Data de envio
  "send_amt": "139",              ← Emails enviados
  "uniqueopens": "23",            ← Aberturas únicas
  "uniquelinkclicks": "0",        ← Cliques únicos
  "automation": "0",              ← Flag se é automação (mas nem sempre confiável)
  "seriesid": "1"                 ← ID da automação (mas não confiável)
}
```

### **Dados que SALVAMOS no banco:**
```sql
CREATE TABLE campaigns (
  id            VARCHAR,
  account_id    VARCHAR,
  name          VARCHAR,          ← ÚNICO LINK COM AUTOMAÇÕES!
  status        VARCHAR,
  type          VARCHAR,
  send_date     TIMESTAMP,        ← Data de envio (sdate)
  is_automation BOOLEAN,          ← Detectado por heurística
  
  -- Métricas
  sent          INTEGER,          ← send_amt
  opens         INTEGER,
  unique_opens  INTEGER,          ← uniqueopens
  open_rate     FLOAT,            ← Calculado
  clicks        INTEGER,
  unique_clicks INTEGER,          ← uniquelinkclicks
  click_rate    FLOAT,            ← Calculado
  bounces       INTEGER,
  unsubscribes  INTEGER,
  
  raw_payload   JSONB,
  created_at    TIMESTAMP,
  updated_at    TIMESTAMP,
  
  PRIMARY KEY (account_id, id)
);
```

### **⚠️ O QUE NÃO TEM:**
```
❌ FK para automations (não existe relação!)
❌ automation_id confiável
❌ Referência direta à automação
```

---

## 🔄 **FLUXO DE SINCRONIZAÇÃO:**

### **1. Sincronizar Automações:**
```typescript
// sync-service.ts - linha 148-167

for await (const automationsBatch of automationsAPI.listAutomations()) {
  for (const acAutomation of automationsBatch) {
    // API retorna apenas: id, name, status, entered, exited
    const normalized = normalizeAutomation(acAutomation, accountId)
    
    await prisma.automation.upsert({
      where: { accountId_id: { accountId, id: acAutomation.id } },
      create: normalized,
      update: normalized
    })
  }
}
```

**O que é salvo:**
```javascript
{
  id: "1",
  accountId: "gactv1",
  name: "[SHEIN-BV] 00 - Boas Vindas",
  status: "active",
  entered: 820,
  completed: 817,
  active: 3
}
```

### **2. Sincronizar Campanhas:**
```typescript
// sync-service.ts - linha 90-145

for await (const campaignsBatch of campaignsAPI.listCampaigns()) {
  for (const acCampaign of campaignsBatch) {
    // API retorna: id, name, sdate, send_amt, uniqueopens, etc
    const normalized = normalizeCampaign(acCampaign, accountId)
    
    await prisma.campaign.upsert({
      where: { accountId_id: { accountId, id: acCampaign.id } },
      create: normalized,
      update: normalized
    })
  }
}
```

**O que é salvo:**
```javascript
{
  id: "27",
  accountId: "gactv1",
  name: "Email 00 - Boas Vindas - Entrada - V6",
  sendDate: "2025-12-17T14:06:41",
  sent: 139,
  uniqueOpens: 23,
  openRate: 0.165,
  isAutomation: true  // ← Detectado por heurística
}
```

---

## 🔗 **ASSOCIAÇÃO (RUNTIME - EM MEMÓRIA):**

### **Quando você acessa `/automations`:**

```typescript
// automation-metrics-service.ts - linha 69-118

for (const automation of automations) {
  // 1. Extrair prefixo do nome
  const autoName = automation.name // "[SHEIN-BV] 00 - Boas Vindas"
  const prefixMatch = autoName.match(/^(\[[\w\s-]+\])/)
  const prefix = prefixMatch ? prefixMatch[1] : null // "[SHEIN-BV]"
  
  // 2. Buscar campanhas com esse prefixo
  const campaigns = await prisma.campaign.findMany({
    where: {
      accountId: automation.accountId,  // ✅ Mesma conta
      isAutomation: true,               // ✅ É automação
      OR: [
        { name: { startsWith: prefix } } // ✅ Começa com [SHEIN-BV]
      ]
    }
  })
  
  // 3. Filtrar por data (em memória)
  let filteredCampaigns = campaigns.filter(c => {
    if (!c.sendDate) return false
    if (filters.dateFrom && c.sendDate < dateFrom) return false
    if (filters.dateTo && c.sendDate > dateTo) return false
    return true
  })
  
  // 4. Agregar métricas
  const totalSent = filteredCampaigns.reduce((sum, c) => sum + c.sent, 0)
  const totalOpens = filteredCampaigns.reduce((sum, c) => sum + c.uniqueOpens, 0)
  // ...
  
  return {
    ...automation,
    totalCampaigns: filteredCampaigns.length,
    totalSent,
    totalOpens,
    openRate: totalSent > 0 ? totalOpens / totalSent : 0
  }
}
```

---

## 🆚 **DIFERENÇA: Automações vs Campanhas**

| Aspecto | Automações | Campanhas |
|---------|-----------|-----------|
| **Endpoint API** | `/api/3/automations` | `/api/3/campaigns` |
| **Dados da API** | Apenas entrada/saída | Métricas completas |
| **Tem métricas de email?** | ❌ NÃO | ✅ SIM |
| **Tem data de envio?** | ❌ NÃO | ✅ SIM (`sdate`) |
| **Tem relação com outro?** | ❌ NÃO | ❌ NÃO |
| **Tabela no banco** | `automations` | `campaigns` |
| **Foreign Key?** | ❌ NÃO | ❌ NÃO |
| **Associação** | Por nome (runtime) | Por nome (runtime) |
| **Filtro de data** | ❌ Não aplicável | ✅ Por `send_date` |

---

## 🎯 **POR QUE SÃO SEPARADOS?**

### **Limitação da API do ActiveCampaign:**

1. **API `/automations`** retorna:
   - ✅ ID, nome, status
   - ✅ Quantos contatos entraram/saíram
   - ❌ **NÃO retorna lista de emails**
   - ❌ **NÃO retorna métricas de email**

2. **API `/campaigns`** retorna:
   - ✅ ID, nome, status
   - ✅ Métricas completas (sent, opens, clicks)
   - ✅ Data de envio
   - ⚠️ **Campo `automation` e `seriesid` não são confiáveis**
   - ❌ **NÃO retorna ID da automação de forma consistente**

3. **Não há endpoint para:**
   - ❌ Listar emails de uma automação
   - ❌ Associar campanha → automação
   - ❌ Métricas de email por automação

---

## 💡 **POR QUE USAMOS HEURÍSTICA DE NOME?**

### **Alternativas consideradas:**

#### **1. Usar `seriesid` da API:**
```json
{
  "campaign": {
    "seriesid": "1"  ← ID da automação
  }
}
```

**Problema:**
- ⚠️ Nem sempre vem preenchido
- ⚠️ Às vezes vem "0" mesmo sendo de automação
- ⚠️ Não é confiável

#### **2. Usar campo `automation`:**
```json
{
  "campaign": {
    "automation": "1"  ← Flag de automação
  }
}
```

**Problema:**
- ⚠️ Também não é 100% confiável
- ⚠️ Não indica QUAL automação

#### **3. Nossa solução: Prefixo no nome:**
```
Automação: [SHEIN-BV] 00 - Boas Vindas
Campanha:  [SHEIN-BV] Email 00 - Boas Vindas - Entrada - V4
            ↑↑↑↑↑↑↑↑↑
         PREFIXO COMUM = ASSOCIAÇÃO
```

**Vantagens:**
- ✅ Controlável pelo usuário
- ✅ 100% preciso (se seguir padrão)
- ✅ Visual (fácil identificar)
- ✅ Funciona para múltiplas campanhas

---

## 🔍 **EXEMPLO PRÁTICO:**

### **Você acessa:**
```
/automations?from=2025-12-17&to=2025-12-24&accountIds=gactv1
```

### **O que acontece:**

```sql
-- 1. Buscar automações da conta
SELECT * FROM automations WHERE account_id = 'gactv1';

-- Resultado:
-- [SHEIN-BV] 00 - Boas Vindas | entered: 820
-- [CO] Email 00               | entered: 418
-- [SK] 00 - Eslovaquia        | entered: 107
```

```sql
-- 2. Para CADA automação, buscar campanhas
SELECT * FROM campaigns 
WHERE account_id = 'gactv1'
  AND is_automation = true
  AND name ILIKE '[SHEIN-BV]%';  ← Busca por prefixo!

-- Resultado:
-- [SHEIN-BV] Email 00 - Boas Vindas - Entrada - V4 | 2025-12-12 | 300 enviados
```

```javascript
// 3. Filtrar por data (em memória)
const filtered = campaigns.filter(c => 
  c.sendDate >= '2025-12-17' && 
  c.sendDate <= '2025-12-24'
)

// Resultado: [] (vazio - campanha foi em 12/12, antes do período!)
```

```javascript
// 4. Agregar métricas
return {
  name: "[SHEIN-BV] 00 - Boas Vindas",
  entered: 820,              // ← Da tabela automations
  totalCampaigns: 0,         // ← Nenhuma no período
  totalSent: 0,              // ← 0 porque filtrou tudo
  totalOpens: 0,             // ← 0
  openRate: 0                // ← 0
}
```

```jsx
// 5. UI renderiza
<TableCell>—</TableCell>  // ← Mostra "—" porque totalSent === 0
```

---

## 📊 **COMPARAÇÃO COM DASHBOARD PRINCIPAL:**

### **Dashboard (/):**
```typescript
// Busca DIRETO as campanhas
const campaigns = await prisma.campaign.findMany({
  where: {
    accountId: 'gactv1',
    sendDate: { gte: '2025-12-17', lte: '2025-12-24' }
  }
})

// Agregação simples
const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0)
```

### **Automações (/automations):**
```typescript
// 1. Busca automações
const automations = await prisma.automation.findMany(...)

// 2. Para CADA automação, busca campanhas associadas
for (const automation of automations) {
  const campaigns = await prisma.campaign.findMany({
    where: {
      name: { startsWith: automation.prefix }  // ← Associação!
    }
  })
  
  // 3. Filtra por data
  const filtered = campaigns.filter(...)
  
  // 4. Agrega métricas
}
```

**Diferença principal:**
- Dashboard: **1 query**, agregação direta
- Automações: **N queries** (1 por automação) + associação por nome + filtro em memória

---

## 🎯 **RESUMO:**

1. **Automações** e **Campanhas** são **tabelas separadas** no banco
2. **NÃO há Foreign Key** entre elas (API não fornece essa relação)
3. **Associação é feita por NOME** (heurística de prefixo)
4. **Automações** têm apenas dados de entrada/saída (da API)
5. **Campanhas** têm métricas completas de email
6. **Filtro de data** só funciona em campanhas (automações não têm data)
7. **Por isso** vemos "—" quando não há campanhas no período!

---

## ✅ **ESTÁ FUNCIONANDO CORRETAMENTE!**

O problema NÃO é bug, mas:
- ✅ Campanhas SEM prefixo não são associadas
- ✅ Campanhas FORA do período não aparecem
- ✅ Comportamento esperado dado as limitações da API

