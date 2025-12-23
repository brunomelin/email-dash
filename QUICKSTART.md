# 🚀 Quick Start - Email Dashboard

## Setup em 5 Minutos

### 1. Instalar dependências
```bash
npm install
```

### 2. Criar arquivo `.env` na raiz
```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/email_dash"

ACCOUNT_A_BASE_URL="https://youraccountA.api-us1.com"
ACCOUNT_A_API_KEY="your-api-key-here"

ACCOUNT_B_BASE_URL="https://youraccountB.api-us1.com"
ACCOUNT_B_API_KEY="your-api-key-here"
```

### 3. Rodar migrations
```bash
npx prisma migrate dev --name init
```

### 4. Popular contas
```bash
npm run db:seed
```

### 5. Rodar servidor
```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

## Estrutura de Comandos

```bash
# Development
npm run dev              # Inicia servidor dev

# Database
npm run db:migrate       # Cria/roda migrations
npm run db:push          # Push schema (sem migration)
npm run db:studio        # GUI do banco (Prisma Studio)
npm run db:seed          # Popula contas iniciais

# Build
npm run build            # Build de produção
npm run start            # Roda build de produção
```

---

## Troubleshooting Rápido

**Erro de conexão com banco?**
- Certifique-se que PostgreSQL está rodando
- Teste a conexão: `psql postgresql://user:password@localhost:5432/email_dash`

**Erro "Prisma Client not generated"?**
```bash
npx prisma generate
```

**Tabelas não existem?**
```bash
npx prisma migrate dev
```

**Contas não aparecem no dashboard?**
```bash
npm run db:seed
```

**Dashboard vazio após sync?**
- Verifique credenciais da API no `.env`
- Veja logs no terminal durante o sync
- Abra Prisma Studio para checar dados: `npm run db:studio`

---

## Estrutura dos Dados

### Credenciais Multi-Account

Adicione quantas contas quiser no `.env`:

```bash
ACCOUNT_A_BASE_URL="..."
ACCOUNT_A_API_KEY="..."

ACCOUNT_B_BASE_URL="..."
ACCOUNT_B_API_KEY="..."

ACCOUNT_C_BASE_URL="..."
ACCOUNT_C_API_KEY="..."
```

O seed script (`npm run db:seed`) busca automaticamente todas as variáveis `ACCOUNT_*` e cria registros no banco.

### Como Obter Credenciais do ActiveCampaign

1. Login no ActiveCampaign
2. **Settings** → **Developer**
3. Copie:
   - **API URL** (ex: `https://account.api-us1.com`) → `ACCOUNT_X_BASE_URL`
   - **API Key** → `ACCOUNT_X_API_KEY`

---

## Sincronização de Dados

### Primeira vez:
1. Abra o dashboard
2. Clique em **"Sync Todas"** ou no botão de uma conta específica
3. Aguarde (pode demorar 30s-2min dependendo do volume)
4. Métricas aparecerão automaticamente

### Atualizações:
- Clique em **"Sync"** sempre que quiser atualizar
- Dados são sobrescritos/atualizados (upsert)
- Futuramente: sync automático via cron

---

## Arquitetura Rápida

```
Frontend (Next.js)
    ↓
Server Actions (sync.ts)
    ↓
Sync Service
    ↓
ActiveCampaign Connector (HTTP client)
    ↓
ActiveCampaign API v3
    ↓
Normalizer (raw → schema)
    ↓
PostgreSQL (via Prisma)
```

**Multi-tenancy**: Chaves compostas `[accountId, id]` porque IDs do AC não são globais.

---

Pronto! 🎉 Agora é só rodar e sincronizar seus dados.

