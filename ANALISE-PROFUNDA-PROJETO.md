# 📊 Análise Profunda do Projeto Email Dashboard

**Data da Análise:** 13 de Janeiro de 2026  
**Analista:** Claude (Cursor AI)  
**Versão:** 1.0

---

## 🎯 Visão Geral do Projeto

O **Email Dashboard** é uma aplicação web moderna construída com **Next.js 15** que funciona como um **dashboard multi-conta para ActiveCampaign**. Ele sincroniza e agrega métricas de múltiplas contas do ActiveCampaign em um único painel centralizado.

### Principais Características

- ✅ **Multi-tenancy**: Suporta múltiplas contas ActiveCampaign simultaneamente
- ✅ **Sincronização automática**: Cron job que atualiza dados periodicamente
- ✅ **Métricas agregadas**: KPIs consolidados de todas as contas
- ✅ **Filtros avançados**: Por conta, lista, período e status
- ✅ **Arquitetura moderna**: Next.js 15 + Server Components + Server Actions
- ✅ **Type-safe**: TypeScript end-to-end com Prisma ORM

---

## 🗄️ Análise do Banco de Dados

### Arquitetura PostgreSQL com Prisma

O banco de dados foi projetado com uma arquitetura **multi-tenant** usando **chaves compostas** para garantir isolamento entre contas.

### Tabelas Principais

#### 1. **accounts** (Contas do ActiveCampaign)

