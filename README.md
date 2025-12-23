# 📊 Email Dashboard - ActiveCampaign Multi-Account

Dashboard web para exibir métricas de engajamento de email marketing consolidando dados de **múltiplas contas do ActiveCampaign**.

## 🎯 Funcionalidades (MVP - Fase 1)

✅ **Multi-account**: Suporte a múltiplas contas ActiveCampaign  
✅ **KPIs Consolidados**: Visão agregada de envios, aberturas, cliques, CTR, CTOR  
✅ **Tabela de Campanhas**: Listagem com filtros e busca  
✅ **Sincronização Manual**: Botão para sincronizar dados sob demanda  
✅ **Schema Normalizado**: Dados padronizados independente da conta  

## 🏗️ Stack Tecnológica

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Banco de Dados**: PostgreSQL + Prisma ORM
- **UI**: shadcn/ui + Tailwind CSS
- **API**: ActiveCampaign v3
- **Deploy Ready**: Vercel / Railway / qualquer Node.js host

## 📋 Pré-requisitos

- Node.js 18+ e npm/pnpm/yarn
- PostgreSQL 14+ rodando localmente ou remoto
- Credenciais de API do ActiveCampaign (API Key + Base URL)

## 🚀 Setup e Instalação

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Banco de Dados

Crie um banco PostgreSQL e configure a URL no `.env`:

```bash
# .env ou .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/email_dash?schema=public"
```

### 3. Configurar Contas do ActiveCampaign

Adicione as credenciais das suas contas no `.env`:

```bash
# Account 1
ACCOUNT_A_BASE_URL="https://youraccountA.api-us1.com"
ACCOUNT_A_API_KEY="sua-api-key-aqui"

# Account 2
ACCOUNT_B_BASE_URL="https://youraccountB.api-us1.com"
ACCOUNT_B_API_KEY="sua-api-key-aqui"

# Adicione mais contas seguindo o padrão ACCOUNT_<NOME>_*
```

**Como obter as credenciais:**
1. Login no ActiveCampaign
2. Vá em **Settings** → **Developer**
3. Copie a **API URL** (base URL) e **API Key**

### 4. Rodar Migrations do Prisma

```bash
npm run db:migrate
```

Isso criará todas as tabelas necessárias.

### 5. Popular Contas no Banco (Seed)

```bash
npm run db:seed
```

Isso criará registros de contas baseados nas credenciais do `.env`.

### 6. Rodar o Servidor de Desenvolvimento

```bash
npm run dev
```

Acesse: **http://localhost:3000**

## 📖 Como Usar

### Primeira Sincronização

1. Acesse o dashboard
2. Clique em **"Sync Todas"** ou no botão de sync de uma conta específica
3. Aguarde a sincronização (pode demorar dependendo do volume de dados)
4. Os dados aparecerão automaticamente após a conclusão

### Sincronizações Subsequentes

- Clique em **"Sync"** sempre que quiser atualizar os dados
- A sincronização sobrescreve/atualiza campanhas, listas e automações existentes
- Futuramente será implementado sync automático via cron

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

- **accounts**: Contas do ActiveCampaign
- **campaigns**: Campanhas de email com métricas
- **lists**: Listas de contatos
- **automations**: Automações (métricas limitadas pela API)
- **campaign_lists**: Relacionamento many-to-many entre campanhas e listas
- **sync_jobs**: Histórico de sincronizações

### Chaves Compostas

⚠️ **Importante**: IDs do ActiveCampaign **não são globais** entre contas.  
Por isso, usamos chaves primárias compostas `@@id([accountId, id])` em `campaigns`, `lists` e `automations`.

## 🔍 Métricas Disponíveis

### KPIs Principais

- **Enviados** (sent)
- **Aberturas Únicas** (uniqueOpens)
- **Taxa de Abertura** (openRate = uniqueOpens / sent)
- **Cliques Únicos** (uniqueClicks)
- **CTR** (clickRate = uniqueClicks / sent)
- **CTOR** (clickToOpenRate = uniqueClicks / uniqueOpens)

### Outras Métricas

- Bounces (hard + soft)
- Unsubscribes
- Bounce Rate
- Unsubscribe Rate

**Definições em**: `src/lib/metrics-definitions.ts` (camada extensível para novas métricas)

## ⚠️ Limitações Conhecidas (ActiveCampaign API v3)

### Campanhas
✅ Métricas completas disponíveis (opens, clicks, bounces, etc)  
⚠️ Métricas já vêm agregadas; não há histórico granular via API pública

### Automações
⚠️ API limitada: apenas `entered`, `exited` disponíveis  
❌ Não há métricas de emails enviados por automação (opens/clicks)  
💡 **Workaround futuro**: Identificar messages/emails associados (não trivial)

