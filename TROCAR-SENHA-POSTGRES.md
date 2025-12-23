# 🔐 Trocar Senha do PostgreSQL

## 🎯 Objetivo

Trocar a senha atual `8R$B8)oxBfeP5wD#%u` (com caracteres especiais problemáticos) para uma senha **simples e forte** sem caracteres especiais.

---

## ✅ Passo a Passo (NO SERVIDOR)

### 1️⃣ Conectar ao PostgreSQL

```bash
# No servidor (SSH)
sudo -u postgres psql
```

---

### 2️⃣ Alterar a Senha do Usuário

**Dentro do PostgreSQL:**

```sql
-- Alterar senha (escolha uma senha forte sem caracteres especiais)
ALTER USER email_dash_user WITH PASSWORD 'senhagay';

-- OU use uma senha mais simples (ainda forte)
ALTER USER email_dash_user WITH PASSWORD 'EmailDash2024Strong';

-- Verificar
\du email_dash_user

-- Sair
\q
```

> 💡 **Recomendação de senha**: 
> - Mínimo 16 caracteres
> - Mistura de letras maiúsculas, minúsculas e números
> - **SEM** caracteres especiais: `$ # % ( ) @ & * < > | \ /`
> - Exemplo bom: `EmailDashProd2024Secure`

---

### 3️⃣ Atualizar o Arquivo .env

**No servidor:**

```bash
# Ir para o diretório do projeto
cd ~/apps/email-dash

# Editar o .env
nano .env
```

**Alterar a linha DATABASE_URL:**

```env
# ANTES (senha antiga codificada)
DATABASE_URL="postgresql://email_dash_user:8R%24B8%29oxBfeP5wD%23%25u@localhost:5432/email_dash"

# DEPOIS (senha nova simples - sem codificação necessária)
DATABASE_URL="postgresql://email_dash_user:senhagay@localhost:5432/email_dash"
```

**Arquivo .env completo:**

```env
DATABASE_URL="postgresql://email_dash_user:EmailDashProd2024Secure@localhost:5432/email_dash"
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://crazymail.costaventures.com.br
```

**Salvar:** Ctrl+X → Y → Enter

---

### 4️⃣ Testar a Conexão

```bash
# No servidor, dentro de ~/apps/email-dash
# Testar se o Prisma consegue conectar com a nova senha
npx prisma db pull
```

Se retornar sem erros → **Senha funcionando!** ✅

---

### 5️⃣ Continuar o Deploy

Agora pode continuar normalmente:

```bash
# No servidor
npx prisma migrate deploy
npm run build
```

---

## 🔒 Segurança

### ✅ Senhas BOAS (sem caracteres especiais que causam problemas em URLs)

```
EmailDashProd2024Secure
MinhaSenh4F0rte2024
PostgresDB2024Strong
SecurePass123ABC456
```

### ❌ Senhas PROBLEMÁTICAS (com caracteres especiais que precisam encoding)

```
8R$B8)oxBfeP5wD#%u  ← atual (problemática)
Pass@word#123       ← precisa encoding
Senh@!2024$         ← precisa encoding
```

---

## 📝 Resumo dos Comandos

```bash
# 1. Conectar ao PostgreSQL
sudo -u postgres psql

# 2. Dentro do PostgreSQL
ALTER USER email_dash_user WITH PASSWORD 'EmailDashProd2024Secure';
\q

# 3. Editar .env
cd ~/apps/email-dash
nano .env
# Mudar a linha DATABASE_URL com a nova senha
# Salvar: Ctrl+X → Y → Enter

# 4. Testar
npx prisma db pull

# 5. Se funcionar, continuar
npx prisma migrate deploy
npm run build
```

---

## 💡 Dica Pro

Depois de tudo funcionando, **anote a nova senha em um lugar seguro** (gerenciador de senhas, 1Password, LastPass, etc.)!

---

## 🎯 Vantagens da Nova Senha

✅ Não precisa encoding (URL encoding)  
✅ Funciona direto no .env  
✅ Mais fácil de gerenciar  
✅ Ainda é forte e segura  
✅ Sem problemas com caracteres especiais  

---

**Boa sorte!** 🚀

