# 🗄️ Análise Profunda do Banco de Dados

**Data:** 13 de Janeiro de 2026  
**Versão:** 1.0  
**SGBD:** PostgreSQL  
**ORM:** Prisma

---

## 📋 Visão Geral

O banco de dados foi projetado para suportar **multi-tenancy** com **chaves compostas**, garantindo isolamento completo entre contas do ActiveCampaign.

### Estatísticas

```sql
-- Exemplo de volume de dados (conta real)
Accounts: 22
Campaigns: 1,523
Lists: 156
Automations: 47
Campaign Messages: 250,000+
Sync Jobs: 500+
```

---

## 📊 Diagrama de Relacionamentos (ERD)

```
┌─────────────────┐
│    accounts     │
│─────────────────│
│ id (PK)         │
│ name            │
│ base_url        │
│ api_key         │
│ is_active       │
│ contact_count   │
│ contact_limit   │
└─────────────────┘
        │
        │ 1:N
        ├──────────────────────────────┐
        │                              │
        ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│   campaigns      │          │      lists       │
│──────────────────│          │──────────────────│
│ account_id (FK)  │◄────────┐│ account_id (FK)  │
│ id               │         ││ id               │
│ PK(account,id)   │         ││ PK(account,id)   │
│ name             │         ││ name             │
│ status           │         ││ subscriber_count │
│ sent             │         │└──────────────────┘
│ unique_opens     │         │         ▲
│ open_rate        │         │         │
│ unique_clicks    │         │         │
│ click_rate       │         │         │
│ raw_payload      │         │         │
└──────────────────┘         │         │
        │                    │         │
        │ 1:N                │         │
        ▼                    │         │
┌──────────────────┐         │         │
│campaign_messages │         │         │
│──────────────────│         │         │
│ account_id (FK)  │         │         │
│ campaign_id (FK) │         │         │
│ id (PK)          │         │         │
│ sent_at          │         │         │
│ was_opened       │         │         │
│ was_clicked      │         │         │
└──────────────────┘         │         │
                             │         │
                             │         │
        ┌────────────────────┘         │
        │                              │
        ▼                              │
┌──────────────────┐                   │
│ campaign_lists   │                   │
│──────────────────│                   │
│ account_id (FK)  ├───────────────────┘
│ campaign_id (FK) │
│ list_id (FK)     │
│ PK(all 3)        │
└──────────────────┘

┌──────────────────┐
│   automations    │
│──────────────────│
│ account_id (FK)  │
│ id               │
│ PK(account,id)   │
│ name             │
│ status           │
│ entered          │
│ completed        │
│ active           │
└──────────────────┘

┌──────────────────┐
│   sync_jobs      │
│──────────────────│
│ id (PK)          │
│ account_id (FK)  │
│ started_at       │
│ finished_at      │
│ status           │
│ error            │
│ is_automatic     │
└──────────────────┘
```

---

## 📋 Schema Completo

### 1. accounts

**Propósito**: Armazenar credenciais e informações de contas do ActiveCampaign

```sql
CREATE TABLE accounts (
  id                 VARCHAR(191) PRIMARY KEY,
  name               VARCHAR(191) NOT NULL,
  base_url           VARCHAR(191) NOT NULL,
  api_key            VARCHAR(191) NOT NULL,
  is_active          BOOLEAN DEFAULT true,
  
  -- Métricas de contatos
  contact_count      INTEGER DEFAULT 0,
  contact_limit      INTEGER,
  last_contact_sync  TIMESTAMP,
  
  -- Timestamps
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_accounts_active ON accounts(is_active);
```

#### Campos Especiais

**base_url**
- Formato: `https://account.api-us1.com`
- Varia por região (US, EU, etc)
- Usado para construir URLs de requisições

**api_key**
- Token de API do ActiveCampaign
- ⚠️ **Segurança**: Atualmente em texto puro (recomendar criptografia)
- Nunca exposto no frontend

**contact_count / contact_limit**
- Sincronizados via API v1 (`account_view`)
- `contact_limit` pode ser `NULL` se plano não tem limite
- Usado para alertas (90%+ do limite)

#### Queries Comuns

