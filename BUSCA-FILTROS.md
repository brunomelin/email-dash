# 🔍 Busca nos Filtros de Contas e Listas

## ✨ Feature Implementada

Adicionamos **caixas de busca** nos selects de contas e listas para facilitar a seleção quando há muitas opções.

---

## 📋 O Que Foi Adicionado

### 1. **Busca no Select de Contas**
- Campo de texto no topo do select
- Filtra contas conforme você digita
- Ideal para quando você tem 20+ contas

### 2. **Busca no Multi-Select de Listas**
- Campo de texto no topo do multi-select
- Busca por nome da lista **ou** nome da conta
- Contador de listas selecionadas
- Badges compactas mostrando até 3 listas selecionadas

---

## 🎯 Componentes Criados/Modificados

### 1. `src/components/ui/command.tsx` ✨ NOVO
Componente base para criar interfaces de busca (baseado no shadcn/ui)

```typescript
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
```

**Recursos**:
- `CommandInput`: Campo de busca com ícone de lupa
- `CommandList`: Lista rolável de resultados
- `CommandEmpty`: Mensagem quando não há resultados
- `CommandGroup`: Agrupamento de itens
- `CommandItem`: Item clicável da lista

### 2. `src/components/filters/account-select.tsx` ✨ NOVO
Select de contas com busca

```typescript
<AccountSelect
  accounts={accounts}
  selectedAccountId={selectedAccount}
  onAccountChange={handleAccountChange}
/>
```

**Props**:
- `accounts`: Array de contas `{ id: string, name: string }[]`
- `selectedAccountId`: ID da conta selecionada (ou `undefined` para "Todas")
- `onAccountChange`: Callback quando a conta muda
- `disabled`: Desabilita o select (opcional)

**Features**:
- ✅ Busca por nome da conta
- ✅ Opção "Todas as contas"
- ✅ Checkbox visual para item selecionado
- ✅ Fecha automaticamente após seleção
- ✅ Limpa busca ao fechar

### 3. `src/components/filters/list-multi-select.tsx` 🔄 ATUALIZADO
Multi-select de listas com busca

**Mudanças**:
- ✅ Adicionado campo de busca no topo
- ✅ Busca por nome da lista **ou** nome da conta
- ✅ Contador visual de listas selecionadas
- ✅ Badges compactas (mostra até 3, depois "+N")
- ✅ Botões "Todas" e "Limpar" mais compactos
- ✅ Layout melhorado com `Command` component

```typescript
<ListMultiSelect
  lists={lists}
  selectedLists={selectedLists}
  onSelectionChange={handleListsChange}
/>
```

**Features**:
- ✅ Busca em tempo real
- ✅ Filtra por nome da lista ou conta
- ✅ Checkboxes visuais
- ✅ Multi-seleção
- ✅ Indicador visual de selecionados

### 4. `src/components/filters/global-filters.tsx` 🔄 ATUALIZADO
Integração dos novos componentes

**Mudanças**:
- ✅ Substituiu `Select` por `AccountSelect`
- ✅ Ajustou `handleAccountChange` para aceitar `undefined`
- ✅ Manteve toda a lógica de filtros existente

---

## 📦 Dependências Adicionadas

```bash
npm install cmdk @radix-ui/react-icons
```

- **`cmdk`**: Biblioteca para criar interfaces de comando/busca (usada internamente pelo Command)
- **`@radix-ui/react-icons`**: Ícones necessários para o componente Command

---

## 🎨 Interface Visual

### Select de Contas (Antes)
```
┌─────────────────────┐
│ Todas as contas   ▼ │
├─────────────────────┤
│ Todas as contas     │
│ Gactv22             │
│ gactv1              │
│ gactv10             │
│ ... (rolar 20+)     │
└─────────────────────┘
```

### Select de Contas (Agora)
```
┌─────────────────────┐
│ Todas as contas   ▼ │
├─────────────────────┤
│ 🔍 Buscar conta...  │ ← NOVO!
├─────────────────────┤
│ ✓ Todas as contas   │
│   gactv1            │
│   gactv2            │
│   gactv3            │
│   ...               │
└─────────────────────┘

# Digitando "13":
┌─────────────────────┐
│ 🔍 13               │
├─────────────────────┤
│   gactv13           │ ← Só mostra resultado
└─────────────────────┘
```

### Multi-Select de Listas (Agora)
```
┌────────────────────────────┐
│ Todas as listas          ▼ │
├────────────────────────────┤
│ 🔍 Buscar lista ou conta...│ ← NOVO!
├────────────────────────────┤
│ 2 selecionadas  [Todas][Limpar]
│ [Funil ×] [Broadcast ×]    │ ← Badges das selecionadas
├────────────────────────────┤
│ ☑ 📋 Funil                 │
│    gactv1                  │
│ ☑ 📋 Broadcast             │
│    gactv1                  │
│ ☐ 📋 Newsletter            │
│    gactv2                  │
└────────────────────────────┘

# Digitando "gactv13":
┌────────────────────────────┐
│ 🔍 gactv13                 │
├────────────────────────────┤
│ ☐ 📋 Assinantes            │ ← Só listas da gactv13
│    gactv13                 │
│ ☐ 📋 Leads                 │
│    gactv13                 │
└────────────────────────────┘
```

