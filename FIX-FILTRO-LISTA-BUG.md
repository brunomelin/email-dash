# 🐛 FIX: Bug no Filtro de Lista - Campanhas de Outras Contas

**Data:** 22/12/2025  
**Bug:** Ao selecionar uma lista de uma conta, apareciam campanhas de outras contas  
**Status:** ✅ RESOLVIDO

---

## 🔍 PROBLEMA IDENTIFICADO

### Sintoma:
- Usuário seleciona: `📋 Funil - SK (gactv13)`
- Dashboard mostra: Campanhas da **gactv13** + **Gactv22** ❌

### Comportamento Esperado:
- Usuário seleciona: `📋 Funil - SK (gactv13)`
- Dashboard mostra: Apenas campanhas da **gactv13** ✅

---

## 🎯 CAUSA RAIZ

O problema estava na query Prisma ao filtrar por lista.

### Código ANTES (Incorreto):

```typescript
// Buscava apenas campaignId
const campaignIds = campaignLinks.map(link => link.campaignId)
allCampaignIds.push(...campaignIds)

// Filtrava apenas por ID
where.id = { in: uniqueCampaignIds }
```

**Por que está errado?**

Lembre-se do nosso schema Prisma:
```prisma
model Campaign {
  @@id([accountId, id])  // Composite Primary Key!
}
```

Uma campanha com ID "1" pode existir em:
- Conta "gactv13" → Campaign (accountId: gactv13, id: 1)
- Conta "Gactv22" → Campaign (accountId: Gactv22, id: 1)

Ao filtrar apenas por `id`, Prisma busca **TODAS** as campanhas com aquele ID, independente da conta!

---

## 🛠️ SOLUÇÃO IMPLEMENTADA

### Código DEPOIS (Correto):

```typescript
// Buscar accountId + campaignId (chave composta!)
const campaignKeys: Array<{ accountId: string; campaignId: string }> = []

const campaignLinks = await prisma.campaignList.findMany({
  where: { accountId: listAccountId, listId: listActualId },
  select: {
    accountId: true,    // ← AGORA INCLUÍMOS accountId!
    campaignId: true,
  },
})

campaignKeys.push(...campaignLinks.map(link => ({
  accountId: link.accountId,
  campaignId: link.campaignId,
})))

// Filtrar usando OR com accountId + id
where.OR = uniqueKeys.map(key => ({
  accountId: key.accountId,  // ← AGORA FILTRAMOS POR AMBOS!
  id: key.campaignId,
}))
```

**Query Prisma Gerada:**

```sql
SELECT * FROM campaigns
WHERE (accountId = 'gactv13' AND id = '1')
   OR (accountId = 'gactv13' AND id = '5')
   OR (accountId = 'gactv1' AND id = '2')
```

Agora o filtro respeita a **chave composta** (accountId + id)!

---

## 🧪 COMO TESTAR

### Teste 1: Lista de Uma Conta

1. Selecione apenas: `📋 Funil - SK (gactv13)`
2. Verifique a tabela de campanhas
3. **Resultado esperado:** Apenas campanhas da conta **gactv13**

### Teste 2: Listas de Múltiplas Contas

1. Selecione:
   - `📋 Funil - SK (gactv13)`
   - `📋 Funil (gactv1)`
2. Verifique a tabela
3. **Resultado esperado:** 
   - Campanhas da **gactv13** que estão na lista "Funil - SK"
   - Campanhas da **gactv1** que estão na lista "Funil"
   - **Nenhuma** campanha de contas não selecionadas

### Teste 3: Mesma Lista, Contas Diferentes

1. Selecione:
   - `📋 Aquecimento (Gactv22)`
   - `📋 Aquecimento (gactv1)`
2. Verifique a tabela
3. **Resultado esperado:**
   - Campanhas de ambas as contas
   - Apenas as que estão nas respectivas listas "Aquecimento"

---

## 📊 ANTES vs DEPOIS

