# 🚀 Comandos para Deploy no Servidor

**Guia completo passo a passo**

---

## 📋 **Pré-requisitos no Servidor**

Certifique-se de que o servidor tem:
- ✅ Node.js 20+ instalado
- ✅ PostgreSQL rodando
- ✅ Git instalado
- ✅ PM2 instalado (para manter app rodando)

---

## 🔧 **Parte 1: Preparação Inicial (Primeira vez apenas)**

### **1.1. Conectar ao servidor via SSH**

```bash
ssh user@seu-servidor.com
```

### **1.2. Instalar Node.js 20 (se não tiver)**

```bash
# Usando NVM (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node --version  # Deve mostrar v20.x.x
```

### **1.3. Instalar PM2 globalmente**

```bash
npm install -g pm2
```

### **1.4. Clonar o repositório (primeira vez)**

```bash
# Criar diretório para aplicações
mkdir -p ~/apps
cd ~/apps

# Clonar repositório
git clone https://github.com/brunomelin/email-dash.git
cd email-dash
```

### **1.5. Configurar variáveis de ambiente**

```bash
# Criar arquivo .env
nano .env
```

Adicione:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/email_dash?schema=public"
NODE_ENV="production"
PORT=3000
```

Salvar: `Ctrl + X`, depois `Y`, depois `Enter`

---

## 🚀 **Parte 2: Deploy/Atualização (Executar sempre)**

### **2.1. Navegar para o diretório do projeto**

```bash
cd ~/apps/email-dash
```

### **2.2. Parar aplicação atual (se estiver rodando)**

```bash
pm2 stop email-dash || true
```

### **2.3. Puxar últimas alterações do GitHub**

```bash
git pull origin main
```

### **2.4. Instalar/atualizar dependências**

```bash
npm ci
```

### **2.5. Gerar Prisma Client**

```bash
npx prisma generate
```

### **2.6. Rodar migrations do banco (se houver)**

```bash
# Opção 1: Migrations (se tiver arquivos migration)
npx prisma migrate deploy

# OU Opção 2: Push direto (mais simples)
npx prisma db push --accept-data-loss
```

### **2.7. Build da aplicação**

```bash
npm run build
```

### **2.8. Iniciar aplicação com PM2**

```bash
# Primeira vez
pm2 start npm --name "email-dash" -- start