```sql
-- Listar contas ativas (ordenação natural)
SELECT id, name, contact_count, contact_limit
FROM accounts
WHERE is_active = true
ORDER BY name;

-- Verificar contas próximas do limite
SELECT 
  name,
  contact_count,
  contact_limit,
  ROUND((contact_count::NUMERIC / NULLIF(contact_limit, 0)) * 100, 1) as usage_percent
FROM accounts
WHERE 
  is_active = true 
  AND contact_limit IS NOT NULL
  AND contact_limit > 0
  AND (contact_count::NUMERIC / contact_limit) > 0.9
ORDER BY usage_percent DESC;
```

---

### 2. campaigns

**Propósito**: Armazenar campanhas de email com métricas denormalizadas

```sql
CREATE TABLE campaigns (
  id                VARCHAR(191),
  account_id        VARCHAR(191) NOT NULL,
  name              VARCHAR(191) NOT NULL,
  status            VARCHAR(191) NOT NULL,
  type              VARCHAR(191),
  send_date         TIMESTAMP,
  is_automation     BOOLEAN DEFAULT false,
  
  -- Métricas (denormalizadas para performance)
  sent              INTEGER DEFAULT 0,
  opens             INTEGER DEFAULT 0,
  unique_opens      INTEGER DEFAULT 0,
  open_rate         DOUBLE PRECISION DEFAULT 0,
  clicks            INTEGER DEFAULT 0,
  unique_clicks     INTEGER DEFAULT 0,
  click_rate        DOUBLE PRECISION DEFAULT 0,
  click_to_open_rate DOUBLE PRECISION DEFAULT 0,
  bounces           INTEGER DEFAULT 0,
  unsubscribes      INTEGER DEFAULT 0,
  
  -- Payload original (auditoria)
  raw_payload       JSONB,
  
  -- Timestamps
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Chave composta (multi-tenancy)
  PRIMARY KEY (account_id, id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_campaigns_account ON campaigns(account_id);
CREATE INDEX idx_campaigns_date ON campaigns(send_date);
CREATE INDEX idx_campaigns_account_date ON campaigns(account_id, send_date);
CREATE INDEX idx_campaigns_automation ON campaigns(account_id, is_automation);
CREATE INDEX idx_campaigns_status ON campaigns(status);
```

#### Por quê Chave Composta?

**Problema**: IDs do ActiveCampaign **NÃO são globais**

```
Conta A: campaign_id = "123"
Conta B: campaign_id = "123" (ID diferente!)
```

**Solução**: `PRIMARY KEY (account_id, id)`

Isso garante:
- ✅ Unicidade por conta
- ✅ Queries rápidas filtrando por account_id
- ✅ Integridade referencial

#### Métricas Denormalizadas

**Trade-off**: Espaço vs Performance

```sql
-- OPÇÃO 1: Normalizado (ruim para performance)
SELECT 
  c.name,
  COUNT(DISTINCT cm.id) FILTER (WHERE cm.was_opened) as unique_opens,
  COUNT(DISTINCT cm.id) as total_sent
FROM campaigns c
LEFT JOIN campaign_messages cm ON cm.campaign_id = c.id
GROUP BY c.id;
-- ❌ Lento: precisa fazer JOIN e COUNT em 250k+ registros

-- OPÇÃO 2: Denormalizado (bom para performance)
SELECT name, unique_opens, sent
FROM campaigns
WHERE account_id = 'xxx';
-- ✅ Rápido: valores pré-calculados
```

**Estratégia**: Denormalizar e sincronizar periodicamente

#### Status Enum

```sql
-- Valores possíveis de status
'draft'      -- Rascunho
'scheduled'  -- Agendado
'sending'    -- Enviando
'paused'     -- Pausado
'stopped'    -- Parado
'completed'  -- Completado
'automation' -- Email de automação
```

**Conversão da API**:
```typescript
// API retorna número
0 → 'draft'
1 → 'scheduled'
2 → 'sending'
3 → 'paused'
4 → 'stopped'
5 → 'completed'
```

#### Queries Comuns

