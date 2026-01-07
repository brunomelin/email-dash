# 🔄 Deploy: Auto-Sync (Cron Job) + Display no Frontend

**Feature**: Sincronização automática a cada 2 horas + exibição do último horário de sync no frontend

**Data**: 05/01/2026

---

## 📦 O QUE FOI IMPLEMENTADO

### ✅ **1. Database Changes**
- **Novo campo** em `SyncJob`:
  - `isAutomatic` (Boolean): Diferencia syncs manuais (false) vs automáticos (true)
  - Índice adicionado para performance em queries
  
### ✅ **2. Backend - Auto-Sync Script**
- **Arquivo**: `auto-sync.js`
- **Funcionalidade**:
  - Sincroniza todas as contas ativas sequencialmente
  - Marca jobs como automáticos (`isAutomatic: true`)
  - Logs detalhados de execução
  - Tolerante a falhas (continua mesmo se uma conta falhar)
  - Resumo estatístico ao final

### ✅ **3. Backend - Service Layer**
- **Modificado**: `SyncService`
  - `syncAccount()` aceita parâmetro `isAutomatic`
  - `syncMultipleAccounts()` propaga o parâmetro

### ✅ **4. Backend - Server Action**
- **Novo**: `getLastAutoSyncAction()`
  - Busca último sync automático concluído
  - Retorna timestamp, número de contas e totais
  - Query otimizada com índices

### ✅ **5. Frontend - UI Component**
- **Novo**: `<LastAutoSync />`
  - Exibe "há X minutos/horas"
  - Atualiza automaticamente a cada 1 minuto
  - Cores baseadas no status:
    - 🟢 Verde: Atualizado (< 3h)
    - 🟡 Amarelo: Atrasado (3-6h)
    - 🔴 Vermelho: Muito atrasado (> 6h)
  - Mostra próxima execução estimada
  - Badge com status visual

### ✅ **6. Frontend - Integração**
- Componente adicionado ao header do dashboard
- Visível em todas as páginas principais

---

## 🚀 **DEPLOY NO SERVIDOR**

### **PASSO 1: Push para GitHub** ✅ (Já feito localmente)

```bash
# Já commitado e pronto para push
git log -1
```

### **PASSO 2: Conectar ao Servidor**

```bash
# No Mac
ssh deploy@SEU_IP_SERVIDOR
```

### **PASSO 3: Atualizar Código**

```bash
# No servidor
cd ~/apps/email-dash
git pull origin main
```

### **PASSO 4: Instalar Dependências e Aplicar Migration**

```bash
# No servidor
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
```

**Migration aplicada**: `20260105204903_add_is_automatic_to_sync_jobs`

### **PASSO 5: Reiniciar Aplicação**

```bash
# No servidor
pm2 restart email-dashboard
pm2 logs email-dashboard --lines 20
```

### **PASSO 6: Testar Script Manualmente (Importante!)**

Antes de configurar o cron, teste o script:

```bash
# No servidor
cd ~/apps/email-dash

# Testar auto-sync
npx tsx auto-sync.js

# Ou criar wrapper script
chmod +x auto-sync.js
```

**Saída esperada**:
```
================================================================================
🔄 [AUTO-SYNC] Iniciado em 2026-01-05T20:51:47.243Z
================================================================================
📊 Buscando contas ativas...
✅ Encontradas 20 contas ativas
...
✅ Sucesso em X.Xs
================================================================================
```

### **PASSO 7: Criar Diretório de Logs**

```bash
# No servidor
mkdir -p ~/logs
```

### **PASSO 8: Configurar Cron Job**

```bash
# No servidor
crontab -e
```

**Adicionar esta linha** (executar a cada 2 horas):

```cron
0 */2 * * * cd /home/deploy/apps/email-dash && npx tsx auto-sync.js >> /home/deploy/logs/auto-sync.log 2>&1
```

