# 🔧 Solução: Erro 403 Forbidden no Auto-Sync

**Problema**: Conta específica falha com erro `403 Forbidden` durante sincronização automática.

**Exemplo**: Conta `gactv22` falhou com:
```
❌ Erro na sincronização da conta gactv22: Error: ActiveCampaign API error: 403 Forbidden
```

---

## 📋 **CAUSAS POSSÍVEIS**

### **1. API Key Inválida** (90% dos casos)
- API key foi revogada no ActiveCampaign
- API key expirou
- API key foi substituída por uma nova

### **2. Conta Suspensa**
- Conta com pagamento em atraso
- Conta desativada temporariamente

### **3. Permissões Insuficientes**
- API key criada sem permissões adequadas
- Escopo limitado (ex: apenas leitura de contatos)

### **4. Rate Limit Severo**
- Conta excedeu limites e está bloqueada temporariamente

---

## 🔍 **DIAGNÓSTICO**

### **Opção A: Script Automático** ⭐ **RECOMENDADO**

```bash
# No servidor
cd ~/apps/email-dash

# Testar conta específica
npx tsx diagnostico-api-key.js gactv22

# Ou testar todas as contas
npx tsx diagnostico-api-key.js --all
```

**O script testa:**
- ✅ GET /users/me (verificar se API key está válida)
- ✅ GET /lists (endpoint que falhou)
- ✅ GET /contacts (verificar permissões)
- ✅ account_view (API v1 - limite da conta)

---

### **Opção B: Verificação Manual no Banco**

```bash
# Conectar ao banco
psql -h localhost -U email_dash_user -d email_dash
```

```sql
-- Ver informações da conta
SELECT 
  name,
  base_url,
  api_key,
  is_active,
  last_contact_sync,
  updated_at
FROM accounts 
WHERE name = 'gactv22';

-- Ver últimos erros de sync
SELECT 
  started_at,
  finished_at,
  status,
  error
FROM sync_jobs 
WHERE account_id = (SELECT id FROM accounts WHERE name = 'gactv22')
ORDER BY started_at DESC 
LIMIT 5;
```

---

### **Opção C: Teste Manual da API**

```bash
# Substituir valores reais
BASE_URL="https://gactv22.api-us1.com"
API_KEY="SUA_API_KEY"

# Testar endpoint que falhou
curl -X GET "$BASE_URL/api/3/lists?limit=1" \
  -H "Api-Token: $API_KEY" \
  -H "Content-Type: application/json"
```

**Se retornar 403**: API key inválida  
**Se retornar 200**: API key válida (problema pode ser temporário)

---

## ✅ **SOLUÇÕES**

### **SOLUÇÃO 1: Gerar Nova API Key**

1. **Acessar painel do ActiveCampaign** da conta problemática
2. **Settings → Developer → API Access**
3. **Generate new API key**
4. **Copiar a nova key**

**Atualizar no banco:**

```sql
-- Conectar ao banco
psql -h localhost -U email_dash_user -d email_dash

-- Atualizar API key
UPDATE accounts 
SET api_key = 'NOVA_API_KEY_AQUI'
WHERE name = 'gactv22';
```

**Verificar:**
```bash
# Testar com o script
cd ~/apps/email-dash
npx tsx diagnostico-api-key.js gactv22
```

---

### **SOLUÇÃO 2: Desativar Conta Temporariamente**

Se não puder resolver agora, desative para não quebrar auto-sync:

```sql
-- Desativar conta problemática
UPDATE accounts 
SET is_active = false
WHERE name = 'gactv22';
```

**Benefícios:**
- ✅ Auto-sync continua funcionando nas outras contas
- ✅ Frontend não mostra a conta desativada
- ✅ Pode reativar depois quando resolver

**Reativar depois:**
```sql
UPDATE accounts 
SET is_active = true
WHERE name = 'gactv22';
```

---

### **SOLUÇÃO 3: Deletar Conta (Último Recurso)**

Se a conta não existe mais:

```sql
-- ⚠️ CUIDADO: Isso deleta TODOS os dados da conta
-- Campanhas, listas, automações, etc.
DELETE FROM accounts WHERE name = 'gactv22';
```

