# 🔍 ANÁLISE PRELIMINAR: Por que automações mostram "—"?

## 📊 **DADOS DA PRIMEIRA INVESTIGAÇÃO:**

### **Screenshot do problema:**
- URL: `?from=2025-12-17&to=2025-12-24&accountIds=gactv1`
- **Todas as 5 automações mostram "—" nas colunas de emails**
- Mas mostram valores em "Entraram" (dados da API)

### **Automações visíveis:**
1. **[CO] Email 00** → 418 entraram
2. **[SHEIN-BV] 00 - Boas Vindas** → 820 entraram
3. **[SHEIN-CLICK] 00 - Clique** → 680 entraram
4. **[SHEIN-RES] - Resposta** → 680 entraram
5. **[SK] 00 - Eslovaquia** → 107 entraram

---

## 🔍 **EVIDÊNCIAS DO BANCO DE DADOS:**

### **Query 3 - Campanhas com esses prefixos (TODAS as contas):**
```
[CO] Email 00 - V7               | gactv1 | 2025-11-25 20:48:28 | 418
[SHEIN-BV] Email 00 - ...        | gactv1 | 2025-12-12 17:15:36 | 300
[SHEIN-BV] Email 00 - ...        | outras contas | várias datas
[SK] Email 00 - ...              | gactv13 | 2025-12-17 13:16:26 | 122
```

### **Query 5 - Últimas 30 campanhas (TODAS as contas):**
```
gactv1 | Email 00 - Boas Vindas - Entrada - V6      | 2025-12-17 14:06:41 | 139
gactv1 | Email 00 - Boas Vindas - Entrada - Japones | 2025-12-16 19:21:40 | 1
gactv1 | [CO] Email 00 - V7                         | 2025-11-25 20:48:28 | 418
```

---

## ⚠️ **HIPÓTESES INICIAIS:**

### **HIPÓTESE 1: Campanhas estão em OUTRAS CONTAS** 🔴 PROVÁVEL
**Evidência:**
- URL tem `accountIds=gactv1` (filtrando apenas 1 conta)
- Query 3 mostra campanhas [SHEIN-BV] em **gactv17, gactv15, gactv2, etc**
- Query 3 mostra campanhas [SK] em **gactv13**, não em gactv1

**Conclusão parcial:**
```
Automação [SK] 00 - Eslovaquia da conta gactv1
    ↓ (tenta buscar campanhas)
Campanha [SK] Email 00 está na conta gactv13 ← OUTRA CONTA!
    ↓
Nenhuma campanha encontrada para gactv1
    ↓
Mostra "—"
```

### **HIPÓTESE 2: Nomes não correspondem EXATAMENTE** 🟡 POSSÍVEL
**Evidência:**
- Automação: `[SHEIN-BV] 00 - Boas Vindas`
- Campanha: `[SHEIN-BV] Email 00 - Boas Vindas - Entrada - V6`
- Heurística atual: busca por prefixo `[SHEIN-BV]`
- **DEVE funcionar** (startsWith)

### **HIPÓTESE 3: Campanhas SEM prefixo** 🟢 POSSÍVEL (mas improvável)
**Evidência:**
- Query 5 mostra: `Email 00 - Boas Vindas - Entrada - V6` (SEM prefixo!)
- Mas também mostra: `[CO] Email 00 - V7` (COM prefixo)

### **HIPÓTESE 4: Período fora de alcance** 🟡 CONFIRMADO PARCIAL
**Evidência:**
- `[CO] Email 00 - V7` foi enviado em **25/11/2025**
- Período filtrado: **17-24/12/2025**
- **MÊS DIFERENTE!** → Correto não aparecer

---

## 🎯 **ANÁLISE ESPECÍFICA POR AUTOMAÇÃO:**

### **[CO] Email 00:**
- ✅ Campanha existe: `[CO] Email 00 - V7`
- ✅ Prefixo bate: `[CO]`
- ❌ **Data: 25/11/2025** (fora do período 17-24/12)
- **CONCLUSÃO:** Comportamento CORRETO (sem dados no período)

### **[SHEIN-BV] 00 - Boas Vindas:**
- ✅ Campanhas existem em várias contas
- ❓ **Tem na conta gactv1?**
  - Query 5 mostra: `[SHEIN-BV] Email 00 - ...` em gactv1 (12/12)
  - **Fora do período!** (17-24/12)
