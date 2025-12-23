# ⚡ Deploy Rápido - Resumo de Comandos

**Para quem já sabe o que está fazendo e só precisa dos comandos.**

---

## 1️⃣ Criar Droplet

- Ubuntu 22.04
- 2GB RAM ($12/mês)
- Anotar IP: `164.90.123.45`

---

## 2️⃣ Setup Inicial

```bash
# Conectar
ssh root@164.90.123.45

# Atualizar
apt update && apt upgrade -y
apt install -y curl wget git build-essential

# Criar usuário
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

# Sair e reconectar
exit
ssh deploy@164.90.123.45
```

---

## 3️⃣ Instalar Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version
```

---

## 4️⃣ Instalar PostgreSQL 16

```bash
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update && sudo apt install -y postgresql-16

# Configurar
sudo -u postgres psql
```

```sql
CREATE DATABASE email_dash;
CREATE USER email_dash_user WITH ENCRYPTED PASSWORD 'SUA_SENHA_FORTE';
GRANT ALL PRIVILEGES ON DATABASE email_dash TO email_dash_user;
\c email_dash
GRANT ALL ON SCHEMA public TO email_dash_user;
\q
```

---

## 5️⃣ Deploy do Projeto

```bash
# Clonar (ou fazer upload)
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/seu-usuario/email-dash.git
cd email-dash

# Configurar .env
nano .env.production
```

```env
DATABASE_URL="postgresql://email_dash_user:SUA_SENHA@localhost:5432/email_dash"
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://email.suaempresa.com
```

```bash
# Build
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
```

---

## 6️⃣ PM2

```bash
sudo npm install -g pm2

# Criar ecosystem.config.js
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'email-dashboard',
    script: 'npm',
    args: 'start',
    cwd: '/home/deploy/apps/email-dash',
    instances: 1,
    autorestart: true,
    env: { NODE_ENV: 'production', PORT: 3000 }
  }]
}
```

```bash
pm2 start ecosystem.config.js
pm2 startup systemd -u deploy --hp /home/deploy
# Copiar e executar comando que aparecer
pm2 save
```

---

## 7️⃣ Nginx

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/email-dashboard
```

```nginx
server {
    listen 80;
    server_name email.suaempresa.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/email-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8️⃣ DNS

No seu provedor de domínio, adicionar:

```
Tipo: A
Nome: email
Valor: 164.90.123.45
```

Aguardar 5-30 min.

---

## 9️⃣ SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d email.suaempresa.com
```

---

## ✅ Pronto!

Acesse: `https://email.suaempresa.com`

---

## 🔄 Deploy de Atualizações

```bash
cd ~/apps/email-dash
git pull origin main
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart email-dashboard
```

---

## 🐛 Debug

```bash
pm2 logs email-dashboard
pm2 status
sudo tail -f /var/log/nginx/error.log
```

---

**Guia completo**: `DEPLOY-DIGITAL-OCEAN.md`