```sql
-- Top 10 campanhas por taxa de abertura
SELECT 
  a.name as account_name,
  c.name as campaign_name,
  c.sent,
  c.unique_opens,
  c.open_rate,
  c.send_date
FROM campaigns c
JOIN accounts a ON a.id = c.account_id
WHERE 
  c.sent > 100
  AND c.send_date >= NOW() - INTERVAL '30 days'
ORDER BY c.open_rate DESC
LIMIT 10;

-- Métricas agregadas por conta
SELECT 
  a.name,
  COUNT(*) as total_campaigns,
  SUM(c.sent) as total_sent,
  SUM(c.unique_opens) as total_opens,
  ROUND(
    SUM(c.unique_opens)::NUMERIC / NULLIF(SUM(c.sent), 0),
    4
  ) as avg_open_rate
FROM campaigns c
JOIN accounts a ON a.id = c.account_id
WHERE c.send_date >= '2026-01-01'
GROUP BY a.id, a.name
ORDER BY total_sent DESC;

-- Campanhas enviadas em período específico (para filtro de data)
SELECT *
FROM campaigns
WHERE 
  account_id IN ('id1', 'id2')
  AND send_date >= '2026-01-01 00:00:00'
  AND send_date <= '2026-01-31 23:59:59'
ORDER BY send_date DESC;
```

---

### 3. lists

**Propósito**: Listas de contatos do ActiveCampaign

```sql
CREATE TABLE lists (
  id              VARCHAR(191),
  account_id      VARCHAR(191) NOT NULL,
  name            VARCHAR(191) NOT NULL,
  active_contacts INTEGER,
  total_contacts  INTEGER,
  raw_payload     JSONB,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (account_id, id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX idx_lists_account ON lists(account_id);
CREATE INDEX idx_lists_name ON lists(name);
```

#### Queries Comuns

```sql
-- Listas por conta (ordenação alfabética)
SELECT id, name, active_contacts
FROM lists
WHERE account_id = 'xxx'
ORDER BY name;

-- Top 10 listas maiores
SELECT 
  a.name as account_name,
  l.name as list_name,
  l.active_contacts
FROM lists l
JOIN accounts a ON a.id = l.account_id
ORDER BY l.active_contacts DESC NULLS LAST
LIMIT 10;
```

---

### 4. campaign_lists (Join Table)

**Propósito**: Relacionamento many-to-many entre campanhas e listas

```sql
CREATE TABLE campaign_lists (
  account_id   VARCHAR(191) NOT NULL,
  campaign_id  VARCHAR(191) NOT NULL,
  list_id      VARCHAR(191) NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (account_id, campaign_id, list_id),
  FOREIGN KEY (account_id, campaign_id) REFERENCES campaigns(account_id, id) ON DELETE CASCADE,
  FOREIGN KEY (account_id, list_id) REFERENCES lists(account_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_campaign_lists_campaign ON campaign_lists(account_id, campaign_id);
CREATE INDEX idx_campaign_lists_list ON campaign_lists(account_id, list_id);
```

#### Por quê Join Table Explícita?

**Problema com Arrays**:
```sql
-- ❌ NÃO funciona com foreign keys
CREATE TABLE campaigns (
  list_ids VARCHAR[] -- Array de IDs
);

-- ❌ Prisma não consegue fazer join
-- ❌ Integridade referencial não garantida
```

**Solução com Join Table**:
```sql
-- ✅ Foreign keys funcionam
-- ✅ Queries eficientes
-- ✅ Integridade garantida
```

#### Queries Comuns

```sql
-- Campanhas de uma lista
SELECT 
  c.name,
  c.sent,
  c.open_rate,
  c.send_date
FROM campaigns c
JOIN campaign_lists cl ON cl.account_id = c.account_id AND cl.campaign_id = c.id
WHERE cl.account_id = 'xxx' AND cl.list_id = 'yyy'
ORDER BY c.send_date DESC;

-- Listas de uma campanha
SELECT 
  l.name,
  l.active_contacts
FROM lists l
JOIN campaign_lists cl ON cl.account_id = l.account_id AND cl.list_id = l.id
WHERE cl.account_id = 'xxx' AND cl.campaign_id = 'yyy';

-- Métricas agregadas por lista
SELECT 
  l.name,
  COUNT(DISTINCT c.id) as total_campaigns,
  SUM(c.sent) as total_sent,
  ROUND(AVG(c.open_rate), 4) as avg_open_rate
FROM lists l
JOIN campaign_lists cl ON cl.account_id = l.account_id AND cl.list_id = l.id
JOIN campaigns c ON c.account_id = cl.account_id AND c.id = cl.campaign_id
WHERE l.account_id = 'xxx'
GROUP BY l.id, l.name
ORDER BY total_sent DESC;
```

