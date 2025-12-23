# 🏗️ Arquitetura - Email Dashboard

## Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   KPI Cards  │  │  Campaigns   │  │  Sync Button │      │
│  │              │  │    Table     │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server Actions (Next.js)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  syncAccountAction()  │  syncAllAccountsAction()     │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      Services Layer                          │
│  ┌──────────────────┐        ┌──────────────────┐          │
│  │  SyncService     │        │  MetricsService  │          │
│  │                  │        │                  │          │
│  │ - syncAccount()  │        │ - getAggregated()│          │
│  │ - syncMultiple() │        │ - getByAccount() │          │
│  └──────────────────┘        └──────────────────┘          │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
┌────────────────────────┐    ┌────────────────────────┐
│  ActiveCampaign        │    │      Database          │
│  Connector Layer       │    │     (PostgreSQL)       │
│                        │    │                        │
│  ┌──────────────────┐ │    │  ┌──────────────────┐ │
│  │ Client (HTTP)    │ │    │  │  Prisma ORM      │ │
│  │ - retry/rate     │ │    │  │                  │ │
│  │ - pagination     │ │    │  │ - accounts       │ │
│  └──────────────────┘ │    │  │ - campaigns      │ │
│                        │    │  │ - lists          │ │
│  ┌──────────────────┐ │    │  │ - automations    │ │
│  │ APIs             │ │    │  │ - sync_jobs      │ │
│  │ - campaigns      │ │    │  └──────────────────┘ │
│  │ - lists          │ │    │                        │
│  │ - automations    │ │    └────────────────────────┘
│  └──────────────────┘ │
│                        │
│  ┌──────────────────┐ │
│  │ Normalizer       │ │
│  │ raw → schema     │ │
│  └──────────────────┘ │
└────────────────────────┘
              │
              ▼
