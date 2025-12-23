# 🔧 Correção: Passos Executados no Lugar Errado

## ❌ O que aconteceu?

Você executou os passos de deploy **no seu computador local** (Mac), quando deveria ter executado **dentro do servidor** (droplet Digital Ocean via SSH).

---

## ✅ Como corrigir?

### Passo 1: Limpar arquivos criados localmente (OPCIONAL)

Se você criou arquivos no seu Mac em `~/apps/email-dash`, pode apagar:

```bash
# No seu Mac (computador local)
rm -rf ~/apps/email-dash
```

> ⚠️ Não apague se você fez mudanças importantes! Mas como clonou do GitHub, pode recriar a qualquer momento.

---

### Passo 2: Conectar ao servidor Digital Ocean

```bash
# Do seu Mac, conectar ao droplet
ssh deploy@SEU_IP_DO_DROPLET

# Exemplo:
# ssh deploy@164.90.123.45
```

---

### Passo 3: Seguir o guia DENTRO DO SERVIDOR

Agora que você está conectado via SSH ao servidor, siga o `DEPLOY-RAPIDO.md` ou `DEPLOY-DIGITAL-OCEAN.md` **A PARTIR DA SEÇÃO 3** (Instalar Node.js).

**Checklist rápido NO SERVIDOR:**

```bash
# ✅ Verificar onde você está
pwd
# Deve mostrar: /home/deploy

# ✅ Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Deve mostrar v20.x.x

# ✅ Instalar PostgreSQL 16
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-16

# ✅ Configurar PostgreSQL
sudo -u postgres psql
```

Dentro do PostgreSQL:

```sql
CREATE DATABASE email_dash;
CREATE USER email_dash_user WITH ENCRYPTED PASSWORD 'SUA_SENHA_FORTE';
GRANT ALL PRIVILEGES ON DATABASE email_dash TO email_dash_user;
\c email_dash
GRANT ALL ON SCHEMA public TO email_dash_user;
\q
```

```bash
# ✅ Clonar projeto do GitHub NO SERVIDOR
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/brunomelin/email-dash.git
cd email-dash

# ✅ Criar arquivo .env NO SERVIDOR (Prisma usa este nome)
nano .env
```

Conteúdo do `.env`:

```env
DATABASE_URL="postgresql://email_dash_user:SUA_SENHA@localhost:5432/email_dash"
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://email.suaempresa.com
```

> ⚠️ IMPORTANTE: Use `.env` (sem `.production`), pois o Prisma procura este nome específico!

```bash
# ✅ Build do projeto NO SERVIDOR
npm install
npx prisma generate
npx prisma migrate deploy
npm run build

# ✅ Instalar PM2
sudo npm install -g pm2

# ✅ Criar ecosystem.config.js
nano ecosystem.config.js
```

Conteúdo do `ecosystem.config.js`:

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
# ✅ Iniciar aplicação
pm2 start ecosystem.config.js
pm2 startup systemd -u deploy --hp /home/deploy
# Copiar e executar o comando que aparecer
pm2 save

# ✅ Instalar Nginx
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/email-dashboard
```

Conteúdo do arquivo Nginx:

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
# ✅ Ativar site
sudo ln -s /etc/nginx/sites-available/email-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# ✅ Configurar SSL
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d email.suaempresa.com
```

---

## 🎯 Resumo

- ❌ **Antes**: Executando no Mac (`~/apps/`)
- ✅ **Agora**: Executando no servidor via SSH (`ssh deploy@IP`)

**Regra de ouro**: Se você vê `[deploy@email-dashboard-prod ~]$` no terminal, você está no servidor! ✅

---

## 📚 Referências

- `DEPLOY-RAPIDO.md` - Comandos resumidos (agora corrigidos)
- `DEPLOY-DIGITAL-OCEAN.md` - Guia completo passo a passo (agora corrigido)

