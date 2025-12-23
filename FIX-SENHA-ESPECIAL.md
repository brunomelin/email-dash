# 🔐 Correção: Senha com Caracteres Especiais

## ❌ Problema

Sua senha PostgreSQL: `8R$B8)oxBfeP5wD#%u`

Tem caracteres especiais que quebram a URL do banco de dados:
- `$` → causa erro "invalid port number"
- `)`, `(`, `#`, `%` → também problemáticos

---

## ✅ Solução: Codificar a Senha (URL Encoding)

### Senha Original vs Codificada

| Caractere | Código URL |
|-----------|------------|
| `$`       | `%24`      |
| `)`       | `%29`      |
| `(`       | `%28`      |
| `#`       | `%23`      |
| `%`       | `%25`      |

**Senha original**: `8R$B8)oxBfeP5wD#%u`  
**Senha codificada**: `8R%24B8%29oxBfeP5wD%23%25u`

---

## 🔧 Corrigir o .env

**No servidor, editar o arquivo:**

```bash
# Dentro de ~/apps/email-dash
nano .env
```

**Alterar a linha DATABASE_URL para:**

```env
DATABASE_URL="postgresql://email_dash_user:8R%24B8%29oxBfeP5wD%23%25u@localhost:5432/email_dash"
```

> ✅ Note que substituímos:
> - `$` por `%24`
> - `)` por `%29`
> - `#` por `%23`
> - `%` por `%25`

**Salvar:** Ctrl+X → Y → Enter

---

## 🚀 Testar a Conexão

```bash
# Testar se o Prisma consegue conectar
npx prisma migrate deploy

# Se funcionar, continuar o build
npm run build
```

---

## 💡 Alternativa: Mudar a Senha (Mais Simples)

Se preferir, pode criar uma senha **sem caracteres especiais** no PostgreSQL:

```bash
# Conectar ao PostgreSQL
sudo -u postgres psql

# Dentro do PostgreSQL
ALTER USER email_dash_user WITH PASSWORD 'senhaForte123SemCaracteresEspeciais';
\q
```

Depois atualizar o `.env`:

```env
DATABASE_URL="postgresql://email_dash_user:senhaForte123SemCaracteresEspeciais@localhost:5432/email_dash"
```

---

## 🎯 Recomendação

Use a **primeira opção** (codificar a senha) para manter a senha forte atual.

Ou use a **segunda opção** (mudar senha) se quiser algo mais simples de gerenciar.

