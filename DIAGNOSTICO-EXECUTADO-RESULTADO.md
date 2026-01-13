# 🔍 DIAGNÓSTICO EXECUTADO - Resultados

**Data:** 13 de Janeiro de 2026  
**Status:** 🚨 **PROBLEMA CRÍTICO IDENTIFICADO**

---

## 📊 Resultados do Diagnóstico

### ❌ **PROBLEMA: Messages NÃO estão sendo sincronizados**

```
Messages Total no banco: 0
Messages Últimos 7 Dias: 0
Messages Ontem: 0

Últimos 5 syncs:
├─ gactv21: messages_synced = 0
├─ gactv20: messages_synced = 0
├─ gactv2:  messages_synced = 0
├─ gactv19: messages_synced = 0
└─ gactv18: messages_synced = 0
```

---

## 🔴 Por que Messages não são sincronizados?

### **Possíveis Causas**

#### **Causa 1: API não retorna messages** (Mais Provável)

A API `/messages` do ActiveCampaign pode:
- Não ter dados (contas sem envios recentes)
- Requerer permissões específicas
- Retornar formato inesperado

**Verificar**: Testar API manualmente

```bash
# Testar com uma conta específica
curl "https://[CONTA].api-us1.com/api/3/messages?limit=10" \
  -H "Api-Token: [API_KEY]"
```

---

#### **Causa 2: Filtro de data não funciona**

Código atual:

```typescript:204:204:src/lib/services/sync-service.ts
for await (const messagesBatch of messagesAPI.listRecentMessages(90)) {
```

A API pode não suportar o filtro `cdate_gte` corretamente.

---

#### **Causa 3: Generator não itera**

Se a API retornar 0 resultados, o `for await` nunca entra no loop:

```typescript
// Em messages.ts
async *listRecentMessages(daysBack: number = 30): AsyncGenerator {
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - daysBack)

  yield* this.listMessages({ fromDate })
}
```

Se `yield*` não retornar nada, o loop no sync-service não executa.

---

## 📈 Dados Importantes Encontrados

### 1. **Campanhas de Automação Existem**

```
Top 10 campanhas de automação por envios (acumulados):
├─ [SHEIN-BV] Email 00 - V12: 1,056 enviados (desde 27/11/2025)
├─ [SHEIN-BV] Email 00 - V18: 876 enviados (desde 24/12/2025)
├─ [SHEIN-BV] Email 00 - V2: 875 enviados (desde 15/12/2025)
└─ ... (total: 161 campanhas)
```

**Conclusão**: Campanhas estão sincronizadas ✅

---

### 2. **Heurística de Prefixos Funcionando**

```
Prefixos detectados:
├─ [SHEIN-RES]
├─ [SHEIN-CLICK]
├─ [SHEIN-BV]
├─ [SK]
├─ [PE]
├─ [CO]
├─ [JP]
├─ [DE]
└─ [BR]
```

**Conclusão**: Associação de automações funciona ✅

---

### 3. **API v1 é Chamada mas Retorna Erros**

Logs do servidor:

```
📅 [V2] Filtro de data ativo, buscando métricas da API v1...
⚠️  API v1 retornou erro para campanha 29: Failed: Nothing is returned
⚠️  API v1 retornou erro para campanha 3: Failed: Nothing is returned
⚠️  API v1 retornou erro para campanha 10: Failed: Nothing is returned
...
```

**Significado**: Essas campanhas **não tiveram envios** no período filtrado (correto!)

---

## 💡 Solução: Ativar Sincronização de Messages

### **Opção 1: Debug Sync de Messages** ⭐ **RECOMENDADO**

Adicionar logs detalhados para entender por quê messages não são sincronizados:

```typescript
// Em sync-service.ts, linha 204
console.log(`📬 Sincronizando mensagens dos últimos 90 dias da conta ${account.name}...`)

let batchCount = 0
for await (const messagesBatch of messagesAPI.listRecentMessages(90)) {
  batchCount++
  console.log(`  📦 Batch ${batchCount}: ${messagesBatch.length} mensagens`)
  
  for (const acMessage of messagesBatch) {
    // ... resto do código
  }
}

if (batchCount === 0) {
  console.warn(`  ⚠️  Nenhum batch de mensagens recebido da API!`)
  console.warn(`  ⚠️  Possíveis causas:`)
  console.warn(`     - API não retornou dados`)
  console.warn(`     - Filtro de data não funcionou`)
  console.warn(`     - Conta não tem envios nos últimos 90 dias`)
}
```

---

### **Opção 2: Testar API de Messages Manualmente**

Criar script de teste:

