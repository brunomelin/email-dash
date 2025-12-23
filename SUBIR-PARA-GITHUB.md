# 🚀 Subir Projeto para GitHub - Guia Rápido

## ⚠️ **IMPORTANTE: Segurança Primeiro**

Antes de subir, **GARANTA** que arquivos sensíveis não vão para o GitHub!

---

## 📋 Passo 1: Verificar .gitignore

```bash
cd /Users/brunomelin/email-dash

# Verificar se .gitignore existe e está correto
cat .gitignore
```

**Deve conter pelo menos**:
```
node_modules
.next
.env
.env.local
.env*.local
*.pem
.DS_Store
```

✅ **Já está ok no seu projeto!**

---

## 🔒 Passo 2: Remover Senhas dos Arquivos de Documentação

**⚠️ CRÍTICO**: Você colocou a senha do PostgreSQL no `DEPLOY-DIGITAL-OCEAN.md`!

```bash
# Abrir e remover a senha
nano DEPLOY-DIGITAL-OCEAN.md

# Buscar por: 8R$B8)oxBfeP5wD#%u
# Substituir por: SUA_SENHA_FORTE_AQUI
```

**Ou use este comando para fazer automaticamente**:

```bash
cd /Users/brunomelin/email-dash

# Substituir senha em DEPLOY-DIGITAL-OCEAN.md
sed -i '' 's/8R\$B8)oxBfeP5wD#%u/SUA_SENHA_FORTE_AQUI/g' DEPLOY-DIGITAL-OCEAN.md

# Verificar se removeu
grep -r "8R\$B8)oxBfeP5wD" .
```

**Se aparecer algum resultado**, remova manualmente!

---

## 🔍 Passo 3: Verificar Outros Arquivos Sensíveis

```bash
cd /Users/brunomelin/email-dash

# Buscar por possíveis chaves de API ou senhas
grep -r "api_key" . --exclude-dir=node_modules --exclude-dir=.next
grep -r "apiKey" . --exclude-dir=node_modules --exclude-dir=.next
grep -r "password" . --exclude-dir=node_modules --exclude-dir=.next
grep -r "@api-us1.com" . --exclude-dir=node_modules --exclude-dir=.next

# Se encontrar algo sensível, remover!
```

---

## 📦 Passo 4: Inicializar Git (se necessário)

```bash
cd /Users/brunomelin/email-dash

# Verificar se já é um repositório Git
git status

# Se NÃO for (erro: "not a git repository"), inicializar:
git init
git branch -M main
```

---

## 🌐 Passo 5: Criar Repositório no GitHub

### 5.1. Via Browser (Mais Fácil)

