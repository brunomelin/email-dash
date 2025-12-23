# 🔄 Workflow de Deploy - GitHub → Digital Ocean

**Fluxo completo**: Desenvolvimento Local → GitHub → Servidor de Produção

---

## 📋 Fluxo Geral

```
┌──────────────────┐
│   Mac (Local)    │
│  /Users/bruno... │
└────────┬─────────┘
         │ git push
         ↓
┌──────────────────┐
│     GitHub       │
│  brunomelin/     │
│  email-dash      │
└────────┬─────────┘
         │ git pull
         ↓
┌──────────────────┐
│ Digital Ocean    │
│ ~/apps/email-dash│
│  (Produção)      │
└──────────────────┘
```

---

## 🚀 Workflow Completo

### 1️⃣ **Desenvolvimento Local (Mac)**

```bash
cd /Users/brunomelin/email-dash

# Fazer suas mudanças...
# Editar arquivos, adicionar features, etc.

# Ver o que mudou
git status

# Adicionar arquivos
git add .
# ou adicionar específicos
git add src/app/page.tsx src/components/

# Ver diff (o que vai ser commitado)
git diff --staged

# Commit
git commit -m "feat: adicionar exportação CSV"

# Push para GitHub
git push origin main
```

**✅ Código agora está no GitHub!**

---

### 2️⃣ **Deploy no Servidor (Digital Ocean)**

```bash
# Conectar ao servidor
ssh deploy@SEU_IP_DROPLET

# Ir para o diretório do projeto
cd ~/apps/email-dash

# Executar script de deploy
./deploy.sh
```

**O script faz automaticamente**:
1. `git pull origin main` (baixa código do GitHub)
2. `npm install` (instala novas dependências)
3. `npx prisma generate` (gera Prisma Client)
4. `npx prisma migrate deploy` (aplica migrations)
5. `npm run build` (build do Next.js)
6. `pm2 restart` (reinicia aplicação)

⏱️ **Tempo total**: 2-3 minutos

**✅ Deploy concluído! Aplicação atualizada.**

---

## 📝 Exemplos de Uso

### Exemplo 1: Nova Feature

**No Mac:**
```bash
cd /Users/brunomelin/email-dash

# Criar nova feature (ex: exportar CSV)
# ... editar arquivos ...

# Commit
git add .
git commit -m "feat: add CSV export functionality"
git push
```

**No servidor:**
```bash
ssh deploy@SEU_IP
cd ~/apps/email-dash
./deploy.sh
```

---

### Exemplo 2: Correção de Bug

**No Mac:**
```bash
cd /Users/brunomelin/email-dash

# Corrigir bug
# ... editar arquivos ...

# Commit
git add .
git commit -m "fix: resolve date filter bug on automations page"
git push
```

**No servidor:**
```bash
ssh deploy@SEU_IP
cd ~/apps/email-dash
./deploy.sh
```

---

### Exemplo 3: Atualização de Documentação

**No Mac:**
```bash
cd /Users/brunomelin/email-dash

# Atualizar docs
nano DEPLOY-DIGITAL-OCEAN.md

# Commit
git add DEPLOY-DIGITAL-OCEAN.md
git commit -m "docs: update deployment guide with GitHub workflow"
git push
```

**No servidor:**
```bash
# Não precisa fazer deploy para docs!
# Mas se quiser atualizar:
ssh deploy@SEU_IP
cd ~/apps/email-dash
git pull origin main
```

---

## 🔀 Branches e Estratégias

### Estratégia Simples (Atual)

```
main (produção)
  └─ Push direto
```

**Quando usar**: Projetos pequenos, time pequeno, você é o único desenvolvedor.

---

### Estratégia com Branches (Recomendada)

```
main (produção)
  ↑ merge
develop (staging)
  ↑ merge
feature/nova-funcionalidade
```

**Como fazer:**

**Criar feature:**
```bash
# No Mac
cd /Users/brunomelin/email-dash
git checkout -b feature/export-csv

# Desenvolver...
git add .
git commit -m "feat: implement CSV export"
git push -u origin feature/export-csv

# No GitHub: Criar Pull Request
# Após review, fazer merge para main
```

**Deploy:**
```bash
# No servidor
cd ~/apps/email-dash
./deploy.sh  # Sempre puxa de 'main'
```

---

## 🛡️ Boas Práticas

### ✅ DO (Faça)

1. **Sempre teste localmente antes de fazer push**
   ```bash
   npm run build
   npm run start
   # Testar a aplicação
   ```

2. **Use mensagens de commit descritivas**
   ```bash
   ✅ git commit -m "feat: add CSV export to campaigns page"
   ❌ git commit -m "update"
   ```