```typescript
// test-messages-api.ts
import { ActiveCampaignClient, MessagesAPI } from '@/lib/connectors/activecampaign'

async function testMessagesAPI() {
  const client = new ActiveCampaignClient({
    baseUrl: 'https://gactv1.api-us1.com',  // Ajustar
    apiKey: 'YOUR_API_KEY'                   // Ajustar
  })

  const messagesAPI = new MessagesAPI(client)

  console.log('🧪 Testando API de Messages...')

  let totalMessages = 0
  let batchCount = 0

  for await (const batch of messagesAPI.listRecentMessages(90)) {
    batchCount++
    totalMessages += batch.length
    console.log(`  Batch ${batchCount}: ${batch.length} messages`)
    
    if (batchCount === 1 && batch.length > 0) {
      console.log('  Exemplo de message:')
      console.log(JSON.stringify(batch[0], null, 2))
    }
  }

  console.log(`✅ Total: ${totalMessages} messages em ${batchCount} batches`)
}

testMessagesAPI().catch(console.error)
```

**Executar**:
```bash
npx tsx test-messages-api.ts
```

---

### **Opção 3: Verificar Permissões da API Key**

No ActiveCampaign:
1. Settings → Developer → API Access
2. Verificar se a API Key tem permissão para:
   - ✅ Read Messages
   - ✅ Read Campaigns

Se não tiver, gerar nova API Key com permissões corretas.

---

### **Opção 4: Remover Filtro de Data** (Teste)

Testar sem filtro de data para ver se retorna algo:

```typescript
// Em messages.ts, temporariamente mudar:
async *listRecentMessages(daysBack: number = 30): AsyncGenerator {
  // SEM filtro de data
  yield* this.listMessages()  // ← Sem options
}
```

Se funcionar, o problema é o filtro de data.

---

## 🎯 Ações Imediatas

### **PASSO 1: Adicionar Logs Detalhados**

```typescript
// src/lib/services/sync-service.ts (linha 200)
console.log(`📬 Sincronizando mensagens dos últimos 90 dias da conta ${account.name}...`)

let batchCount = 0
let skippedNoCampaignId = 0
let skippedCampaignNotFound = 0

for await (const messagesBatch of messagesAPI.listRecentMessages(90)) {
  batchCount++
  console.log(`  📦 Batch ${batchCount}: ${messagesBatch.length} mensagens`)
  
  for (const acMessage of messagesBatch) {
    if (!acMessage.campaignid) {
      skippedNoCampaignId++
      continue
    }

    const campaignExists = await prisma.campaign.findUnique({
      where: {
        accountId_id: {
          accountId,
          id: acMessage.campaignid,
        },
      },
    })

    if (!campaignExists) {
      skippedCampaignNotFound++
      console.log(`    ⚠️  Campanha ${acMessage.campaignid} não encontrada`)
      continue
    }

    const normalized = normalizeMessage(acMessage, accountId)

    await prisma.campaignMessage.upsert({
      where: {
        accountId_id: {
          accountId,
          id: acMessage.id,
        },
      },
      create: normalized as any,
      update: normalized as any,
    })

    messagesSynced++
  }
}

console.log(`✅ ${messagesSynced} mensagens sincronizadas`)
if (batchCount === 0) {
  console.warn(`  ⚠️  NENHUM BATCH RECEBIDO DA API!`)
}
if (skippedNoCampaignId > 0) {
  console.warn(`  ⚠️  ${skippedNoCampaignId} mensagens sem campaignId`)
}
if (skippedCampaignNotFound > 0) {
  console.warn(`  ⚠️  ${skippedCampaignNotFound} mensagens com campanha não encontrada`)
}
```

---

### **PASSO 2: Rodar Sync Manual**

```bash
cd ~/apps/email-dash
npx tsx auto-sync.js
```

**Verificar logs**:
- Aparece "📦 Batch X: Y mensagens"?
- Se SIM: API retorna dados (problema está no processamento)
- Se NÃO: API não retorna dados (problema na API ou permissões)

---

### **PASSO 3: Testar API Manualmente**

```bash
# Criar arquivo test-messages-api.ts (código acima)
npx tsx test-messages-api.ts
```

---

## 📊 Resultado Esperado

**Após corrigir**:

```sql
-- Verificar novamente:
SELECT COUNT(*) FROM campaign_messages;
-- Deve retornar > 0

SELECT 
  DATE(sent_at) as data,
  COUNT(*) as total
FROM campaign_messages
WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(sent_at)
ORDER BY data DESC;
-- Deve mostrar envios dos últimos 7 dias
```

---

## 🎯 Próximo Passo

**Implementar Opção 1 (Adicionar logs) agora?**

Isso vai revelar exatamente onde o sync de messages está travando:
1. API não retorna dados? → Problema de permissões/configuração
2. API retorna mas nenhuma mensagem tem `campaignid`? → Problema no ActiveCampaign
3. Campanhas não são encontradas? → Problema de sincronização de campanhas

---

**Quer que eu implemente os logs detalhados agora?** 🔧

