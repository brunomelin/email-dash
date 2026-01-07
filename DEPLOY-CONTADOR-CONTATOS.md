# 🚀 Deploy: Contador de Contatos com Limite Automático

**Feature**: Exibir contador de contatos (atual/limite) nos badges das contas, com busca automática via API do ActiveCampaign.

**Commit**: `dbd89ec` - feat: adicionar contador de contatos com limite automático via API

---

## 📋 O QUE FOI IMPLEMENTADO

### ✅ Mudanças no Banco de Dados
- **Novos campos** no modelo `Account`:
  - `contactCount` (Int): Total de contatos atual
  - `contactLimit` (Int): Limite do plano
  - `lastContactSync` (DateTime): Última sincronização

### ✅ Nova API Connector
- **`ContactsAPI`** (`src/lib/connectors/activecampaign/contacts.ts`):
  - `getTotalContacts()`: Busca total via API v3 `/contacts`
  - `getAccountLimit()`: Busca limite via API v1 `account_view`

### ✅ Integração no Sync
- **`SyncService`** atualizado para buscar automaticamente:
  - Total de contatos
  - Limite da conta
  - Salvar no banco durante cada sync

### ✅ UI Atualizada
- **Badges de contas** exibem: `2,202 / 2,500`
- **Cores baseadas no uso**:
  - Verde: < 80%
  - Amarelo: 80-90%
  - Vermelho: ≥ 90% (com ícone de alerta ⚠️)

---

## 🚀 PASSO A PASSO DO DEPLOY

### **IMPORTANTE**: 
Todos os comandos abaixo devem ser executados **NO SERVIDOR** (conectado via SSH), exceto quando indicado "No Mac".

---

## **PASSO 1: Conectar ao Servidor**

```bash
# No Mac (seu computador local)
ssh deploy@SEU_IP_SERVIDOR
```

> 💡 Substitua `SEU_IP_SERVIDOR` pelo IP real do seu droplet Digital Ocean

---

## **PASSO 2: Ir para o Diretório do Projeto**

```bash
# No servidor (após conectar via SSH)
cd ~/apps/email-dash
```

---

## **PASSO 3: Fazer Backup do Banco (Recomendado)**

```bash
# No servidor
pg_dump -h localhost -U email_dash_user email_dash > ~/backup-antes-contador-$(date +%Y%m%d-%H%M%S).sql
```

> 💡 Isso cria um backup com timestamp. Se algo der errado, você pode restaurar.

---

## **PASSO 4: Baixar Código Atualizado do GitHub**

```bash
# No servidor
git pull origin main
```

**Saída esperada**:
```
remote: Enumerating objects: 20, done.
remote: Counting objects: 100% (20/20), done.
...
From https://github.com/brunomelin/email-dash
   2bb0ea1..dbd89ec  main       -> origin/main
Updating 2bb0ea1..dbd89ec
Fast-forward
 15 files changed, 957 insertions(+), 13 deletions(-)
 create mode 100644 src/lib/connectors/activecampaign/contacts.ts
 ...
```

---

## **PASSO 5: Instalar Dependências (se houver novas)**

```bash
# No servidor
npm install
```

> 💡 Neste caso específico, não há novas dependências, mas é boa prática rodar sempre.

---

## **PASSO 6: Gerar Prisma Client**

```bash
# No servidor
npx prisma generate
```

**Saída esperada**:
```
✔ Generated Prisma Client (v5.22.0) to ./node_modules/@prisma/client
```

---

## **PASSO 7: Aplicar Migration no Banco de Dados**

```bash
# No servidor
npx prisma migrate deploy
```

**Saída esperada**:
```
1 migration found in prisma/migrations
Applying migration `20260105133518_add_contact_tracking`
The following migration(s) have been applied:

migrations/
  └─ 20260105133518_add_contact_tracking/
    └─ migration.sql

✔ All migrations have been successfully applied.
```

> ⚠️ **IMPORTANTE**: Esta migration adiciona 3 novos campos na tabela `accounts`. É segura e não perde dados.

---

## **PASSO 8: Verificar Schema do Banco (Opcional)**

```bash
# No servidor
psql -h localhost -U email_dash_user -d email_dash -c "\d accounts"
```

**Você deve ver os novos campos**:
```
 contact_count       | integer                  |
 contact_limit       | integer                  |
 last_contact_sync   | timestamp(3)             |
```

