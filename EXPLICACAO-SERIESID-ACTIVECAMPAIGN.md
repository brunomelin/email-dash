# 📘 O que é `seriesid` no ActiveCampaign?

**Data:** 13 de Janeiro de 2026

---

## 🎯 Conceito

No ActiveCampaign, uma **"Series"** (Série) é uma **sequência automática de emails** que são enviados em ordem.

### **Hierarquia**

```
Automação (Automation)
  └─ Série (Series) ← seriesid
      ├─ Email 1 (Campaign)
      ├─ Email 2 (Campaign)
      └─ Email 3 (Campaign)
```

---

## 🔍 Exemplo Real: [SHEIN-BV] 00 - Boas Vindas

### **Estrutura no ActiveCampaign**

```
🤖 Automação: [SHEIN-BV] 00 - Boas Vindas (automation_id=1)
   │
   └─ 📬 Série: seriesid=1
       │
       ├─ 📧 Email ID 1: "Email 00 - Boas Vindas - Entrada - V2"
       │   └─ Enviado: 0 dias após entrada
       │
       ├─ 📧 Email ID 4: "Email 00 - Boas Vindas - Entrada - V6"  
       │   └─ Enviado: X dias após entrada
       │
       └─ 📧 Email ID 5: "[SHEIN-BV] Email 00 - Boas Vindas - V23"
           └─ Enviado: Y dias após entrada
```

---

## 📊 Dados Reais do Banco

Vamos verificar os dados dos 3 emails da série:

```sql
SELECT 
  id,
  name,
  raw_payload->>'seriesid' as series_id,
  raw_payload->>'automation' as is_automation,
  send_date as created_at
FROM campaigns
WHERE account_id = (SELECT id FROM accounts WHERE name = 'gactv20')
  AND id IN ('1', '4', '5')
ORDER BY id;
```

**Resultado:**

| ID | Nome | seriesid | automation | Quando Criado |
|----|------|----------|------------|---------------|
| 1 | Email 00 - BV - V2 | **1** | 1 | 25/12/2025 |
| 4 | Email 00 - BV - V6 | **1** | 1 | 25/12/2025 |
| 5 | [SHEIN-BV] Email 00 - V23 | **1** | 1 | 25/12/2025 |

👆 Todos compartilham o **mesmo `seriesid=1`**!

---

## 🤔 Series vs Automação

### **Automação (Automation)**

- **Nível mais alto** (workflow completo)
- Pode ter **múltiplas ações**:
  - Enviar email
  - Adicionar tag
  - Esperar X dias
  - Condições IF/ELSE
  - Mover para lista
  - **Enviar série de emails** ←

### **Série (Series)**

- **Parte da automação**
- Especificamente uma **sequência de emails**
- Todos os emails da série compartilham o mesmo `seriesid`

---

## 📐 Relações no ActiveCampaign

