# 📋 Guia de Nomenclatura - Automações e Emails

## 🎯 Objetivo

Padronizar os nomes de **Automações** e **Emails (Campanhas)** no ActiveCampaign para que o dashboard consiga rastrear corretamente qual email pertence a qual automação.

---

## ⚠️ O Problema

A API do ActiveCampaign **NÃO fornece** o vínculo direto entre:
- Automação ↔ Campanhas de Email

Por isso, usamos uma **heurística por nome** para fazer a associação.

### Exemplo Real do Problema

**Sem Padrão:**
```
❌ Automação: "Boas Vindas"
   Email 1: "Mensagem de boas vindas"
   Email 2: "Bem vindo ao nosso sistema"
   Email 3: "Oi! Seja bem vindo"
```
**Resultado**: ❌ Dashboard mostra **0 emails** para essa automação

---

## ✅ Padrão Recomendado (3 Opções)

### **Opção 1: Código Numérico (RECOMENDADO) 🌟**

Use números sequenciais no início de ambos:

```
✅ Automação: "00 - Boas Vindas"
   
   Emails:
   ✅ Email 00 - Entrada
   ✅ Email 00 - Dia 2  
   ✅ Email 00 - Lembrete
```

**Por que funciona:**
- Dashboard busca por "Email 00" → Encontra todos
- Fácil de organizar visualmente
- Números não mudam se você renomear a descrição

**Seu caso atual (gactv1):**
```
✅ 00 - Eslovaquia
✅ 00 - Boas Vindas
✅ 00 - Clique
✅ 00 - Resposta
   
   Emails:
   ✅ Email 00 - Boas Vindas - Entrada - V6
   ✅ Email 00 - Boas Vindas - Entrada - V4
   ✅ Email 00 - Boas Vindas - Resposta Confirmação
   ... (todos têm "Email 00")
```

---

### **Opção 2: Prefixo Único**

Use um código alfanumérico único:

```
✅ Automação: "BWV - Boas Vindas"
   
   Emails:
   ✅ BWV-001 - Entrada
   ✅ BWV-002 - Dia 2
   ✅ BWV-003 - Lembrete
```

**Vantagens:**
- Menos chance de conflito
- Suporta mais de 99 automações
- Siglas podem ser descritivas

**Exemplo de organização:**
```
BWV - Boas Vindas
ONB - Onboarding
NUR - Nutrição
VND - Vendas
RET - Retenção
```

---

### **Opção 3: Nome Completo no Início**

Repita o nome da automação em cada email:

```
✅ Automação: "Sequência Onboarding"
   
   Emails:
   ✅ Sequência Onboarding - Passo 1
   ✅ Sequência Onboarding - Passo 2
   ✅ Sequência Onboarding - Passo 3
```

**Desvantagens:**
- Nomes longos
- Se renomear automação, precisa renomear todos os emails

---

## 🎯 Padrão Detalhado: Código Numérico

### Estrutura das Automações

```
[CÓDIGO] - [DESCRIÇÃO] - [VARIAÇÃO]

Exemplos:
00 - Boas Vindas
01 - Onboarding - 7 Dias
02 - Nutrição - Newsletter
03 - Vendas - Produto A
04 - Retenção
10 - Abandono Carrinho
20 - Reengajamento
```

### Estrutura dos Emails

```
Email [CÓDIGO] - [DESCRIÇÃO] - [VERSÃO/CONTEXTO]

Exemplos:
Email 00 - Entrada
Email 00 - Dia 2 - Apresentação
Email 00 - Dia 4 - Conteúdo
Email 01 - Passo 1 - V2
Email 01 - Passo 2
Email 02 - Newsletter Semanal
```

---

## 📊 Como o Dashboard Faz a Associação

### Heurística Implementada

Para cada automação, o dashboard busca campanhas que atendam **qualquer um** destes critérios:

1. **Nome completo**: Email contém o nome completo da automação
   ```
   Automação: "Onboarding Completo"
   Email: "Onboarding Completo - Passo 1" ✅
   ```

2. **Código numérico**: Se automação começa com número
   ```
   Automação: "01 - Onboarding"
   Email: "Email 01 - Passo 1" ✅
   Email: "Email 01 - Passo 2" ✅
   ```

3. **Prefixo com hífen**: Busca por "[CÓDIGO] -"
   ```
   Automação: "BWV - Boas Vindas"
   Email: "BWV - Entrada" ✅
   Email: "BWV - Dia 2" ✅
   ```