1. Acesse: [https://github.com/new](https://github.com/new)

2. Preencher:
   - **Repository name**: `email-dashboard` (ou outro nome)
   - **Description**: "Multi-account ActiveCampaign Analytics Dashboard"
   - **Visibility**: 
     - ✅ **Private** (Recomendado - código da empresa)
     - ❌ Public (só se quiser tornar open source)
   - **Initialize**: 
     - ❌ NÃO adicionar README
     - ❌ NÃO adicionar .gitignore
     - ❌ NÃO adicionar license

3. Clicar em **"Create repository"**

4. **Copiar a URL** que aparecer:
   ```
   https://github.com/seu-usuario/email-dashboard.git
   ```

---

## 📤 Passo 6: Fazer Commit e Push

```bash
cd /Users/brunomelin/email-dash

# Adicionar todos os arquivos
git add .

# Ver o que vai ser commitado
git status

# Se aparecer algo sensível (*.env, senhas), remover:
git reset HEAD .env
git reset HEAD .env.local
# etc...

# Fazer commit inicial
git commit -m "feat: initial commit - email dashboard MVP

- Next.js 15 + TypeScript + Prisma
- Multi-account ActiveCampaign integration
- Dashboard with campaigns, lists, and automations
- Advanced filters (date, account, list)
- API v1 integration for date-based metrics
- PM2-ready for production deployment"

# Adicionar remote (substituir pela sua URL)
git remote add origin https://github.com/seu-usuario/email-dashboard.git

# Push para GitHub
git push -u origin main
```

---

## ✅ Passo 7: Verificar no GitHub

1. Acesse: `https://github.com/seu-usuario/email-dashboard`

2. **Verificar**:
   - ✅ Código está lá
   - ✅ Sem arquivo `.env`
   - ✅ Sem `node_modules`
   - ✅ Sem senhas visíveis

3. **Testar clone**:
   ```bash
   cd /tmp
   git clone https://github.com/seu-usuario/email-dashboard.git
   cd email-dashboard
   ls -la
   ```

---

## 🔐 Passo 8: Criar .env.example (Template)

Para que outros desenvolvedores saibam quais variáveis configurar:

```bash
cd /Users/brunomelin/email-dash

# Criar .env.example (sem valores reais)
cat > .env.example << 'EOF'
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/email_dash"

# Next.js
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional: Analytics, Monitoring, etc.
# NEXT_PUBLIC_GA_ID=
# SENTRY_DSN=
EOF

# Adicionar ao Git
git add .env.example
git commit -m "docs: add .env.example template"
git push
```

---

## 📝 Passo 9: Atualizar README (Opcional)

Criar um README.md básico:

```bash
cd /Users/brunomelin/email-dash
nano README.md
```

```markdown
# 📧 Email Dashboard

Multi-account ActiveCampaign Analytics Dashboard built with Next.js 15, TypeScript, and Prisma.

## Features

- 📊 Multi-account dashboard with consolidated metrics
- 🔍 Advanced filters (date range, accounts, lists)
- 📋 Lists analytics and performance tracking
- 🤖 Automations insights with email association
- 🔄 Automatic data sync from ActiveCampaign API
- 📈 KPI cards and sortable tables
- 🔐 Secure credential management

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL, Prisma ORM
- **API**: ActiveCampaign API v1 & v3
- **Deployment**: Digital Ocean (Node.js + PM2 + Nginx)

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and configure
3. Install dependencies: `npm install`
4. Run migrations: `npx prisma migrate dev`
5. Start dev server: `npm run dev`

See `DEPLOY-DIGITAL-OCEAN.md` for production deployment guide.

## Documentation

- `DEPLOY-DIGITAL-OCEAN.md` - Complete deployment guide
- `PLANO-DE-ACAO-COMPLETO.md` - Project roadmap
- `GUIA-NOMENCLATURA-AUTOMACOES.md` - Naming conventions

## License

Private - Company Use Only
```

```bash
# Adicionar ao Git
git add README.md
git commit -m "docs: add README with project overview"
git push
```

---

## 🔄 Passo 10: Futuras Atualizações

Depois de fazer mudanças no código:

```bash
cd /Users/brunomelin/email-dash

# Ver o que mudou
git status

# Adicionar mudanças
git add .

# Ou adicionar arquivos específicos
git add src/app/page.tsx
git add src/components/dashboard/

# Commit com mensagem descritiva
git commit -m "feat: add export to CSV functionality"
# ou
git commit -m "fix: resolve date filter bug"
# ou
git commit -m "docs: update deployment guide"

# Push para GitHub
git push
```

---

## 🏷️ Convenções de Commit (Opcional)

Use prefixos para commits organizados:

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Mudanças na documentação
- `style:` - Formatação, sem mudança de código
- `refactor:` - Refatoração de código
- `test:` - Adicionar/modificar testes
- `chore:` - Manutenção, deps, config

**Exemplos**:
```bash
git commit -m "feat: add drill-down pages for campaigns"
git commit -m "fix: resolve automation metrics calculation"
git commit -m "docs: update API v1 integration guide"
git commit -m "refactor: simplify date filter logic"
```

---

## 🌿 Branches (Opcional)

Se trabalhar em equipe ou features grandes:

```bash
# Criar branch para nova feature
git checkout -b feature/export-csv

# Fazer mudanças...
git add .
git commit -m "feat: implement CSV export"

# Push da branch
git push -u origin feature/export-csv

# No GitHub, criar Pull Request
# Após merge, voltar para main
git checkout main
git pull
```

---

## 🚨 Problemas Comuns

### "Permission denied (publickey)"

**Solução**: Configurar SSH key no GitHub

```bash
# Gerar SSH key (se não tiver)
ssh-keygen -t ed25519 -C "seu-email@empresa.com"

# Copiar chave pública
cat ~/.ssh/id_ed25519.pub

# Adicionar no GitHub:
# Settings → SSH and GPG keys → New SSH key
```

Ou usar HTTPS com token:
```bash
git remote set-url origin https://ghp_TOKEN@github.com/usuario/repo.git
```

### "Updates were rejected"

**Solução**: Pull antes de push
```bash
git pull --rebase
git push
```

### Arquivo grande demais

**Solução**: Adicionar ao .gitignore
```bash
echo "arquivo-grande.zip" >> .gitignore
git rm --cached arquivo-grande.zip
git commit -m "chore: remove large file"
git push
```

---

## 📦 Bonus: Package.json Scripts

Verificar se você tem estes scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio"
  }
}
```

Se faltar algo, adicionar!

---

## ✅ Checklist Final

- [ ] `.gitignore` correto (sem .env, node_modules)
- [ ] **Senhas removidas dos arquivos de documentação**
- [ ] Repositório criado no GitHub (Private)
- [ ] `git add .` e `git commit`
- [ ] `git push` concluído com sucesso
- [ ] Repositório visível no GitHub
- [ ] `.env` NÃO está no GitHub
- [ ] `.env.example` adicionado (template)
- [ ] README.md criado (opcional)
- [ ] Time avisado do repositório (se aplicável)

---

## 🎉 Pronto!

Seu projeto está no GitHub: `https://github.com/seu-usuario/email-dashboard`

**Próximos passos**:
1. Configurar GitHub Actions (CI/CD) - opcional
2. Fazer deploy no Digital Ocean usando `git clone`
3. Continuar desenvolvendo novas features

---

**Dúvidas?** Consulte: [docs.github.com](https://docs.github.com)

