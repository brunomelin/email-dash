# 🔧 Troubleshooting: Cron Job Não Está Rodando

**Problema**: O auto-sync não está executando automaticamente a cada 2 horas.

**Sintomas**: 
- Frontend mostra "há 19 horas" ou mais
- Badge está vermelho (Muito atrasado)
- Arquivo `~/logs/auto-sync.log` não tem entradas recentes

---

## 🔍 **DIAGNÓSTICO RÁPIDO**

### **Execute no servidor:**

```bash
ssh deploy@SEU_IP
cd ~/apps/email-dash
bash diagnostico-cron.sh
```

Esse script vai verificar automaticamente todos os problemas comuns.

---

## 🐛 **PROBLEMAS COMUNS E SOLUÇÕES**

### **PROBLEMA 1: Cron não está configurado**

**Como verificar:**
```bash
crontab -l
```

**Se retornar**: "no crontab for user"

**Solução:**
```bash
crontab -e
```

**Adicione esta linha:**
```
0 */2 * * * cd /home/deploy/apps/email-dash && npx tsx auto-sync.js >> /home/deploy/logs/auto-sync.log 2>&1
```

**Salvar:**
- Nano: `Ctrl+X`, depois `Y`, depois `ENTER`
- Vim: `ESC`, depois `:wq`, depois `ENTER`

---

### **PROBLEMA 2: Serviço cron não está rodando**

**Como verificar:**
```bash
systemctl status cron
# OU
systemctl status crond
```

**Solução:**
```bash
sudo systemctl start cron
sudo systemctl enable cron
```

---

### **PROBLEMA 3: Caminho errado no crontab**

**Sintoma**: Cron está configurado mas não executa

**Problema comum**: Usar `~` em vez de caminho absoluto

**❌ ERRADO:**
```
0 */2 * * * cd ~/apps/email-dash && npx tsx auto-sync.js
```

**✅ CORRETO:**
```
0 */2 * * * cd /home/deploy/apps/email-dash && npx tsx auto-sync.js >> /home/deploy/logs/auto-sync.log 2>&1
```

---

### **PROBLEMA 4: Node/NPX não está no PATH do cron**

**Sintoma**: Funciona manualmente mas não via cron

**Como verificar:**
```bash
which node
which npx
```

**Solução 1** - Adicionar PATH no crontab:
```bash
crontab -e
```

**Adicionar no topo:**
```
PATH=/usr/local/bin:/usr/bin:/bin
SHELL=/bin/bash

0 */2 * * * cd /home/deploy/apps/email-dash && npx tsx auto-sync.js >> /home/deploy/logs/auto-sync.log 2>&1
```

**Solução 2** - Usar caminho absoluto:
```bash
# Descobrir caminho do npx
which npx  # Ex: /usr/bin/npx
```

```
0 */2 * * * cd /home/deploy/apps/email-dash && /usr/bin/npx tsx auto-sync.js >> /home/deploy/logs/auto-sync.log 2>&1
```

---

### **PROBLEMA 5: Permissões do arquivo**

**Como verificar:**
```bash
ls -la ~/apps/email-dash/auto-sync.js
```

**Se não tiver permissão de execução:**
```bash
chmod +x ~/apps/email-dash/auto-sync.js
```

---

### **PROBLEMA 6: Diretório de logs não existe**

**Como verificar:**
```bash
ls -la ~/logs
```

**Se não existir:**
```bash
mkdir -p ~/logs
```

---

### **PROBLEMA 7: TSX não instalado**

**Como verificar:**
```bash
cd ~/apps/email-dash
npx tsx --version
```

**Se falhar:**
```bash
npm install -D tsx
```

---

## 🧪 **TESTES**

### **Teste 1: Executar manualmente**

```bash
cd ~/apps/email-dash
npx tsx auto-sync.js
```

**Se funcionar manualmente mas não via cron** = Problema de PATH ou ambiente

---

### **Teste 2: Simular ambiente do cron**

```bash
# Executar como o cron executaria
env -i SHELL=/bin/bash bash -c "cd /home/deploy/apps/email-dash && npx tsx auto-sync.js"
```

**Se falhar aqui** = PATH ou variáveis de ambiente

---

### **Teste 3: Verificar logs do cron**

```bash
# Logs do sistema
sudo grep CRON /var/log/syslog | tail -20

# Ou
sudo tail -50 /var/log/cron
```

Procure por mensagens de erro relacionadas ao seu cron job.

---

## ✅ **SOLUÇÃO DEFINITIVA**

### **Passo 1: Remover cron atual (se existir)**