### Rate Limiting
- ~5 requisições/segundo por conta
- Retry automático com exponential backoff implementado
- Sincronização pode demorar com muitas campanhas

## 📁 Estrutura de Pastas

```
/email-dash
├── prisma/
│   ├── schema.prisma          # Schema do banco
│   ├── migrations/            # Migrations
│   └── seed.ts                # Seed de contas
├── src/
│   ├── app/
│   │   ├── actions/           # Server Actions (sync)
│   │   ├── layout.tsx
│   │   └── page.tsx           # Dashboard principal
│   ├── components/
│   │   ├── ui/                # shadcn components
│   │   └── dashboard/         # Componentes do dashboard
│   └── lib/
│       ├── connectors/
│       │   └── activecampaign/  # Cliente e normalizers da API
│       ├── services/
│       │   └── sync-service.ts  # Orquestração de sync
│       ├── db.ts              # Prisma client
│       ├── metrics-definitions.ts
│       └── utils.ts
└── README.md
```

## 🛠️ Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Rodar build de produção
npm run db:migrate   # Rodar migrations
npm run db:push      # Push schema (sem migration)
npm run db:studio    # Abrir Prisma Studio (GUI do banco)
npm run db:seed      # Popular contas no banco
```

## 🔮 Próximas Fases (Roadmap)

### Fase 2 - Multi-account e Filtros
- [ ] Filtros por data (range picker)
- [ ] Filtros por conta, lista, campanha
- [ ] Paginação otimizada
- [ ] Cache com revalidação (5min)

### Fase 3 - Listas e Relacionamentos
- [ ] Página dedicada para listas
- [ ] Filtrar campanhas por lista
- [ ] Métricas de engajamento por lista

### Fase 4 - Automações
- [ ] Melhorar métricas de automação (melhor esforço)
- [ ] Identificar emails de automação via API
- [ ] Documentar limitações e alternativas

### Fase 5 - Polimento
- [ ] Logs estruturados (Winston/Pino)
- [ ] Tratamento robusto de erros
- [ ] Testes automatizados
- [ ] Sync automático (cron/Vercel Cron)
- [ ] Exportar dados (CSV/Excel)

## 🤝 Como Adicionar Novas Métricas

Graças à camada de **metric definitions** (`src/lib/metrics-definitions.ts`):

1. Adicione a definição em `METRICS`:
```typescript
newMetric: {
  key: 'newMetric',
  label: 'Nova Métrica',
  format: (n) => n.toFixed(2),
  aggregation: 'sum', // ou 'avg', 'rate', 'custom'
  dependencies: ['dependency1', 'dependency2'], // se aplicável
  calculate: (data) => data.dependency1 / data.dependency2, // se rate/custom
}
```

2. A métrica estará disponível automaticamente para:
   - Cálculos agregados via `calculateAggregatedMetrics()`
   - Formatação via `formatMetric()`
   - Inclusão em KPIs ou tabelas

## 📝 Notas Técnicas

### Por que Chaves Compostas?

Duas contas diferentes podem ter a mesma `campaignId=123`. Sem chave composta `[accountId, id]`, teríamos conflitos de PK.

### Por que Join Table (CampaignList)?

Prisma não suporta foreign keys em arrays (`listIds String[]`). A join table garante integridade referencial e queries eficientes.

### CTR vs CTOR

- **CTR** (Click Rate): `uniqueClicks / sent` - percentual de quem clicou sobre envios
- **CTOR** (Click-to-Open Rate): `uniqueClicks / uniqueOpens` - percentual de quem clicou sobre quem abriu

Ambos são importantes para análises diferentes.

## 🐛 Troubleshooting

### Erro: "P2002 Unique constraint failed"
- Provavelmente problema com chave composta
- Rode `npm run db:push` novamente ou delete e recrie o banco

### Erro: "ActiveCampaign API error: 401"
- Verifique se API Key e Base URL estão corretos no `.env`
- Teste as credenciais diretamente no ActiveCampaign

### Sincronização muito lenta
- Normal para contas com muitas campanhas (1000+)
- Considere limitar o range de datas no futuro
- Rate limiting da API (~5 req/s) também afeta

### Dashboard vazio após sync
- Verifique logs do console durante o sync
- Abra Prisma Studio (`npm run db:studio`) e veja se os dados foram gravados
- Cheque se as contas estão `isActive: true`

## 📄 Licença

MIT

## 🙋 Suporte

Para dúvidas ou problemas:
1. Verifique os logs no console do navegador e do servidor
2. Rode `npm run db:studio` para inspecionar o banco
3. Confira a [documentação da API do ActiveCampaign](https://developers.activecampaign.com/reference)

---

**Desenvolvido com Next.js + Prisma + ActiveCampaign API**

