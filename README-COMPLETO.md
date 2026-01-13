# 📚 Email Dashboard - Documentação Completa

**Data de Criação:** 13 de Janeiro de 2026  
**Versão:** 1.0  
**Status:** Projeto em Produção

---

## 🎯 O que é este projeto?

**Email Dashboard** é uma aplicação web que consolida métricas de **múltiplas contas do ActiveCampaign** em um único painel centralizado. Construído com **Next.js 15**, **TypeScript**, **Prisma ORM** e **PostgreSQL**.

### Principais Recursos

✅ **Multi-tenant**: Gerencia múltiplas contas ActiveCampaign  
✅ **Sincronização automática**: Cron job a cada 4 horas  
✅ **Métricas agregadas**: KPIs consolidados de todas as contas  
✅ **Filtros avançados**: Por conta, lista, período de data  
✅ **Dashboard em tempo real**: Taxas de abertura, cliques, CTR, CTOR  
✅ **Monitoramento de limites**: Alertas quando próximo do limite de contatos  

---

## 📋 Índice da Documentação

### 📊 Documentos Principais

1. **[ANALISE-PROFUNDA-PROJETO.md](./ANALISE-PROFUNDA-PROJETO.md)** ⭐ **COMECE AQUI**
   - Visão geral completa da arquitetura
   - Análise de todas as camadas (Frontend, Backend, Services)
   - Padrões de código e boas práticas
   - Pontos fortes e sugestões de melhoria
   - **Ideal para**: Entender o projeto como um todo

2. **[MAPEAMENTO-REQUISICOES-API.md](./MAPEAMENTO-REQUISICOES-API.md)**
   - Todas as requisições HTTP ao ActiveCampaign
   - Headers, query parameters, estrutura de resposta
   - API v3 vs API v1 (e quando usar cada uma)
   - Rate limiting e estratégias de retry
   - cURL e Postman examples
   - **Ideal para**: Entender integração com ActiveCampaign

3. **[ANALISE-BANCO-DE-DADOS.md](./ANALISE-BANCO-DE-DADOS.md)**
   - Schema completo do PostgreSQL
   - Diagrama de relacionamentos (ERD)
   - Chaves compostas e multi-tenancy
   - Queries SQL de análise e diagnóstico
   - Performance e otimizações
   - **Ideal para**: Entender estrutura de dados

4. **[ARCHITECTURE.md](./ARCHITECTURE.md)**
   - Documentação original da arquitetura
   - Fluxos de sincronização
   - Decisões arquiteturais
   - Como adicionar novas funcionalidades

### 🔧 Documentos Operacionais

5. **[SOLUCAO-ERRO-403.md](./SOLUCAO-ERRO-403.md)**
   - Troubleshooting de erro 403 Forbidden
   - Diagnóstico de API Keys inválidas
   - Scripts de teste e correção

6. **[QUICKSTART.md](./QUICKSTART.md)**
   - Como rodar o projeto localmente
   - Instalação e configuração
   - Primeiros passos

7. **[QUICK-START-ACCOUNTS.md](./QUICK-START-ACCOUNTS.md)**
   - Como adicionar e gerenciar contas
   - Testar conexões
   - Sincronização manual

### 📝 Documentos de Contexto

8. **[FASE-*-COMPLETA.md](./)**
   - Histórico de fases de implementação
   - Funcionalidades adicionadas por fase
   - Decisões técnicas tomadas

9. **[FIX-*.md](./)**
   - Histórico de bugs corrigidos
   - Soluções implementadas
   - Aprendizados

10. **[DEPLOY-*.md](./)**
    - Instruções de deploy
    - Configuração de servidor
    - Cron jobs

---

## 🚀 Quick Start

### 1. Clonar e Instalar

```bash
git clone <repo-url>
cd email-dash
npm install
```

### 2. Configurar Banco de Dados

```bash
# Criar banco PostgreSQL
createdb email_dash

# Copiar .env
cp .env.example .env

# Editar DATABASE_URL no .env
DATABASE_URL="postgresql://user:password@localhost:5432/email_dash"

# Rodar migrations
npx prisma migrate dev
```

### 3. Adicionar Conta

1. Rodar o projeto: `npm run dev`
2. Acessar: `http://localhost:3000`
3. Ir em "Gerenciar Contas"
4. Adicionar conta do ActiveCampaign
5. Clicar em "Sync"

### 4. Ver Métricas

Dashboard mostrará automaticamente:
- Total de emails enviados
- Taxa de abertura
- Taxa de cliques
- CTOR (Click-to-Open Rate)
- Tabela de campanhas

---

## 🏗️ Arquitetura Rápida

```
Frontend (Next.js)
    ↓ Server Actions
Backend Services
    ↓ Connectors
ActiveCampaign API (v3 + v1)
    ↓
PostgreSQL
```

### Stack Tecnológica