```sql
CREATE TABLE accounts (
  id VARCHAR PRIMARY KEY,
  name VARCHAR,
  base_url VARCHAR,           -- https://account.api-us1.com
  api_key VARCHAR,
  is_active BOOLEAN DEFAULT true,
  
  -- Métricas de contatos
  contact_count INT DEFAULT 0,
  contact_limit INT,
  last_contact_sync TIMESTAMP,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Decisão de Design**: 
- `contact_count` e `contact_limit` são sincronizados via API v1 do ActiveCampaign
- `is_active` permite soft-delete (desativar sem perder dados)

#### 2. **campaigns** (Campanhas de Email)

```sql
CREATE TABLE campaigns (
  id VARCHAR,                   -- ID do ActiveCampaign (não global!)
  account_id VARCHAR,
  name VARCHAR,
  status VARCHAR,               -- draft, scheduled, completed, automation
  type VARCHAR,
  send_date TIMESTAMP,
  is_automation BOOLEAN,        -- Flag para diferenciar emails normais de automação
  
  -- Métricas denormalizadas (performance)
  sent INT,
  opens INT,
  unique_opens INT,
  open_rate FLOAT,
  clicks INT,
  unique_clicks INT,
  click_rate FLOAT,
  click_to_open_rate FLOAT,
  bounces INT,
  unsubscribes INT,
  
  raw_payload JSONB,            -- Payload original da API (debug)
  
  PRIMARY KEY (account_id, id),  -- Chave composta!
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX idx_campaigns_account_date ON campaigns(account_id, send_date);
CREATE INDEX idx_campaigns_date ON campaigns(send_date);
CREATE INDEX idx_campaigns_automation ON campaigns(account_id, is_automation);
```

**Decisões Críticas**:

1. **Chave Composta (account_id, id)**
   - **Por quê?** IDs do ActiveCampaign **NÃO são globais**
   - Conta A pode ter `campaign_id=123`
   - Conta B também pode ter `campaign_id=123`
   - Solução: usar `(account_id, id)` como chave primária

2. **Métricas Denormalizadas**
   - **Trade-off**: Espaço vs Performance
   - Armazenar `open_rate` calculado evita recalcular sempre
   - Sincronização periódica mantém dados atualizados

3. **raw_payload JSONB**
   - Armazena resposta completa da API
   - Útil para debug e auditoria
   - Permite adicionar campos futuros sem migração

#### 3. **lists** (Listas de Contatos)

```sql
CREATE TABLE lists (
  id VARCHAR,
  account_id VARCHAR,
  name VARCHAR,
  active_contacts INT,
  total_contacts INT,
  raw_payload JSONB,
  
  PRIMARY KEY (account_id, id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
```

**Decisão**: Mesmo padrão de chave composta

#### 4. **campaign_lists** (Join Table)

```sql
CREATE TABLE campaign_lists (
  account_id VARCHAR,
  campaign_id VARCHAR,
  list_id VARCHAR,
  created_at TIMESTAMP,
  
  PRIMARY KEY (account_id, campaign_id, list_id),
  FOREIGN KEY (account_id, campaign_id) REFERENCES campaigns(account_id, id),
  FOREIGN KEY (account_id, list_id) REFERENCES lists(account_id, id)
);
```

**Por quê Join Table explícita?**
- Prisma não suporta arrays como foreign keys
- Relacionamento many-to-many precisa de tabela intermediária
- Permite queries eficientes: "quais campanhas usaram lista X?"

#### 5. **automations** (Automações)

```sql
CREATE TABLE automations (
  id VARCHAR,
  account_id VARCHAR,
  name VARCHAR,
  status VARCHAR,               -- active, inactive
  
  -- Métricas (melhor esforço - API limitada)
  entered INT,                  -- Contatos que entraram
  completed INT,                -- Contatos que completaram (= exited)
  active INT,                   -- Aproximação: entered - completed
  
  raw_payload JSONB,
  
  PRIMARY KEY (account_id, id)
);
```

**Limitação da API**: 
- ActiveCampaign API v3 **não fornece métricas de email de automações**
- Apenas `entered` e `exited` disponíveis
- Não há open_rate, click_rate para emails de automação via API

#### 6. **campaign_messages** (Envios Individuais)

```sql
CREATE TABLE campaign_messages (
  id VARCHAR,
  account_id VARCHAR,
  campaign_id VARCHAR,
  sent_at TIMESTAMP,
  
  -- Flags de interação
  was_opened BOOLEAN,
  was_clicked BOOLEAN,
  was_bounced BOOLEAN,
  
  contact_id VARCHAR,
  raw_payload JSONB,
  
  PRIMARY KEY (account_id, id),
  FOREIGN KEY (account_id, campaign_id) REFERENCES campaigns(account_id, id)
);

CREATE INDEX idx_messages_campaign ON campaign_messages(account_id, campaign_id);
CREATE INDEX idx_messages_date ON campaign_messages(sent_at);
```

**Uso**: 
- Permite métricas por período (filtro de data)
- Suporta análises granulares (por contato)
- Sincroniza últimos 90 dias para evitar volume excessivo

#### 7. **sync_jobs** (Histórico de Sincronizações)

```sql
CREATE TABLE sync_jobs (
  id VARCHAR PRIMARY KEY,
  account_id VARCHAR,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  status VARCHAR,               -- running, completed, failed
  error TEXT,
  is_automatic BOOLEAN,         -- true = cron, false = manual
  
  campaigns_synced INT,
  lists_synced INT,
  automations_synced INT,
  messages_synced INT,
  
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);
```

**Uso**:
- Auditoria: quando cada sync ocorreu
- Debug: ver erros de sincronização
- Métricas: quantos registros foram sincronizados

---

## 🔌 Análise das Requisições ao ActiveCampaign

### Arquitetura de Conectores

O projeto usa uma **camada de abstração** para comunicação com a API do ActiveCampaign:

```
ActiveCampaignClient (client.ts)
    ├── CampaignsAPI (campaigns.ts)
    ├── ListsAPI (lists.ts)
    ├── AutomationsAPI (automations.ts)
    ├── MessagesAPI (messages.ts)
    ├── ContactsAPI (contacts.ts)
    └── ActiveCampaignAPIv1 (api-v1.ts)
```

### 1. Cliente Base (ActiveCampaignClient)

**Localização**: `src/lib/connectors/activecampaign/client.ts`

#### Funcionalidades:

**a) Autenticação via Header**
```typescript
headers: {
  'Api-Token': this.apiKey,
  'Content-Type': 'application/json'
}
```

**b) Rate Limiting Inteligente**
```typescript
// Lê headers da resposta
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1705180800

// Se remaining < 2, aguarda até reset
if (this.rateLimitInfo.remaining < 2) {
  await sleep(waitTime)
}
```

**c) Retry com Exponential Backoff**
```typescript
// 3 tentativas
// Backoff: 1s, 2s, 4s
const backoff = Math.pow(2, attempt) * 1000
```

**d) Paginação Automática**
```typescript
async *paginate<T>(endpoint, limit = 100): AsyncGenerator {
  let offset = 0
  while (hasMore) {
    const url = `${endpoint}?limit=${limit}&offset=${offset}`
    const response = await this.get(url)
    yield items
    offset += limit
  }
}
```

**Padrão Generator**: Permite processar grandes volumes sem carregar tudo na memória

### 2. API v3 - Endpoints Utilizados

#### a) **GET /campaigns**

**Requisição**:
```http
GET /api/3/campaigns?orders[sdate]=DESC&limit=100&offset=0
Host: account.api-us1.com
Api-Token: xxx
```

**Resposta**:
```json
{
  "campaigns": [
    {
      "id": "123",
      "name": "Newsletter Jan 2026",
      "status": 5,
      "send_amt": "1000",
      "opens": "450",
      "uniqueopens": "420",
      "linkclicks": "80",
      "uniquelinkclicks": "75",
      "hardbounces": "5",
      "softbounces": "3",
      "unsubscribes": "2",
      "sdate": "2026-01-10T14:00:00-06:00"
    }
  ],
  "meta": {
    "total": 1523
  }
}
```

**Normalização**:
- `status` numérico → string ("completed")
- Strings → números (`send_amt: "1000"` → `sent: 1000`)
- Calcular rates (`openRate = uniqueOpens / sent`)

#### b) **GET /campaigns/:id/campaignLists**

**Requisição**:
```http
GET /api/3/campaigns/123/campaignLists
```

**Resposta**:
```json
{
  "campaignLists": [
    { "list": "5", "listid": "5" },
    { "list": "12", "listid": "12" }
  ]
}
```

**Uso**: Associar campanhas às listas (populate join table)

#### c) **GET /lists**

**Requisição**:
```http
GET /api/3/lists?limit=100&offset=0
```

**Resposta**:
```json
{
  "lists": [
    {
      "id": "5",
      "name": "Clientes VIP",
      "subscriber_count": "1234"
    }
  ]
}
```

#### d) **GET /automations**

**Requisição**:
```http
GET /api/3/automations?limit=100&offset=0
```

**Resposta**:
```json
{
  "automations": [
    {
      "id": "1",
      "name": "Welcome Series",
      "status": "1",
      "entered": "523",
      "exited": "498"
    }
  ]
}
```

**Limitação**: Não traz métricas de email (opens, clicks)

#### e) **GET /messages**

**Requisição com Filtro de Data**:
```http
GET /api/3/messages?filters[cdate_gte]=2025-10-15T00:00:00Z&orders[cdate]=DESC&limit=100
```

**Resposta**:
```json
{
  "messages": [
    {
      "id": "msg_123",
      "campaignid": "123",
      "contactid": "456",
      "cdate": "2025-10-15T14:23:00-06:00",
      "opened_count": "3",
      "clicked_count": "1",
      "bounced": "0"
    }
  ]
}
```

**Uso**: Métricas granulares por período

#### f) **GET /contacts**

**Requisição**:
```http
GET /api/3/contacts?limit=1
```

**Resposta**:
```json
{
  "contacts": [...],
  "meta": {
    "total": 15234
  }
}
```

**Estratégia**: `limit=1` para performance (só precisamos do `meta.total`)

### 3. API v1 - Métricas por Período

**Por quê API v1?**
- API v3 **NÃO suporta filtro de data** em métricas de campanha
- API v1 tem endpoint `campaign_report_totals` com filtros `sdate` e `ldate`

**Localização**: `src/lib/connectors/activecampaign/api-v1.ts`

#### Endpoint: `campaign_report_totals`

**Requisição**:
```http
GET /admin/api.php?api_action=campaign_report_totals&campaignid=123&sdate=2026-01-01&ldate=2026-01-31&api_key=xxx&api_output=json
```

**Resposta**:
```json
{
  "result_code": 1,
  "send_amt": "456",
  "uniqueopens": "210",
  "uniquelinkclicks": "45",
  "totalbounces": "3",
  "unsubscribes": "1"
}
```

**Bug da API**: Se `sdate = ldate`, retorna 0 em tudo
**Solução no código**: Adicionar +1 dia ao `ldate` quando for o mesmo dia

#### account_view

**Requisição**:
```http
GET /admin/api.php?api_action=account_view&api_key=xxx&api_output=json
```

**Resposta**:
```json
{
  "result_code": 1,
  "subscriber_total": "15234",
  "subscriber_limit": "25000"
}
```

**Uso**: Obter limite de contatos da conta (não disponível na v3)

---

## 🔄 Fluxo de Sincronização Detalhado

### Processo Step-by-Step

**Trigger**: Usuário clica em "Sync" OU cron job automático

```mermaid
1. syncAccountAction(accountId)
   ↓
2. SyncService.syncAccount(accountId)
   ├─ Cria SyncJob (status: "running")
   ├─ Busca Account do DB
   ├─ Inicializa ActiveCampaignClient
   │
   ├─ [ETAPA 1] Sincronizar Listas
   │  ├─ ListsAPI.listLists() → Generator<ACList[]>
   │  ├─ Para cada batch:
   │  │  ├─ Para cada lista:
   │  │  │  ├─ normalizeList(acList, accountId)
   │  │  │  └─ prisma.list.upsert()
   │  └─ Log: "✅ X listas sincronizadas"
   │
   ├─ [ETAPA 2] Sincronizar Contatos (totais)
   │  ├─ ContactsAPI.getAccountInfo() → API v1
   │  ├─ Extrai: contactCount, contactLimit
   │  ├─ prisma.account.update({ contactCount, contactLimit })
   │  └─ Log: "✅ Contatos: 15,234 / 25,000 (60.9% usado)"
   │
   ├─ [ETAPA 3] Sincronizar Campanhas
   │  ├─ CampaignsAPI.listCampaigns() → Generator<ACCampaign[]>
   │  ├─ Para cada batch:
   │  │  ├─ Para cada campanha:
   │  │  │  ├─ normalizeCampaign(acCampaign, accountId)
   │  │  │  ├─ prisma.campaign.upsert()
   │  │  │  │
   │  │  │  ├─ [SUB-ETAPA] Sincronizar Listas da Campanha
   │  │  │  ├─ CampaignsAPI.getCampaignLists(campaignId)
   │  │  │  ├─ prisma.campaignList.deleteMany() (limpar antigas)
   │  │  │  └─ prisma.campaignList.create() (novas)
   │  └─ Log: "✅ Y campanhas sincronizadas"
   │
   ├─ [ETAPA 4] Sincronizar Automações
   │  ├─ AutomationsAPI.listAutomations() → Generator<ACAutomation[]>
   │  ├─ Para cada batch:
   │  │  ├─ Para cada automação:
   │  │  │  ├─ normalizeAutomation(acAutomation, accountId)
   │  │  │  └─ prisma.automation.upsert()
   │  └─ Log: "✅ Z automações sincronizadas"
   │
   ├─ [ETAPA 5] Sincronizar Messages (últimos 90 dias)
   │  ├─ MessagesAPI.listRecentMessages(90) → Generator<ACMessage[]>
   │  ├─ Para cada batch:
   │  │  ├─ Para cada message:
   │  │  │  ├─ Verificar se campaignId existe
   │  │  │  ├─ normalizeMessage(acMessage, accountId)
   │  │  │  └─ prisma.campaignMessage.upsert()
   │  └─ Log: "✅ W mensagens sincronizadas"
   │
   └─ Atualiza SyncJob (status: "completed")
```

### Estratégias de Resiliência

1. **Isolamento de Falhas**
   ```typescript
   // syncMultipleAccounts usa Promise.allSettled
   const results = await Promise.allSettled(
     accountIds.map(id => this.syncAccount(id))
   )
   // Se conta A falha, contas B, C, D continuam
   ```

2. **Tratamento de Erros**
   ```typescript
   try {
     // sync logic
   } catch (error) {
     // Log erro no SyncJob
     await prisma.syncJob.update({
       status: 'failed',
       error: errorMessage
     })
   }
   ```

3. **Verificações de Integridade**
   ```typescript
   // Não criar message se campanha não existe
   const campaignExists = await prisma.campaign.findUnique(...)
   if (!campaignExists) continue
   ```

---

## 📊 Sistema de Métricas

### Camada de Definições (`metrics-definitions.ts`)

**Padrão Declarativo**: Todas as métricas definidas em um único lugar

```typescript
export const METRICS: Record<string, MetricDefinition> = {
  sent: {
    key: 'sent',
    label: 'Emails Enviados',
    format: (n) => n.toLocaleString('pt-BR'),
    aggregation: 'sum'
  },
  
  openRate: {
    key: 'openRate',
    label: 'Taxa de Abertura',
    format: (n) => `${(n * 100).toFixed(1)}%`,
    aggregation: 'rate',
    dependencies: ['uniqueOpens', 'sent'],
    calculate: (data) => data.sent > 0 ? data.uniqueOpens / data.sent : 0
  }
}
```

**Benefícios**:
- ✅ Single source of truth
- ✅ Formatação consistente em todo o app
- ✅ Fácil adicionar novas métricas
- ✅ Cálculos automáticos de métricas derivadas

### Cálculo de Métricas Agregadas

**MetricsService** (`metrics-service.ts`) usa a camada de definições:

```typescript
async getAggregatedCampaignMetrics(filter: MetricsFilter) {
  // 1. Buscar campanhas do DB com filtros
  const campaigns = await prisma.campaign.findMany({ where })
  
  // 2. Calcular agregações usando metrics-definitions
  const aggregated = calculateAggregatedMetrics(campaigns, metricKeys)
  
  return aggregated
}
```

**Suporta Filtros**:
- ✅ Por conta(s)
- ✅ Por lista(s)
- ✅ Por período (date range)
- ✅ Por status

---

## 🎨 Frontend (Next.js 15)

### Arquitetura React Server Components

**Padrão do projeto**: Server Components por padrão, Client Components apenas quando necessário

#### Server Components (SSR)

**Exemplo**: `src/app/page.tsx`

```typescript
// Sem 'use client' = Server Component
export default async function DashboardPage({ searchParams }) {
  // ✅ Acesso direto ao banco de dados
  const { accounts, kpiData, campaigns } = await getDashboardData(filters)
  
  // ✅ Renderizado no servidor (SEO, performance)
  return (
    <div>
      <KPICards data={kpiData} />
      <CampaignsTable campaigns={campaigns} />
    </div>
  )
}
```

**Vantagens**:
- ✅ Data fetching no servidor (próximo ao banco)
- ✅ Credenciais nunca vazam para o cliente
- ✅ Menos JavaScript no cliente
- ✅ SEO-friendly

#### Client Components (Interatividade)

**Exemplo**: `src/components/filters/global-filters.tsx`

```typescript
'use client'

export function GlobalFilters({ accounts, lists }) {
  const [accountIds, setAccountIds] = useState<string[]>([])
  const router = useRouter()
  
  const handleApply = () => {
    // ✅ Atualiza URL (query params)
    const params = new URLSearchParams()
    params.set('accountIds', accountIds.join(','))
    router.push(`/?${params.toString()}`)
  }
  
  // ✅ UI interativa (multi-select, date picker)
  return <form>...</form>
}
```

**Quando usar Client Component**:
- ✅ useState, useEffect, event handlers
- ✅ Formulários interativos
- ✅ Modais, dropdowns
- ✅ Real-time updates

### Server Actions

**Localização**: `src/app/actions/`

**Exemplo**: Sincronização

```typescript
'use server'

export async function syncAccountAction(accountId: string) {
  const syncService = new SyncService()
  const result = await syncService.syncAccount(accountId)
  
  // ✅ Invalidar cache do Next.js
  revalidatePath('/')
  
  return result
}
```

**Vantagens**:
- ✅ Type-safe (TypeScript end-to-end)
- ✅ Não precisa criar API routes
- ✅ Serialização automática
- ✅ Revalidação de cache integrada

---

## 🔍 Padrões e Boas Práticas

### 1. Normalização de Dados

**Pattern**: API → Normalizer → DB

```typescript
// API retorna strings
ACCampaign.send_amt = "1000"
ACCampaign.opens = "450"

// Normalizer converte
Campaign.sent = 1000
Campaign.opens = 450
Campaign.openRate = 0.45 // calculado
```

**Por quê?**
- ✅ Consistência: schema único independente da API
- ✅ Performance: métricas calculadas uma vez
- ✅ Manutenção: mudanças na API isoladas no normalizer

### 2. Upsert para Idempotência

```typescript
await prisma.campaign.upsert({
  where: { accountId_id: { accountId, id } },
  create: normalized,
  update: normalized
})
```

**Benefício**: Sync pode rodar múltiplas vezes sem duplicar dados

### 3. Generators para Paginação

```typescript
async *listCampaigns(): AsyncGenerator<ACCampaign[]> {
  for await (const campaigns of this.client.paginate('/campaigns')) {
    yield campaigns // ✅ Processa batch por batch
  }
}
```

**Benefício**: Não carrega 10.000 campanhas na memória de uma vez

### 4. Chaves Compostas para Multi-Tenancy

```typescript
@@id([accountId, id])
```

**Benefício**: IDs não colidem entre contas

### 5. Soft Delete

```typescript
// Desativar ao invés de deletar
account.isActive = false
```

**Benefício**: Preserva histórico

### 6. Raw Payload para Auditoria

```typescript
rawPayload: acCampaign as any // JSONB
```

**Benefício**: Sempre pode recuperar dados originais

---

## ⚡ Performance e Otimizações

### 1. Índices de Banco de Dados

```prisma
@@index([accountId])
@@index([sendDate])
@@index([accountId, sendDate])
```

**Impacto**: Queries filtradas por conta e data são rápidas

### 2. Métricas Denormalizadas

```prisma
model Campaign {
  openRate Float // ✅ Pré-calculado
}
```

**Trade-off**: Espaço vs Performance (correto neste caso)

### 3. Paginação da API

```typescript
limit=100 // Máximo do ActiveCampaign
```

**Estratégia**: Processar em batches de 100

### 4. Cache do Next.js

```typescript
// Server Components são cachados automaticamente
// Invalidar com:
revalidatePath('/')
```

### 5. Rate Limiting Inteligente

```typescript
// Ler header X-RateLimit-Remaining
// Pausar se < 2 requests restantes
```

---

## 🛡️ Segurança

### 1. API Keys

✅ Armazenadas em banco (criptografadas idealmente)  
✅ Nunca expostas no frontend  
✅ Acessadas apenas em Server Actions/Components

### 2. Validação de Inputs

```typescript
import { z } from 'zod'

const accountSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1)
})
```

### 3. SQL Injection

✅ Prisma protege automaticamente (prepared statements)

### 4. Cascade Deletes

```prisma
onDelete: Cascade
```

**Benefício**: Deletar conta remove todos os dados relacionados

---

## 🔧 Infraestrutura e Deploy

### Stack de Deploy

```bash
# Servidor: Digital Ocean (ou similar)
# App: Next.js standalone build
# Banco: PostgreSQL
# Cron: Crontab + auto-sync.js
```

### Cron Job de Sincronização

**Arquivo**: `auto-sync.js`

```bash
# Crontab: Roda a cada 4 horas
0 */4 * * * cd /home/deploy/apps/email-dash && npx tsx auto-sync.js >> /home/deploy/logs/auto-sync.log 2>&1
```

**Lógica**:
1. Busca todas as contas ativas
2. Roda `SyncService.syncMultipleAccounts()`
3. Loga resultados

---

## 📈 Métricas e KPIs Disponíveis

### Métricas Básicas (Soma)
- **Enviados** (`sent`): Total de emails enviados
- **Aberturas** (`opens`): Total de aberturas (inclui múltiplas)
- **Aberturas Únicas** (`uniqueOpens`): Pessoas únicas que abriram
- **Cliques** (`clicks`): Total de cliques
- **Cliques Únicos** (`uniqueClicks`): Pessoas únicas que clicaram
- **Bounces** (`bounces`): Hard + Soft bounces
- **Descadastros** (`unsubscribes`): Unsubscribes

### Métricas Calculadas (Rates)
- **Taxa de Abertura** (`openRate`): `uniqueOpens / sent`
- **CTR** (`clickRate`): `uniqueClicks / sent`
- **CTOR** (`clickToOpenRate`): `uniqueClicks / uniqueOpens`
- **Taxa de Bounce** (`bounceRate`): `bounces / sent`
- **Taxa de Descadastro** (`unsubscribeRate`): `unsubscribes / sent`

---

## 🎯 Funcionalidades Principais

### 1. Dashboard Consolidado
- ✅ KPIs agregados de todas as contas
- ✅ Tabela de campanhas recentes
- ✅ Filtros por conta, lista, período
- ✅ Exibição de limites de contatos

### 2. Gestão de Contas
- ✅ Adicionar/editar/remover contas ActiveCampaign
- ✅ Testar conexão antes de salvar
- ✅ Ativar/desativar contas
- ✅ Contador de contatos com alertas (90%+ do limite)

### 3. Visualização de Listas
- ✅ Todas as listas de todas as contas
- ✅ Contagem de contatos por lista
- ✅ Filtro por conta
- ✅ Ordenação alfabética natural

### 4. Visualização de Automações
- ✅ Todas as automações de todas as contas
- ✅ Métricas: entered, completed, active
- ✅ Status (active/inactive)
- ✅ Filtro por conta

### 5. Sincronização
- ✅ Manual: Botão "Sync" no dashboard
- ✅ Automática: Cron job a cada 4h
- ✅ Por conta individual
- ✅ Histórico de syncs (success/failed)

### 6. Filtros Avançados
- ✅ Multi-select de contas
- ✅ Multi-select de listas
- ✅ Date range picker
- ✅ Filtro por status de campanha
- ✅ Métricas por período via API v1

---

## 🚧 Limitações Conhecidas

### 1. API do ActiveCampaign

**Limitação**: Automações não têm métricas de email
- API v3 **não retorna** open_rate, click_rate para emails de automação
- Apenas `entered` e `exited` disponíveis
- **Solução**: Documentado + captura melhor esforço

**Limitação**: API v3 não filtra métricas por data
- Métricas de campanhas são acumuladas (lifetime)
- **Solução**: Usar API v1 `campaign_report_totals` com filtros de data

**Bug da API v1**: Se `sdate = ldate`, retorna 0
- **Solução**: Adicionar +1 dia ao `ldate` quando forem iguais

### 2. Performance

**Limitação**: Sync completo pode demorar
- Contas com 1000+ campanhas levam alguns minutos
- **Mitigação**: Paginação (100 por vez)
- **Mitigação**: Paralelização (múltiplas contas simultaneamente)

### 3. Rate Limiting

**Limitação**: ActiveCampaign tem rate limits
- Geralmente 5 requests/segundo
- **Mitigação**: Exponential backoff + retry
- **Mitigação**: Leitura de headers `X-RateLimit-*`

---

## 🌟 Pontos Fortes do Projeto

### 1. Arquitetura Sólida
✅ Separação clara de responsabilidades (Services, Connectors, Actions)  
✅ Type-safety end-to-end (TypeScript + Prisma)  
✅ Padrão de código consistente

### 2. Multi-Tenancy Robusto
✅ Chaves compostas evitam colisões  
✅ Isolamento completo entre contas  
✅ Cascade deletes garantem integridade

### 3. Resiliência
✅ Retry automático com exponential backoff  
✅ Rate limiting inteligente  
✅ Isolamento de falhas (uma conta não quebra outras)

### 4. Extensibilidade
✅ Adicionar nova métrica: 1 arquivo (metrics-definitions.ts)  
✅ Adicionar novo endpoint: criar classe API  
✅ Adicionar nova página: Next.js routing automático

### 5. Observabilidade
✅ SyncJobs registra cada execução  
✅ Logs detalhados (✅, ⚠️, ❌)  
✅ Erros armazenados no banco

### 6. DX (Developer Experience)
✅ Prisma Studio para explorar banco  
✅ Scripts de diagnóstico (diagnostico-api-key.js)  
✅ Documentação detalhada (ARCHITECTURE.md, etc)

---

## 🔮 Sugestões de Melhoria

### 1. Autenticação
**Status**: Não implementado  
**Sugestão**: Adicionar NextAuth.js
- Login com email/senha
- Roles (admin, viewer)
- Multi-usuário

### 2. Webhooks
**Status**: Não implementado  
**Sugestão**: Receber eventos do ActiveCampaign em tempo real
- Email enviado → atualizar DB imediatamente
- Reduzir necessidade de polling

### 3. Cache Redis
**Status**: Usa cache do Next.js  
**Sugestão**: Redis para cache de métricas agregadas
- TTL de 5 minutos
- Invalidação manual

### 4. Testes
**Status**: Não implementado  
**Sugestão**: 
- Unit tests (normalizers, services)
- Integration tests (API calls)
- E2E tests (Playwright)

### 5. Monitoramento
**Status**: Básico (logs)  
**Sugestão**: Sentry para error tracking
- Alertas quando sync falha 3x seguidas
- Dashboard de health

### 6. Visualizações Avançadas
**Status**: Tabelas básicas  
**Sugestão**: 
- Gráficos (Recharts)
- Heatmaps de melhor horário de envio
- Comparação de campanhas

### 7. Exportação de Dados
**Status**: Não implementado  
**Sugestão**: 
- Exportar CSV
- Relatórios PDF
- API pública (read-only)

### 8. Criptografia de API Keys
**Status**: Texto puro no banco  
**Sugestão**: Criptografar com chave no ambiente
```typescript
import { encrypt, decrypt } from '@/lib/crypto'
const encrypted = encrypt(apiKey, process.env.SECRET_KEY)
```

---

## 📊 Estatísticas do Código

### Estrutura de Arquivos

```
Total de arquivos: ~100
├── TypeScript: 40 arquivos
├── TSX (React): 25 arquivos
├── Markdown (Docs): 30 arquivos
├── SQL (Migrations): 4 arquivos
└── Config: 5 arquivos
```

### Linhas de Código (aprox)

```
src/lib/: ~2,000 linhas
src/components/: ~1,500 linhas
src/app/: ~800 linhas
prisma/: ~200 linhas
Total: ~4,500 linhas (sem node_modules)
```

### Complexidade

```
Rotas: 4 páginas principais
Server Actions: 8 actions
Services: 4 services
API Connectors: 6 classes
Componentes: 25+ componentes React
```

---

## 🎓 Aprendizados e Insights

### 1. Chaves Compostas são Essenciais
Multi-tenancy com IDs não globais **requer** chaves compostas. Alternativa seria criar UUID próprio, mas perderia rastreabilidade com IDs externos.

### 2. Denormalização é OK para Performance
Armazenar `openRate` calculado é correto aqui. Recalcular em tempo real seria lento. Trade-off aceitável.

### 3. API v1 vs v3
APIs antigas às vezes têm features que novas não têm. API v1 tem filtros de data que v3 não tem. Manter ambas foi a decisão certa.

### 4. Generators > Arrays
Para grandes volumes, generators (async iterators) são superiores. Processar 10.000 campanhas em batches de 100 é muito mais eficiente.

### 5. Next.js Server Components são Poderosos
Acesso direto ao banco em componentes simplifica muito. Sem necessidade de criar API routes intermediárias.

---

## 📝 Conclusão

O **Email Dashboard** é um projeto **bem arquitetado** com:

✅ **Arquitetura sólida**: Separação clara de responsabilidades  
✅ **Type-safety**: TypeScript + Prisma end-to-end  
✅ **Multi-tenancy robusto**: Chaves compostas + isolamento  
✅ **Resiliência**: Retry, rate limiting, isolamento de falhas  
✅ **Extensibilidade**: Fácil adicionar métricas, endpoints, páginas  
✅ **Observabilidade**: Logs, histórico de syncs, diagnóstico  
✅ **Documentação**: Extensa e detalhada

### Pontos de Atenção

⚠️ **Segurança**: API keys em texto puro (criptografar futuramente)  
⚠️ **Autenticação**: Não implementada (adicionar NextAuth.js)  
⚠️ **Testes**: Não implementados (adicionar coverage)  
⚠️ **Monitoramento**: Básico (integrar Sentry/DataDog)

### Veredicto Final

**Nota: 8.5/10**

Excelente base para um dashboard multi-conta. Arquitetura escalável, código limpo, boas práticas seguidas. Principais gaps são autenticação e testes, que são planejados para futuro.

---

**Análise completa gerada por Claude (Cursor AI)**  
**Data:** 13 de Janeiro de 2026