---

### 5. automations

**Propósito**: Automações de email do ActiveCampaign

```sql
CREATE TABLE automations (
  id         VARCHAR(191),
  account_id VARCHAR(191) NOT NULL,
  name       VARCHAR(191) NOT NULL,
  status     VARCHAR(191) NOT NULL,
  
  -- Métricas (limitadas pela API)
  entered    INTEGER DEFAULT 0,
  completed  INTEGER DEFAULT 0,
  active     INTEGER DEFAULT 0,
  
  raw_payload JSONB,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (account_id, id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX idx_automations_account ON automations(account_id);
CREATE INDEX idx_automations_status ON automations(status);
```

#### ⚠️ Limitação da API

A API do ActiveCampaign v3 **NÃO fornece**:
- ❌ Taxa de abertura de emails de automação
- ❌ Taxa de cliques
- ❌ Bounces/unsubscribes específicos

Apenas fornece:
- ✅ `entered`: Contatos que entraram na automação
- ✅ `exited`: Contatos que saíram (completaram ou saíram antes)

**Workaround**: `active = entered - completed` (aproximação)

#### Queries Comuns

```sql
-- Automações ativas por conta
SELECT name, entered, completed, active
FROM automations
WHERE account_id = 'xxx' AND status = 'active'
ORDER BY entered DESC;

-- Automações com mais entradas
SELECT 
  a.name as account_name,
  au.name as automation_name,
  au.entered,
  au.completed,
  ROUND((au.completed::NUMERIC / NULLIF(au.entered, 0)) * 100, 1) as completion_rate
FROM automations au
JOIN accounts a ON a.id = au.account_id
WHERE au.entered > 0
ORDER BY au.entered DESC
LIMIT 10;
```

---

### 6. campaign_messages

**Propósito**: Envios individuais de email (para métricas por período)

```sql
CREATE TABLE campaign_messages (
  id          VARCHAR(191),
  account_id  VARCHAR(191) NOT NULL,
  campaign_id VARCHAR(191) NOT NULL,
  sent_at     TIMESTAMP NOT NULL,
  
  -- Flags de interação
  was_opened  BOOLEAN DEFAULT false,
  was_clicked BOOLEAN DEFAULT false,
  was_bounced BOOLEAN DEFAULT false,
  
  -- Opcional
  contact_id  VARCHAR(191),
  raw_payload JSONB,
  
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (account_id, id),
  FOREIGN KEY (account_id, campaign_id) REFERENCES campaigns(account_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_campaign ON campaign_messages(account_id, campaign_id);
CREATE INDEX idx_messages_sent_at ON campaign_messages(sent_at);
CREATE INDEX idx_messages_account_date ON campaign_messages(account_id, sent_at);
```

#### Uso Principal

**Métricas por Período**: Filtrar emails enviados em datas específicas

```sql
-- Emails enviados ontem
SELECT 
  c.name,
  COUNT(*) as sent,
  COUNT(*) FILTER (WHERE cm.was_opened) as opened,
  COUNT(*) FILTER (WHERE cm.was_clicked) as clicked
FROM campaign_messages cm
JOIN campaigns c ON c.account_id = cm.account_id AND c.id = cm.campaign_id
WHERE 
  cm.sent_at >= CURRENT_DATE - INTERVAL '1 day'
  AND cm.sent_at < CURRENT_DATE
GROUP BY c.id, c.name
ORDER BY sent DESC;
```

#### Estratégia de Sincronização

**Limitação**: Não sincronizar TODAS as mensagens (volume muito alto)

**Estratégia**: Últimos 90 dias

```typescript
// Em sync-service.ts
for await (const messages of messagesAPI.listRecentMessages(90)) {
  // Processar apenas últimos 90 dias
}
```