3. **Faça commits pequenos e frequentes**
   ```bash
   # Melhor fazer 3 commits pequenos
   git commit -m "feat: add CSV export button"
   git commit -m "feat: implement CSV generation logic"
   git commit -m "style: improve button styling"
   
   # Do que 1 commit gigante
   git commit -m "add everything"
   ```

4. **Sempre verifique o status antes de commitar**
   ```bash
   git status
   git diff
   ```

5. **Faça backup do `.env.production` do servidor**
   ```bash
   # No servidor
   cp ~/apps/email-dash/.env.production ~/email-dash-env-backup.txt
   ```

---

### ❌ DON'T (Não Faça)

1. **Nunca commite arquivos `.env`**
   ```bash
   # Já está no .gitignore, mas verificar:
   git status
   # Se aparecer .env, fazer:
   git reset HEAD .env
   ```

2. **Nunca commite `node_modules`**
   ```bash
   # Já está no .gitignore
   ```

3. **Nunca faça `git push --force` na main**
   ```bash
   ❌ git push --force origin main
   ```

4. **Nunca edite código direto no servidor**
   ```bash
   # ❌ Errado
   ssh deploy@SEU_IP
   nano ~/apps/email-dash/src/app/page.tsx
   
   # ✅ Correto
   # Editar no Mac → git push → deploy.sh
   ```

---

## 🐛 Troubleshooting

### Problema: "Already up to date" mas código não atualizou

**Solução:**
```bash
# No servidor
cd ~/apps/email-dash
git status  # Ver se tem mudanças locais
git stash   # Guardar mudanças locais
git pull origin main
./deploy.sh
```

---

### Problema: "Cannot pull with rebase: You have unstaged changes"

**Solução:**
```bash
# No servidor
cd ~/apps/email-dash
git stash
git pull origin main
npm run build
pm2 restart email-dashboard
```

---

### Problema: Deploy falhou (build error)

**Solução:**
```bash
# No servidor
cd ~/apps/email-dash

# Ver logs
pm2 logs email-dashboard --lines 50

# Tentar build manualmente
npm run build

# Se falhar, verificar:
# 1. Dependências instaladas?
npm install

# 2. Prisma gerado?
npx prisma generate

# 3. .env.production existe?
cat .env.production
```

---

### Problema: Mudanças não aparecem no site

**Checklist:**
```bash
# 1. Código está no GitHub?
# No Mac:
git log -1  # Ver último commit
git push origin main

# 2. Servidor puxou o código?
# No servidor:
cd ~/apps/email-dash
git log -1  # Deve ser o mesmo commit

# 3. Build foi feito?
ls -la .next  # Deve ter arquivos recentes

# 4. PM2 reiniciou?
pm2 status
pm2 restart email-dashboard

# 5. Limpar cache do browser
# Ctrl + Shift + R (Mac: Cmd + Shift + R)
```

---

## 📊 Comandos Úteis

### No Mac (Local)

```bash
# Ver status
git status
git log --oneline -5

# Ver diferenças
git diff
git diff --staged

# Ver histórico
git log --graph --oneline --all

# Desfazer mudanças
git checkout -- arquivo.txt  # Desfazer mudanças não commitadas
git reset HEAD~1  # Desfazer último commit (mantém mudanças)
```

### No Servidor (Digital Ocean)

```bash
# Ver status da aplicação
pm2 status
pm2 logs email-dashboard --lines 20

# Ver commit atual
cd ~/apps/email-dash
git log -1

# Ver branch
git branch

# Fazer deploy
./deploy.sh

# Reiniciar manualmente
pm2 restart email-dashboard
```

---

## 📅 Frequência Recomendada

### Durante Desenvolvimento Ativo

- **Commits**: Várias vezes ao dia
- **Push para GitHub**: 1-3x por dia
- **Deploy em produção**: 1x por dia (ou ao final de cada feature)

### Em Manutenção

- **Commits**: Conforme necessário
- **Push para GitHub**: Ao concluir correção/feature
- **Deploy em produção**: Imediatamente após teste bem-sucedido

---

## 🎯 Resumo Rápido

**Workflow em 2 passos:**

```bash
# 1. No Mac
cd /Users/brunomelin/email-dash
git add . && git commit -m "feat: sua mudança" && git push

# 2. No servidor
ssh deploy@SEU_IP
cd ~/apps/email-dash && ./deploy.sh
```

**Pronto!** 🎉

---

## 🔗 Links Úteis

- **Repositório GitHub**: https://github.com/brunomelin/email-dash
- **Dashboard**: https://email.suaempresa.com
- **Guia completo de deploy**: `DEPLOY-DIGITAL-OCEAN.md`
- **Guia de GitHub**: `SUBIR-PARA-GITHUB.md`

---

**Última atualização**: Dezembro 2024  
**Workflow**: Mac → GitHub → Digital Ocean

