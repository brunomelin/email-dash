# 📊 Planilha de Migração - Nomenclatura

Use esta planilha para planejar e executar a migração de nomenclatura das suas automações.

## 📋 Template de Planilha

### Conta: _________________

| ✅ | Código | Nome Atual | Nome Novo | Qtd Emails | Status |
|----|--------|-----------|-----------|----------|--------|
| [ ] | 00 | Boas Vindas | 00 - Boas Vindas | 3 | 🔴 Pendente |
| [ ] | 01 | Onboarding | 01 - Onboarding | 5 | 🔴 Pendente |
| [ ] | 02 | Newsletter | 02 - Newsletter Semanal | 1 | 🔴 Pendente |
| [ ] | 10 | Abandono | 10 - Abandono Carrinho | 3 | 🔴 Pendente |

---

## 🎯 Instruções de Uso

### 1. Preencha a Planilha

Para cada conta do ActiveCampaign:
1. Liste todas as automações ativas
2. Atribua um código numérico
3. Defina o novo nome
4. Conte quantos emails tem cada automação

### 2. Execute a Migração

Para cada linha:
1. **No ActiveCampaign**, renomeie a automação
2. **No ActiveCampaign**, renomeie todos os emails da automação
3. Marque o checkbox ✅ quando concluído
4. Atualize o Status para 🟢 Concluído

### 3. Valide

Após concluir todas as linhas:
1. No dashboard: Clique em "Sincronizar Todas"
2. Acesse `/automations`
3. Verifique se a coluna "📧 Emails" está preenchida

---

## 📝 Exemplo Completo - E-commerce

### Conta: gactv1 (Loja Virtual)

| ✅ | Código | Nome Atual | Nome Novo | Qtd Emails | Emails Renomeados | Status |
|----|--------|-----------|-----------|----------|-------------------|--------|
| [x] | 00 | Boas Vindas | 00 - Boas Vindas | 3 | Email 00 - Entrada<br>Email 00 - Dia 2<br>Email 00 - Cupom | 🟢 OK |
| [x] | 10 | Abandono | 10 - Abandono Carrinho | 3 | Email 10 - Lembrete 1h<br>Email 10 - Lembrete 24h<br>Email 10 - Desconto 10% | 🟢 OK |
| [ ] | 20 | Newsletter | 20 - Newsletter Semanal | 1 | Email 20 - Destaques Semana | 🔴 Pendente |
| [ ] | 30 | Lancamento | 30 - Lancamento Black Friday | 5 | (a renomear) | 🔴 Pendente |

---

## 📝 Exemplo Completo - SaaS

### Conta: gactv2 (Software B2B)

| ✅ | Código | Nome Atual | Nome Novo | Qtd Emails | Status |
|----|--------|-----------|-----------|----------|--------|
| [x] | 00 | Onboarding Trial | 00 - Onboarding Trial | 7 | 🟢 OK |
| [x] | 10 | Ativacao | 10 - Ativacao Usuarios | 4 | 🟢 OK |
| [ ] | 20 | Engajamento | 20 - Engajamento Mensal | 3 | 🟡 Em andamento |
| [ ] | 30 | Upgrade | 30 - Upgrade Para Pro | 5 | 🔴 Pendente |
| [ ] | 40 | Retencao | 40 - Retencao Churn Risk | 3 | 🔴 Pendente |

---

## 🎨 Template em Branco (Copie e Cole)

### Conta: _________________

```
| ✅ | Código | Nome Atual | Nome Novo | Qtd Emails | Status |
|----|--------|-----------|-----------|----------|--------|
| [ ] | __ | _________________ | __ - _________________ | _ | 🔴 Pendente |
| [ ] | __ | _________________ | __ - _________________ | _ | 🔴 Pendente |
| [ ] | __ | _________________ | __ - _________________ | _ | 🔴 Pendente |
| [ ] | __ | _________________ | __ - _________________ | _ | 🔴 Pendente |
| [ ] | __ | _________________ | __ - _________________ | _ | 🔴 Pendente |
| [ ] | __ | _________________ | __ - _________________ | _ | 🔴 Pendente |
| [ ] | __ | _________________ | __ - _________________ | _ | 🔴 Pendente |
| [ ] | __ | _________________ | __ - _________________ | _ | 🔴 Pendente |
| [ ] | __ | _________________ | __ - _________________ | _ | 🔴 Pendente |
| [ ] | __ | _________________ | __ - _________________ | _ | 🔴 Pendente |
```

---

## 📊 Rastreamento de Progresso

### Geral - Todas as Contas

| Conta | Total | Concluído | Pendente | % |
|-------|-------|-----------|----------|---|
| gactv1 | 6 | 3 | 3 | 50% |
| gactv2 | 8 | 5 | 3 | 63% |
| gactv3 | 4 | 0 | 4 | 0% |
| ... | | | | |
| **TOTAL** | **81** | **8** | **73** | **10%** |

---

## ✅ Checklist de Validação

Após concluir cada conta:

### Pré-Migração
- [ ] Listei todas as automações ativas
- [ ] Defini códigos únicos para cada uma
- [ ] Planejei o novo nome seguindo padrão `[CÓDIGO] - [DESCRIÇÃO]`

### Durante Migração
- [ ] Renomeei a automação no ActiveCampaign
- [ ] Renomeei TODOS os emails com `Email [CÓDIGO] -`
- [ ] Verifiquei que o código é o mesmo na automação e nos emails

### Pós-Migração
- [ ] Sincronizei o dashboard
- [ ] Acessei `/automations`
- [ ] Confirmei que coluna "📧 Emails" mostra quantidade correta
- [ ] Confirmei que métricas (Enviados, Open Rate) aparecem

---

## 🚨 Problemas Comuns

### "Renomeei mas ainda aparece 0 emails"

**Possíveis causas:**
1. ❌ Código diferente: Auto "00" mas Email "01"
2. ❌ Formato errado: "Email00-" ao invés de "Email 00 -"
3. ❌ Esqueceu de sincronizar o dashboard
4. ❌ Esqueceu de renomear algum email

**Solução:**
- Rode o script: `node auditar-nomenclatura.js`
- Ele vai mostrar exatamente o que está errado

### "Tenho muitas automações, vai demorar muito?"

**Dicas para acelerar:**
1. Comece pelas automações com mais envios
2. Faça em lotes (5-10 por dia)
3. Use atalhos do ActiveCampaign (editar nome inline)
4. Peça ajuda da equipe

---

## 📈 Meta de Cobertura

Estabeleça metas progressivas:

- [ ] **Fase 1**: 25% das automações (1 semana)
- [ ] **Fase 2**: 50% das automações (2 semanas)
- [ ] **Fase 3**: 75% das automações (3 semanas)
- [ ] **Fase 4**: 90%+ das automações (1 mês)

**Meta Final**: 100% de cobertura em todas as contas!

---

## 💡 Dica Profissional

Faça primeiro nas contas com:
1. ✅ Mais envios (maior impacto)
2. ✅ Menos automações (mais rápido)
3. ✅ Automações mais importantes (valor estratégico)

---

**Boa migração! 🚀**

Use o script `node auditar-nomenclatura.js` para acompanhar seu progresso!

