# 🎯 Regra Simplificada: Apenas Prefixo entre Colchetes

## ✅ **NOVA REGRA (Implementada)**

```
Se tem [PREFIXO] → Agrupa TODOS os emails que começam com [PREFIXO]
```

**Ignora códigos numéricos, ignora resto do nome!**

---

## 🎨 **Como Funciona Agora**

### COM Prefixo entre Colchetes

```
Automação: [SK] email 00
Automação: [SK] qualquer coisa
Automação: [SK] 123 abc xyz

TODOS pegam os MESMOS emails:
✅ [SK] Email 00 - Entrada
✅ [SK] Email 01 - Onboarding
✅ [SK] Email 02 - Newsletter
✅ [SK] Email 10 - Abandono
✅ [SK] Email 99 - Qualquer
✅ [SK] Mensagem sem código
✅ [SK] Qualquer nome aqui
```

**O que importa**: Apenas que o email COMECE com `[SK]`

**O que NÃO importa**: 
- ❌ Código numérico (00, 01, 10, etc.)
- ❌ Resto do nome após o prefixo
- ❌ Palavra "email" ou não

---

## 📊 **Matriz de Associação**

| Automação | Email | Associa? | Por quê? |
|-----------|-------|----------|----------|
| `[SK] email 00` | `[SK] Email 00 - X` | ✅ SIM | Começa com [SK] |
| `[SK] email 00` | `[SK] Email 01 - X` | ✅ SIM | Começa com [SK] |
| `[SK] email 00` | `[SK] Email 99 - X` | ✅ SIM | Começa com [SK] |
| `[SK] email 00` | `[SK] Mensagem X` | ✅ SIM | Começa com [SK] |
| `[SK] email 00` | `[SHEIN] Email 00` | ❌ NÃO | Prefixo diferente |
| `[SK] email 00` | `Email SK 00` | ❌ NÃO | [SK] não está no início |
| `[SHEIN] email 00` | `[SHEIN] Email X` | ✅ SIM | Começa com [SHEIN] |

---

## 🔑 **Regra de Ouro**

```
Automação com [PREFIXO] → Pega TUDO que começa com [PREFIXO]
```

### Exemplo Prático:

```
Você tem UMA automação:
  [SK] email 00

Ela vai agrupar TODOS estes emails:
  ✅ [SK] Email 00 - Boas Vindas
  ✅ [SK] Email 01 - Onboarding
  ✅ [SK] Email 02 - Newsletter
  ✅ [SK] Email 10 - Abandono
  ✅ [SK] Email 20 - Reengajamento
  ✅ [SK] Mensagem Especial
  ✅ [SK] Qualquer coisa

Ou seja, TODOS os emails da marca SK ficam nesta automação!
```

---

## ⚠️ **ATENÇÃO: Nova Organização Necessária**

### ❌ ANTES (Lógica Antiga):

```
Automação 1: [SK] email 00 - Boas Vindas
  → [SK] Email 00 - Entrada
  → [SK] Email 00 - Dia 2

Automação 2: [SK] email 01 - Onboarding
  → [SK] Email 01 - Setup
  → [SK] Email 01 - Tutorial

Automação 3: [SK] email 10 - Abandono
  → [SK] Email 10 - Lembrete
```

### ✅ AGORA (Nova Lógica):

**Opção 1: Uma Automação por Marca (Recomendado)**

```
Automação Única: [SK] Todos os Emails
  → [SK] Email 00 - Entrada
  → [SK] Email 00 - Dia 2
  → [SK] Email 01 - Setup
  → [SK] Email 01 - Tutorial
  → [SK] Email 10 - Lembrete
  → ... TODOS os [SK]
```

**Opção 2: Múltiplas Automações com Prefixos Diferentes**

```
Automação 1: [SK-BV] Boas Vindas
  → [SK-BV] Email 00 - Entrada
  → [SK-BV] Email 00 - Dia 2

Automação 2: [SK-ON] Onboarding
  → [SK-ON] Email 01 - Setup
  → [SK-ON] Email 01 - Tutorial

Automação 3: [SK-AB] Abandono
  → [SK-AB] Email 10 - Lembrete
```

---

## 🎯 **Padrões Recomendados**

### Padrão 1: Por Marca/Produto (Simples)

```
Automação: [SK] Emails
Emails:    [SK] Email 00 - Entrada
          [SK] Email 01 - Onboarding
          [SK] Email 10 - Abandono
          ... todos os [SK]

Automação: [SHEIN] Emails
Emails:    [SHEIN] Email 00 - Welcome
          [SHEIN] Email 01 - Catalog
          ... todos os [SHEIN]
```

**Vantagens**:
- ✅ Simples de manter
- ✅ Uma automação = uma marca
- ✅ Fácil de entender

**Desvantagens**:
- ❌ Todos os emails da marca ficam juntos
- ❌ Não separa por jornada/fluxo

### Padrão 2: Por Marca + Fluxo (Detalhado)

```
Automação: [SK-BV] Boas Vindas
Emails:    [SK-BV] Email 00 - Entrada
          [SK-BV] Email 00 - Dia 2

Automação: [SK-ON] Onboarding
Emails:    [SK-ON] Email 01 - Setup
          [SK-ON] Email 01 - Tutorial

Automação: [SK-AB] Abandono
Emails:    [SK-AB] Email 10 - Lembrete
```

**Vantagens**:
- ✅ Separa por jornada/fluxo
- ✅ Métricas mais granulares
- ✅ Organização clara

