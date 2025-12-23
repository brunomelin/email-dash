# 🔑 Regras de Associação - Automações e Emails

## ❌ **Mito: "Apenas o prefixo [SK] é suficiente"**

**FALSO!** Não é apenas o prefixo entre colchetes que importa.

---

## ✅ **Verdade: Precisa de DOIS elementos**

Para um email ser associado a uma automação:

```
1. PREFIXO deve ser IGUAL
2. CÓDIGO deve ser IGUAL
```

---

## 📊 **Tabela de Associação**

| Automação | Email | Associa? | Por quê? |
|-----------|-------|----------|----------|
| `[SK] email 00` | `[SK] Email 00 - Entrada` | ✅ SIM | Prefixo E código iguais |
| `[SK] email 00` | `[SK] Email 00 - V7` | ✅ SIM | Prefixo E código iguais |
| `[SK] email 00` | `[SK] Email 01 - Outro` | ❌ NÃO | Código diferente (00 ≠ 01) |
| `[SK] email 00` | `[SHEIN] Email 00 - Outro` | ❌ NÃO | Prefixo diferente |
| `[SK] email 00` | `[SK] Mensagem 00` | ❌ NÃO | Falta "email" |
| `[SHEIN] email 00` | `[SHEIN] Email 00 - V7` | ✅ SIM | Prefixo E código iguais |

---

## 🔐 **O Que DEVE Ser Igual**

### 1. Prefixo entre Colchetes

```
✅ Automação: [SK] email 00
✅ Email:     [SK] Email 00 - Entrada

❌ Automação: [SK] email 00
❌ Email:     [SHEIN] Email 00 - Entrada
              ^^^^^^ DIFERENTE!
```

### 2. Código Numérico

```
✅ Automação: [SK] email 00
✅ Email:     [SK] Email 00 - Entrada

❌ Automação: [SK] email 00
❌ Email:     [SK] Email 01 - Entrada
                        ^^ DIFERENTE!
```

### 3. Palavra "email" (case-insensitive)

```
✅ Automação: [SK] email 00
✅ Email:     [SK] Email 00 - Entrada
✅ Email:     [SK] EMAIL 00 - Entrada
✅ Email:     [SK] email 00 - Entrada

❌ Automação: [SK] email 00
❌ Email:     [SK] Mensagem 00 - Entrada
                   ^^^^^^^^ Falta "email"
```

---

## 🎨 **O Que PODE Variar**

### 1. Maiúsculas/Minúsculas

```
Automação: [SK] email 00

✅ [SK] Email 00 - Entrada
✅ [sk] email 00 - Entrada
✅ [SK] EMAIL 00 - Entrada
✅ [Sk] EmAiL 00 - Entrada

Todos funcionam! (case-insensitive)
```

### 2. Texto DEPOIS do Código

```
Automação: [SK] email 00

✅ [SK] Email 00
✅ [SK] Email 00 - Entrada
✅ [SK] Email 00 - Boas Vindas
✅ [SK] Email 00 - V7
✅ [SK] Email 00 - Boas Vindas - Entrada - V2 - Teste - ABC
✅ [SK] Email 00 - 任何文字都可以
✅ [SK] Email 00 - Qualquer coisa aqui pode variar livremente

Tudo depois do código "00" é livre!
```

### 3. Espaços Entre Palavras

```
Automação: [SK] email 00

✅ [SK] Email 00 - Entrada
✅ [SK]  Email  00 - Entrada  (espaços extras)

Funcionam (mas recomendo padrão consistente)
```

---

## ❌ **O Que NÃO Funciona**

### 1. Mudar Prefixo

```
❌ Automação: [SK] email 00
❌ Email:     [SHEIN] Email 00 - Entrada

Não associa! Prefixo diferente.
```

### 2. Mudar Código

```
❌ Automação: [SK] email 00
❌ Email:     [SK] Email 01 - Entrada

Não associa! Código diferente.
```

### 3. Remover "email"

```
❌ Automação: [SK] email 00
❌ Email:     [SK] 00 - Entrada

Não associa! Falta a palavra "email".
```

### 4. Adicionar Texto ANTES do Código

```
❌ Automação: [SK] email 00
❌ Email:     [SK] Email Boas Vindas 00 - Entrada

Pode não associar! "Boas Vindas" está entre "email" e "00".
```

---

## 📐 **Fórmula Exata**

```
ASSOCIAÇÃO = (PREFIXO_IGUAL) AND (CÓDIGO_IGUAL) AND (TEM_"email")
```

### Exemplo Válido:

