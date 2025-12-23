# 🚀 Deploy no Digital Ocean - Guia Completo

## 📋 Pré-requisitos

- ✅ Conta na Digital Ocean
- ✅ Domínio da empresa (ex: `suaempresa.com`)
- ✅ Subdomínio escolhido (ex: `email.suaempresa.com`)
- ✅ Projeto Next.js funcionando localmente

---

## 🎯 Visão Geral

```
┌─────────────────────────────────────────────────┐
│  Cliente (Browser)                              │
│  ↓ https://email.suaempresa.com                 │
├─────────────────────────────────────────────────┤
│  Digital Ocean Droplet (Ubuntu 22.04)           │
│  ├─ Nginx (Reverse Proxy + SSL)                 │
│  ├─ Node.js 20.x (Next.js)                      │
│  ├─ PostgreSQL 16                                │
│  ├─ PM2 (Process Manager)                        │
│  └─ Let's Encrypt (SSL Certificates)            │
└─────────────────────────────────────────────────┘
```

---

## 📝 Parte 1: Criar Droplet na Digital Ocean

### 1.1. Acessar Digital Ocean

1. Acesse [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Clique em **"Create"** → **"Droplets"**

### 1.2. Configurar o Droplet

**Choose Region** (Escolha o mais próximo):
- 🌎 New York (se você está no Brasil/EUA)
- 🌎 São Francisco
- 🌎 Toronto

**Choose an image**:
- ✅ **Ubuntu 22.04 (LTS) x64**

**Choose Size**:
- ✅ **Basic Plan**
- ✅ **Regular (SSD)**
- ✅ **$12/mês** (2 GB RAM / 1 CPU / 50 GB SSD)
  - Suficiente para o projeto
  - Upgrade depois se necessário

**Authentication**:
- ✅ **SSH keys** (Recomendado) OU
- ✅ **Password** (Mais simples, mas menos seguro)

**Escolher SSH Key** (Recomendado):
```bash
# No seu Mac, gerar chave SSH (se não tiver)
ssh-keygen -t ed25519 -C "seu-email@empresa.com"

# Copiar chave pública
cat ~/.ssh/id_ed25519.pub
```
- Cole a chave no campo da Digital Ocean

**Hostname**:
- ✅ `email-dashboard-prod`

**Tags** (Opcional):
- `production`, `next-js`, `email-dashboard`

**Backups** (Recomendado):
- ✅ Enable backups (+$2.40/mês)

3. Clique em **"Create Droplet"**

⏱️ **Aguarde 1-2 minutos** até o droplet ficar pronto.

4. **Anote o IP do droplet** (ex: `164.90.123.45`)

---

## 🔐 Parte 2: Configuração Inicial do Servidor

### 2.1. Conectar ao Servidor

```bash
# Substituir pelo seu IP
ssh root@164.90.123.45

# Se usar password, digite quando solicitado
# Se usar SSH key, conecta automaticamente
```

### 2.2. Atualizar Sistema

```bash
# Atualizar pacotes
apt update && apt upgrade -y

# Instalar pacotes essenciais
apt install -y curl wget git build-essential
```

### 2.3. Criar Usuário (Segurança)

```bash
# Criar usuário para deploy (não usar root)
adduser deploy

# Adicionar ao grupo sudo
usermod -aG sudo deploy

# Copiar SSH key para o novo usuário
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

### 2.4. Configurar Firewall

```bash
# Habilitar UFW
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

# Verificar status
ufw status
```

### 2.5. Desconectar e Reconectar como Deploy

```bash
# Sair do root
exit

# Conectar como deploy
ssh deploy@164.90.123.45
```

---

## 📦 Parte 3: Instalar Node.js e PostgreSQL

### 3.1. Instalar Node.js 20.x

```bash
# Adicionar repositório NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js
sudo apt install -y nodejs

# Verificar instalação
node --version  # Deve mostrar v20.x.x
npm --version   # Deve mostrar 10.x.x
```

### 3.2. Instalar PostgreSQL 16

```bash
# Adicionar repositório oficial PostgreSQL
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Adicionar chave GPG
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Atualizar e instalar
sudo apt update
sudo apt install -y postgresql-16 postgresql-contrib-16

# Verificar status
sudo systemctl status postgresql
```

### 3.3. Configurar PostgreSQL

```bash
# Conectar como postgres
sudo -u postgres psql

# Dentro do PostgreSQL, executar:
```

```sql
-- Criar banco de dados
CREATE DATABASE email_dash;

-- Criar usuário
CREATE USER email_dash_user WITH ENCRYPTED PASSWORD 'SUA_SENHA_FORTE_AQUI';

-- Dar permissões
GRANT ALL PRIVILEGES ON DATABASE email_dash TO email_dash_user;

-- PostgreSQL 15+ requer este comando adicional
\c email_dash
GRANT ALL ON SCHEMA public TO email_dash_user;

-- Sair
\q
```

**⚠️ IMPORTANTE**: Anote a senha do banco!

### 3.4. Testar Conexão

```bash
# Testar conexão
psql -h localhost -U email_dash_user -d email_dash

# Se conectar, digite \q para sair
```

---

## 🚀 Parte 4: Deploy do Projeto Next.js

### 4.1. Clonar o Repositório

**Opção A: Se o projeto está no GitHub/GitLab**

```bash
# Criar diretório
mkdir -p ~/apps
cd ~/apps

# Clonar repositório (substituir pela sua URL)
git clone https://github.com/seu-usuario/email-dash.git
cd email-dash
```

**Opção B: Se o projeto está local (upload via SCP)**

No seu Mac:
```bash
# Comprimir projeto
cd /Users/brunomelin
tar -czf email-dash.tar.gz email-dash/

# Excluir node_modules antes
cd email-dash
rm -rf node_modules .next

# Comprimir novamente
cd ..
tar -czf email-dash.tar.gz email-dash/

# Enviar para o servidor
scp email-dash.tar.gz deploy@164.90.123.45:~/

# No servidor:
ssh deploy@164.90.123.45
mkdir -p ~/apps
cd ~/apps
tar -xzf ~/email-dash.tar.gz
cd email-dash
```

### 4.2. Configurar Variáveis de Ambiente

```bash
cd ~/apps/email-dash

# Criar arquivo .env.production
nano .env.production
```

Adicionar (substituir valores):

```env
# Database
DATABASE_URL="postgresql://email_dash_user:SUA_SENHA_AQUI@localhost:5432/email_dash"

# Next.js
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://email.suaempresa.com

# Opcional: Analytics, Sentry, etc.
# NEXT_PUBLIC_GA_ID=...
```

Salvar: `Ctrl + X` → `Y` → `Enter`

### 4.3. Instalar Dependências

```bash
# Instalar dependências
npm install

# Gerar Prisma Client
npx prisma generate

# Rodar migrations
npx prisma migrate deploy

# Build do Next.js
npm run build
```

**⏱️ Aguarde 2-5 minutos para o build.**

### 4.4. Testar Localmente

```bash
# Testar (porta 3000)
npm run start

# Em outro terminal, testar:
curl http://localhost:3000
```

Se ver HTML do Next.js → **Funcionou!** 🎉

Parar com `Ctrl + C`

---

## 🔄 Parte 5: Instalar e Configurar PM2

PM2 mantém o Next.js rodando 24/7 e reinicia automaticamente se cair.

### 5.1. Instalar PM2

```bash
sudo npm install -g pm2
```

### 5.2. Criar Arquivo de Configuração

```bash
cd ~/apps/email-dash
nano ecosystem.config.js
```

Adicionar:

```javascript
module.exports = {
  apps: [
    {
      name: 'email-dashboard',
      script: 'npm',
      args: 'start',
      cwd: '/home/deploy/apps/email-dash',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/home/deploy/.pm2/logs/email-dashboard-error.log',
      out_file: '/home/deploy/.pm2/logs/email-dashboard-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
}
```

Salvar: `Ctrl + X` → `Y` → `Enter`

### 5.3. Iniciar com PM2

```bash
# Iniciar aplicação
pm2 start ecosystem.config.js

# Ver status
pm2 status

# Ver logs
pm2 logs email-dashboard

# Parar logs: Ctrl + C
```

### 5.4. Configurar PM2 para Iniciar no Boot

```bash
# Gerar script de startup
pm2 startup systemd -u deploy --hp /home/deploy

# Copiar e executar o comando que aparecer
# (Algo como: sudo env PATH=...)

# Salvar configuração atual
pm2 save
```

**Testar**: Reinicie o servidor e verifique se PM2 inicia automaticamente:
```bash
sudo reboot

# Após reiniciar, conectar novamente
ssh deploy@164.90.123.45

# Verificar
pm2 status
```

---

## 🌐 Parte 6: Configurar Nginx como Reverse Proxy

### 6.1. Instalar Nginx

```bash
sudo apt install -y nginx
```

### 6.2. Configurar Site

```bash
sudo nano /etc/nginx/sites-available/email-dashboard
```

Adicionar (substituir `email.suaempresa.com`):

```nginx
server {
    listen 80;
    server_name email.suaempresa.com;

    # Redirecionar HTTP para HTTPS (após configurar SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Cache para assets estáticos
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }

    # Segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Salvar: `Ctrl + X` → `Y` → `Enter`

### 6.3. Habilitar Site

```bash
# Criar symlink
sudo ln -s /etc/nginx/sites-available/email-dashboard /etc/nginx/sites-enabled/

# Remover site default (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

---

## 🌍 Parte 7: Configurar DNS (Subdomínio)

### 7.1. Adicionar Registro DNS

No painel do seu provedor de domínio (GoDaddy, Registro.br, Cloudflare, etc.):

1. Acesse a zona DNS do domínio `suaempresa.com`

2. Adicione um registro **A**:
   ```
   Tipo: A
   Nome: email
   Valor: 164.90.123.45 (IP do seu droplet)
   TTL: 3600 (ou automático)
   ```

3. Salve as alterações

⏱️ **Aguarde 5-30 minutos** para propagação do DNS.

### 7.2. Verificar DNS

```bash
# No seu Mac, testar:
nslookup email.suaempresa.com

# Deve retornar o IP do droplet
```

Ou acesse: [https://dnschecker.org](https://dnschecker.org)

---

## 🔒 Parte 8: Configurar SSL (Let's Encrypt)

### 8.1. Instalar Certbot

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2. Obter Certificado SSL

```bash
# Obter e instalar certificado
sudo certbot --nginx -d email.suaempresa.com

# Seguir as instruções:
# 1. Email: seu-email@empresa.com
# 2. Concordar com termos: Y
# 3. Receber emails: N (ou Y, se quiser)
# 4. Redirect HTTP para HTTPS: 2 (Yes)
```

**✅ Certificado instalado!** Válido por 90 dias.

### 8.3. Configurar Renovação Automática

```bash
# Testar renovação
sudo certbot renew --dry-run

# Certbot adiciona cron job automaticamente
# Verificar:
sudo systemctl status certbot.timer
```

### 8.4. Verificar SSL

Acesse: `https://email.suaempresa.com`

Deve mostrar **cadeado verde** 🔒

Teste em: [https://www.ssllabs.com/ssltest/](https://www.ssllabs.com/ssltest/)

---

## ✅ Parte 9: Verificar Funcionamento

### 9.1. Testar Aplicação

1. Acesse `https://email.suaempresa.com`
2. Deve carregar o dashboard
3. Testar login (se houver)
4. Sincronizar uma conta do ActiveCampaign
5. Verificar se dados aparecem

### 9.2. Verificar Logs

```bash
# Logs do Next.js (PM2)
pm2 logs email-dashboard

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### 9.3. Verificar Performance

```bash
# Status do PM2
pm2 status

# Uso de memória
pm2 monit

# Uso de CPU/RAM do servidor
htop  # (Instalar: sudo apt install htop)
```

---

## 🔄 Parte 10: Deploy de Atualizações

### 10.1. Script de Deploy

Criar script para facilitar deploys futuros:

```bash
cd ~/apps/email-dash
nano deploy.sh
```

Adicionar:

```bash
#!/bin/bash

echo "🚀 Iniciando deploy..."

# Ir para o diretório
cd ~/apps/email-dash

# Pull do código (se usar Git)
echo "📥 Baixando código..."
git pull origin main

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Gerar Prisma
echo "🔧 Gerando Prisma Client..."
npx prisma generate

# Rodar migrations
echo "🗄️  Rodando migrations..."
npx prisma migrate deploy

# Build
echo "🏗️  Building..."
npm run build

# Reiniciar PM2
echo "🔄 Reiniciando aplicação..."
pm2 restart email-dashboard

echo "✅ Deploy concluído!"
pm2 status
```

Tornar executável:

```bash
chmod +x deploy.sh
```

### 10.2. Fazer Deploy de Atualização

```bash
cd ~/apps/email-dash
./deploy.sh
```

---

## 🛡️ Parte 11: Segurança Adicional (Recomendado)

### 11.1. Fail2Ban (Proteção contra Brute Force)

```bash
# Instalar
sudo apt install -y fail2ban

# Copiar configuração
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Habilitar proteção SSH
sudo nano /etc/fail2ban/jail.local
```

Encontrar `[sshd]` e garantir que tenha:
```
enabled = true
maxretry = 3
bantime = 3600
```

```bash
# Reiniciar
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Ver bans
sudo fail2ban-client status sshd
```

### 11.2. Atualizar Sistema Regularmente

```bash
# Criar cron job para atualizações automáticas
sudo apt install -y unattended-upgrades

# Configurar
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 11.3. Configurar Swap (Se 2GB RAM)

```bash
# Criar swap de 2GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Tornar permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verificar
free -h
```

---

## 📊 Parte 12: Monitoramento (Opcional)

### 12.1. PM2 Web Interface

```bash
# Habilitar dashboard web do PM2
pm2 web

# Acesse: http://IP-DO-DROPLET:9615
```

### 12.2. Instalar htop

```bash
sudo apt install -y htop

# Usar:
htop
```

---

## 🐛 Troubleshooting

### Problema: Aplicação não inicia

```bash
# Ver logs
pm2 logs email-dashboard --lines 100

# Verificar .env
cat ~/apps/email-dash/.env.production

# Testar banco
psql -h localhost -U email_dash_user -d email_dash
```

### Problema: 502 Bad Gateway

```bash
# Verificar se Next.js está rodando
pm2 status

# Verificar porta
sudo netstat -tulpn | grep 3000

# Reiniciar
pm2 restart email-dashboard
```

### Problema: SSL não funciona

```bash
# Ver configuração Nginx
sudo nginx -t

# Ver logs Certbot
sudo certbot certificates

# Forçar renovação
sudo certbot renew --force-renewal
```

### Problema: Baixa Performance

```bash
# Ver uso de recursos
htop

# Ver logs
pm2 logs

# Aumentar instances do PM2 (cluster mode)
# Editar ecosystem.config.js:
# instances: 2  # ou 'max'

pm2 restart email-dashboard
```

---

## 📋 Checklist Final

- [ ] Droplet criado e configurado
- [ ] Node.js 20.x instalado
- [ ] PostgreSQL 16 instalado e configurado
- [ ] Projeto clonado e build realizado
- [ ] PM2 configurado e rodando
- [ ] Nginx configurado
- [ ] DNS configurado (subdomínio aponta para IP)
- [ ] SSL instalado (Let's Encrypt)
- [ ] Aplicação acessível via HTTPS
- [ ] Firewall configurado (UFW)
- [ ] Fail2Ban instalado (opcional)
- [ ] Backups habilitados (Digital Ocean)
- [ ] Script de deploy criado

---

## 📚 Comandos Úteis

```bash
# Ver status geral
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql

# Reiniciar serviços
pm2 restart email-dashboard
sudo systemctl restart nginx
sudo systemctl restart postgresql

# Ver logs
pm2 logs email-dashboard
sudo tail -f /var/log/nginx/error.log

# Fazer deploy
cd ~/apps/email-dash && ./deploy.sh

# Ver uso de recursos
htop
free -h
df -h

# Backup manual do banco
pg_dump -h localhost -U email_dash_user email_dash > backup_$(date +%Y%m%d).sql
```

---

## 💰 Custos Mensais Estimados

```
Droplet (2GB RAM):        $12.00/mês
Backups (opcional):       + $2.40/mês
Domain (já tem):          $0.00
SSL (Let's Encrypt):      $0.00
─────────────────────────────────
TOTAL:                    ~$14.40/mês
```

---

## 🎉 Conclusão

Após seguir este guia, você terá:

- ✅ Dashboard rodando em `https://email.suaempresa.com`
- ✅ SSL configurado (HTTPS)
- ✅ Processo gerenciado por PM2 (auto-restart)
- ✅ Backups automáticos
- ✅ Deploy simplificado (script)

---

## 📞 Suporte

**Documentação**:
- Digital Ocean: [docs.digitalocean.com](https://docs.digitalocean.com)
- Next.js: [nextjs.org/docs](https://nextjs.org/docs)
- PM2: [pm2.keymetrics.io](https://pm2.keymetrics.io)

**Problemas?**
- Ver logs: `pm2 logs email-dashboard`
- Status: `pm2 status`
- Reiniciar: `pm2 restart email-dashboard`

---

**Última atualização**: Dezembro 2024  
**Testado em**: Ubuntu 22.04 LTS + Node.js 20.x + Next.js 15