```bash
crontab -l  # Ver o que tem
crontab -r  # Remover tudo (cuidado!)
# OU editar: crontab -e
```

### **Passo 2: Criar cron do zero**

```bash
crontab -e
```

**Cole exatamente isso (ajuste o usuário se necessário):**

```bash
# Auto-sync Email Dashboard
PATH=/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin
SHELL=/bin/bash

# Executar a cada 2 horas
0 */2 * * * cd /home/deploy/apps/email-dash && /usr/bin/npx tsx auto-sync.js >> /home/deploy/logs/auto-sync.log 2>&1
```

### **Passo 3: Salvar e verificar**

```bash
# Verificar se foi salvo
crontab -l

# Esperar alguns minutos e verificar log
tail -f ~/logs/auto-sync.log
```

---

## 🕐 **HORÁRIOS DE EXECUÇÃO**

Com `0 */2 * * *`, o cron roda:
- 00:00 (meia-noite)
- 02:00
- 04:00
- 06:00
- 08:00
- 10:00
- 12:00 (meio-dia)
- 14:00
- 16:00
- 18:00
- 20:00
- 22:00

**Para testar imediatamente** (não esperar 2 horas):

```bash
# Rodar agora manualmente
cd ~/apps/email-dash
npx tsx auto-sync.js
```

---

## 📊 **MONITORAMENTO**

### **Ver se cron está rodando:**

```bash
# Ver últimas execuções
grep CRON /var/log/syslog | grep $(whoami) | tail -10

# Ver logs do auto-sync
tail -100 ~/logs/auto-sync.log

# Ver última atualização no banco
psql -h localhost -U email_dash_user -d email_dash -c "
SELECT 
  started_at,
  finished_at,
  is_automatic,
  status,
  campaigns_synced + lists_synced + automations_synced as total
FROM sync_jobs
WHERE is_automatic = true
ORDER BY started_at DESC
LIMIT 5;
"
```

---

## 🚨 **SOLUÇÃO DE EMERGÊNCIA**

Se nada funcionar, use um wrapper script:

### **Criar wrapper:**

```bash
nano ~/apps/email-dash/cron-wrapper.sh
```

```bash
#!/bin/bash
export PATH=/usr/local/bin:/usr/bin:/bin
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd /home/deploy/apps/email-dash
npx tsx auto-sync.js >> /home/deploy/logs/auto-sync.log 2>&1
```

```bash
chmod +x ~/apps/email-dash/cron-wrapper.sh
```

### **Crontab com wrapper:**

```bash
crontab -e
```

```
0 */2 * * * /home/deploy/apps/email-dash/cron-wrapper.sh
```

---

## 📋 **CHECKLIST DE VERIFICAÇÃO**

- [ ] Serviço cron está rodando (`systemctl status cron`)
- [ ] Crontab está configurado (`crontab -l` mostra a linha)
- [ ] Diretório `~/apps/email-dash` existe
- [ ] Arquivo `auto-sync.js` existe
- [ ] Diretório `~/logs` existe
- [ ] Node e NPX estão instalados (`node --version`, `npx --version`)
- [ ] TSX está disponível (`npx tsx --version`)
- [ ] Script roda manualmente sem erros (`npx tsx auto-sync.js`)
- [ ] PATH inclui binários do node
- [ ] Permissões estão corretas

---

## 🎯 **COMANDO PARA COPIAR E COLAR**

**Execute tudo de uma vez:**

```bash
# No servidor
ssh deploy@SEU_IP

# Verificar e corrigir tudo
mkdir -p ~/logs
cd ~/apps/email-dash
chmod +x auto-sync.js
npm install -D tsx

# Configurar cron
(crontab -l 2>/dev/null | grep -v "auto-sync.js"; echo "0 */2 * * * cd /home/$(whoami)/apps/email-dash && npx tsx auto-sync.js >> /home/$(whoami)/logs/auto-sync.log 2>&1") | crontab -

# Verificar
echo "✅ Cron configurado:"
crontab -l | grep auto-sync

# Testar agora
echo "🧪 Testando execução manual..."
npx tsx auto-sync.js

echo "✅ Pronto! Próxima execução automática será na próxima hora par (00, 02, 04, etc.)"
```

---

**Após configurar, aguarde até a próxima hora par (ex: se são 15h, aguarde até 16h) e verifique se rodou:**

```bash
tail -50 ~/logs/auto-sync.log
```

---

**Documentação criada em**: 05/01/2026  
**Problema**: Cron job não está executando automaticamente  
**Solução**: Verificar configuração, PATH e permissões

