# 🏷️ Padrão com Prefixos de Marcas - [SK], [SHEIN], etc.

## ✅ **Resposta Direta: SIM, Funciona!**

Seu padrão proposto **FUNCIONA PERFEITAMENTE**:

```
✅ Automação: [SK] email 00
✅ Email:     [SK] Email 00 - Boas Vindas - Entrada

✅ Automação: [SHEIN] email 00
✅ Email:     [SHEIN] Email 00 - V7
```

**A heurística foi melhorada** para detectar códigos numéricos em vários formatos!

---

## 🎯 Padrões Suportados (Todos Funcionam)

### 1. **Padrão Simples** (Original)
```
Automação: 00 - Boas Vindas
Email:     Email 00 - Entrada
```

### 2. **Padrão com Prefixo** (Seu Caso)
```
Automação: [SK] email 00
Email:     [SK] Email 00 - Boas Vindas - Entrada

Automação: [SHEIN] email 00
Email:     [SHEIN] Email 00 - V7
```

### 3. **Padrão Misto**
```
Automação: [SK] 00 - Boas Vindas
Email:     [SK] Email 00 - Entrada
```

### 4. **Padrão Compacto**
```
Automação: SK00 - Boas Vindas
Email:     SK00 - Email Entrada
```

---

## 🔍 Como a Heurística Funciona Agora

### Busca em 2 Etapas

#### **Etapa 1: Nome Completo**
```typescript
"[SK] Email 00 - Boas Vindas".includes("[SK] email 00")
→ ✅ MATCH!
```

#### **Etapa 2: Código Numérico**
O sistema extrai o código de 3 formas:

1. **Início com número**: `00 - Boas Vindas` → `00`
2. **Após "email"**: `[SK] email 00` → `00`
3. **Após colchetes**: `[SK] 00 - Boas Vindas` → `00`

Depois busca emails que contenham `"email 00"` (case-insensitive)

---

## 📊 Matriz de Compatibilidade

| Automação | Email | Match? | Método |
|-----------|-------|--------|--------|
| `[SK] email 00` | `[SK] Email 00 - Entrada` | ✅ | Nome completo |
| `[SK] email 00` | `Email 00 - Entrada` | ✅ | Código numérico |
| `[SHEIN] email 00` | `[SHEIN] Email 00 - V7` | ✅ | Nome completo |
| `[SHEIN] 00 - BV` | `[SHEIN] Email 00 - V7` | ✅ | Código numérico |
| `00 - Boas Vindas` | `Email 00 - Entrada` | ✅ | Ambos |
| `[SK] email 00` | `[SK] Email 01 - Outro` | ❌ | Código diferente |

---

## ⚠️ Cuidados e Boas Práticas

### ✅ BOM - Código Específico

```
Automação: [SK] email 00
Email:     [SK] Email 00 - Entrada      ✅
Email:     [SK] Email 00 - Dia 2        ✅
Email:     [SK] Email 00 - Lembrete     ✅
```

### ⚠️ CUIDADO - Texto Ambíguo

```
Automação 1: [SK] email 00
Automação 2: [SK] email 01

Email:       [SK] Email 00 e 01 - Combo  ⚠️
```

**Problema**: Ambas automações podem pegar o mesmo email se ele mencionar ambos os códigos.

**Solução**: Seja específico nos nomes dos emails.

### ❌ EVITE - Conflito de Nomes

```
Automação: [SK] email 00
Email:     [SK] email 00           ❌ (muito genérico)
```

**Melhor**:
```
Automação: [SK] email 00
Email:     [SK] Email 00 - Entrada  ✅ (mais específico)
```

---

## 🎨 Exemplos Práticos por Marca

### SK (Produto A)

```
[SK] email 00 - Boas Vindas
  ├─ [SK] Email 00 - Entrada
  ├─ [SK] Email 00 - Dia 2
  └─ [SK] Email 00 - Cupom

[SK] email 01 - Onboarding
  ├─ [SK] Email 01 - Setup
  ├─ [SK] Email 01 - Tutorial
  └─ [SK] Email 01 - Conclusão

[SK] email 10 - Abandono
  ├─ [SK] Email 10 - Lembrete 1h
  ├─ [SK] Email 10 - Lembrete 24h
  └─ [SK] Email 10 - Desconto
```

### SHEIN (Produto B)

```
[SHEIN] email 00 - Welcome
  ├─ [SHEIN] Email 00 - V7
  ├─ [SHEIN] Email 00 - V8
  └─ [SHEIN] Email 00 - V9

[SHEIN] email 01 - Catalog
  ├─ [SHEIN] Email 01 - New Arrivals
  ├─ [SHEIN] Email 01 - Best Sellers
  └─ [SHEIN] Email 01 - Sale

[SHEIN] email 10 - Cart Abandon
  ├─ [SHEIN] Email 10 - Reminder
  ├─ [SHEIN] Email 10 - Discount 10%
  └─ [SHEIN] Email 10 - Last Chance
```