┌────────────────────────┐
│  ActiveCampaign API v3 │
└────────────────────────┘
```

---

## Camadas e Responsabilidades

### 1. Frontend (React/Next.js)

**Localização**: `src/app/`, `src/components/`

**Responsabilidades**:
- Renderizar UI (Server Components)
- Client Components para interatividade (busca, filtros)
- Chamar Server Actions para mutations

**Componentes Principais**:
- `src/app/page.tsx`: Dashboard principal
- `src/components/dashboard/kpi-cards.tsx`: Cards de métricas
- `src/components/dashboard/campaigns-table.tsx`: Tabela de campanhas
- `src/components/dashboard/sync-button.tsx`: Botão de sincronização

**Padrões**:
- Server Components por padrão (data fetching no servidor)
- Client Components marcados com `'use client'` (interatividade)
- Sem lógica de negócio no frontend

---

### 2. Server Actions

**Localização**: `src/app/actions/`

**Responsabilidades**:
- Receber chamadas do frontend
- Orquestrar services
- Revalidar cache do Next.js
- Retornar resultados estruturados

**Principais**:
- `syncAccountAction(accountId)`: Sincroniza uma conta
- `syncAllAccountsAction()`: Sincroniza todas as contas

**Padrões**:
- Sempre com `'use server'`
- Try/catch para capturar erros
- `revalidatePath()` para invalidar cache

---

### 3. Services Layer

**Localização**: `src/lib/services/`

**Responsabilidades**:
- Lógica de negócio
- Orquestração de múltiplas operações
- Transações quando necessário
- Cálculos agregados

**Principais**:

#### SyncService (`sync-service.ts`)
- `syncAccount(accountId)`: Sincroniza campanhas, listas, automações
- `syncMultipleAccounts(accountIds)`: Paraleliza syncs
- Gerencia `SyncJob` (histórico)

#### MetricsService (`metrics-service.ts`)
- `getAggregatedCampaignMetrics(filter)`: KPIs agregados
- `getMetricsByAccount()`: Breakdown por conta
- `getMetricsByList()`: Breakdown por lista
- `getTopCampaigns(metricKey)`: Ranking de campanhas

**Padrões**:
- Classes com métodos públicos
- Usar Prisma para DB
- Usar Connectors para APIs externas
- Sem HTTP direto (delegar para connectors)

---

### 4. ActiveCampaign Connector

**Localização**: `src/lib/connectors/activecampaign/`

**Responsabilidades**:
- Comunicação com ActiveCampaign API v3
- Rate limiting e retry
- Paginação automática
- Normalização de dados (raw → schema interno)

**Estrutura**:

#### Client (`client.ts`)
```typescript
class ActiveCampaignClient {
  request<T>(endpoint, options): Promise<ACApiResponse<T>>
  get<T>(endpoint): Promise<ACApiResponse<T>>
  post<T>(endpoint, body): Promise<ACApiResponse<T>>
  paginate<T>(endpoint, limit): AsyncGenerator<T[]>
}
```

- Exponential backoff (1s, 2s, 4s)
- Tracking de rate limits via headers
- Retry automático em 429/5xx

#### APIs
- `CampaignsAPI` (`campaigns.ts`): Campanhas e messages
- `ListsAPI` (`lists.ts`): Listas de contatos
- `AutomationsAPI` (`automations.ts`): Automações

#### Normalizer (`normalizer.ts`)
- `normalizeCampaign(acCampaign, accountId)`: AC → Campaign
- `normalizeList(acList, accountId)`: AC → List
- `normalizeAutomation(acAutomation, accountId)`: AC → Automation
- `extractListIds(acCampaign)`: Extrai IDs de listas

**Padrões**:
- Tipos separados (`types.ts`)
- Prefixo `AC` para tipos da API (ex: `ACCampaign`)
- Raw payload salvo em `rawPayload` (JSONB) para debug
- IDs sempre como string

---

### 5. Database Layer (Prisma)

**Localização**: `prisma/schema.prisma`, `src/lib/db.ts`

**Schema Highlights**:

#### Chaves Compostas (Multi-Tenancy)
```prisma
model Campaign {
  id        String
  accountId String
  
  @@id([accountId, id])
}
```

**Por quê?** IDs do ActiveCampaign não são globais entre contas. Duas contas podem ter `campaignId=123`.

#### Join Table para Many-to-Many
```prisma
model CampaignList {
  accountId  String
  campaignId String
  listId     String
  
  campaign Campaign @relation(...)
  list     List @relation(...)
  
  @@id([accountId, campaignId, listId])
}
```

**Por quê?** Prisma não suporta foreign keys em arrays.

#### Métricas Calculadas
- `openRate = uniqueOpens / sent`
- `clickRate = uniqueClicks / sent` (CTR)
- `clickToOpenRate = uniqueClicks / uniqueOpens` (CTOR)

Calculadas no normalizer e armazenadas denormalizadas para performance.

**Padrões**:
- Migrations declarativas (`prisma migrate dev`)
- Singleton client (`src/lib/db.ts`)
- Snake_case para colunas (ex: `open_rate`)
- JSONB para raw payloads

---

### 6. Metrics Definitions Layer

**Localização**: `src/lib/metrics-definitions.ts`

**Responsabilidades**:
- Definir métricas de forma declarativa
- Formatação consistente
- Cálculo automático de métricas derivadas
- Extensibilidade sem tocar múltiplos arquivos

**Estrutura**:
```typescript
interface MetricDefinition {
  key: string
  label: string
  format: (value: number) => string
  aggregation: 'sum' | 'avg' | 'rate' | 'custom'
  dependencies?: string[]
  calculate?: (data: Record<string, number>) => number
}
```

**Uso**:
```typescript
// Adicionar nova métrica
METRICS.engagementScore = {
  key: 'engagementScore',
  label: 'Engagement Score',
  format: (n) => n.toFixed(2),
  aggregation: 'custom',
  dependencies: ['openRate', 'clickToOpenRate'],
  calculate: (data) => (data.openRate + data.clickToOpenRate) / 2,
}