---

## **PASSO 9: Build do Next.js**

```bash
# No servidor
npm run build
```

**Tempo estimado**: 30-60 segundos

**Saída esperada**:
```
   ▲ Next.js 15.1.3
   - Environments: .env

 ✓ Creating an optimized production build
 ✓ Compiled successfully
 ✓ Linting and checking validity of types
 ✓ Collecting page data
 ✓ Generating static pages (5/5)
 ✓ Collecting build traces
 ✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    142 B          87.3 kB
├ ○ /_not-found                          871 B          85.1 kB
└ ○ /settings/accounts                   142 B          87.3 kB
...

○  (Static)  prerendered as static content
```

---

## **PASSO 10: Reiniciar Aplicação com PM2**

```bash
# No servidor
pm2 restart email-dashboard
```

**Saída esperada**:
```
[PM2] Applying action restartProcessId on app [email-dashboard](ids: [ 0 ])
[PM2] [email-dashboard](0) ✓
┌─────┬────────────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name               │ mode        │ ↺       │ status  │ cpu      │
├─────┼────────────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ email-dashboard    │ fork        │ 15      │ online  │ 0%       │
└─────┴────────────────────┴─────────────┴─────────┴─────────┴──────────┘
```

---

## **PASSO 11: Verificar Logs**

```bash
# No servidor
pm2 logs email-dashboard --lines 20
```

**Procure por**:
- ✅ `Ready in XXXms`
- ✅ Sem erros de conexão com banco
- ❌ Se aparecer erros, copie e envie para análise

---

## **PASSO 12: Testar no Browser**

1. Abra o dashboard: `https://email.suaempresa.com`
2. Vá para a página inicial (dashboard)
3. **Verifique os badges das contas**:
   - Devem mostrar apenas o nome da conta (sem contador ainda)
4. **Clique em "Sync"** em uma conta
5. **Aguarde o sync completar**
6. **Recarregue a página** (F5 ou Cmd+R)
7. **Verifique o badge**:
   - Deve exibir: `👥 2,202 / 2,500` (exemplo)
   - Cor verde/amarela/vermelha baseada no uso

---

## **PASSO 13: Sincronizar Todas as Contas (Opcional)**

Para popular os dados de todas as contas de uma vez:

```bash
# No servidor
cd ~/apps/email-dash

# Criar script temporário
cat > sync-all-contacts.js << 'EOF'
const { PrismaClient } = require('@prisma/client')
const { ContactsAPI } = require('./src/lib/connectors/activecampaign/contacts')
const { ActiveCampaignClient } = require('./src/lib/connectors/activecampaign/client')

const prisma = new PrismaClient()

async function syncAllContacts() {
  const accounts = await prisma.account.findMany({ where: { isActive: true } })
  
  for (const account of accounts) {
    console.log(`\n📊 Sincronizando ${account.name}...`)
    
    const client = new ActiveCampaignClient(account.baseUrl, account.apiKey)
    const contactsAPI = new ContactsAPI(client, account.apiKey)
    
    const contactCount = await contactsAPI.getTotalContacts()
    const contactLimit = await contactsAPI.getAccountLimit()
    
    await prisma.account.update({
      where: { id: account.id },
      data: {
        contactCount,
        contactLimit,
        lastContactSync: new Date(),
      },
    })
    
    console.log(`✅ ${account.name}: ${contactCount.toLocaleString()} / ${contactLimit?.toLocaleString() || 'N/A'}`)
  }
  
  await prisma.$disconnect()
  console.log('\n🎉 Sincronização completa!')
}

syncAllContacts().catch(console.error)
EOF

# Executar
node sync-all-contacts.js

# Remover script
rm sync-all-contacts.js
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Após o deploy, verifique:

- [ ] **Aplicação está online**: `pm2 status` mostra `online`
- [ ] **Sem erros nos logs**: `pm2 logs email-dashboard --lines 50`
- [ ] **Dashboard carrega**: Acessar `https://email.suaempresa.com`
- [ ] **Migration aplicada**: Campos existem no banco
- [ ] **Sync funciona**: Clicar em "Sync" não gera erro
- [ ] **Contador aparece**: Após sync, badge mostra `X / Y`
- [ ] **Cores corretas**: Verde/amarelo/vermelho baseado no uso
- [ ] **Alerta aparece**: Ícone ⚠️ quando uso ≥ 90%

