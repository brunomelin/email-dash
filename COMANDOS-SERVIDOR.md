# 🚀 COMANDOS PARA EXECUTAR NO SERVIDOR

**Execute estes comandos NO SERVIDOR (conectado via SSH)**

---

## 📋 **PASSO A PASSO COMPLETO**

### **1️⃣ Conectar ao Servidor**

```bash
# No seu Mac/PC local
ssh deploy@SEU_IP_SERVIDOR
```

Substitua `SEU_IP_SERVIDOR` pelo IP real do seu droplet Digital Ocean.

---

### **2️⃣ Ir para o Diretório do Projeto**

```bash
# No servidor (após SSH)
cd ~/apps/email-dash
```

---

### **3️⃣ Executar Script de Deploy Automático**

**OPÇÃO A: Usar o script automático** (Recomendado)

```bash
# No servidor
chmod +x DEPLOY-AGORA.sh
./DEPLOY-AGORA.sh
```

Esse script faz tudo automaticamente:
- ✅ Backup do banco
- ✅ Git pull
- ✅ npm install
- ✅ Prisma generate
- ✅ Prisma migrate deploy
- ✅ npm run build
- ✅ PM2 restart
- ✅ Cria diretório ~/logs

---

**OPÇÃO B: Executar comandos manualmente**

Se preferir fazer manualmente, execute linha por linha:

```bash
# No servidor

# 1. Fazer backup (opcional mas recomendado)
pg_dump -h localhost -U email_dash_user email_dash > ~/backup-$(date +%Y%m%d-%H%M%S).sql

# 2. Baixar código atualizado
cd ~/apps/email-dash
git pull origin main

# 3. Instalar dependências
npm install

# 4. Gerar Prisma Client
npx prisma generate

# 5. Aplicar migrations
npx prisma migrate deploy

# 6. Build do Next.js
npm run build

# 7. Reiniciar aplicação
pm2 restart email-dashboard

# 8. Verificar se está rodando
pm2 status

# 9. Ver logs
pm2 logs email-dashboard --lines 20

# 10. Criar diretório de logs para auto-sync
mkdir -p ~/logs
```

---

### **4️⃣ Configurar Cron Job (Auto-Sync)**

```bash
# No servidor
crontab -e
```

**Se perguntar qual editor usar**, escolha:
- `1` para nano (mais fácil)
- `2` para vim

**Adicione esta linha no final do arquivo:**

```
0 */2 * * * cd /home/deploy/apps/email-dash && npx tsx auto-sync.js >> /home/deploy/logs/auto-sync.log 2>&1
```

**Salvar e sair:**
- **Nano**: Pressione `Ctrl+X`, depois `Y`, depois `ENTER`
- **Vim**: Pressione `ESC`, digite `:wq`, pressione `ENTER`

---

### **5️⃣ Verificar Cron Configurado**

```bash
# No servidor
crontab -l
```

Deve mostrar a linha que você adicionou.

---

### **6️⃣ Testar Auto-Sync Manualmente (Opcional)**

Não quer esperar 2 horas? Teste agora:

```bash
# No servidor
cd ~/apps/email-dash
npx tsx auto-sync.js
```

**Isso vai:**
- Sincronizar todas as 20 contas
- Levar ~4-8 minutos
- Gerar logs detalhados

**Ver progresso em tempo real:**

```bash
# Em outro terminal SSH
tail -f ~/logs/auto-sync.log
```

---

### **7️⃣ Verificar se Está Tudo OK**

```bash
# No servidor

# 1. Verificar se aplicação está rodando
pm2 status

# 2. Ver logs recentes
pm2 logs email-dashboard --lines 30

# 3. Ver últimos syncs no banco
psql -h localhost -U email_dash_user -d email_dash -c "
SELECT 
  started_at, 
  finished_at, 
  is_automatic,
  status,
  campaigns_synced + lists_synced + automations_synced as total
FROM sync_jobs 
ORDER BY started_at DESC 
LIMIT 5;
"

# 4. Ver se cron está configurado
crontab -l
```

---

### **8️⃣ Testar no Browser**

1. Abra: `https://email.suaempresa.com`
2. Verifique:
   - ✅ Dashboard carrega normalmente
   - ✅ Badges das contas mostram contador: `👥 2,219 / 2,500`
   - ✅ Header mostra: "Aguardando primeira sincronização automática"
     - (Após primeira execução do cron, mostrará "há X minutos")

---

## 🐛 **TROUBLESHOOTING**

### **Problema: Git pull dá erro de permissão**

```bash
# Verificar se há mudanças locais
git status

# Se houver, fazer stash
git stash

# Tentar pull novamente
git pull origin main
```

---

### **Problema: Build falha**

```bash
# Limpar cache e tentar novamente
rm -rf .next node_modules
npm install
npx prisma generate
npm run build
```

---

### **Problema: PM2 não reinicia**

```bash
# Ver o que está acontecendo
pm2 describe email-dashboard

# Se necessário, parar e iniciar novamente
pm2 stop email-dashboard
pm2 start email-dashboard

# Ou usar o ecosystem.config.js
pm2 delete email-dashboard
pm2 start ecosystem.config.js
```

---

### **Problema: Cron não está rodando**

```bash
# Verificar se cron service está ativo
sudo systemctl status cron

# Se não estiver, iniciar
sudo systemctl start cron

# Verificar logs do cron
grep CRON /var/log/syslog | tail -20
```

---

### **Problema: Auto-sync falha**

```bash
# Ver logs de erro
cat ~/logs/auto-sync.log

# Testar manualmente
cd ~/apps/email-dash
npx tsx auto-sync.js

# Se der erro de módulo não encontrado
npm install -D tsx
```

---

## ✅ **CHECKLIST FINAL**

Após executar todos os comandos, verifique:

- [ ] `pm2 status` mostra "online"
- [ ] `pm2 logs` não tem erros críticos
- [ ] Dashboard abre no browser
- [ ] Badges mostram contador de contatos
- [ ] `crontab -l` mostra a linha do auto-sync
- [ ] Teste manual do auto-sync funciona
- [ ] Após 2 horas (ou teste manual), frontend mostra "há X minutos"

---

## 📊 **MONITORAMENTO CONTÍNUO**

### **Ver logs do auto-sync em tempo real:**
```bash
tail -f ~/logs/auto-sync.log
```

### **Ver status da aplicação:**
```bash
pm2 monit
```

### **Ver últimos syncs automáticos:**
```bash
psql -h localhost -U email_dash_user -d email_dash
```

```sql
SELECT 
  started_at,
  finished_at,
  is_automatic,
  status,
  campaigns_synced,
  lists_synced,
  automations_synced
FROM sync_jobs
WHERE is_automatic = true
ORDER BY started_at DESC
LIMIT 10;
```

---

## 🎉 **PRONTO!**

Após seguir todos os passos:

✅ Código deployado  
✅ Migrations aplicadas  
✅ Contador de contatos funcionando  
✅ Auto-sync configurado  
✅ Frontend atualizado  

**Próxima execução automática:** A cada 2 horas (00:00, 02:00, 04:00, etc.)

---

**Documentação completa:**
- `DEPLOY-CONTADOR-CONTATOS.md`
- `DEPLOY-AUTO-SYNC.md`