### Exemplo Visual

```typescript
Automação: "00 - Boas Vindas"

Extrai código: "00"

Busca emails que começam com:
  ✅ "Email 00 -"
  ✅ "Email 00 "
  ✅ "00 -"

Encontra:
  ✅ Email 00 - Entrada
  ✅ Email 00 - Dia 2
  ✅ Email 00 - Lembrete
  ❌ Email 01 - Outro (não corresponde)
```

---

## 🚫 O Que NÃO Fazer

### ❌ Nomes Diferentes Sem Padrão

```
❌ Automação: "Boas Vindas"
   Email: "Primeira mensagem"
   Email: "Segunda mensagem"
   Email: "Lembrete"
```
**Problema**: Nenhum vínculo identificável

### ❌ Códigos Só no Email

```
❌ Automação: "Onboarding Completo"
   Email: "BWV-001"
   Email: "BWV-002"
```
**Problema**: Dashboard não sabe que "BWV" = "Onboarding"

### ❌ Códigos Diferentes

```
❌ Automação: "00 - Boas Vindas"
   Email: "01 - Entrada"
   Email: "02 - Dia 2"
```
**Problema**: Códigos não correspondem

### ❌ Espaços/Formatação Inconsistente

```
❌ Automação: "00-Boas Vindas"
   Email: "Email 00- Entrada"
   Email: "Email 00 -Dia 2"
```
**Problema**: Pode funcionar, mas melhor ser consistente

---

## 🔄 Migração de Automações Existentes

### Passo 1: Auditar Automações

No ActiveCampaign, vá em **Automations** e liste todas:

```
Atual:
- Boas Vindas
- Onboarding
- Newsletter
- Abandono
```

### Passo 2: Definir Códigos

Crie uma planilha:

| Código | Nome Atual | Nome Novo |
|--------|-----------|-----------|
| 00 | Boas Vindas | 00 - Boas Vindas |
| 01 | Onboarding | 01 - Onboarding |
| 02 | Newsletter | 02 - Newsletter |
| 10 | Abandono | 10 - Abandono Carrinho |

**Dica**: Use múltiplos de 10 para grandes categorias:
- 00-09: Boas vindas e entrada
- 10-19: Onboarding
- 20-29: Nutrição
- 30-39: Vendas
- 40-49: Retenção
- 50-59: Reengajamento

### Passo 3: Renomear Automações

No ActiveCampaign:
1. Abra cada automação
2. Clique em "Edit" no nome
3. Adicione o código no início

### Passo 4: Renomear Campanhas

Para cada email dentro da automação:
1. Vá em **Campaigns**
2. Filtre por tipo "Automation"
3. Renomeie adicionando "Email [CÓDIGO] -" no início

**Exemplo de transformação:**
```
Antes:
Automação: Boas Vindas
  ├─ Mensagem de entrada
  ├─ Segundo email
  └─ Lembrete

Depois:
Automação: 00 - Boas Vindas
  ├─ Email 00 - Entrada
  ├─ Email 00 - Dia 2
  └─ Email 00 - Lembrete
```

### Passo 5: Re-sincronizar Dashboard

Após renomear tudo:
```bash
# No dashboard
1. Acesse http://localhost:3000
2. Clique em "Sincronizar Todas"
3. Aguarde conclusão
4. Vá em /automations
5. Veja as métricas atualizadas!
```

---

## 📋 Checklist de Implementação

### Para Cada Conta do ActiveCampaign:

- [ ] Listar todas as automações ativas
- [ ] Definir códigos numéricos únicos
- [ ] Criar planilha de mapeamento
- [ ] Renomear automações (adicionar código)
- [ ] Renomear campanhas (adicionar "Email [CÓDIGO]")
- [ ] Re-sincronizar no dashboard
- [ ] Verificar se métricas aparecem corretamente
- [ ] Documentar padrão para equipe

---

## 🎓 Exemplos Práticos por Tipo

### E-commerce

```
00 - Boas Vindas
   ├─ Email 00 - Desconto Primeira Compra
   └─ Email 00 - Conheca Nossos Produtos

10 - Abandono Carrinho
   ├─ Email 10 - Lembrete 1h
   ├─ Email 10 - Lembrete 24h
   └─ Email 10 - Desconto Especial

20 - Pos Venda
   ├─ Email 20 - Agradecimento
   ├─ Email 20 - Feedback
   └─ Email 20 - Produtos Relacionados
```

