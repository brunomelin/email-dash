# 🔢 Fix: Ordenação Natural de Contas

## 🔴 Problema Identificado

As contas não estavam em ordem alfabética correta no select:

```
❌ ORDEM INCORRETA (Prisma orderBy: name asc):
1. Gactv22     ← Maiúsculo vem primeiro
2. gactv1
3. gactv10     ← 10 vem antes de 2 (ordenação lexicográfica)
4. gactv13
5. gactv14
...
11. gactv2     ← 2 vem depois de 10!
12. gactv20
13. gactv21
14. gactv3
15. gactv4
...
```

---

## 🔍 Causa Raiz

### Problema 1: Case Sensitivity
O Prisma `orderBy: { name: 'asc' }` usa **ordenação ASCII/lexicográfica**:
- Letras maiúsculas (A-Z) têm valores ASCII menores que minúsculas (a-z)
- Resultado: "Gactv22" < "gactv1" (porque "G" < "g" em ASCII)

### Problema 2: Ordenação Numérica
Ordenação lexicográfica trata números como strings:
- "10" vem antes de "2" porque compara caractere por caractere: "1" < "2"
- Resultado: "gactv10" < "gactv2"

---

## ✅ Solução: Natural Sorting

Implementamos **natural sorting** usando `localeCompare()` com opções:

```typescript
// ❌ ANTES - Ordenação lexicográfica
const accounts = await prisma.account.findMany({
  where: { isActive: true },
  orderBy: { name: 'asc' }, // Lexicográfica (ASCII)
})

// ✅ DEPOIS - Ordenação natural
const accountsRaw = await prisma.account.findMany({
  where: { isActive: true },
})

const accounts = accountsRaw.sort((a: { name: string }, b: { name: string }) => 
  a.name.localeCompare(b.name, 'pt-BR', {
    numeric: true,      // Trata números como números: 2 < 10
    sensitivity: 'base' // Ignora maiúsculas/minúsculas: G = g
  })
)
```

---

## 🎯 Resultado Esperado

```
✅ ORDEM CORRETA (Natural Sorting):
1. gactv1
2. gactv2      ← Agora 2 vem antes de 10!
3. gactv3
4. gactv4
5. gactv5
6. gactv6
7. gactv7
8. gactv8
9. gactv9
10. gactv10    ← 10 vem depois de 9!
11. gactv13
12. gactv14
13. gactv15
14. gactv16
15. gactv17
16. gactv18
17. gactv19
18. gactv20
19. gactv21
20. Gactv22    ← Maiúsculo agrupado corretamente
```

---

## 📚 Sobre `localeCompare()`

### Sintaxe
```typescript
string1.localeCompare(string2, locale, options)
```

### Opções Utilizadas

| Opção | Valor | Descrição |
|-------|-------|-----------|
| `numeric` | `true` | Trata sequências numéricas como números<br>Exemplo: "gactv2" < "gactv10" |
| `sensitivity` | `'base'` | Ignora diferenças de maiúsculas/minúsculas e acentos<br>Exemplo: "Gactv" = "gactv" |
| `locale` | `'pt-BR'` | Usa regras de ordenação do português brasileiro |

### Outras Opções de `sensitivity`

```typescript
// 'base' - Ignora case e acentos (mais permissivo)
'a' === 'A' === 'á' === 'Á'

// 'accent' - Diferencia acentos, ignora case
'a' === 'A' !== 'á' === 'Á'

// 'case' - Diferencia case, ignora acentos
'a' !== 'A' === 'á' !== 'Á'

// 'variant' - Diferencia tudo (mais restritivo)
'a' !== 'A' !== 'á' !== 'Á'
```

---

## 📋 Arquivos Alterados

### 1. `src/app/page.tsx`
```typescript
// Linha 20-32
async function getDashboardData(filters: DashboardFilters = {}) {
  const accountsRaw = await prisma.account.findMany({
    where: { isActive: true },
  })
  
  const accounts = accountsRaw.sort((a: { name: string }, b: { name: string }) => 
    a.name.localeCompare(b.name, 'pt-BR', {
      numeric: true,
      sensitivity: 'base'
    })
  )
  // ...
}
```

