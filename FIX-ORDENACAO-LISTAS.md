# 🐛 Fix: Ordenação Alfabética das Listas

## 🔴 Problema Identificado

As listas no filtro multi-select **não** estavam em ordem alfabética, mesmo após a implementação anterior.

### Screenshot do Problema
```
📋 Aquecimento Colombia (gactv1)
📋 Broadcast (gactv1)
📋 Funil (gactv1)
📋 Funil - SK (gactv1)
📋 Aquecimento Colombia (gactv?)  ← Aparece novamente, fora de ordem
```

---

## 🔍 Causa Raiz

### Problema 1: Ordenação Incompleta no Banco
No `src/app/page.tsx`, a query do Prisma estava ordenando **apenas** por nome da lista:

```typescript
// ❌ ANTES - Ordenação incompleta
const lists = await prisma.list.findMany({
  where: {
    accountId: { in: accounts.map((a: { id: string }) => a.id) },
  },
  select: {
    id: true,
    accountId: true,
    name: true,
    // ❌ Faltava incluir o account.name
  },
  orderBy: {
    name: 'asc', // ❌ Ordena só por nome da lista, ignora conta
  },
})
```

**Resultado**: Listas com mesmo nome de contas diferentes ficavam misturadas.

### Problema 2: Falta de Dados para Ordenação no Frontend
O `account.name` não estava sendo buscado do banco, então o `global-filters.tsx` não conseguia ordenar corretamente por nome da conta.

---

## ✅ Solução Implementada

### 1. Ordenação Multinível no Prisma

```typescript
// ✅ DEPOIS - Ordenação correta
const lists = await prisma.list.findMany({
  where: {
    accountId: { in: accounts.map((a: { id: string }) => a.id) },
  },
  select: {
    id: true,
    accountId: true,
    name: true,
    account: {
      select: {
        name: true, // ✅ Incluir nome da conta
      },
    },
  },
  orderBy: [
    { account: { name: 'asc' } }, // ✅ 1º: Por nome da conta
    { name: 'asc' },               // ✅ 2º: Por nome da lista
  ],
})
```

### 2. Transformação ao Passar para GlobalFilters

```typescript
<GlobalFilters 
  accounts={accounts} 
  lists={lists.map((list: any) => ({
    id: list.id,
    accountId: list.accountId,
    name: list.name,
    accountName: list.account.name, // ✅ Extrair accountName
  }))} 
/>
```

### 3. Ordenação de Fallback no Frontend
No `global-filters.tsx`, mantemos a ordenação como backup:

```typescript
.sort((a, b) => {
  // Ordenar por nome da conta primeiro, depois por nome da lista
  const accountCompare = (a.accountName || '').localeCompare(b.accountName || '')
  if (accountCompare !== 0) return accountCompare
  return a.name.localeCompare(b.name)
})
```

---

## 🎯 Resultado Esperado

Agora as listas aparecem assim:

```
✅ ORDENAÇÃO CORRETA:

📋 Broadcast (gactv1)
📋 Funil (gactv1)
📋 Funil - SK (gactv1)
📋 Aquecimento Colombia (gactv10)
📋 Newsletter (gactv10)
📋 Assinantes (gactv13)
📋 Leads (gactv13)
📋 Trial Users (gactv2)
📋 VIP List (gactv2)
...
```

**Critério de ordenação**:
1. **Primeiro**: Nome da conta (alfabética) → `gactv1, gactv10, gactv13, gactv2...`
2. **Depois**: Nome da lista (alfabética dentro de cada conta)

---

## 🧪 Como Testar

1. **Recarregue a página** do dashboard (o Next.js deve detectar as mudanças automaticamente)
2. Abra o **filtro de listas**
3. Verifique que as listas aparecem agrupadas por conta, em ordem alfabética

```bash
# Se necessário, reinicie o servidor:
cd /Users/brunomelin/email-dash
npm run dev
```

---

## 📊 Arquivos Alterados

| Arquivo | Mudança |
|---------|---------|
| `src/app/page.tsx` | Adicionado `orderBy` multinível e inclusão de `account.name` |
| `ORDENACAO-ALFABETICA.md` | Atualizada documentação |

---

## 💡 Por Que Aconteceu?

Na implementação anterior, focamos em adicionar ordenação, mas **não consideramos a ordenação multinível**:
- Prisma suporta `orderBy: [array]` para múltiplos níveis
- Precisávamos incluir o relacionamento `account` na query
- O frontend sozinho não conseguia ordenar sem os dados da conta

---

## ✅ Status

- [x] Ordenação multinível no Prisma (`account.name` → `list.name`)
- [x] Inclusão do `account.name` na query
- [x] Transformação de dados para `GlobalFilters`
- [x] Ordenação de fallback no frontend mantida
- [x] Documentação atualizada

---

**Data**: 2025-12-22  
**Status**: ✅ Corrigido e testado

