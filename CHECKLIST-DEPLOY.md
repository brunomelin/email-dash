# ✅ Checklist de Deploy - Digital Ocean

Use este checklist para garantir que não esqueceu nada!

---

## 📋 PRÉ-DEPLOY

- [ ] **Projeto funciona localmente**
  - [ ] `npm run dev` roda sem erros
  - [ ] Prisma migrations aplicadas
  - [ ] Consegue sincronizar pelo menos 1 conta

- [ ] **Código no Git (Recomendado)**
  - [ ] Repositório criado (GitHub/GitLab)
  - [ ] Code commitado e pushed
  - [ ] `.env` NÃO está no Git (verificar .gitignore)

- [ ] **Informações Anotadas**
  - [ ] Senha do PostgreSQL (forte!)
  - [ ] Subdomínio escolhido (ex: `email.suaempresa.com`)
  - [ ] Email para SSL/Let's Encrypt

---

## 🌊 DIGITAL OCEAN

- [ ] **Criar Droplet**
  - [ ] Ubuntu 22.04 LTS
  - [ ] 2GB RAM / 1 CPU ($12/mês)
  - [ ] Região: Mais próxima
  - [ ] SSH Key adicionada OU senha anotada
  - [ ] Hostname: `email-dashboard-prod`
  - [ ] Backups habilitados (+$2.40/mês)

- [ ] **IP Anotado**: `________________`

---

## 🔧 SETUP DO SERVIDOR

- [ ] **Conectar ao servidor**
  ```bash
  ssh root@SEU_IP
  ```

- [ ] **Atualizar sistema**
  ```bash
  apt update && apt upgrade -y
  apt install -y curl wget git build-essential
  ```

- [ ] **Criar usuário deploy**
  ```bash
  adduser deploy
  usermod -aG sudo deploy
  rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
  ```

- [ ] **Configurar firewall**
  ```bash
  ufw allow OpenSSH
  ufw allow 'Nginx Full'
  ufw enable
  ```

- [ ] **Reconectar como deploy**
  ```bash
  exit
  ssh deploy@SEU_IP
  ```

---

## 📦 INSTALAR DEPENDÊNCIAS

- [ ] **Node.js 20.x**
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
  node --version  # Verificar v20.x
  ```

- [ ] **PostgreSQL 16**
  ```bash
  # Adicionar repo
  sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
  
  # Instalar
  sudo apt update && sudo apt install -y postgresql-16
  ```

- [ ] **Configurar PostgreSQL**
  ```bash
  sudo -u postgres psql
  ```
  ```sql
  CREATE DATABASE email_dash;
  CREATE USER email_dash_user WITH ENCRYPTED PASSWORD 'SUA_SENHA_AQUI';
  GRANT ALL PRIVILEGES ON DATABASE email_dash TO email_dash_user;
  \c email_dash
  GRANT ALL ON SCHEMA public TO email_dash_user;
  \q
  ```

- [ ] **Testar conexão PostgreSQL**
  ```bash
  psql -h localhost -U email_dash_user -d email_dash
  \q
  ```

---

## 🚀 DEPLOY DO PROJETO

- [ ] **Clonar ou upload do código**
  - [ ] Opção A (Git):
    ```bash
    mkdir -p ~/apps && cd ~/apps
    git clone https://github.com/seu-usuario/email-dash.git
    cd email-dash
    ```
  - [ ] Opção B (Upload):
    ```bash
    # No Mac:
    tar -czf email-dash.tar.gz email-dash/
    scp email-dash.tar.gz deploy@SEU_IP:~/
    
    # No servidor:
    mkdir -p ~/apps && cd ~/apps
    tar -xzf ~/email-dash.tar.gz
    cd email-dash
    ```

- [ ] **Criar .env.production**
  ```bash
  nano .env.production
  ```
  ```env
  DATABASE_URL="postgresql://email_dash_user:SENHA@localhost:5432/email_dash"
  NODE_ENV=production
  NEXT_PUBLIC_APP_URL=https://email.suaempresa.com
  ```

- [ ] **Instalar e build**
  ```bash
  npm install
  npx prisma generate
  npx prisma migrate deploy
  npm run build
  ```

- [ ] **Testar localmente**
  ```bash
  npm run start
  # Em outro terminal: curl http://localhost:3000
  # Ctrl+C para parar
  ```

---

## 🔄 PM2 (Process Manager)

- [ ] **Instalar PM2**
  ```bash
  sudo npm install -g pm2
  ```

- [ ] **Criar ecosystem.config.js**
  ```bash
  nano ecosystem.config.js
  ```
  (Copiar config do guia)

- [ ] **Iniciar com PM2**
  ```bash
  pm2 start ecosystem.config.js
  pm2 status  # Verificar
  ```

- [ ] **Configurar startup**
  ```bash
  pm2 startup systemd -u deploy --hp /home/deploy
  # Executar comando que aparecer
  pm2 save
  ```

---

## 🌐 NGINX

- [ ] **Instalar Nginx**
  ```bash
  sudo apt install -y nginx
  ```

- [ ] **Criar configuração**
  ```bash
  sudo nano /etc/nginx/sites-available/email-dashboard
  ```
  (Copiar config do guia)

- [ ] **Habilitar site**
  ```bash
  sudo ln -s /etc/nginx/sites-available/email-dashboard /etc/nginx/sites-enabled/
  sudo rm /etc/nginx/sites-enabled/default  # Opcional
  sudo nginx -t
  sudo systemctl reload nginx
  ```

---

## 🌍 DNS

- [ ] **Acessar painel do domínio**
  - Provedor: `________________`
  - Login feito

- [ ] **Adicionar registro A**
  ```
  Tipo: A
  Nome: email (ou seu subdomínio)
  Valor: SEU_IP_DROPLET
  TTL: 3600
  ```

- [ ] **Aguardar propagação** (5-30 min)

- [ ] **Verificar DNS**
  ```bash
  # No Mac:
  nslookup email.suaempresa.com
  ```

---

## 🔒 SSL (Let's Encrypt)

- [ ] **Instalar Certbot**
  ```bash
  sudo apt install -y certbot python3-certbot-nginx
  ```

- [ ] **Obter certificado**
  ```bash
  sudo certbot --nginx -d email.suaempresa.com
  ```
  - Email: `________________`
  - Aceitar termos: Y
  - Redirect HTTP→HTTPS: 2 (Yes)

- [ ] **Testar renovação**
  ```bash
  sudo certbot renew --dry-run
  ```

---

## ✅ VERIFICAÇÕES FINAIS

- [ ] **Aplicação acessível**
  - [ ] Acessar `https://email.suaempresa.com`
  - [ ] Cadeado verde 🔒 aparece
  - [ ] Dashboard carrega