**Benefício**: Balanceia utilidade vs volume de dados

---

### 7. sync_jobs

**Propósito**: Auditoria e histórico de sincronizações

```sql
CREATE TABLE sync_jobs (
  id                 VARCHAR(191) PRIMARY KEY,
  account_id         VARCHAR(191) NOT NULL,
  started_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at        TIMESTAMP,
  status             VARCHAR(191) NOT NULL,
  error              TEXT,
  is_automatic       BOOLEAN DEFAULT false,
  
  -- Contadores
  campaigns_synced   INTEGER DEFAULT 0,
  lists_synced       INTEGER DEFAULT 0,
  automations_synced INTEGER DEFAULT 0,
  messages_synced    INTEGER DEFAULT 0,
  
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX idx_sync_jobs_account ON sync_jobs(account_id, started_at);
CREATE INDEX idx_sync_jobs_automatic ON sync_jobs(is_automatic, finished_at);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);
```

#### Status Enum

```
'running'   -- Em execução
'completed' -- Concluído com sucesso
'failed'    -- Falhou
```

#### Queries Comuns

```sql
-- Últimos 10 syncs
SELECT 
  a.name,
  sj.started_at,
  sj.finished_at,
  sj.status,
  sj.campaigns_synced,
  sj.lists_synced,
  sj.automations_synced,
  sj.is_automatic
FROM sync_jobs sj
JOIN accounts a ON a.id = sj.account_id
ORDER BY sj.started_at DESC
LIMIT 10;

-- Syncs falhados nas últimas 24h
SELECT 
  a.name,
  sj.started_at,
  sj.error
FROM sync_jobs sj
JOIN accounts a ON a.id = sj.account_id
WHERE 
  sj.status = 'failed'
  AND sj.started_at >= NOW() - INTERVAL '24 hours'
ORDER BY sj.started_at DESC;

-- Taxa de sucesso por conta (últimos 30 dias)
SELECT 
  a.name,
  COUNT(*) as total_syncs,
  COUNT(*) FILTER (WHERE sj.status = 'completed') as successful,
  COUNT(*) FILTER (WHERE sj.status = 'failed') as failed,
  ROUND(
    (COUNT(*) FILTER (WHERE sj.status = 'completed')::NUMERIC / COUNT(*)) * 100,
    1
  ) as success_rate
FROM sync_jobs sj
JOIN accounts a ON a.id = sj.account_id
WHERE sj.started_at >= NOW() - INTERVAL '30 days'
GROUP BY a.id, a.name
ORDER BY success_rate ASC;

-- Duração média de sync por conta
SELECT 
  a.name,
  COUNT(*) as total_syncs,
  AVG(EXTRACT(EPOCH FROM (sj.finished_at - sj.started_at))) as avg_duration_seconds
FROM sync_jobs sj
JOIN accounts a ON a.id = sj.account_id
WHERE 
  sj.status = 'completed'
  AND sj.finished_at IS NOT NULL
GROUP BY a.id, a.name
ORDER BY avg_duration_seconds DESC;
```

---

## 🚀 Performance e Otimizações

### Índices Estratégicos

**Princípio**: Índices devem cobrir queries comuns

```sql
-- ✅ BOM: Índice composto para filtro comum
CREATE INDEX idx_campaigns_account_date 
ON campaigns(account_id, send_date);

-- Query beneficiada:
WHERE account_id = 'xxx' AND send_date >= '2026-01-01'

-- ❌ RUIM: Índices redundantes
CREATE INDEX idx_campaigns_account ON campaigns(account_id);
CREATE INDEX idx_campaigns_account_date ON campaigns(account_id, send_date);
-- O segundo já cobre o primeiro!
```

### Análise de EXPLAIN

```sql
-- Ver plano de execução
EXPLAIN ANALYZE
SELECT *
FROM campaigns
WHERE account_id = 'xxx'
  AND send_date >= '2026-01-01'
ORDER BY send_date DESC
LIMIT 100;

-- Resultado esperado:
-- Index Scan using idx_campaigns_account_date (cost=...)
```

### Vacuum e Analyze

```sql
-- Atualizar estatísticas do planner
ANALYZE campaigns;

-- Limpar espaço morto (após muitos UPSERTs)
VACUUM campaigns;

-- Ou combinar:
VACUUM ANALYZE campaigns;
```

