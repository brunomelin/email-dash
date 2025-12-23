# 🔄 Atualizar Código no Servidor

## ✅ Passo 1: Código já foi enviado para o GitHub

```
✓ Commit: "fix: corrigir erro TypeScript em accounts.ts e atualizar guias de deploy"
✓ Push: Enviado para https://github.com/brunomelin/email-dash.git
✓ Branch: main
```

---

## 🚀 Passo 2: Atualizar no Servidor

**Abra um novo terminal e execute:**

### 1️⃣ Conectar ao servidor

```bash
ssh root@164.90.123.45
# Senha: 8R$B8)oxBfeP5wD#%u
```

---

### 2️⃣ Ir para o diretório do projeto

```bash
cd /home/deploy/apps/email-dash
```

Ou se estiver como usuário deploy:

```bash
cd ~/apps/email-dash
```

---

### 3️⃣ Atualizar o código do GitHub

```bash
git pull origin main
```

Você verá algo como:

```
remote: Counting objects: 15, done.
remote: Compressing objects: 100% (8/8), done.
remote: Total 15 (delta 10), reused 15 (delta 10)
Unpacking objects: 100% (15/15), done.
From https://github.com/brunomelin/email-dash
 * branch            main       -> FETCH_HEAD
   fa53d4c..9f0c0a1  main       -> origin/main
Updating fa53d4c..9f0c0a1
Fast-forward
 CHECKLIST-DEPLOY.md              |  10 +-
 CORRECAO-DEPLOY.md               | 179 +++++++++++++++++++++++
 DEPLOY-DIGITAL-OCEAN.md          |  15 +-
 DEPLOY-RAPIDO.md                 |  21 ++-
 FIX-DATABASE-URL.md              |  88 +++++++++++
 FIX-SENHA-ESPECIAL.md            |  94 ++++++++++++
 TROCAR-SENHA-POSTGRES.md         | 169 ++++++++++++++++++++++
 WORKFLOW-DEPLOY.md               | 142 +++++++++++++++++
 src/app/actions/accounts.ts      |   2 +-
 9 files changed, 1146 insertions(+), 85 deletions(-)
```

---

### 4️⃣ Rebuild da aplicação

```bash
npm run build
```

⏱️ Aguarde 2-5 minutos para o build completar.

---

### 5️⃣ Reiniciar PM2 (se já estiver configurado)

```bash
pm2 restart email-dashboard
```

Ou se ainda não configurou PM2, continue seguindo o guia `DEPLOY-DIGITAL-OCEAN.md` a partir da seção de PM2.

---

## ✅ Pronto!

Seu servidor agora está com o código atualizado do GitHub! 🎉

---

## 🐛 Se der erro no git pull

Se aparecer erro tipo "local changes would be overwritten", faça:

```bash
# Salvar alterações locais (se houver)
git stash

# Atualizar
git pull origin main

# Reaplicar alterações (se necessário)
git stash pop
```

---

## 📝 Resumo do que foi atualizado

1. ✅ `src/app/actions/accounts.ts` - Corrigido erro TypeScript
2. ✅ Guias de deploy atualizados com instruções corretas
3. ✅ Novos guias criados:
   - `FIX-DATABASE-URL.md`
   - `FIX-SENHA-ESPECIAL.md`
   - `TROCAR-SENHA-POSTGRES.md`
   - `CORRECAO-DEPLOY.md`
   - `WORKFLOW-DEPLOY.md`

---

**Agora execute os comandos acima no servidor!** 🚀