---

## 🐛 TROUBLESHOOTING

### Problema: Migration falhou

**Erro**: `P3009: migrate found failed migration`

**Solução**:
```bash
# No servidor
cd ~/apps/email-dash
npx prisma migrate resolve --applied 20260105133518_add_contact_tracking
npx prisma migrate deploy
```

---

### Problema: Build falhou

**Erro**: `Type error: ...`

**Solução**:
```bash
# No servidor
cd ~/apps/email-dash
rm -rf .next node_modules
npm install
npx prisma generate
npm run build
```

---

### Problema: Contador não aparece após sync

**Checklist**:
1. **Verificar banco**:
   ```bash
   psql -h localhost -U email_dash_user -d email_dash -c "SELECT name, contact_count, contact_limit FROM accounts;"
   ```
   - Se `contact_count` é NULL, o sync não funcionou

2. **Verificar logs do sync**:
   ```bash
   pm2 logs email-dashboard | grep -i "contatos"
   ```
   - Procure por: `✅ Total de contatos: X`

3. **Testar API manualmente**:
   ```bash
   cd ~/apps/email-dash
   node -e "
   const { ContactsAPI } = require('./src/lib/connectors/activecampaign/contacts');
   const { ActiveCampaignClient } = require('./src/lib/connectors/activecampaign/client');
   const client = new ActiveCampaignClient('https://CONTA.api-us1.com', 'SUA_API_KEY');
   const api = new ContactsAPI(client, 'SUA_API_KEY');
   api.getTotalContacts().then(console.log);
   "
   ```

---

### Problema: Limite não aparece (só contatos)

**Causa**: API v1 pode não estar retornando o limite.

**Solução**:
1. Verificar se a API Key tem permissão para acessar API v1
2. Testar endpoint manualmente:
   ```bash
   curl "https://CONTA.api-us1.com/admin/api.php?api_action=account_view&api_output=json&api_key=SUA_KEY"
   ```
3. Se não funcionar, o limite pode ser configurado manualmente em `/settings/accounts`

---

## 📊 COMANDOS ÚTEIS

### Ver status da aplicação
```bash
pm2 status
pm2 logs email-dashboard --lines 50
```

### Ver dados no banco
```bash
psql -h localhost -U email_dash_user -d email_dash
```
```sql
-- Ver todas as contas com contadores
SELECT 
  name, 
  contact_count, 
  contact_limit,
  last_contact_sync
FROM accounts
ORDER BY name;

-- Ver uso percentual
SELECT 
  name,
  contact_count,
  contact_limit,
  ROUND((contact_count::float / NULLIF(contact_limit, 0)) * 100, 1) as uso_pct
FROM accounts
WHERE contact_limit IS NOT NULL
ORDER BY uso_pct DESC;
```

### Resetar contadores (se necessário)
```bash
psql -h localhost -U email_dash_user -d email_dash -c "UPDATE accounts SET contact_count = NULL, contact_limit = NULL, last_contact_sync = NULL;"
```

---

## 🎯 RESUMO RÁPIDO

**Para fazer o deploy**:

```bash
# 1. Conectar ao servidor (no Mac)
ssh deploy@SEU_IP

# 2. Atualizar código (no servidor)
cd ~/apps/email-dash
git pull origin main

# 3. Aplicar mudanças (no servidor)
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart email-dashboard

# 4. Verificar (no servidor)
pm2 logs email-dashboard --lines 20
```

**Tempo total**: ~3-5 minutos

---

## 📞 SUPORTE

Se algo der errado:

1. **Copie os logs**:
   ```bash
   pm2 logs email-dashboard --lines 100 > ~/deploy-error.log
   cat ~/deploy-error.log
   ```

2. **Verifique o status**:
   ```bash
   pm2 status
   pm2 describe email-dashboard
   ```

3. **Rollback (se necessário)**:
   ```bash
   cd ~/apps/email-dash
   git log --oneline -5  # Ver commits
   git checkout 2bb0ea1  # Voltar para commit anterior
   npm run build
   pm2 restart email-dashboard
   ```

---

**Deploy criado em**: 05/01/2026  
**Commit**: `dbd89ec`  
**Feature**: Contador de contatos com limite automático