```
┌─────────────────────────────────────┐
│ Automation (ID: 1)                  │
│ [SHEIN-BV] 00 - Boas Vindas         │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ Ação 1: Tag "novo_contato"   │  │
│  └──────────────────────────────┘  │
│              ↓                      │
│  ┌──────────────────────────────┐  │
│  │ Ação 2: Enviar Série (ID: 1) │  │ ← seriesid
│  │  ├─ Email 1 (campaign_id=1)  │  │
│  │  ├─ Email 2 (campaign_id=4)  │  │
│  │  └─ Email 3 (campaign_id=5)  │  │
│  └──────────────────────────────┘  │
│              ↓                      │
│  ┌──────────────────────────────┐  │
│  │ Ação 3: Esperar 7 dias       │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 🔬 Como Identificar no Payload

### **Campanha Regular (não é série)**

```json
{
  "id": "123",
  "name": "Newsletter Semanal",
  "seriesid": "0",      ← "0" = NÃO faz parte de série
  "automation": "0",    ← "0" = NÃO é automação
  "type": "single"
}
```

### **Campanha de Série**

```json
{
  "id": "5",
  "name": "[SHEIN-BV] Email 00 - Boas Vindas",
  "seriesid": "1",      ← Faz parte da série ID 1
  "automation": "1",    ← É automação
  "type": "single"
}
```

---

## 🎯 Por Que Isso Importa?

### **Problema Atual**

```typescript
// Busca apenas por nome
const campaigns = await prisma.campaign.findMany({
  where: {
    name: { startsWith: '[SHEIN-BV]' }  // ❌ Encontra só 1 email!
  }
})
```

**Resultado:** Apenas email ID 5 (que tem o prefixo)

### **Solução com seriesid**

```typescript
// Busca todos os emails da mesma série
const campaigns = await prisma.campaign.findMany({
  where: {
    seriesId: '1',        // ✅ Encontra os 3 emails!
    isAutomation: true
  }
})
```

**Resultado:** Emails 1, 4 e 5 (todos da série)

---

## 📊 Verificação no Banco Atual

Vamos ver quantos emails de automação compartilham o mesmo `seriesid`:

```sql
SELECT 
  raw_payload->>'seriesid' as series_id,
  COUNT(*) as num_emails,
  STRING_AGG(DISTINCT name, ' | ') as email_names
FROM campaigns
WHERE account_id = (SELECT id FROM accounts WHERE name = 'gactv20')
  AND is_automation = true
  AND raw_payload->>'seriesid' != '0'
GROUP BY raw_payload->>'seriesid'
ORDER BY COUNT(*) DESC;
```

Isso mostraria todas as séries e quantos emails cada uma tem.

---

## 🚀 Implicações para o Dashboard

### **Sem usar seriesid:**
- ❌ Depende de nomenclatura consistente
- ❌ Falha se emails não têm mesmo prefixo
- ❌ Pode perder emails da automação

### **Usando seriesid:**
- ✅ Agrupa corretamente todos os emails
- ✅ Independente de nomenclatura
- ✅ Métricas completas da automação

---

## 🔗 Relação com o Modelo de Dados

### **Estrutura Proposta**

```prisma
model Automation {
  id        String
  accountId String
  name      String
  // ... outros campos
  
  series    Series[]  // ← Nova relação
}

model Series {
  id           String
  accountId    String
  automationId String  // ← Link para automação
  
  automation   Automation @relation(...)
  campaigns    Campaign[] // ← Emails da série
}

model Campaign {
  id        String
  accountId String
  seriesId  String?    // ← Campo NOVO
  
  series    Series? @relation(...)
}
```

**OU** versão simplificada (sem model Series):

```prisma
model Campaign {
  id        String
  seriesId  String?    // ← Apenas adicionar este campo
  
  @@index([accountId, seriesId])
}
```

---

## 🧪 Teste de Conceito

Vamos testar se realmente funciona:

```bash
# 1. Ver todos os emails da série 1
SELECT id, name 
FROM campaigns 
WHERE raw_payload->>'seriesid' = '1';

# Deve retornar: IDs 1, 4, 5

# 2. Somar envios de ontem de TODOS eles via API v1
# (já fizemos isso!)

# Resultado: 50 envios (apenas email ID 1 teve envios ontem)
```

---

## 📝 Conclusão

**`seriesid` é:**
- ✅ Um identificador de **sequência de emails**
- ✅ Nível abaixo de "automação"
- ✅ Compartilhado por **todos os emails da mesma série**
- ✅ A **solução ideal** para associar corretamente emails de automação

**Não é:**
- ❌ O ID da automação em si
- ❌ Único por email (é compartilhado)
- ❌ Presente em campanhas regulares (é "0")

---

**Próximos Passos:**

1. Adicionar campo `seriesId` no schema
2. Popular esse campo no sync
3. Usar para agrupar emails corretamente
4. Resolver o problema de métricas incompletas

✅ Isso resolverá o caso do [SHEIN-BV] e casos similares!

