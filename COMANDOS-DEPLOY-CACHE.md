# 🚀 Comandos para Deploy do Sistema de Cache

**Data:** 13 de Janeiro de 2026

---

## ✅ **O QUE FOI IMPLEMENTADO**

1. ✅ Sistema de cache com `unstable_cache` (5 min TTL)
2. ✅ API route `/api/cron/warm-cache` para pre-aquecer cache
3. ✅ Integração com `automation-metrics-service`
4. ✅ Cron job configurado (a cada 4 minutos)
5. ✅ Warm automático após sync
6. ✅ Invalidação de cache

---

## 📋 **COMANDOS PARA O SERVIDOR**

### **1. Gerar CRON_SECRET**

```bash
# Gerar um secret aleatório seguro
openssl rand -base64 32
```

**Copie o resultado e guarde!** Exemplo: `abc123XYZ...`

---

### **2. Adicionar Variável de Ambiente no Servidor**

```bash
# Editar .env no servidor
cd /var/www/email-dash  # ou seu diretório
nano .env

# Adicionar no final do arquivo:
CRON_SECRET="cole-o-secret-gerado-aqui"
NEXT_PUBLIC_URL="https://seu-dominio.com"  # ou http://localhost:3000

# Salvar: Ctrl+O, Enter, Ctrl+X
```

---

### **3. Pull do Código Atualizado**

```bash
cd /var/www/email-dash
git pull origin main
```

---

### **4. Instalar Dependências e Build**

```bash
# Instalar (caso tenha novas dependências)
npm ci

# Gerar Prisma Client
npx prisma generate

# Build
npm run build
```

---

### **5. Reiniciar Aplicação**

```bash
# Com PM2
pm2 restart email-dash

# Verificar se está funcionando
pm2 status
pm2 logs email-dash --lines 50
```

---

### **6. Configurar Cron Job no Servidor (Linux)**

**IMPORTANTE:** Se você estiver em servidor Linux (não Vercel), adicione manualmente:

```bash
# Editar crontab
crontab -e

# Adicionar esta linha no final:
*/4 * * * * curl -H "Authorization: Bearer SEU_CRON_SECRET" http://localhost:3000/api/cron/warm-cache >> /var/log/cache-warming.log 2>&1

# Substituir:
# - SEU_CRON_SECRET pelo secret gerado
# - localhost:3000 pela URL correta

# Salvar e sair
```

**Verificar se cron foi adicionado:**
```bash
crontab -l | grep warm-cache
```

---

### **7. Testar Cache Warming Manualmente**

```bash
# Teste 1: Warm cache manualmente
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  http://localhost:3000/api/cron/warm-cache

# Deve retornar algo como:
# {"success":true,"duration":45123,"accounts":20}

# Teste 2: Verificar logs
pm2 logs email-dash --lines 100 | grep "CACHE WARMING"
```

---

### **8. Verificar Funcionamento**

```bash
# 1. Acessar aplicação
# Ir para: http://seu-dominio.com/automations

# 2. Ver logs de cache
pm2 logs email-dash --lines 50

# Deve aparecer:
# "✅ Cache hit: ..." ou
# "📡 Cache miss: ..."
```

---

## 🎯 **CHECKLIST DE VALIDAÇÃO**

Após rodar os comandos, verificar:

- [ ] Variável `CRON_SECRET` configurada no `.env`
- [ ] Código atualizado (`git pull`)
- [ ] Build concluído sem erros
- [ ] PM2 restart executado
- [ ] Cron job adicionado (se Linux)
- [ ] Teste manual funcionou
- [ ] Logs mostram cache working
- [ ] Página de automações carrega em 2-5s (após primeiro warm)

---

## 📊 **LOGS ESPERADOS**

### **Durante Cache Warming:**
```
🔥 [CACHE WARMING] Iniciando cache warming...
📊 [CACHE WARMING] Encontradas 20 contas ativas
🔥 [CACHE WARMING] Preenchendo cache geral (sem filtro)...
📡 [CACHE MISS] Buscando campanhas da automação 1 via API
✅ [CACHE WARMING] Cache geral: 25000ms
🔥 [CACHE WARMING] Preenchendo cache de ontem...
✅ [CACHE WARMING] Cache ontem: 15000ms
✅ [CACHE WARMING] Concluído em 40000ms (40.0s)
```

### **Durante Acesso de Usuário (Cache Hit):**
```
📊 [V2] Encontradas 87 automações
📧 [V2] Automação "...": 3 campanhas via API direta (cachado)
✅ [V2] Com atividade: 51, Sem atividade: 36
```

---

## ⚠️ **TROUBLESHOOTING**

### **Erro: "CRON_SECRET not configured"**
```bash
# Verificar se variável está no .env
cat .env | grep CRON_SECRET

# Se não estiver, adicionar:
echo 'CRON_SECRET="seu-secret-aqui"' >> .env
pm2 restart email-dash
```

### **Erro: "Unauthorized"**
```bash
# O secret está errado
# Verificar o secret correto:
cat .env | grep CRON_SECRET

# Usar o mesmo no curl:
curl -H "Authorization: Bearer $CRON_SECRET_CORRETO" ...
```

### **Cron não está executando**
```bash
# Verificar se cron service está rodando
sudo systemctl status cron

# Verificar logs do cron
grep CRON /var/log/syslog | tail -20

# Verificar se crontab está correto
crontab -l
```

---

## 🔄 **MANUTENÇÃO**

### **Ver logs de cache warming:**
```bash
# Logs gerais
pm2 logs email-dash | grep "CACHE WARMING"

# Logs específicos do cron (se configurado com >> arquivo)
tail -f /var/log/cache-warming.log
```

### **Forçar warm cache manualmente:**
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/warm-cache
```

### **Limpar cache manualmente:**
```bash
# Reiniciar aplicação (limpa cache em memória)
pm2 restart email-dash
```

---

## 🚀 **RESULTADO ESPERADO**

### **ANTES (Sem Cache):**
```
Usuário 1: ████████████████████████████████████ 40s 😤
Usuário 2: ████████████████████████████████████ 40s 😤
Usuário 3: ████████████████████████████████████ 40s 😤
```

### **DEPOIS (Com Cache + Warming):**
```
Cron Job: ████████████████████████████████████ 40s (background)
Usuário 1: ███ 2-3s 😍
Usuário 2: ███ 2-3s 😍
Usuário 3: ███ 2-3s 😍
```

**TODOS os usuários: 2-3 segundos!** 🎉

---

## 📞 **SE PRECISAR DE AJUDA**

1. Verificar logs: `pm2 logs email-dash`
2. Verificar variáveis: `cat .env | grep CRON`
3. Testar endpoint: `curl -H "Authorization: Bearer ..." http://...`

---

**Sucesso?** ✅ Todos usuários terão experiência rápida!

