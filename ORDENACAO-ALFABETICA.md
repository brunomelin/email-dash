# 🔤 Ordenação Alfabética - Contas e Listas

## ✅ Implementado

Todas as contas e listas agora estão ordenadas alfabeticamente em todo o sistema.

---

## 📋 Alterações Realizadas

### 1. **src/app/page.tsx** 🔄
**Status**: Corrigido para ordenar por conta primeiro, depois por nome da lista

```typescript
// Contas - linha 24
const accounts = await prisma.account.findMany({
  where: { isActive: true },
  orderBy: { name: 'asc' }, // ✅ Ordenação alfabética
})

// Listas - linha 285 (CORRIGIDO)
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
        name: true,
      },
    },
  },
  orderBy: [
    { account: { name: 'asc' } }, // ✅ Primeiro por nome da conta
    { name: 'asc' },               // ✅ Depois por nome da lista
  ],
})
```

**Transformação ao passar para GlobalFilters**:
```typescript
<GlobalFilters 
  accounts={accounts} 
  lists={lists.map((list: any) => ({
    id: list.id,
    accountId: list.accountId,
    name: list.name,
    accountName: list.account.name, // ✅ Extrai o nome da conta
  }))} 
/>
```

---

### 2. **src/components/filters/global-filters.tsx** 🔄
**Status**: Adicionada ordenação ao filtrar listas

```typescript
// Antes
const availableLists = (selectedAccount
  ? lists.filter(list => list.accountId === selectedAccount)
  : lists
).map(list => {
  const account = accounts.find(acc => acc.id === list.accountId)
  return {
    ...list,
    accountName: account?.name || list.accountId
  }
})

// Depois - linhas 117-130
const availableLists = (selectedAccount
  ? lists.filter(list => list.accountId === selectedAccount)
  : lists
).map(list => {
  const account = accounts.find(acc => acc.id === list.accountId)
  return {
    ...list,
    accountName: account?.name || list.accountId
  }
}).sort((a, b) => {
  // Ordenar por nome da conta primeiro, depois por nome da lista
  const accountCompare = (a.accountName || '').localeCompare(b.accountName || '')
  if (accountCompare !== 0) return accountCompare
  return a.name.localeCompare(b.name)
})
```

**Critério de ordenação**:
1. Primeiro por **nome da conta** (ordem alfabética)
2. Depois por **nome da lista** (ordem alfabética)

---

### 3. **src/app/settings/accounts/page.tsx** 🔄
**Status**: Alterado de `createdAt` para `name`

```typescript
// Antes - linha 16
async function getAccounts() {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: 'desc' }, // ❌ Ordenação por data de criação
    include: {
      _count: {
        select: {
          campaigns: true,
          lists: true,
          automations: true,
        },
      },
    },
  })

  return accounts
}

// Depois - linha 16
async function getAccounts() {
  const accounts = await prisma.account.findMany({
    orderBy: { name: 'asc' }, // ✅ Ordenação alfabética
    include: {
      _count: {
        select: {
          campaigns: true,
          lists: true,
          automations: true,
        },
      },
    },
  })

  return accounts
}
```

---

### 4. **src/lib/services/list-metrics-service.ts** 🔄
**Status**: Adicionada ordenação alfabética

```typescript
// Antes - linha 39
const lists = await prisma.list.findMany({
  where: {
    ...(filters.accountId && { accountId: filters.accountId }),
  },
  include: {
    account: {
      select: {
        name: true,
      },
    },
    campaignLinks: {
      include: {
        campaign: true,
      },
    },
  },
})

// Depois - linha 39
const lists = await prisma.list.findMany({
  where: {
    ...(filters.accountId && { accountId: filters.accountId }),
  },
  orderBy: {
    name: 'asc', // ✅ Ordenação alfabética
  },
  include: {
    account: {
      select: {
        name: true,
      },
    },
    campaignLinks: {
      include: {
        campaign: true,
      },
    },
  },
})
```

---

## 🎯 Onde a Ordenação se Aplica

### Dashboard Principal (`/`)
- ✅ Select de **Contas** no filtro global
- ✅ Select de **Listas** no filtro multi-select
- ✅ Cards de **Contas Ativas**
- ✅ Botões de **Sincronização** por conta

### Página de Listas (`/lists`)
- ✅ Tabela de **Todas as Listas**
- ✅ Top 5 - Open Rate
- ✅ Top 5 - Click Rate

### Página de Configurações (`/settings/accounts`)
- ✅ Tabela de **Contas Cadastradas**

---

## 🧪 Como Testar

1. **Dashboard Principal**:
   ```bash
   # Acessar http://localhost:3000
   # Verificar:
   # - Select "Contas" está em ordem alfabética
   # - Select "Listas" está em ordem alfabética (conta + lista)
   # - Botões de sincronização estão em ordem alfabética
   ```

2. **Página de Listas**:
   ```bash
   # Acessar http://localhost:3000/lists
   # Verificar:
   # - Tabela de listas está em ordem alfabética
   ```

3. **Configurações**:
   ```bash
   # Acessar http://localhost:3000/settings/accounts
   # Verificar:
   # - Tabela de contas está em ordem alfabética (não mais por data)
   ```

---

## 📊 Exemplo Visual

### Select de Listas (Multi-Select)
```
📋 Listas Selecionadas:

[ ] 📋 Assinantes ativos (gactv1)
[ ] 📋 Compradores (gactv1)
[ ] 📋 Newsletter semanal (gactv1)
[ ] 📋 Leads qualificados (gactv2)
[ ] 📋 Trial Users (gactv2)
[ ] 📋 VIP Members (gactv2)
```

**Ordem**:
1. Primeiro agrupa por conta (gactv1, gactv2, etc.)
2. Dentro de cada conta, ordena listas alfabeticamente

---

## 🔍 Locais Verificados

| Local | Status | Ordenação |
|-------|--------|-----------|
| `src/app/page.tsx` | ✅ | `name: 'asc'` |
| `src/app/settings/accounts/page.tsx` | ✅ | `name: 'asc'` |
| `src/components/filters/global-filters.tsx` | ✅ | `localeCompare()` |
| `src/lib/services/list-metrics-service.ts` | ✅ | `name: 'asc'` |
| `src/lib/services/metrics-service.ts` | ✅ | `name: 'asc'` |

---

## 🎉 Resultado Final

Agora toda a aplicação usa **ordenação alfabética consistente** para:
- 📧 Contas do ActiveCampaign
- 📋 Listas
- 🔄 Botões de sincronização
- ⚙️ Configurações

A experiência do usuário é mais intuitiva, especialmente com **20+ contas** cadastradas!

---

## 🚀 Próximos Passos

Se quiser, também podemos:
1. ✅ Adicionar ordenação alfabética em tabelas de campanhas (atualmente por data)
2. ✅ Adicionar busca/filtro de texto nos selects (já implementado no multi-select)
3. ✅ Adicionar agrupamento visual por conta nos multi-selects

---

**Data de implementação**: 2025-12-22  
**Status**: ✅ Concluído