### 2. `src/app/settings/accounts/page.tsx`
```typescript
// Linha 14-32
async function getAccounts() {
  const accountsRaw = await prisma.account.findMany({
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

  const accounts = accountsRaw.sort((a, b) => 
    a.name.localeCompare(b.name, 'pt-BR', {
      numeric: true,
      sensitivity: 'base'
    })
  )

  return accounts
}
```

### 3. `src/lib/services/metrics-service.ts`
```typescript
// Linha 113-124
async getMetricsByAccount(filter: Omit<MetricsFilter, 'accountIds'> = {}) {
  const accountsRaw = await prisma.account.findMany({
    where: { isActive: true },
  })
  
  const accounts = accountsRaw.sort((a, b) => 
    a.name.localeCompare(b.name, 'pt-BR', {
      numeric: true,
      sensitivity: 'base'
    })
  )
  // ...
}
```

---

## 🧪 Como Testar

1. **Recarregue a página** do dashboard
2. Abra o **select de contas**
3. Verifique a ordem:
   - gactv1, gactv2, ..., gactv9, gactv10, ..., gactv21, Gactv22

```bash
# O servidor Next.js deve recompilar automaticamente
# Caso contrário, reinicie:
cd /Users/brunomelin/email-dash
npm run dev
```

---

## 🔬 Teste de Verificação

Criamos um script de teste que mostra a diferença:

```javascript
// verificar-ordem-contas.js (temporário)
const accounts = await prisma.account.findMany({
  where: { isActive: true },
  orderBy: { name: 'asc' },
})

console.log('Ordem Prisma (lexicográfica):')
// Gactv22, gactv1, gactv10, gactv13, ..., gactv2, ...

const sorted = [...accounts].sort((a, b) => 
  a.name.localeCompare(b.name, 'pt-BR', {
    numeric: true,
    sensitivity: 'base'
  })
)

console.log('Ordem Natural:')
// gactv1, gactv2, gactv3, ..., gactv10, ..., Gactv22
```

---

## 💡 Por Que Não Usar Prisma `orderBy`?

O Prisma delega a ordenação para o **banco de dados** (PostgreSQL), que usa:
- **Collation padrão**: Geralmente `en_US.UTF-8` ou similar
- **Ordenação ASCII/lexicográfica**: Não suporta natural sorting nativamente

Para ter natural sorting no PostgreSQL, precisaríamos:
1. Criar uma coluna computada com padding numérico
2. Usar extensões como `pg_collation`
3. Implementar uma função custom de ordenação

**Solução mais simples**: Ordenar no JavaScript após buscar os dados.

---

## 🎯 Impacto

Esta mudança afeta:
- ✅ Select de contas no filtro global
- ✅ Tabela de contas em `/settings/accounts`
- ✅ Botões de sincronização por conta
- ✅ Métricas por conta (breakdown)
- ✅ Qualquer lugar que liste contas

---

## 📊 Comparação Visual

### Antes (Lexicográfica)
```
Gactv22  ← Problema 1: Maiúsculo primeiro
gactv1
gactv10  ← Problema 2: 10 antes de 2
gactv13
gactv2   ← Fora de ordem!
gactv20
gactv3
```

### Depois (Natural)
```
gactv1   ← Ordem correta!
gactv2   ← 2 antes de 10
gactv3
gactv10  ← 10 depois de 9
gactv13
gactv20
Gactv22  ← Maiúsculo no final (mas agrupado)
```

---

## ✅ Checklist

- [x] Implementado natural sorting em `src/app/page.tsx`
- [x] Implementado natural sorting em `src/app/settings/accounts/page.tsx`
- [x] Implementado natural sorting em `src/lib/services/metrics-service.ts`
- [x] Tipos TypeScript corrigidos
- [x] Linter sem erros
- [x] Documentação criada

---

## 🚀 Próximos Passos (Opcional)

Se quiser padronizar nomes de contas:
```sql
-- Normalizar todos para minúsculas
UPDATE accounts SET name = LOWER(name);
```

Ou criar uma função helper:
```typescript
// src/lib/utils/sort.ts
export function naturalSort<T>(
  array: T[],
  key: (item: T) => string
): T[] {
  return array.sort((a, b) => 
    key(a).localeCompare(key(b), 'pt-BR', {
      numeric: true,
      sensitivity: 'base'
    })
  )
}

// Uso:
const sortedAccounts = naturalSort(accounts, acc => acc.name)
```

---

**Data**: 2025-12-22  
**Status**: ✅ Implementado e testado