// Usar em qualquer lugar
const formatted = formatMetric('openRate', 0.234) // "23.4%"
const kpis = getKPIMetrics()
```

**Benefícios**:
- Single source of truth para métricas
- Adicionar novas métricas sem mexer em 10 componentes
- Formatação consistente
- Fácil testar

---

## Fluxos Principais

### Fluxo de Sincronização

```
1. User clica em "Sync" button
   ↓
2. syncAccountAction(accountId) chamado
   ↓
3. SyncService.syncAccount(accountId)
   ├─ Cria SyncJob (status: "running")
   ├─ Busca Account do DB
   ├─ Inicializa ActiveCampaignClient
   ├─ Sincroniza Listas
   │  ├─ ListsAPI.listLists() (pagination)
   │  ├─ normalizeList() para cada lista
   │  └─ prisma.list.upsert()
   ├─ Sincroniza Campanhas
   │  ├─ CampaignsAPI.listCampaigns() (pagination)
   │  ├─ normalizeCampaign() para cada campanha
   │  ├─ prisma.campaign.upsert()
   │  └─ prisma.campaignList.create() (relacionamentos)
   ├─ Sincroniza Automações
   │  ├─ AutomationsAPI.listAutomations()
   │  ├─ normalizeAutomation() para cada automação
   │  └─ prisma.automation.upsert()
   └─ Atualiza SyncJob (status: "completed")
   ↓
4. revalidatePath('/') invalida cache
   ↓
5. Frontend re-renderiza com dados atualizados
```

### Fluxo de Exibição de Métricas

```
1. User acessa dashboard (/)
   ↓
2. getDashboardData() (Server Component)
   ├─ prisma.account.findMany()
   ├─ prisma.campaign.findMany()
   └─ Calcula KPIs agregados
   ↓
3. Renderiza:
   ├─ KPICards (Server Component)
   ├─ CampaignsTable (Client Component)
   └─ SyncButton (Client Component)
```

### Fluxo de Normalização

```
ActiveCampaign API Response (ACCampaign)
   ↓
normalizeCampaign(acCampaign, accountId)
   ├─ Mapeia status numérico → string
   ├─ Parse strings → números (sent, opens, etc)
   ├─ Calcula rates (openRate, clickRate, CTOR)
   ├─ Parse data de envio (ISO → Date)
   └─ Retorna objeto tipado (Campaign)
   ↓
prisma.campaign.upsert() (salva no banco)
```

---

## Decisões Arquiteturais

### 1. Por que Server Components por padrão?

- **Performance**: Data fetching no servidor (próximo ao banco)
- **SEO**: Conteúdo renderizado no servidor
- **Segurança**: Credenciais nunca vazam para o cliente
- **Simplicidade**: Menos JavaScript no cliente

### 2. Por que Server Actions?

- **Type-safe**: TypeScript end-to-end
- **Simplicity**: Sem necessidade de API routes extras
- **Automatic**: Serialização, revalidação, etc

### 3. Por que Prisma?

- **Type-safe**: Tipos gerados do schema
- **DX**: Migrations declarativas, introspection, Prisma Studio
- **Performance**: Query optimization, connection pooling

### 4. Por que Chaves Compostas?

- **Multi-tenancy**: IDs do ActiveCampaign não são globais
- **Integridade**: Garante unicidade por conta
- **Queries**: Filtrar por accountId é rápido (index)

### 5. Por que Normalização?

- **Consistência**: Schema único independente da API externa
- **Versioning**: Adicionar campos sem quebrar
- **Cálculos**: Métricas calculadas uma vez (denormalizadas)

### 6. Por que Metrics Definitions?

- **DRY**: Definir uma vez, usar em qualquer lugar
- **Extensibilidade**: Adicionar métricas sem refatorar
- **Manutenção**: Alterar formatação em um lugar só

---

## Extensibilidade

### Como Adicionar Nova Página (ex: Detalhes de Campanha)

1. **Criar rota**:
```typescript
// src/app/campaigns/[accountId]/[id]/page.tsx
export default async function CampaignDetailPage({
  params,
}: {
  params: { accountId: string; id: string }
}) {
  const campaign = await prisma.campaign.findUnique({
    where: { accountId_id: { accountId: params.accountId, id: params.id } },
    include: { account: true, listLinks: { include: { list: true } } },
  })
  
  return <CampaignDetail campaign={campaign} />
}
```

2. **Link da tabela**:
```typescript
<Link href={`/campaigns/${campaign.accountId}/${campaign.id}`}>
  {campaign.name}
