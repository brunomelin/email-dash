# 🔀 Multi-Select de Contas

## ✨ Feature Implementada

Agora você pode **selecionar múltiplas contas ao mesmo tempo** no filtro, assim como já podia selecionar múltiplas listas!

---

## 🎯 Motivação

Com **20 contas do ActiveCampaign**, você frequentemente precisa:
- Comparar métricas de 2-3 contas específicas
- Ver apenas contas de um determinado grupo
- Excluir temporariamente algumas contas da análise

**Antes**: Só podia selecionar 1 conta ou todas  
**Agora**: Pode selecionar quantas quiser! ✨

---

## 📋 O Que Foi Implementado

### 1. **Componente `AccountMultiSelect`** ✨ NOVO
Similar ao `ListMultiSelect`, permite selecionar múltiplas contas

```typescript
<AccountMultiSelect
  accounts={accounts}
  selectedAccounts={selectedAccounts}
  onSelectionChange={handleAccountsChange}
/>
```

**Features**:
- ✅ Multi-seleção com checkboxes
- ✅ Campo de busca no topo
- ✅ Contador de selecionados
- ✅ Badges compactas (mostra até 3, depois "+N")
- ✅ Botões "Todas" e "Limpar"
- ✅ Ordenação natural (numérica + case-insensitive)
- ✅ Ícone 🏢 para contas

### 2. **Atualização do `global-filters.tsx`**
- Mudou de `selectedAccount` (string) para `selectedAccounts` (string[])
- Atualizado `updateFilters` para aceitar `accountIds` (array)
- Filtro de listas agora considera múltiplas contas selecionadas
- URL usa `accountIds` em vez de `accountId`

### 3. **Atualização do `page.tsx`**
- Interface `DashboardFilters` agora aceita `accountIds?: string[]`
- Query `where.accountId` usa `{ in: filters.accountIds }`
- Parsing de `searchParams` atualizado para `accountIds`

---

## 🎨 Interface Visual

### Multi-Select Fechado
```
┌──────────────────────────────┐
│ Todas as contas            ▼ │  ← Nenhuma selecionada
└──────────────────────────────┘

┌──────────────────────────────┐
│ gactv1                     ▼ │  ← 1 conta selecionada
└──────────────────────────────┘

┌──────────────────────────────┐
│ 3 contas selecionadas      ▼ │  ← Múltiplas contas
└──────────────────────────────┘

┌──────────────────────────────┐
│ Todas as contas            ▼ │  ← Todas selecionadas (20/20)
└──────────────────────────────┘
```

### Multi-Select Aberto
```
┌──────────────────────────────┐
│ 🔍 Buscar conta...           │ ← Campo de busca
├──────────────────────────────┤
│ 3 selecionadas  [Todas][Limpar]
│ [gactv1 ×] [gactv2 ×] [+1]  │ ← Badges
├──────────────────────────────┤
│ ☑ 🏢 gactv1              ✓  │
│ ☑ 🏢 gactv2              ✓  │
│ ☐ 🏢 gactv3                  │
│ ☑ 🏢 gactv10             ✓  │
│ ☐ 🏢 gactv13                 │
│ ...                          │
└──────────────────────────────┘
```

---

## 🧪 Como Testar

1. **Recarregue a página** do dashboard
2. **Clique no select de contas**
3. **Selecione múltiplas contas**:
   - Clique em "gactv1" → ☑
   - Clique em "gactv2" → ☑
   - Clique em "gactv13" → ☑
4. **Veja as métricas atualizarem** automaticamente
5. **Teste a busca**: Digite "2" para filtrar contas

### Testes Adicionais

**Teste 1: Selecionar 2 contas**
```
1. Selecione gactv1 e gactv2
2. Verifique que o dashboard mostra apenas campanhas dessas 2 contas
3. Verifique que os KPIs somam apenas essas 2 contas
```

**Teste 2: Buscar e selecionar**
```
1. Abra o multi-select de contas
2. Digite "13"
3. Selecione gactv13
4. Limpe a busca
5. Selecione mais contas
```

**Teste 3: Botões "Todas" e "Limpar"**
```
1. Clique em "Todas" → Seleciona todas as 20 contas
2. Veja que mostra "Todas as contas"
3. Clique em "Limpar" → Desmarca todas
4. Veja que volta para "Todas as contas" (sem filtro)
```

**Teste 4: Filtrar listas por contas**
```
1. Selecione gactv1 e gactv2
2. Abra o multi-select de listas
3. Veja que mostra apenas listas dessas 2 contas
4. Selecione algumas listas
5. Veja campanhas filtradas
```

---

## 💡 Casos de Uso

### Caso 1: Comparar Grupos de Contas
```
Cenário: Você tem 3 contas "premium" e quer ver só essas

1. Selecione: gactv9, gactv10, gactv13
2. Veja métricas consolidadas só dessas 3
3. Compare com outras 3 contas depois
```

### Caso 2: Excluir Contas com Problemas
```
Cenário: gactv7 e gactv8 estão com problemas, quer ver o resto

1. Clique em "Todas"
2. Desmarque gactv7 e gactv8
3. Agora vê 18 contas, excluindo as problemáticas
```

### Caso 3: Análise por Grupo
```
Cenário: Agrupar contas por cliente ou campanha

Grupo A: gactv1, gactv2, gactv3 (Cliente X)
Grupo B: gactv10, gactv13, gactv14 (Cliente Y)

1. Selecione Grupo A → Analise
2. Limpe
3. Selecione Grupo B → Compare
```