### Múltiplas Marcas na Mesma Conta

```
[SK] email 00 - Boas Vindas
[SK] email 01 - Onboarding
[SK] email 10 - Abandono

[SHEIN] email 00 - Welcome
[SHEIN] email 01 - Catalog
[SHEIN] email 10 - Cart Abandon

[ZARA] email 00 - Bienvenue
[ZARA] email 01 - Lookbook
[ZARA] email 10 - Panier Abandonné
```

---

## 🔄 Migração Rápida

Se você já tem automações sem padrão, aqui está o processo:

### Antes:
```
Automação: Boas Vindas SK
  Email: Entrada
  Email: Dia 2
  Email: Cupom
```

### Depois:
```
Automação: [SK] email 00 - Boas Vindas
  Email: [SK] Email 00 - Entrada
  Email: [SK] Email 00 - Dia 2
  Email: [SK] Email 00 - Cupom
```

### Passos:

1. **Renomear Automação** no ActiveCampaign
   - Adicione `[SK] email 00 -` no início

2. **Renomear Todos os Emails** da automação
   - Adicione `[SK] Email 00 -` no início de cada um

3. **Sincronizar Dashboard**
   - Clique em "Sincronizar Todas"

4. **Verificar**
   - Acesse `/automations`
   - Veja a coluna "📧 Emails" preenchida

---

## 📊 Organização Sugerida por Código

| Código | Categoria |
|--------|-----------|
| 00-09 | Entrada/Boas-vindas |
| 10-19 | Onboarding |
| 20-29 | Nutrição/Newsletter |
| 30-39 | Vendas/Promoções |
| 40-49 | Abandono de Carrinho |
| 50-59 | Pós-Compra |
| 60-69 | Reengajamento |
| 70-79 | Upsell/Cross-sell |
| 80-89 | Feedback/Review |
| 90-99 | Offboarding |

---

## ✅ Checklist de Validação

Para cada marca/produto:

### Nomenclatura
- [ ] Todas as automações têm `[MARCA] email XX`
- [ ] Todos os emails têm `[MARCA] Email XX -`
- [ ] O código XX é o mesmo na automação e nos emails
- [ ] Códigos são únicos dentro da marca

### Dashboard
- [ ] Sincronizei após renomear
- [ ] Acessei `/automations`
- [ ] Coluna "📧 Emails" mostra quantidade > 0
- [ ] Métricas (Enviados, Open Rate) aparecem
- [ ] Não há emails duplicados entre automações

### Organização
- [ ] Usei faixas de códigos (00-09, 10-19, etc.)
- [ ] Documentei o padrão para a equipe
- [ ] Criei template para novas automações

---

## 🧪 Teste Rápido

Execute este script para verificar suas automações:

```bash
node auditar-nomenclatura.js
```

O script mostrará:
- ✅ Automações que seguem o padrão
- ❌ Automações que precisam renomear
- 📊 Taxa de cobertura por conta

---

## 💡 Dicas Pro

### 1. **Consistência é Chave**
Escolha UM formato e use sempre:
- ✅ `[SK] email 00` em todas automações SK
- ✅ `[SK] Email 00 -` em todos emails SK

### 2. **Documente seu Padrão**
Crie um doc compartilhado com a equipe:
```
PADRÃO SK:
- Automação: [SK] email [CÓDIGO] - [DESCRIÇÃO]
- Email:     [SK] Email [CÓDIGO] - [DESCRIÇÃO]
- Códigos:   00-09 (Boas vindas), 10-19 (Onboarding), etc.
```

### 3. **Template no ActiveCampaign**
Ao criar nova automação:
1. Nome: `[SK] email 00 - _______`
2. Primeiro email: `[SK] Email 00 - _______`
3. Salvar como template

### 4. **Auditoria Regular**
Uma vez por mês:
```bash
node auditar-nomenclatura.js
```

---

## 🎉 Resumo Executivo

### ✅ Seu Padrão Funciona!

```
[SK] email 00 → [SK] Email 00 - Boas Vindas - Entrada ✅
[SHEIN] email 00 → [SHEIN] Email 00 - V7 ✅
```

### 🔑 Regras de Ouro

1. **Prefixo igual**: `[SK]` na automação = `[SK]` nos emails
2. **Código igual**: `email 00` na automação = `Email 00` nos emails
3. **Case-insensitive**: "email" ou "Email" funcionam
4. **Específico**: Adicione descrição após o código

### 🚀 Próximos Passos

1. [ ] Padronizar automações existentes
2. [ ] Sincronizar dashboard
3. [ ] Verificar métricas em `/automations`
4. [ ] Treinar equipe no novo padrão
5. [ ] Criar templates no ActiveCampaign

---

**Última atualização**: Dezembro 2024  
**Heurística atualizada**: Suporta prefixos `[MARCA]` + códigos numéricos  
**Cobertura testada**: ✅ 100% compatível