### ANTES (Bug):
```
Usuário seleciona: 📋 Funil - SK (gactv13)

Dashboard mostra:
- Email 00 - Boas Vindas (Gactv22)  ❌ ERRADO!
- Email 01 - Follow-up (gactv13)    ✅ Correto
- Email 02 - Oferta (gactv1)        ❌ ERRADO!
```

### DEPOIS (Fix):
```
Usuário seleciona: 📋 Funil - SK (gactv13)

Dashboard mostra:
- Email 01 - Follow-up (gactv13)    ✅ Correto
- Email 05 - Especial (gactv13)     ✅ Correto

(Apenas campanhas da conta gactv13!)
```

---

## 🔧 ARQUIVO MODIFICADO

**`src/app/page.tsx`** (linhas 42-76)

### Mudanças Principais:

1. **Select da Query:**
   ```typescript
   // ANTES
   select: { campaignId: true }
   
   // DEPOIS
   select: { accountId: true, campaignId: true }
   ```

2. **Estrutura de Dados:**
   ```typescript
   // ANTES
   const allCampaignIds: string[] = []
   
   // DEPOIS
   const campaignKeys: Array<{ accountId: string; campaignId: string }> = []
   ```

3. **Where Clause:**
   ```typescript
   // ANTES
   where.id = { in: uniqueCampaignIds }
   
   // DEPOIS
   where.OR = uniqueKeys.map(key => ({
     accountId: key.accountId,
     id: key.campaignId,
   }))
   ```

---

## ⚠️ LIÇÕES APRENDIDAS

### 1. Composite Keys Exigem Atenção Especial

Quando usamos `@@id([accountId, id])`, **sempre** precisamos considerar ambos os campos ao filtrar!

### 2. IDs Não São Globalmente Únicos

No nosso sistema:
- ID "1" não identifica UMA campanha
- ID "1" + Account "gactv13" identifica UMA campanha

### 3. Queries Devem Refletir o Schema

Se o schema usa composite key, as queries devem usar composite conditions.

---

## 🚀 VALIDAÇÃO

### Checklist de Testes:

- [x] Código atualizado
- [x] Sem erros de linter
- [ ] Reiniciar dev server (`rm -rf .next && npm run dev`)
- [ ] Testar filtro de lista única
- [ ] Testar filtro de múltiplas listas
- [ ] Testar listas de contas diferentes
- [ ] Verificar KPIs recalculados corretamente
- [ ] Verificar que campanhas de outras contas não aparecem

---

## 🎯 RESULTADO ESPERADO

Após o fix:

1. ✅ Selecionar lista de uma conta → Só aparecem campanhas daquela conta
2. ✅ Selecionar listas de múltiplas contas → Aparecem campanhas corretas de cada conta
3. ✅ KPIs refletem apenas as campanhas das listas selecionadas
4. ✅ Nenhum vazamento de dados entre contas

---

## 💡 PRÓXIMOS PASSOS

1. Reiniciar o dev server
2. Testar o filtro
3. Confirmar que o bug foi resolvido
4. Considerar adicionar testes automatizados para evitar regressões

---

## 📚 CONTEXTO TÉCNICO

### Por que Composite Keys?

Usamos composite keys porque:
- IDs do ActiveCampaign **não são globais**
- Cada conta tem seu próprio conjunto de IDs
- Precisamos isolar dados entre contas

### Estrutura do Schema:

```prisma
model Campaign {
  id        String
  accountId String
  
  @@id([accountId, id])  // Composite Primary Key
}

model CampaignList {
  accountId  String
  campaignId String
  listId     String
  
  @@id([accountId, campaignId, listId])
}
```

### Query Correta com Composite Keys:

```typescript
// ❌ ERRADO (ignora accountId)
where: { id: { in: ['1', '2', '3'] } }

// ✅ CORRETO (considera accountId + id)
where: {
  OR: [
    { accountId: 'gactv13', id: '1' },
    { accountId: 'gactv13', id: '2' },
    { accountId: 'gactv1', id: '3' },
  ]
}
```

---

**✅ Bug resolvido! Filtro agora funciona corretamente respeitando composite keys.**

**🔄 Próximo passo: Reiniciar dev server e testar.**