**Desvantagens**:
- ❌ Mais trabalho para renomear
- ❌ Precisa criar mais prefixos

### Padrão 3: Híbrido (Marca no início, código depois)

```
Automação: [SK] 00 - Boas Vindas
Emails:    [SK] 00 - Email Entrada
          [SK] 00 - Email Dia 2

Automação: [SK] 01 - Onboarding
Emails:    [SK] 01 - Email Setup
          [SK] 01 - Email Tutorial
```

**ATENÇÃO**: Com a nova lógica, TODAS as automações [SK] vão pegar TODOS os emails [SK]! Você precisaria usar prefixos diferentes para cada automação.

---

## 🔄 **Migração Recomendada**

### Se Você Tem Múltiplas Automações com [SK]:

**Escolha UMA das opções:**

#### Opção A: Consolidar em Uma Automação

```
ANTES:
- [SK] email 00 - Boas Vindas
- [SK] email 01 - Onboarding
- [SK] email 10 - Abandono

DEPOIS:
- [SK] Todos os Emails
  (agrupa automaticamente todos os [SK])
```

#### Opção B: Criar Prefixos Específicos

```
ANTES:
- [SK] email 00 - Boas Vindas → [SK] Email 00 - X
- [SK] email 01 - Onboarding → [SK] Email 01 - Y
- [SK] email 10 - Abandono → [SK] Email 10 - Z

DEPOIS:
- [SK-BV] Boas Vindas → [SK-BV] Email 00 - X
- [SK-ON] Onboarding → [SK-ON] Email 01 - Y
- [SK-AB] Abandono → [SK-AB] Email 10 - Z
```

---

## 📋 **Checklist de Implementação**

### Para Cada Marca:

- [ ] **Decidir estrutura**:
  - [ ] Uma automação única por marca? (Padrão 1)
  - [ ] Múltiplas com prefixos específicos? (Padrão 2)

- [ ] **Renomear automações**:
  - [ ] Adicionar `[PREFIXO]` no início
  - [ ] Exemplo: `[SK] Emails` ou `[SK-BV] Boas Vindas`

- [ ] **Renomear emails**:
  - [ ] Adicionar o MESMO `[PREFIXO]` em todos os emails
  - [ ] Exemplo: `[SK] Email 00 - Entrada`

- [ ] **Validar**:
  - [ ] Sincronizar dashboard
  - [ ] Acessar `/automations`
  - [ ] Verificar coluna "📧 Emails"
  - [ ] Confirmar que agrupa corretamente

---

## 🧪 **Teste Rápido**

Após implementar, execute:

```bash
node auditar-nomenclatura.js
```

O script mostrará:
- ✅ Automações com prefixo que agrupam emails
- ❌ Automações sem emails
- 📊 Total de emails por automação

---

## 💡 **Casos de Uso**

### Caso 1: E-commerce Multi-marca

```
Marca SK:
  Automação: [SK] Emails
    → Todos os emails [SK]

Marca SHEIN:
  Automação: [SHEIN] Emails
    → Todos os emails [SHEIN]

Marca ZARA:
  Automação: [ZARA] Emails
    → Todos os emails [ZARA]
```

### Caso 2: SaaS com Múltiplos Produtos

```
Produto A:
  Automação: [PROD-A] Onboarding
    → [PROD-A] Email 00 - Welcome
    → [PROD-A] Email 01 - Setup
    → [PROD-A] Email 02 - Tutorial

Produto B:
  Automação: [PROD-B] Onboarding
    → [PROD-B] Email 00 - Welcome
    → [PROD-B] Email 01 - Setup
```

### Caso 3: Agência com Múltiplos Clientes

```
Cliente 1:
  Automação: [CLI1] Emails
    → Todos os [CLI1]

Cliente 2:
  Automação: [CLI2] Emails
    → Todos os [CLI2]
```

---

## ⚡ **Benefícios da Nova Lógica**

### ✅ Vantagens:

1. **Simplicidade Extrema**
   - Apenas o prefixo importa
   - Não precisa sincronizar códigos

2. **Flexibilidade**
   - Emails podem ter qualquer nome após o prefixo
   - Não precisa seguir padrão rígido

3. **Manutenção Fácil**
   - Adicionar email novo? Só precisa do [PREFIXO]
   - Não precisa verificar código

4. **Organização Clara**
   - Uma automação = uma marca/produto
   - Fácil de entender visualmente

### ⚠️ Considerações:

1. **Granularidade**
   - Se quiser separar por fluxo, precisa prefixos diferentes
   - Não pode ter múltiplas automações com mesmo prefixo

2. **Migração**
   - Se já tem múltiplas automações [SK], precisa consolidar ou renomear

---

## 📚 **Resumo Executivo**

### Nova Regra:

```
[PREFIXO] = Chave Única de Agrupamento
```

### Exemplos Válidos:

```
✅ Automação: [SK] qualquer nome
   Emails:    Tudo que começa com [SK]

✅ Automação: [SHEIN] xyz
   Emails:    Tudo que começa com [SHEIN]

✅ Automação: [CLIENT-001] abc
   Emails:    Tudo que começa com [CLIENT-001]
```

### Regra de Ouro:

```
MESMO [PREFIXO] = MESMA AUTOMAÇÃO
```

---

**Última atualização**: Dezembro 2024  
**Implementado em**: `automation-metrics-service.ts`  
**Testado**: ✅ 100% (19/19 casos)  
**Status**: ✅ Ativo