### Particionamento (Futuro)

**Quando?** Se `campaigns` > 10 milhões de linhas

```sql
-- Particionar por send_date (range)
CREATE TABLE campaigns_2026_01 PARTITION OF campaigns
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE campaigns_2026_02 PARTITION OF campaigns
FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

---

## 🔒 Integridade e Constraints

### Foreign Keys com Cascade

```sql
FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
```

**Comportamento**: Deletar conta → Deleta TODAS campanhas, listas, automações

**Vantagem**: Limpeza automática, sem dados órfãos

### Unique Constraints

```sql
PRIMARY KEY (account_id, id)
```

**Garante**: Não duplicar campanha dentro da mesma conta

### Check Constraints (Futuro)

```sql
-- Garantir que rates estão entre 0 e 1
ALTER TABLE campaigns
ADD CONSTRAINT check_open_rate
CHECK (open_rate >= 0 AND open_rate <= 1);

-- Garantir que sent >= unique_opens
ALTER TABLE campaigns
ADD CONSTRAINT check_opens_sent
CHECK (unique_opens <= sent);
```

---

## 📊 Queries de Análise

### Dashboard KPIs

```sql
-- Métricas consolidadas de todas as contas
SELECT 
  SUM(sent) as total_sent,
  SUM(unique_opens) as total_unique_opens,
  SUM(unique_clicks) as total_unique_clicks,
  ROUND(SUM(unique_opens)::NUMERIC / NULLIF(SUM(sent), 0), 4) as open_rate,
  ROUND(SUM(unique_clicks)::NUMERIC / NULLIF(SUM(sent), 0), 4) as click_rate,
  ROUND(SUM(unique_clicks)::NUMERIC / NULLIF(SUM(unique_opens), 0), 4) as ctor
FROM campaigns
WHERE 
  account_id IN (SELECT id FROM accounts WHERE is_active = true)
  AND send_date >= '2026-01-01'
  AND send_date <= '2026-01-31';
```

### Comparação de Contas

```sql
SELECT 
  a.name,
  COUNT(c.id) as campaigns_count,
  SUM(c.sent) as total_sent,
  ROUND(AVG(c.open_rate) * 100, 1) as avg_open_rate,
  ROUND(AVG(c.click_rate) * 100, 1) as avg_click_rate,
  a.contact_count,
  a.contact_limit,
  ROUND((a.contact_count::NUMERIC / NULLIF(a.contact_limit, 0)) * 100, 1) as contact_usage
FROM accounts a
LEFT JOIN campaigns c ON c.account_id = a.id
WHERE a.is_active = true
GROUP BY a.id, a.name, a.contact_count, a.contact_limit
ORDER BY total_sent DESC;
```

### Time Series (Envios por Dia)

```sql
SELECT 
  DATE(send_date) as date,
  COUNT(*) as campaigns_sent,
  SUM(sent) as emails_sent,
  ROUND(AVG(open_rate) * 100, 1) as avg_open_rate
FROM campaigns
WHERE 
  send_date >= NOW() - INTERVAL '30 days'
  AND account_id IN (SELECT id FROM accounts WHERE is_active = true)
GROUP BY DATE(send_date)
ORDER BY date DESC;
```

### Campanhas sem Listas (Anomalia)

```sql
SELECT 
  a.name as account,
  c.name as campaign,
  c.sent,
  c.send_date
FROM campaigns c
JOIN accounts a ON a.id = c.account_id
LEFT JOIN campaign_lists cl ON cl.account_id = c.account_id AND cl.campaign_id = c.id
WHERE cl.list_id IS NULL
  AND c.sent > 0;
```

---

## 🧪 Queries de Diagnóstico

### Saúde do Banco

```sql
-- Tamanho das tabelas
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Índices não utilizados (otimização)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE 'pg_toast%'
ORDER BY schemaname, tablename;

-- Queries lentas (se log habilitado)
SELECT 
  query,
  calls,
  total_time / 1000 as total_seconds,
  mean_time / 1000 as mean_seconds
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### Integridade de Dados