- ⚠️ **SUSPEITO:** Deveria ter dados se há campanha em 12/12

### **[SK] 00 - Eslovaquia:**
- ✅ Campanha existe
- ❌ **Mas na conta gactv13, não gactv1!**
- **CONCLUSÃO:** Comportamento CORRETO (campanha em outra conta)

---

## 🔧 **PRÓXIMOS PASSOS DE INVESTIGAÇÃO:**

### **Script criado: `debug-associacao-profunda.sh`**

**O que vai revelar:**
1. ✅ Todas as automações da conta `gactv1`
2. ✅ Todas as campanhas de automação da conta `gactv1`
3. ✅ Campanhas no período exato (17-24/12) da `gactv1`
4. ✅ Teste de associação para cada prefixo
5. ✅ Padrão de nomes: automações vs campanhas
6. ✅ Campanhas que não batem com automações
7. ✅ Análise por que [CO] não aparece
8. ✅ Simulação exata do que o código TypeScript faz
9. ✅ Resumo: quantas campanhas por automação

---

## 💡 **PERGUNTAS CRÍTICAS A RESPONDER:**

### **1. Quantas campanhas a conta `gactv1` tem de fato?**
- No período 17-24/12
- Por prefixo ([CO], [SHEIN-BV], [SK], etc)

### **2. Por que campanhas sem prefixo?**
```
Email 00 - Boas Vindas - Entrada - V6  ← SEM [prefixo]
```
- Essas campanhas não vão ser associadas!
- A heurística atual exige prefixo entre colchetes

### **3. O código está buscando na conta correta?**
```typescript
const campaigns = await prisma.campaign.findMany({
  where: {
    accountId: automation.accountId,  // ← Garante mesma conta
    isAutomation: true,
    OR: patterns,
  }
})
```
✅ Código ESTÁ correto (busca na mesma conta)

---

## 🎯 **CONCLUSÕES PRELIMINARES:**

### ✅ **CÓDIGO ESTÁ CORRETO:**
1. Filtra por mesma conta (`accountId`)
2. Filtra por período de data
3. Usa heurística de prefixo

### ⚠️ **POSSÍVEIS PROBLEMAS REAIS:**

#### **A) Campanhas em OUTRAS contas:**
- Automação está em `gactv1`
- Campanhas estão em `gactv13`, `gactv17`, etc
- **Solução:** Não tem! São contas diferentes mesmo

#### **B) Campanhas FORA do período:**
- `[CO] Email 00 - V7` → 25/11 (novembro!)
- Período: 17-24/12 (dezembro)
- **Solução:** Não tem! Use período maior ou remova filtro

#### **C) Campanhas SEM prefixo:**
- `Email 00 - Boas Vindas - Entrada - V6` ← SEM [...]
- Heurística não vai pegar
- **Solução:** Renomear campanhas com prefixo

#### **D) Prefixos diferentes:**
- Automação: `[SHEIN-BV] 00 - Boas Vindas`
- Campanha: `[SHEIN-CLICK]` ou `[SHEIN-RES]`
- **São automações DIFERENTES!** Correto não associar

---

## 📋 **EXECUTE O SCRIPT PARA CONFIRMAR:**

```bash
# No servidor
cd /root/apps/email-dash
git pull origin main
chmod +x debug-associacao-profunda.sh
./debug-associacao-profunda.sh

# Ver resultados
cat /tmp/debug-associacao-*.txt
```

**Com os resultados desse script, vou poder:**
1. ✅ Confirmar ou descartar cada hipótese
2. ✅ Identificar a causa raiz exata
3. ✅ Propor solução definitiva (se houver bug) ou documentar limitação (se for comportamento correto)

---

## ⚠️ **SUSPEITA PRINCIPAL:**

**Acredito que o comportamento é CORRETO e o problema é:**
1. **Campanhas estão em outras contas** (não em gactv1)
2. **Campanhas estão fora do período** (novembro vs dezembro)
3. **Campanhas sem prefixo** (não seguem padrão de nomenclatura)

**MAS precisamos confirmar com dados específicos da conta gactv1! 🔍**