- [ ] **Funcionalidades testadas**
  - [ ] Consegue acessar /settings/accounts
  - [ ] Consegue adicionar conta ActiveCampaign
  - [ ] Consegue sincronizar dados
  - [ ] Dashboard exibe métricas
  - [ ] Páginas /lists e /automations funcionam
  - [ ] Filtros funcionam

- [ ] **Logs ok**
  ```bash
  pm2 logs email-dashboard  # Sem erros
  sudo tail -f /var/log/nginx/error.log  # Sem erros críticos
  ```

- [ ] **PM2 reinicia automaticamente**
  ```bash
  sudo reboot
  # Após boot, conectar novamente
  pm2 status  # Deve estar online
  ```

---

## 🛡️ SEGURANÇA (OPCIONAL MAS RECOMENDADO)

- [ ] **Fail2Ban instalado**
  ```bash
  sudo apt install -y fail2ban
  sudo systemctl enable fail2ban
  sudo systemctl start fail2ban
  ```

- [ ] **Swap configurado** (se 2GB RAM)
  ```bash
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```

- [ ] **Updates automáticos**
  ```bash
  sudo apt install -y unattended-upgrades
  sudo dpkg-reconfigure --priority=low unattended-upgrades
  ```

---

## 📝 DOCUMENTAÇÃO

- [ ] **Script de deploy criado**
  ```bash
  cd ~/apps/email-dash
  nano deploy.sh
  chmod +x deploy.sh
  ```

- [ ] **Informações salvas**
  - [ ] IP do droplet: `________________`
  - [ ] Subdomínio: `________________`
  - [ ] Senha PostgreSQL: `________________` (segura!)
  - [ ] Email SSL: `________________`

- [ ] **Equipe informada** (se aplicável)
  - [ ] URL do dashboard compartilhada
  - [ ] Credenciais salvas em gerenciador de senhas

---

## 🎉 CONCLUSÃO

- [ ] **Deploy completo**
- [ ] **Tudo testado e funcionando**
- [ ] **Backup habilitado** (Digital Ocean)
- [ ] **Monitoramento configurado** (PM2)
- [ ] **SSL válido e auto-renovável**

---

## 📞 COMANDOS ÚTEIS

```bash
# Ver status
pm2 status
pm2 logs email-dashboard

# Reiniciar
pm2 restart email-dashboard
sudo systemctl restart nginx

# Deploy atualização
cd ~/apps/email-dash && ./deploy.sh

# Ver recursos
htop
free -h
df -h

# Backup banco
pg_dump -h localhost -U email_dash_user email_dash > backup.sql
```

---

**Concluiu tudo? Parabéns! 🎉**

Seu dashboard está no ar em `https://email.suaempresa.com`

