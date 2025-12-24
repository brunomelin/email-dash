# 🔐 Como Entrar no Banco de Dados PostgreSQL

## ⚠️ O Problema:
```
Peer authentication failed for user "email_dash_user"
```

Isso acontece porque o PostgreSQL está configurado para pedir senha, mas você não está fornecendo.

---

## ✅ **SOLUÇÃO 1: Usar variável de ambiente (RECOMENDADO)**

### No servidor, execute:

```bash
# 1. Exportar senha (temporariamente nesta sessão)
export PGPASSWORD="SUA_SENHA_AQUI"

# 2. Conectar no banco
psql -U email_dash_user -d email_dash

# Exemplo se a senha for "minhasenha123":
export PGPASSWORD="minhasenha123"
psql -U email_dash_user -d email_dash
```

---

## ✅ **SOLUÇÃO 2: Conectar com usuário postgres (se tiver acesso root)**

```bash
# Como root ou com sudo
sudo -u postgres psql

# Depois, dentro do psql:
\c email_dash
```

---

## ✅ **SOLUÇÃO 3: Passar senha na linha de comando**

```bash
PGPASSWORD="SUA_SENHA" psql -U email_dash_user -d email_dash
```

---

## 🚀 **EXECUTAR O SCRIPT DE DEBUG**

### Passo 1: Tornar o script executável
```bash
cd /root/apps/email-dash
chmod +x debug-automacoes.sh
```

### Passo 2: Exportar a senha
```bash
export PGPASSWORD="SUA_SENHA_AQUI"
export DB_PASSWORD="SUA_SENHA_AQUI"  # Para o script
```

### Passo 3: Executar o script
```bash
./debug-automacoes.sh
```

### Passo 4: Ver os resultados
```bash
# O script vai criar um arquivo em /tmp/debug-automacoes-*.txt
# Para ver o último arquivo criado:
cat /tmp/debug-automacoes-*.txt | tail -1000
```

---

## 🔍 **SE NÃO SOUBER A SENHA:**

### Opção A: Verificar no .env
```bash
cat /root/apps/email-dash/.env | grep DATABASE_URL
```

A senha está na URL depois de `postgresql://email_dash_user:`

**Exemplo:**
```
DATABASE_URL="postgresql://email_dash_user:SENHA@localhost:5432/email_dash"
                                         ↑↑↑↑↑↑
                                       Esta é a senha
```

### Opção B: Resetar a senha do usuário

```bash
# Como root
sudo -u postgres psql

# Dentro do psql:
ALTER USER email_dash_user WITH PASSWORD 'nova_senha_segura';
\q

# Depois atualizar no .env
nano /root/apps/email-dash/.env
# Mudar a senha na DATABASE_URL
```

---

## 📋 **COMANDOS ÚTEIS NO PSQL:**

```sql
-- Ver todas as tabelas
\dt

-- Ver estrutura de uma tabela
\d campaigns

-- Ver contas
SELECT id, name FROM accounts;

-- Sair
\q
```

---

## 🎯 **RESUMO RÁPIDO:**

```bash
# NO SERVIDOR:

# 1. Pegar senha do .env
grep DATABASE_URL /root/apps/email-dash/.env

# 2. Exportar senha (substituir SENHA pela senha real)
export PGPASSWORD="SENHA"
export DB_PASSWORD="SENHA"

# 3. Copiar script de debug
cd /root/apps/email-dash
# (baixar ou colar o conteúdo do debug-automacoes.sh)

# 4. Executar script
chmod +x debug-automacoes.sh
./debug-automacoes.sh

# 5. Ver resultados
ls -lh /tmp/debug-automacoes-*.txt
cat /tmp/debug-automacoes-*.txt
```

---

## ⚡ **ALTERNATIVA: Executar queries manualmente**

Se o script não funcionar, você pode executar as queries uma por uma:

```bash
# Conectar no banco
PGPASSWORD="SUA_SENHA" psql -U email_dash_user -d email_dash

# Dentro do psql, colar as queries do arquivo QUERIES-DEBUG-AUTOMACOES.sql
```