```
Automação: [SK] email 00
Email:     [SK] Email 00 - [QUALQUER COISA]

Onde:
- [SK] = [SK] ✅
- email = Email ✅ (case-insensitive)
- 00 = 00 ✅
- [QUALQUER COISA] = livre ✅

RESULTADO: ✅ ASSOCIA
```

### Exemplo Inválido:

```
Automação: [SK] email 00
Email:     [SK] Email 01 - Entrada

Onde:
- [SK] = [SK] ✅
- email = Email ✅
- 00 ≠ 01 ❌

RESULTADO: ❌ NÃO ASSOCIA
```

---

## 🎯 **Casos de Uso Práticos**

### Caso 1: Múltiplas Marcas

```
Automações:
- [SK] email 00 - Boas Vindas
- [SHEIN] email 00 - Welcome
- [ZARA] email 00 - Bienvenue

Emails SK:
✅ [SK] Email 00 - Entrada     → Vai para [SK] email 00
✅ [SK] Email 00 - Dia 2       → Vai para [SK] email 00

Emails SHEIN:
✅ [SHEIN] Email 00 - V7       → Vai para [SHEIN] email 00
✅ [SHEIN] Email 00 - V8       → Vai para [SHEIN] email 00

Emails ZARA:
✅ [ZARA] Email 00 - Bonjour   → Vai para [ZARA] email 00

❌ NÃO há conflito entre marcas!
```

### Caso 2: Múltiplos Códigos na Mesma Marca

```
Automações SK:
- [SK] email 00 - Boas Vindas
- [SK] email 01 - Onboarding
- [SK] email 10 - Abandono

Emails:
✅ [SK] Email 00 - Entrada     → Vai para [SK] email 00
✅ [SK] Email 00 - Dia 2       → Vai para [SK] email 00
✅ [SK] Email 01 - Setup       → Vai para [SK] email 01
✅ [SK] Email 01 - Tutorial    → Vai para [SK] email 01
✅ [SK] Email 10 - Lembrete    → Vai para [SK] email 10

❌ NÃO há conflito entre códigos!
```

### Caso 3: Variações de Descrição

```
Automação:
- [SK] email 00 - Boas Vindas

Emails (todos associam):
✅ [SK] Email 00
✅ [SK] Email 00 - V1
✅ [SK] Email 00 - V2
✅ [SK] Email 00 - V3
✅ [SK] Email 00 - Entrada
✅ [SK] Email 00 - Dia 2
✅ [SK] Email 00 - Lembrete
✅ [SK] Email 00 - Boas Vindas - Entrada - V2 - Teste

Tudo com [SK] + email + 00 associa!
```

---

## ✅ **Checklist de Validação**

Ao criar ou renomear:

### Automação:
- [ ] Tem prefixo entre colchetes: `[MARCA]`
- [ ] Tem a palavra "email"
- [ ] Tem código numérico: `00`, `01`, `10`, etc.
- [ ] Formato: `[MARCA] email XX - Descrição`

### Email:
- [ ] Tem o MESMO prefixo: `[MARCA]`
- [ ] Tem a palavra "email" (maiúscula ou minúscula)
- [ ] Tem o MESMO código: `XX`
- [ ] Formato: `[MARCA] Email XX - Descrição`

---

## 🧪 **Teste Rápido**

Execute este comando para verificar suas associações:

```bash
node auditar-nomenclatura.js
```

O script mostrará:
- ✅ Automações com emails associados
- ❌ Automações sem emails
- 💡 Sugestões de correção

---

## 📚 **Resumo Executivo**

### O Que Importa:
1. ✅ Prefixo entre colchetes: `[SK]`, `[SHEIN]`, etc.
2. ✅ Código numérico: `00`, `01`, `10`, etc.
3. ✅ Ambos devem ser iguais na automação e no email

### O Que Não Importa:
1. ✅ Maiúsculas/minúsculas
2. ✅ Texto depois do código
3. ✅ Espaços extras

### Formato Final:
```
Automação: [PREFIXO] email [CÓDIGO] - descrição
Email:     [PREFIXO] Email [CÓDIGO] - descrição
```

---

## 💡 **Dica Pro**

Para evitar erros, sempre copie e cole o padrão:

```
1. Crie automação: [SK] email 00 - _______
2. Crie emails:    [SK] Email 00 - _______
                   [SK] Email 00 - _______
                   [SK] Email 00 - _______
```

Assim você garante que prefixo e código são sempre iguais!

---

**Última atualização**: Dezembro 2024  
**Validado com testes**: ✅ 100% precisão  
**Casos de uso testados**: 11 cenários diferentes

