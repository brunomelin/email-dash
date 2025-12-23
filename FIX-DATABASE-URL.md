# 🔧 Correção: DATABASE_URL não encontrada

## ❌ Problema

O Prisma está procurando a variável `DATABASE_URL` no arquivo `.env`, mas você criou `.env.production`.

O Prisma por padrão lê apenas o arquivo `.env` (sem sufixo).

---

## ✅ Solução (ESCOLHA UMA)

### Opção 1: Criar arquivo .env (RECOMENDADO ⭐)

**No servidor, dentro de `~/apps/email-dash`:**

```bash
# Copiar .env.production para .env
cp .env.production .env

# OU criar do zero
nano .env
```

**Conteúdo do `.env`:**

```env
DATABASE_URL="postgresql://email_dash_user:SUA_SENHA_AQUI@localhost:5432/email_dash"
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://email.suaempresa.com
```

**Salvar:** Ctrl+O, Enter, Ctrl+X

**Agora rodar novamente:**

```bash
npx prisma generate
npx prisma migrate deploy
npm run build
```

---

### Opção 2: Exportar variável temporariamente

```bash
# No servidor
export DATABASE_URL="postgresql://email_dash_user:SUA_SENHA@localhost:5432/email_dash"

# Verificar se funcionou
echo $DATABASE_URL

# Rodar comandos
npx prisma generate
npx prisma migrate deploy
npm run build
```

> ⚠️ **Atenção**: Esta opção é temporária! Ao fechar o terminal, perde a variável.

---

## 🎯 Recomendação

**Use a Opção 1** (criar arquivo `.env`). É mais seguro, permanente e o padrão esperado pelo Prisma.

---

## 🔐 Segurança

**IMPORTANTE**: O arquivo `.env` está no `.gitignore`, então suas senhas não vão para o GitHub. ✅

Verifique:

```bash
cat .gitignore | grep .env
# Deve aparecer: .env*
```

---

## 📚 Referências

- Documentação Prisma: https://www.prisma.io/docs/guides/development-environment/environment-variables
- Deploy guides: `DEPLOY-RAPIDO.md`, `DEPLOY-DIGITAL-OCEAN.md`