- **Framework**: Next.js 15 (App Router, Server Components)
- **Linguagem**: TypeScript
- **Banco**: PostgreSQL
- **ORM**: Prisma
- **UI**: Radix UI + Tailwind CSS
- **Validação**: Zod
- **Gráficos**: Recharts

---

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

| Tabela | Propósito | Registros (exemplo) |
|--------|-----------|---------------------|
| `accounts` | Contas do ActiveCampaign | 22 |
| `campaigns` | Campanhas de email | 1,523 |
| `lists` | Listas de contatos | 156 |
| `automations` | Automações | 47 |
| `campaign_messages` | Envios individuais | 250,000+ |
| `campaign_lists` | Join table (many-to-many) | 3,400+ |
| `sync_jobs` | Histórico de sincronizações | 500+ |

### Conceito Chave: Chaves Compostas

```sql
PRIMARY KEY (account_id, id)
```

**Por quê?** IDs do ActiveCampaign **não são globais**. Duas contas podem ter `campaign_id=123`.

---

## 🔌 Integração com ActiveCampaign

### API v3 - Endpoints Usados

| Endpoint | Propósito |
|----------|-----------|
| `GET /campaigns` | Listar campanhas |
| `GET /campaigns/:id/campaignLists` | Listas de uma campanha |
| `GET /lists` | Listar listas |
| `GET /automations` | Listar automações |
| `GET /messages` | Envios individuais (últimos 90 dias) |
| `GET /contacts` | Contar total de contatos |

### API v1 - Por quê ainda usar?

**API v3 não suporta filtros de data** em métricas de campanha.

**API v1** tem endpoint `campaign_report_totals` que aceita `sdate` e `ldate`:

```http
GET /admin/api.php?api_action=campaign_report_totals&campaignid=123&sdate=2026-01-01&ldate=2026-01-31
```

Isso permite **filtro por período** no dashboard!

---

## 🎨 Frontend

### Componentes Principais

```
src/app/
  ├── page.tsx                 # Dashboard principal
  ├── lists/page.tsx           # Página de listas
  ├── automations/page.tsx     # Página de automações
  └── settings/accounts/       # Gerenciar contas

src/components/
  ├── dashboard/
  │   ├── kpi-cards.tsx        # Cards de métricas
  │   ├── campaigns-table.tsx  # Tabela de campanhas
  │   └── sync-button.tsx      # Botão de sincronização
  ├── filters/
  │   └── global-filters.tsx   # Filtros (conta, lista, data)
  └── ui/                      # Componentes base (Radix UI)
```

### Server Components vs Client Components

**Server Components** (padrão):
- Acesso direto ao banco de dados
- Renderização no servidor
- Sem JavaScript no cliente

**Client Components** (`'use client'`):
- Interatividade (useState, event handlers)
- Formulários, modals, dropdowns

---

## 🔄 Sincronização

### Manual

Usuário clica em "Sync" → `syncAccountAction()` → `SyncService.syncAccount()`

### Automática (Cron)

```bash
# Crontab: A cada 4 horas
0 */4 * * * cd ~/apps/email-dash && npx tsx auto-sync.js >> ~/logs/auto-sync.log 2>&1
```

**Arquivo**: `auto-sync.js`

```javascript
const { prisma } = require('@/lib/db')
const { SyncService } = require('@/lib/services/sync-service')

// Busca contas ativas
const accounts = await prisma.account.findMany({ where: { isActive: true } })

// Sincroniza em paralelo
const syncService = new SyncService()
await syncService.syncMultipleAccounts(accounts.map(a => a.id), true)
```

### Ordem de Sincronização

1. **Listas** (primeiro)
2. **Contatos** (informações agregadas)
3. **Campanhas** (requer listas)
4. **Automações** (independente)
5. **Messages** (requer campanhas, últimos 90 dias)

---

## 📈 Métricas Disponíveis

### Básicas (Soma)

- **Enviados** (`sent`)
- **Aberturas** (`opens`)
- **Aberturas Únicas** (`uniqueOpens`)
- **Cliques** (`clicks`)
- **Cliques Únicos** (`uniqueClicks`)
- **Bounces** (`bounces`)
- **Descadastros** (`unsubscribes`)

### Calculadas (Rates)

- **Taxa de Abertura** (`openRate`): `uniqueOpens / sent`
- **CTR** (`clickRate`): `uniqueClicks / sent`
- **CTOR** (`clickToOpenRate`): `uniqueClicks / uniqueOpens`
- **Taxa de Bounce** (`bounceRate`): `bounces / sent`
- **Taxa de Descadastro** (`unsubscribeRate`): `unsubscribes / sent`

### Filtros

✅ Por **conta(s)** (multi-select)  
✅ Por **lista(s)** (multi-select)  
✅ Por **período** (date range picker)  
✅ Por **status** (draft, completed, etc)

---

## 🔒 Segurança

### Atual

✅ API Keys armazenadas em banco de dados  
✅ Nunca expostas no frontend (Server Components)  
✅ Prisma protege contra SQL Injection  
✅ Validação com Zod

### Melhorias Recomendadas

