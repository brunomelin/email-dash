# ⚠️ Limitação: Associação de Emails a Automações

## 🔴 Problema Identificado

A API v3 do ActiveCampaign **NÃO fornece um vínculo direto** entre automações e as campanhas/emails enviados por elas.

### Dados Disponíveis na API

**✅ O que temos**:
- `automation.entered`: Quantos contatos entraram
- `automation.exited`: Quantos contatos saíram  
- `automation.status`: Ativa ou pausada
- `automation.name`: Nome da automação

**❌ O que NÃO temos**:
- Quais emails pertencem a qual automação
- Métricas de envios/aberturas/cliques por automação
- ID de relacionamento automação → campanha

---

## 📊 Exemplo Real (gactv1)

### Automação no ActiveCampaign
```
Nome: "00 - Clique"
Entered: 665
Exited: 0
```

### Emails Dessa Automação
```
Nome: "Email 00 - Boas Vindas - Resposta Confirmação"
Enviados: 88
Opens: 66
```

**Problema**: O nome do email ("Email 00 - Boas Vindas...") **NÃO contém** "Clique"!

---

## 🔧 Solução Implementada: Heurística

### Estratégia Atual

Tentamos associar emails a automações através de **matching de nomes**:

```typescript
// 1. Buscar emails com isAutomation=true
// 2. Aplicar heurística:

// Padrão 1: Nome completo
nomeDoCampanha.includes(nomeDaAutomação)

// Padrão 2: Código numérico
Se automação = "00 - Clique"
  → Buscar campanhas que começam com "Email 00"
```

### Exemplo de Funcionamento

| Automação | Padrão de Busca | Campanhas Encontradas |
|-----------|-----------------|----------------------|
| "00 - Boas Vindas" | Contains "00 - Boas Vindas" | ✅ 11 campanhas |
| "Email 00" | Contains "Email 00" | ✅ 12 campanhas |
| "00 - Clique" | Starts with "Email 00" | ✅ 12 campanhas (via código) |
| "Limpar leads" | Contains "Limpar leads" | ❌ 0 campanhas |

### Taxa de Sucesso

**Depende da convenção de nomenclatura**:
- ✅ 80-95% quando há consistência nos nomes
- ⚠️ 50-70% quando nomes são muito diferentes
- ❌ 0% quando não há padrão algum

---

## 💡 Recomendações para Usuários

### Para Melhor Rastreamento

1. **Nomeie emails com prefixo da automação**
   ```
   Automação: "01 - Onboarding"
   Emails:    "01 - Welcome Email"
              "01 - Day 2 Email"
              "01 - Day 7 Email"
   ```

2. **Use códigos numéricos**
   ```
   Automação: "00 - Boas Vindas"
   Emails:    "Email 00 - ..."
              "00 - ..."
   ```

3. **Mantenha consistência**
   - Todos os emails de uma automação devem ter algo em comum no nome
   - Prefira prefixos claros e únicos

---

## 🎯 Soluções Alternativas (Futuro)

### Opção 1: Mapeamento Manual
**Ideia**: Criar tabela no banco para associações manuais

```prisma
model AutomationCampaignMapping {
  automationId String
  campaignId   String
  accountId    String
  
  automation   Automation @relation(...)
  campaign     Campaign   @relation(...)
  
  @@id([accountId, automationId, campaignId])
}
```

**Prós**:
- 100% preciso
- Controle total

**Contras**:
- Trabalhoso
- Requer UI para gerenciar
- Manutenção manual

---

### Opção 2: Machine Learning
**Ideia**: Treinar modelo para identificar padrões

```typescript
// Analisar histórico e aprender:
- Quais emails pertencem a quais automações
- Padrões de nomenclatura específicos do cliente
- Timing de envios (correlação temporal)
```

**Prós**:
- Automático após treinamento
- Pode encontrar padrões não óbvios

**Contras**:
- Complexo de implementar
- Requer dados de treinamento
- Nunca será 100% preciso

---

### Opção 3: Tags/Custom Fields
**Ideia**: Usar tags ou custom fields no ActiveCampaign

```
Tag do email: "automation:00-clique"
Custom field: automation_id = "5"
```

**Prós**:
- Preciso
- Gerenciável dentro do ActiveCampaign

**Contras**:
- Requer mudança de processo do cliente
- Precisa configurar manualmente no ActiveCampaign
- API pode não expor esses campos

---

### Opção 4: Webhooks
**Ideia**: Usar webhooks do ActiveCampaign para rastrear envios

```
Webhook: contact_enters_automation
  → Registrar que email X pertence a automação Y
  
Webhook: email_sent
  → Associar envio com automação
```

**Prós**:
- Tempo real
- Preciso

**Contras**:
- Requer infraestrutura de webhook
- Só funciona para eventos futuros
- Não resolve histórico

---

## 📋 Status Atual

### Implementado ✅
- Heurística básica de nome
- Heurística de código numérico
- Aviso claro na UI sobre limitações
- Documentação da limitação

### Não Implementado ⏳
- Mapeamento manual
- Machine learning
- Webhooks
- Tags/Custom fields

---

## 🎨 Como Aparece na UI

### Cards de Estatísticas
```
Total de Automações:  15
Com Emails Associados: 8    ← 53% conseguimos associar
```

### Tabela
```
Automação          | Emails | Enviados | Open Rate
00 - Boas Vindas   | 11     | 1,234    | 75.0%    ✅ Associado
00 - Clique        | 12     | 1,650    | 73.2%    ✅ Associado
Limpar leads       | 0      | —        | —        ⚠️ Não associado
```

### Card de Aviso
```
ℹ️ Sobre as Métricas de Emails

✅ Métricas Precisas (da API):
  • Entraram/Saíram
  • Retenção
  • Status

⚠️ Métricas Aproximadas (heurística):
  • Emails/Enviados/Aberturas
  • Identificados por nome similar
```

---

## 🔍 Como Investigar Problemas

### Se uma automação mostra 0 emails:

1. **Verificar no banco**:
   ```bash
   node -e "..." # Script para verificar campanhas
   ```

2. **Verificar nomenclatura**:
   - Nome da automação no dashboard
   - Nomes dos emails no ActiveCampaign
   - Há algum padrão comum?

3. **Testar heurística manualmente**:
   ```typescript
   nomeDoCampanha.includes(nomeDaAutomação)
   // OU
   nomeDoCampanha.startsWith(`Email ${código}`)
   ```

4. **Se necessário, ajustar heurística**:
   - Adicionar novo padrão de busca
   - Ou aceitar que não conseguimos associar

---

## 🎓 Lições Aprendidas

1. **API tem limitações sérias**
   - Nem sempre é possível obter os dados que queremos
   - Às vezes precisamos de heurísticas

2. **Comunicação é crucial**
   - Usuário precisa entender as limitações
   - Melhor ser honesto que prometer precisão falsa

3. **Convenção de nomenclatura importa**
   - Um bom padrão de nomes resolve 90% do problema
   - Vale a pena educar o usuário sobre isso

4. **Trade-offs**
   - Heurística simples vs complexa
   - Precisão vs facilidade de manutenção
   - Automático vs manual

---

## 📞 Suporte

Se encontrar um caso onde a heurística não funciona:

1. Verifique a nomenclatura
2. Veja se há padrão comum
3. Considere renomear emails no ActiveCampaign
4. Ou aceite que essa automação não terá métricas de emails

---

**Criado em**: 22/12/2025  
**Última atualização**: 22/12/2025