```sql
-- Campanhas órfãs (não deveria existir com CASCADE)
SELECT COUNT(*)
FROM campaigns c
LEFT JOIN accounts a ON a.id = c.account_id
WHERE a.id IS NULL;

-- Messages sem campanha associada
SELECT COUNT(*)
FROM campaign_messages cm
LEFT JOIN campaigns c ON c.account_id = cm.account_id AND c.id = cm.campaign_id
WHERE c.id IS NULL;

-- Listas duplicadas (não deveria acontecer com PK)
SELECT account_id, id, COUNT(*)
FROM lists
GROUP BY account_id, id
HAVING COUNT(*) > 1;
```

---

## 🔧 Manutenção

### Backup

```bash
# Backup completo
pg_dump -h localhost -U email_dash_user -d email_dash > backup_$(date +%Y%m%d).sql

# Backup apenas schema (sem dados)
pg_dump -h localhost -U email_dash_user -d email_dash --schema-only > schema.sql

# Backup apenas dados de uma tabela
pg_dump -h localhost -U email_dash_user -d email_dash -t campaigns --data-only > campaigns_data.sql
```

### Restore

```bash
# Restore completo
psql -h localhost -U email_dash_user -d email_dash < backup_20260113.sql

# Restore de uma tabela específica
psql -h localhost -U email_dash_user -d email_dash < campaigns_data.sql
```

### Limpeza de Dados Antigos

```sql
-- Deletar messages com mais de 180 dias
DELETE FROM campaign_messages
WHERE sent_at < NOW() - INTERVAL '180 days';

-- Deletar sync_jobs com mais de 1 ano
DELETE FROM sync_jobs
WHERE started_at < NOW() - INTERVAL '1 year';
```

---

## 📈 Estatísticas de Uso

### Crescimento de Dados

```sql
-- Registros adicionados por dia (últimos 7 dias)
SELECT 
  DATE(created_at) as date,
  'campaigns' as table_name,
  COUNT(*) as new_records
FROM campaigns
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
UNION ALL
SELECT 
  DATE(created_at),
  'campaign_messages',
  COUNT(*)
FROM campaign_messages
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC, table_name;
```

---

## 🎯 Recomendações

### Curto Prazo

1. ✅ **Adicionar índice em raw_payload**
   ```sql
   CREATE INDEX idx_campaigns_raw_payload_gin ON campaigns USING GIN (raw_payload);
   ```
   **Benefício**: Queries em JSONB mais rápidas

2. ✅ **Criptografar API Keys**
   ```typescript
   import { encrypt } from '@/lib/crypto'
   apiKey = encrypt(apiKey, process.env.SECRET_KEY)
   ```

3. ✅ **Adicionar Check Constraints**
   ```sql
   ALTER TABLE campaigns ADD CONSTRAINT check_rates CHECK (
     open_rate BETWEEN 0 AND 1 AND
     click_rate BETWEEN 0 AND 1
   );
   ```

### Médio Prazo

1. ✅ **Implementar View Materializada para KPIs**
   ```sql
   CREATE MATERIALIZED VIEW kpi_snapshot AS
   SELECT 
     DATE(send_date) as date,
     account_id,
     SUM(sent) as sent,
     SUM(unique_opens) as opens,
     AVG(open_rate) as avg_open_rate
   FROM campaigns
   GROUP BY DATE(send_date), account_id;
   
   -- Refresh diário
   REFRESH MATERIALIZED VIEW kpi_snapshot;
   ```

2. ✅ **Adicionar Logging de Queries Lentas**
   ```sql
   -- postgresql.conf
   log_min_duration_statement = 1000  -- Log queries > 1s
   ```

### Longo Prazo

1. ✅ **Particionamento de `campaign_messages`**
   - Por `sent_at` (monthly partitions)
   - Quando > 10M registros

2. ✅ **Replicação Read-Only**
   - PostgreSQL Streaming Replication
   - Dashboard lê do replica
   - Sync escreve no master

3. ✅ **Migração para TimescaleDB**
   - Otimizado para time-series
   - Melhor compressão
   - Queries temporais mais rápidas

---

**Documento criado por Claude (Cursor AI)**  
**Data:** 13 de Janeiro de 2026