⚠️ **Criptografar API Keys** no banco  
⚠️ **Adicionar autenticação** (NextAuth.js)  
⚠️ **Implementar roles** (admin, viewer)  
⚠️ **Rate limiting** em Server Actions

---

## 🛠️ Comandos Úteis

### Desenvolvimento

```bash
npm run dev              # Rodar em dev mode
npm run build            # Build de produção
npm run start            # Rodar build
npm run lint             # Linter
```

### Prisma

```bash
npx prisma studio        # GUI do banco
npx prisma migrate dev   # Criar migration
npx prisma db push       # Push sem migration
npx prisma generate      # Gerar cliente
```

### Banco de Dados

```bash
# Conectar ao banco
psql -h localhost -U email_dash_user -d email_dash

# Backup
pg_dump -h localhost -U email_dash_user -d email_dash > backup.sql

# Restore
psql -h localhost -U email_dash_user -d email_dash < backup.sql
```

### Diagnóstico

```bash
# Testar API Key de conta específica
npx tsx diagnostico-api-key.js gactv22

# Testar todas as contas
npx tsx diagnostico-api-key.js --all

# Verificar cron
cat ~/logs/auto-sync.log | tail -50
```

---

## 🐛 Troubleshooting

### Erro 403 Forbidden

**Causa**: API Key inválida ou revogada

**Solução**: Ver [SOLUCAO-ERRO-403.md](./SOLUCAO-ERRO-403.md)

### Sync muito lento

**Causa**: Muitas campanhas (1000+)

**Solução**: Normal. Paginação processa 100 por vez.

### Filtro de data retorna 0

**Causa**: Bug da API v1 quando `sdate = ldate`

**Solução**: Já corrigido no código (adiciona +1 dia ao `ldate`)

### Métricas de automação zeradas

**Limitação**: API do ActiveCampaign **não fornece** métricas de email de automação

**Disponível apenas**: `entered`, `exited`, `active`

---

## 📊 Estatísticas do Código

```
Total de Arquivos TypeScript: ~40
Componentes React: ~25
Services: 4
API Connectors: 6
Migrações SQL: 4
Linhas de Código: ~4,500
```

---

## 🎯 Roadmap Futuro

### Curto Prazo

- [ ] Adicionar testes (Jest + Playwright)
- [ ] Exportação de dados (CSV)
- [ ] Gráficos (Recharts)
- [ ] Criptografia de API Keys

### Médio Prazo

- [ ] Autenticação (NextAuth.js)
- [ ] Multi-usuário com roles
- [ ] Webhooks do ActiveCampaign
- [ ] Notificações por email

### Longo Prazo

- [ ] Cache Redis
- [ ] View materializada para KPIs
- [ ] Particionamento de tabelas
- [ ] API pública (read-only)

---

## 👥 Contribuindo

### Adicionar Nova Métrica

1. Definir em `src/lib/metrics-definitions.ts`:
   ```typescript
   conversionRate: {
     key: 'conversionRate',
     label: 'Taxa de Conversão',
     format: (n) => `${(n * 100).toFixed(2)}%`,
     aggregation: 'rate',
     calculate: (data) => data.sent > 0 ? data.conversions / data.sent : 0
   }
   ```

2. Adicionar campo no Prisma (se necessário)
3. Atualizar normalizer (se necessário)
4. Métrica aparece automaticamente no dashboard!

### Adicionar Novo Endpoint da API

1. Criar método em `src/lib/connectors/activecampaign/[nome].ts`
2. Definir tipos em `types.ts`
3. Criar função de normalização
4. Adicionar ao `SyncService`
5. Testar com conta real

---

## 📞 Suporte

### Documentação

- **Geral**: [ANALISE-PROFUNDA-PROJETO.md](./ANALISE-PROFUNDA-PROJETO.md)
- **API**: [MAPEAMENTO-REQUISICOES-API.md](./MAPEAMENTO-REQUISICOES-API.md)
- **Banco**: [ANALISE-BANCO-DE-DADOS.md](./ANALISE-BANCO-DE-DADOS.md)

### Links Úteis

- **ActiveCampaign API v3**: https://developers.activecampaign.com/reference/overview
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs

---

## ⭐ Pontos Fortes

✅ **Arquitetura sólida**: Separação clara de responsabilidades  
✅ **Type-safe**: TypeScript + Prisma end-to-end  
✅ **Multi-tenancy robusto**: Chaves compostas + isolamento  
✅ **Resiliência**: Retry, rate limiting, isolamento de falhas  
✅ **Extensibilidade**: Fácil adicionar métricas/endpoints/páginas  
✅ **Observabilidade**: Logs, histórico de syncs, diagnóstico  
✅ **Documentação**: Extensa e detalhada

---

## 📝 Licença

[Especificar licença]

---

## 🙏 Agradecimentos

Documentação gerada por **Claude (Cursor AI)** em 13 de Janeiro de 2026.

---

**Boa codificação! 🚀**