**Explicação do Cron**:
- `0 */2 * * *`: A cada 2 horas (00:00, 02:00, 04:00, etc.)
- `cd /home/deploy/apps/email-dash`: Vai para o diretório do projeto
- `npx tsx auto-sync.js`: Executa o script com tsx
- `>> /home/deploy/logs/auto-sync.log`: Adiciona logs ao arquivo
- `2>&1`: Redireciona erros também para o log

**Salvar e sair**:
- Vim: Pressione `ESC`, depois `:wq` e `ENTER`
- Nano: `Ctrl+X`, depois `Y` e `ENTER`

### **PASSO 9: Verificar Cron Configurado**

```bash
# No servidor
crontab -l
```

Deve mostrar a linha adicionada.

### **PASSO 10: Testar Imediatamente (Opcional)**

Para não esperar 2 horas, force uma execução:

```bash
# No servidor
cd ~/apps/email-dash
npx tsx auto-sync.js >> ~/logs/auto-sync.log 2>&1 &

# Ver log em tempo real
tail -f ~/logs/auto-sync.log
```

### **PASSO 11: Verificar Frontend**

1. Abra: `https://email.suaempresa.com`
2. No header, deve aparecer:
   - 🟢 "Última atualização automática: há X minutos"
   - OU
   - "Aguardando primeira sincronização automática"

---

## 🐛 **TROUBLESHOOTING**

### **Problema: Cron não está rodando**

**Verificar**:
```bash
# Ver logs do sistema
grep CRON /var/log/syslog | tail -20

# Verificar se cron está ativo
sudo systemctl status cron
```

**Solução**:
```bash
# Reiniciar cron
sudo systemctl restart cron
```

---

### **Problema: Script falha com "Cannot find module"**

**Verificar**:
```bash
# Garantir que tsx está instalado
npm list tsx
```

**Solução**:
```bash
cd ~/apps/email-dash
npm install -D tsx
```

---

### **Problema: Frontend não mostra último sync**

**Verificar banco de dados**:
```bash
psql -h localhost -U email_dash_user -d email_dash
```

```sql
-- Ver últimos syncs automáticos
SELECT 
  id,
  started_at,
  finished_at,
  status,
  is_automatic,
  campaigns_synced + lists_synced + automations_synced as total
FROM sync_jobs
WHERE is_automatic = true
ORDER BY started_at DESC
LIMIT 10;
```

Se não houver registros com `is_automatic = true`, o cron ainda não rodou.

---

### **Problema: Logs não estão sendo gravados**

**Verificar permissões**:
```bash
# Criar diretório se não existir
mkdir -p ~/logs

# Dar permissão
chmod 755 ~/logs

# Testar escrita
echo "test" >> ~/logs/auto-sync.log
```

---

## 📊 **MONITORAMENTO**

### **Ver Logs do Auto-Sync**

```bash
# Últimas 50 linhas
tail -50 ~/logs/auto-sync.log

# Seguir em tempo real
tail -f ~/logs/auto-sync.log

# Buscar erros
grep -i "erro\|error\|failed" ~/logs/auto-sync.log
```

### **Ver Últimos Syncs no Banco**

```sql
-- Conectar
psql -h localhost -U email_dash_user -d email_dash

-- Últimos 10 syncs automáticos
SELECT 
  started_at,
  finished_at,
  EXTRACT(EPOCH FROM (finished_at - started_at)) as duration_seconds,
  status,
  campaigns_synced,
  lists_synced,
  automations_synced,
  messages_synced
FROM sync_jobs
WHERE is_automatic = true
ORDER BY started_at DESC
LIMIT 10;

-- Contar syncs automáticos por dia
SELECT 
  DATE(started_at) as dia,
  COUNT(*) as total_syncs,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as sucessos,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as falhas
FROM sync_jobs
WHERE is_automatic = true
GROUP BY DATE(started_at)
ORDER BY dia DESC
LIMIT 7;
```

### **Verificar Próxima Execução do Cron**

Não há comando direto, mas calcule:
- Se último sync foi às 14:00
- Próximo será às 16:00

Ou veja no frontend: "Próxima em ~X horas"

---

## ⚙️ **CUSTOMIZAÇÃO**