### SaaS

```
00 - Onboarding
   ├─ Email 00 - Boas Vindas
   ├─ Email 00 - Setup Passo 1
   ├─ Email 00 - Setup Passo 2
   └─ Email 00 - Primeiros Resultados

10 - Ativacao
   ├─ Email 10 - Feature A
   ├─ Email 10 - Feature B
   └─ Email 10 - Case Success

20 - Engajamento
   ├─ Email 20 - Newsletter Semanal
   ├─ Email 20 - Tips & Tricks
   └─ Email 20 - Novidades
```

### Infoprodutos

```
00 - Entrada Funil
   ├─ Email 00 - Ebook Gratis
   ├─ Email 00 - Video Aula 1
   └─ Email 00 - Bonus Surpresa

10 - Lancamento
   ├─ Email 10 - Pre Lancamento
   ├─ Email 10 - Carrinho Aberto
   ├─ Email 10 - Depoimentos
   └─ Email 10 - Ultima Chance

20 - Pos Venda
   ├─ Email 20 - Acesso Curso
   ├─ Email 20 - Modulo 1
   └─ Email 20 - Certificado
```

---

## 🔍 Como Verificar Se Está Funcionando

### No Dashboard

1. Acesse `/automations`
2. Veja a coluna "📧 Emails"
3. Automações com padrão correto mostrarão número > 0
4. Clique para ver detalhes

### Teste Rápido

```
✅ Bom:
Automação: "00 - Boas Vindas"
Coluna Emails: "12"
Enviados: "1.389"
Open Rate: "37.9%"

❌ Ruim:
Automação: "Limpar leads"
Coluna Emails: "—"
Enviados: "—"
Open Rate: "—"
```

---

## 💡 Dicas Avançadas

### 1. Use Categorias com Dezenas

```
00-09: Entrada
10-19: Onboarding  
20-29: Nutrição
30-39: Vendas
40-49: Retenção
50-59: Reengajamento
60-69: Eventos
70-79: Abandono
80-89: Cross-sell
90-99: Offboarding
```

### 2. Variações Regionais

```
00 - Boas Vindas - Brasil
01 - Boas Vindas - Portugal
02 - Boas Vindas - Angola

Emails:
Email 00 - Entrada
Email 01 - Entrada
Email 02 - Entrada
```

### 3. Testes A/B

```
00 - Boas Vindas - Controle
00B - Boas Vindas - Variante B

Emails:
Email 00 - Entrada - V1
Email 00B - Entrada - V2
```

---

## 📊 Relatório de Cobertura

Após padronizar, você pode auditar:

```sql
-- No dashboard, criar relatório
Total de Automações: 81
Com Emails Associados: 75 (92%)
Sem Emails: 6 (8%)

Top 5 sem emails:
1. "Limpar leads" → Renomear para "90 - Limpar leads"
2. "Teste antigo" → Pode deletar
3. "Backup" → Pode deletar
...
```

---

## 🎯 Resumo Executivo

### Padrão Recomendado

```
✅ AUTOMAÇÃO: [CÓDIGO] - [DESCRIÇÃO]
✅ EMAIL: Email [CÓDIGO] - [DESCRIÇÃO]

Exemplo:
00 - Boas Vindas
  Email 00 - Entrada
  Email 00 - Dia 2
  Email 00 - Lembrete
```

### Benefícios

✅ **100% de rastreabilidade** - Todos os emails aparecem no dashboard  
✅ **Organização visual** - Fácil identificar no ActiveCampaign  
✅ **Escalável** - Suporta 99+ automações por categoria  
✅ **Flexível** - Pode renomear descrições sem quebrar vínculo  
✅ **Documentação automática** - Código indica categoria  

### Próximos Passos

1. ✅ Escolher padrão (recomendo: código numérico)
2. ✅ Criar planilha de mapeamento
3. ✅ Renomear automações e emails
4. ✅ Re-sincronizar dashboard
5. ✅ Treinar equipe no padrão

---

## 📞 Suporte

Se tiver dúvidas sobre nomenclatura específica ou casos especiais, consulte este guia ou teste no dashboard após renomear!

---

**Última atualização**: Dezembro 2024  
**Versão do Dashboard**: Phase 4 - Automações