---

## 🧪 Como Testar

1. **Recarregue a página** do dashboard
2. Teste o **Select de Contas**:
   - Clique no select de contas
   - Digite "13" → Deve mostrar só "gactv13"
   - Digite "gactv2" → Deve mostrar "gactv2", "gactv20", "gactv21", "Gactv22"
   - Limpe a busca → Mostra todas novamente

3. Teste o **Multi-Select de Listas**:
   - Clique no select de listas
   - Digite "funil" → Mostra só listas com "funil" no nome
   - Digite "gactv1" → Mostra só listas da conta "gactv1"
   - Selecione múltiplas listas
   - Veja as badges no topo mostrando as selecionadas

---

## ⚡ Performance

### Busca em Tempo Real
- Filtro instantâneo sem delay
- Usa `filter()` do JavaScript (muito rápido)
- Não faz chamadas para o backend

### Otimizações
- Busca **case-insensitive** (maiúsculas/minúsculas ignoradas)
- Busca em **múltiplos campos** (nome da lista + nome da conta)
- Limpa busca automaticamente ao fechar

---

## 💡 Exemplos de Uso

### Cenário 1: Encontrar uma conta específica
```
Você tem 20 contas (gactv1 até gactv22)
Quer selecionar "gactv13"

1. Clique no select de contas
2. Digite "13"
3. Clique em "gactv13"
✅ Muito mais rápido que rolar a lista!
```

### Cenário 2: Filtrar listas de uma conta
```
Você tem 50+ listas de várias contas
Quer ver só as listas da "gactv2"

1. Clique no multi-select de listas
2. Digite "gactv2"
3. Vê só as listas da gactv2
4. Selecione as que quiser
✅ Busca também pelo nome da conta!
```

### Cenário 3: Buscar uma lista específica
```
Procura pela lista "Newsletter"

1. Clique no multi-select de listas
2. Digite "news"
3. Vê todas as listas com "news" no nome
4. Selecione
✅ Busca parcial funciona!
```

---

## 🎯 Benefícios

| Antes | Agora |
|-------|-------|
| Rolar lista de 20+ contas | Digitar 2-3 caracteres |
| Tempo: ~5-10 segundos | Tempo: ~1-2 segundos |
| Difícil com muitas opções | Fácil mesmo com 100+ opções |
| Só busca visual manual | Busca automática instantânea |

---

## 🔧 Detalhes Técnicos

### Algoritmo de Busca (AccountSelect)
```typescript
// Busca case-insensitive
CommandItem.value = account.name
// O Command automaticamente filtra baseado no value
```

### Algoritmo de Busca (ListMultiSelect)
```typescript
const filteredLists = lists.filter(list => {
  const searchLower = searchValue.toLowerCase()
  return (
    list.name.toLowerCase().includes(searchLower) ||
    (list.accountName || '').toLowerCase().includes(searchLower)
  )
})
```

### Estado da Busca
```typescript
const [searchValue, setSearchValue] = React.useState('')

// Limpa ao fechar
setOpen(false)
setSearchValue('')
```

---

## 📊 Comparação de Componentes

| Feature | AccountSelect | ListMultiSelect |
|---------|---------------|-----------------|
| Campo de busca | ✅ | ✅ |
| Single select | ✅ | ❌ |
| Multi select | ❌ | ✅ |
| Checkboxes | ❌ | ✅ |
| Opção "Todas" | ✅ | ✅ (botão) |
| Busca em múltiplos campos | ❌ (só nome) | ✅ (nome + conta) |
| Badges de selecionados | ❌ | ✅ |
| Contador | ❌ | ✅ |

---

## 🚀 Melhorias Futuras (Opcional)

1. **Busca com Highlights**
   - Destacar texto que corresponde à busca
   - Ex: buscar "fu" → **Fu**nil

2. **Keyboard Shortcuts**
   - `/` para focar no campo de busca
   - `Esc` para limpar busca

3. **Histórico de Buscas**
   - Salvar últimas buscas
   - Sugestões baseadas em histórico

4. **Busca Fuzzy**
   - Permitir erros de digitação
   - Ex: "gctv" encontra "gactv"

5. **Agrupamento Visual**
   - Agrupar listas por conta no multi-select
   - Seções colapsáveis

---

## ✅ Checklist de Implementação

- [x] Criar componente `Command`
- [x] Instalar dependências (`cmdk`, `@radix-ui/react-icons`)
- [x] Criar componente `AccountSelect` com busca
- [x] Atualizar `ListMultiSelect` com busca
- [x] Integrar `AccountSelect` no `global-filters.tsx`
- [x] Ajustar `handleAccountChange` para aceitar `undefined`
- [x] Ordenação natural (case-insensitive + numeric)
- [x] Testar busca em tempo real
- [x] Verificar linter (0 erros)
- [x] Documentar feature

---

## 🎉 Resultado Final

Com 20 contas e dezenas de listas, agora é **muito mais rápido** encontrar e selecionar o que você precisa!

**Antes**: Rolar, rolar, rolar... 😫  
**Agora**: Digitar 2-3 letras e pronto! ⚡

---

**Data**: 2025-12-22  
**Status**: ✅ Implementado e testado