# OU se já existir, restart
pm2 restart email-dash
```

### **2.9. Salvar configuração do PM2**

```bash
pm2 save
pm2 startup
# Copie e execute o comando que aparecer
```

### **2.10. Verificar status**

```bash
pm2 status
pm2 logs email-dash --lines 50
```

---

## ✅ **Parte 3: Verificação**

### **3.1. Testar localmente no servidor**

```bash
curl http://localhost:3000
# Deve retornar HTML da página
```

### **3.2. Ver logs em tempo real**

```bash
pm2 logs email-dash
# Ctrl + C para sair
```

### **3.3. Verificar uso de recursos**

```bash
pm2 monit
# Ctrl + C para sair
```

---

## 🌐 **Parte 4: Configurar Nginx (Reverse Proxy)**

### **4.1. Instalar Nginx (se não tiver)**

```bash
sudo apt update
sudo apt install nginx -y
```

### **4.2. Criar configuração do site**

```bash
sudo nano /etc/nginx/sites-available/email-dash
```

Adicione:
```nginx
server {
    listen 80;
    server_name seu-dominio.com;  # Altere para seu domínio

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### **4.3. Habilitar site**

```bash
sudo ln -s /etc/nginx/sites-available/email-dash /etc/nginx/sites-enabled/
sudo nginx -t  # Testar configuração
sudo systemctl restart nginx
```

### **4.4. Configurar SSL com Let's Encrypt (HTTPS)**

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com

# Renovar automaticamente
sudo certbot renew --dry-run
```

---

## 🔄 **Script de Deploy Automático**

Crie um script para facilitar deploys futuros:

```bash
nano ~/deploy-email-dash.sh
```

Adicione:
```bash
#!/bin/bash

echo "🚀 Iniciando deploy do Email Dashboard..."

# Navegar para diretório
cd ~/apps/email-dash

# Parar aplicação
echo "⏹️  Parando aplicação..."
pm2 stop email-dash || true

# Atualizar código
echo "📥 Puxando alterações do GitHub..."
git pull origin main

# Instalar dependências
echo "📦 Instalando dependências..."
npm ci

# Gerar Prisma Client
echo "🔧 Gerando Prisma Client..."
npx prisma generate

# Rodar migrations
echo "🗄️  Atualizando banco de dados..."
npx prisma db push --accept-data-loss

# Build
echo "🏗️  Building aplicação..."
npm run build

# Iniciar aplicação
echo "▶️  Iniciando aplicação..."
pm2 restart email-dash || pm2 start npm --name "email-dash" -- start

# Salvar configuração
pm2 save

# Mostrar status
echo "✅ Deploy concluído!"
pm2 status
pm2 logs email-dash --lines 20
```

Tornar executável:
```bash
chmod +x ~/deploy-email-dash.sh
```

**Usar no futuro:**
```bash
~/deploy-email-dash.sh
```

---

## 🆘 **Comandos Úteis**

### **Ver logs da aplicação**
```bash
pm2 logs email-dash
pm2 logs email-dash --lines 100
pm2 logs email-dash --err  # Apenas erros
```

### **Reiniciar aplicação**
```bash
pm2 restart email-dash
```

### **Parar aplicação**
```bash
pm2 stop email-dash
```

### **Remover do PM2**
```bash
pm2 delete email-dash
```

### **Ver uso de recursos**
```bash
pm2 monit
```

### **Listar processos PM2**
```bash
pm2 list
```

### **Limpar logs**
```bash
pm2 flush
```

### **Testar conexão com banco**
```bash
cd ~/apps/email-dash
npx prisma db pull
```

---

## 🐛 **Troubleshooting**

### **Erro: "Port 3000 already in use"**

```bash
# Ver o que está usando a porta
sudo lsof -i :3000

# Matar processo
sudo kill -9 PID_DO_PROCESSO

# OU mudar porta no .env
echo "PORT=3001" >> .env
```

### **Erro: "Database connection failed"**

```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Testar conexão
psql -U seu_usuario -d email_dash -h localhost
```

### **Erro: "Module not found"**

```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install
npm run build
```

### **Build falhou**

```bash
# Ver logs detalhados
npm run build 2>&1 | tee build.log

# Verificar espaço em disco
df -h
```

### **PM2 não inicia no boot**

```bash
# Reconfigurar startup
pm2 unstartup
pm2 startup
# Copiar e executar comando que aparecer
pm2 save
```

---

## 📊 **Monitoramento**

### **Setup PM2 Plus (Opcional - Monitoring avançado)**

```bash
pm2 link [secret-key] [public-key]
```

Acesse: https://app.pm2.io

---

## 🔒 **Segurança**

### **Firewall**

```bash
# Permitir apenas portas necessárias
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
sudo ufw status
```

### **Fail2Ban (Proteção contra ataques)**

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 📝 **Checklist de Deploy**

Copie e cole este checklist no terminal após cada deploy:

```bash
echo "📋 Checklist de Deploy:"
echo ""
echo "✓ Pull do GitHub"
echo "✓ Dependências instaladas"
echo "✓ Prisma Client gerado"
echo "✓ Migrations aplicadas"
echo "✓ Build concluído"
echo "✓ PM2 reiniciado"
echo ""
echo "🧪 Testando aplicação..."
curl -s http://localhost:3000 > /dev/null && echo "✅ App respondendo!" || echo "❌ App não está respondendo"
pm2 status email-dash
```

---

## 🎯 **Comandos Resumidos (Cola)**

```bash
# Deploy completo em um comando
cd ~/apps/email-dash && \
  pm2 stop email-dash && \
  git pull origin main && \
  npm ci && \
  npx prisma generate && \
  npx prisma db push --accept-data-loss && \
  npm run build && \
  pm2 restart email-dash && \
  pm2 logs email-dash --lines 20
```

---

**🎉 Pronto! Sua aplicação está no ar!**

**Acesse:** 
- Local: http://localhost:3000
- Externo: http://seu-dominio.com (após configurar Nginx)