---

## 🛡️ **PREVENÇÃO**

### **1. Monitoramento Proativo**

Adicione checagem de saúde das API keys:

```bash
# Adicionar ao crontab (1x por dia às 8h)
0 8 * * * cd /home/deploy/apps/email-dash && npx tsx diagnostico-api-key.js --all >> /home/deploy/logs/api-health.log 2>&1
```

### **2. Alertas por Email** (Futuro)

Implementar notificação quando uma conta falha 3x seguidas.

### **3. Documentar API Keys**

Manter registro de quando cada API key foi criada/atualizada.

---

## 📊 **COMPORTAMENTO DO AUTO-SYNC**

### **✅ O que acontece quando uma conta falha:**

1. ✅ **Conta falha** (ex: gactv22)
2. ✅ **Erro é logado** no sync_jobs com `status='failed'`
3. ✅ **Auto-sync continua** para as outras contas
4. ✅ **Todas as outras contas são sincronizadas normalmente**
5. ✅ **Frontend mostra**: "última atualização há X minutos" (baseado nas contas que deram certo)

**Ou seja**: Uma conta quebrada **NÃO** impede as outras de serem sincronizadas.

---

## 🔍 **INVESTIGAR PADRÕES**

Se várias contas estão falhando com 403:

### **Verificar se é problema geral:**

```bash
# Ver quantas contas estão falhando
psql -h localhost -U email_dash_user -d email_dash
```

```sql
-- Contar falhas recentes (últimas 24h)
SELECT 
  a.name,
  COUNT(*) as falhas
FROM sync_jobs sj
JOIN accounts a ON a.id = sj.account_id
WHERE 
  sj.status = 'failed' 
  AND sj.started_at > NOW() - INTERVAL '24 hours'
  AND sj.error LIKE '%403%'
GROUP BY a.name
ORDER BY falhas DESC;
```

**Se muitas contas falhando:**
- 🔴 Pode ser problema no IP do servidor (bloqueado)
- 🔴 Pode ser problema nas credenciais centralizadas
- 🔴 Pode ser mudança na API do ActiveCampaign

---

## 📝 **CHECKLIST DE RESOLUÇÃO**

- [ ] Identificar conta problemática (ex: gactv22)
- [ ] Rodar script de diagnóstico
- [ ] Verificar se erro é 403 ou outro
- [ ] Tentar gerar nova API key
- [ ] Atualizar no banco de dados
- [ ] Testar novamente com script
- [ ] Se não resolver: desativar conta temporariamente
- [ ] Verificar logs do próximo auto-sync
- [ ] Confirmar que outras contas continuam funcionando

---

## 📞 **COMANDOS ÚTEIS**

```bash
# Diagnosticar conta específica
cd ~/apps/email-dash
npx tsx diagnostico-api-key.js gactv22

# Ver logs do último auto-sync
tail -100 ~/logs/auto-sync.log

# Ver contas ativas
psql -h localhost -U email_dash_user -d email_dash -c "SELECT name, is_active FROM accounts ORDER BY name;"

# Ver últimos erros
psql -h localhost -U email_dash_user -d email_dash -c "SELECT a.name, sj.started_at, sj.error FROM sync_jobs sj JOIN accounts a ON a.id = sj.account_id WHERE sj.status = 'failed' ORDER BY sj.started_at DESC LIMIT 10;"

# Forçar novo sync (após corrigir)
cd ~/apps/email-dash
npx tsx auto-sync.js
```

---

## 🎯 **RESUMO**

**Para resolver erro 403:**

1. ✅ Rodar: `npx tsx diagnostico-api-key.js gactv22`
2. ✅ Se API key inválida: gerar nova e atualizar
3. ✅ Se não puder resolver agora: desativar conta
4. ✅ Auto-sync continua normal nas outras contas

**Tempo para resolver**: 5-10 minutos

---

**Documentação criada em**: 05/01/2026  
**Problema**: Erro 403 Forbidden em conta específica  
**Status**: Auto-sync funciona normalmente, apenas 1 conta afetada