</Link>
```

### Como Adicionar Nova Métrica

1. **Definir em `metrics-definitions.ts`**:
```typescript
METRICS.conversionRate = {
  key: 'conversionRate',
  label: 'Conversion Rate',
  format: (n) => `${(n * 100).toFixed(2)}%`,
  aggregation: 'rate',
  dependencies: ['conversions', 'sent'],
  calculate: (data) => data.sent > 0 ? data.conversions / data.sent : 0,
}
```

2. **Adicionar campo no Prisma** (se necessário):
```prisma
model Campaign {
  // ...
  conversions Int @default(0)
}
```

3. **Atualizar normalizer** (se necessário):
```typescript
const conversions = parseInt(acCampaign.conversions || '0', 10)
```

4. **Usar em componentes**:
```typescript
const kpis = getKPIMetrics() // inclui automaticamente se adicionado
```

### Como Adicionar Filtros (Fase 2)

1. **Criar componente de filtro**:
```typescript
// src/components/filters/date-range-filter.tsx
'use client'
export function DateRangeFilter({ onChange }) {
  // ... date picker
}
```

2. **Atualizar página com query params**:
```typescript
// src/app/page.tsx
export default async function Page({ searchParams }) {
  const dateFrom = searchParams.from ? new Date(searchParams.from) : null
  const dateTo = searchParams.to ? new Date(searchParams.to) : null
  
  const metricsService = new MetricsService()
  const kpis = await metricsService.getAggregatedCampaignMetrics({
    dateFrom,
    dateTo,
  })
}
```

### Como Adicionar Cron Job (Fase 5)

1. **Vercel Cron**:
```typescript
// src/app/api/cron/sync/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const syncService = new SyncService()
  await syncService.syncMultipleAccounts([...])
  
  return Response.json({ success: true })
}
```

2. **vercel.json**:
```json
{
  "crons": [{
    "path": "/api/cron/sync",
    "schedule": "0 */6 * * *"
  }]
}
```

---

## Performance e Otimizações

### 1. Caching (Next.js)
- Server Components cachados por padrão
- `revalidatePath()` para invalidar
- Futuro: `unstable_cache()` com TTL de 5min

### 2. Database Indexes
```prisma
@@index([accountId])
@@index([sendDate])
@@index([accountId, sendDate])
```

### 3. Pagination
- ActiveCampaign: limit=100 (máximo)
- Frontend: implementar offset/cursor pagination na Fase 2

### 4. Agregações
- Métricas calculadas e denormalizadas (evitar joins)
- Views materializadas (futuro)

### 5. Rate Limiting
- Retry com exponential backoff
- Tracking de rate limits via headers
- Paralelização com `Promise.allSettled()`

---

## Segurança

### 1. Credenciais
- API Keys em variáveis de ambiente
- Nunca no código ou frontend
- `.env` no `.gitignore`

### 2. Validação
- Zod schemas (futuro)
- Validação de inputs em Server Actions

### 3. Database
- Prisma protege contra SQL injection
- Cascade deletes configurados

### 4. Rate Limiting
- Por conta (isolado)
- Exponential backoff evita banimento

---

## Troubleshooting

### Debug Prisma Queries
```bash
DATABASE_URL="..." npm run dev
# Logs SQL queries no console
```

### Prisma Studio
```bash
npm run db:studio
# Abre GUI do banco em localhost:5555
```

### ActiveCampaign Rate Limits
- Logs automáticos quando rate limit baixo
- Check headers: `X-RateLimit-Remaining`

### Sync Job Errors
- Buscar em `sync_jobs` tabela
- Campo `error` tem stack trace

---

Pronto! 🚀 Arquitetura documentada e pronta para escalar.