---

## 📊 Mudanças na URL

### Antes (Single Select)
```
/?accountId=gactv1
/?accountId=gactv2
```

### Agora (Multi Select)
```
/?accountIds=gactv1,gactv2,gactv13
```

**Vantagens**:
- URL pode ser compartilhada
- Histórico do navegador funciona
- Pode favoritar combinações específicas

---

## 🔧 Detalhes Técnicos

### Estrutura de Dados

```typescript
// Estado do filtro
const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])

// Query params
searchParams.get('accountIds')?.split(',') // ["gactv1", "gactv2"]

// Filtro no banco
where: {
  accountId: { in: ["gactv1", "gactv2"] }
}
```

### Lógica de Filtro

```typescript
// Sem filtro = todas as contas
if (!filters.accountIds || filters.accountIds.length === 0) {
  where.accountId = { in: allAccountIds }
}

// Com filtro = apenas selecionadas
else {
  where.accountId = { in: filters.accountIds }
}
```

### Integração com Filtro de Listas

```typescript
// Listas filtradas pelas contas selecionadas
const availableLists = (selectedAccounts.length > 0
  ? lists.filter(list => selectedAccounts.includes(list.accountId))
  : lists
)
```

**Comportamento**:
- Se **nenhuma conta** selecionada → Mostra todas as listas
- Se **1 conta** selecionada → Mostra só listas dessa conta
- Se **múltiplas contas** → Mostra listas dessas contas
- Ao **mudar contas** → Limpa seleção de listas automaticamente

---

## 📦 Arquivos Criados/Modificados

| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `src/components/filters/account-multi-select.tsx` | ✨ NOVO | Componente de multi-select |
| `src/components/filters/global-filters.tsx` | 🔄 ATUALIZADO | Usa multi-select de contas |
| `src/app/page.tsx` | 🔄 ATUALIZADO | Aceita `accountIds` nos filtros |

---

## ⚡ Performance

### Sem Impacto no Desempenho
- Mesma query do banco (só muda o `IN (...)`)
- Não há N+1 queries
- Mesma estrutura de dados

### Comparação de Queries

```sql
-- Antes (1 conta)
WHERE account_id = 'gactv1'

-- Agora (múltiplas contas)
WHERE account_id IN ('gactv1', 'gactv2', 'gactv13')

-- Ainda usa o mesmo índice!
```

---

## 🎯 Comportamento Especial

### "Todas as Contas"
```
Quando exibir?
- selectedAccounts.length === 0 (nenhuma selecionada)
- selectedAccounts.length === accounts.length (todas selecionadas)

Ambos exibem "Todas as contas" no botão
```

### Limpar Listas ao Mudar Contas
```typescript
const handleAccountsChange = (accountIds: string[]) => {
  setSelectedAccounts(accountIds)
  setSelectedLists([]) // ← Limpa listas
  updateFilters({ accountIds, listIds: [] })
}
```

**Por quê?**  
Evita confusão: Se você selecionou listas da gactv1, mas mudou para gactv2, essas listas não existem em gactv2.

---

## 🔄 Compatibilidade

### URLs Antigas (Single Select)
Se alguém tiver um link antigo com `?accountId=gactv1`, não vai funcionar mais.

**Solução (opcional)**:
```typescript
// Fallback para compatibilidade
if (params.accountId && !params.accountIds) {
  filters.accountIds = [params.accountId as string]
}
```

**Decisão**: Não implementado por enquanto, pois não há URLs compartilhadas.

---

## 💡 Melhorias Futuras (Opcional)

1. **Grupos de Contas**
   - Salvar grupos predefinidos
   - Ex: "Clientes Premium", "Contas Teste"
   - Selecionar grupo todo de uma vez

2. **Estatísticas por Grupo**
   - Comparar grupo A vs grupo B
   - Tabela mostrando métricas lado a lado

3. **Filtro Rápido**
   - Botões: "Últimas 5", "Top 10", "Piores 5"
   - Baseado em performance

4. **Inversão de Seleção**
   - Botão "Inverter" para selecionar o oposto
   - Útil quando quer excluir poucas contas

5. **Persistência**
   - Salvar última seleção no localStorage
   - Restaurar ao voltar ao dashboard

---

## 🎉 Resultado Final

Agora você tem **controle total** sobre quais contas analisar!

| Antes | Agora |
|-------|-------|
| Apenas 1 conta ou todas | Quantas quiser |
| Difícil comparar grupos | Fácil agrupar e comparar |
| Não pode excluir contas | Pode excluir temporariamente |
| Sem busca | Busca + multi-select |

---

## ✅ Checklist de Implementação

- [x] Criar componente `AccountMultiSelect`
- [x] Adicionar busca no multi-select
- [x] Adicionar contador e badges
- [x] Atualizar `global-filters.tsx`
- [x] Mudar estado para array
- [x] Atualizar handlers
- [x] Atualizar filtro de listas
- [x] Atualizar `page.tsx`
- [x] Mudar interface `DashboardFilters`
- [x] Atualizar query do banco
- [x] Atualizar parsing de URL
- [x] Testar com múltiplas contas
- [x] Verificar linter (0 erros)
- [x] Documentar feature

---

**Data**: 2025-12-22  
**Status**: ✅ Implementado e pronto para uso