### **Mudar Frequência do Cron**

**A cada 1 hora**:
```cron
0 * * * * cd /home/deploy/apps/email-dash && npx tsx auto-sync.js >> /home/deploy/logs/auto-sync.log 2>&1
```

**A cada 4 horas**:
```cron
0 */4 * * * cd /home/deploy/apps/email-dash && npx tsx auto-sync.js >> /home/deploy/logs/auto-sync.log 2>&1
```

**A cada 6 horas** (4x por dia):
```cron
0 */6 * * * cd /home/deploy/apps/email-dash && npx tsx auto-sync.js >> /home/deploy/logs/auto-sync.log 2>&1
```

**1x por dia às 6h**:
```cron
0 6 * * * cd /home/deploy/apps/email-dash && npx tsx auto-sync.js >> /home/deploy/logs/auto-sync.log 2>&1
```

Após alterar, salve e o cron pegará a mudança automaticamente.

---

## 📈 **ESTIMATIVAS**

### **Tempo de Execução**
- **Por conta**: ~5-25 segundos (depende do tamanho)
- **20 contas**: ~2-8 minutos total
- **Média**: ~4 minutos

### **Uso de API**
- **Por sync completo**: ~22 chamadas/conta
- **20 contas**: 440 chamadas
- **A cada 2 horas**: 5.280 chamadas/dia
- **1 mês**: ~158.400 chamadas

**Limite ActiveCampaign**: 5.000-10.000 chamadas/hora
- ✅ Bem abaixo do limite (440 chamadas a cada 2 horas = 220/hora)

---

## 🔒 **SEGURANÇA**

### **O que o script faz**:
- ✅ Usa Prisma (sanitização automática)
- ✅ Não expõe API keys nos logs
- ✅ Rodando como usuário `deploy` (não root)
- ✅ Logs em diretório do usuário (~/)

### **O que verificar**:
- ❌ Não deixar `.env` vazar no log
- ❌ Não commitar API keys
- ✅ Manter `auto-sync.log` privado

---

## ✅ **CHECKLIST PÓS-DEPLOY**

- [ ] Código deployado no servidor
- [ ] Migration aplicada
- [ ] PM2 reiniciado
- [ ] Frontend abre sem erros
- [ ] Script `auto-sync.js` testado manualmente
- [ ] Cron job configurado (`crontab -l` mostra)
- [ ] Diretório `~/logs` criado
- [ ] Aguardado 2 horas OU forçado execução manual
- [ ] Frontend exibe "há X minutos"
- [ ] Log `~/logs/auto-sync.log` tem conteúdo
- [ ] Banco tem registros com `is_automatic = true`

---

## 📝 **ARQUIVOS CRIADOS/MODIFICADOS**

### **Novos Arquivos**:
1. `auto-sync.js` (script principal)
2. `src/app/actions/auto-sync.ts` (Server Action)
3. `src/components/dashboard/last-auto-sync.tsx` (UI)
4. `prisma/migrations/20260105204903_add_is_automatic_to_sync_jobs/` (migration)
5. `DEPLOY-AUTO-SYNC.md` (esta documentação)

### **Modificados**:
1. `prisma/schema.prisma` (campo `isAutomatic`)
2. `src/lib/services/sync-service.ts` (parâmetro `isAutomatic`)
3. `src/app/page.tsx` (integração do componente)

---

## 🎉 **RESULTADO ESPERADO**

### **No Frontend**:
- Header exibe: "🔄 Última atualização automática: há 30 minutos"
- Badge verde/amarelo/vermelho baseado no tempo
- Mostra quantas contas foram sincronizadas
- Mostra quando será o próximo sync

### **No Servidor**:
- Cron roda silenciosamente a cada 2 horas
- Logs salvos em `~/logs/auto-sync.log`
- Dados do dashboard sempre atualizados
- Sync manual ainda funciona normalmente

---

**Deploy concluído em**: 05/01/2026  
**Próxima execução**: A cada 2 horas (após configurar cron)  
**Frequência**: Customizável via crontab


