# 🔌 Mapeamento Completo de Requisições à API do ActiveCampaign

**Data:** 13 de Janeiro de 2026  
**Versão:** 1.0

---

## 📋 Sumário Executivo

Este documento mapeia **todas as requisições HTTP** feitas ao ActiveCampaign, incluindo:
- Endpoints utilizados
- Headers de autenticação
- Parâmetros de query
- Estrutura de resposta
- Tratamento de erros
- Rate limiting

---

## 🌐 Configuração Base

### URL Base

```
Padrão: https://{account}.api-us1.com
Exemplo: https://gactv22.api-us1.com
```

**Variações por Região:**
- US: `api-us1.com` (padrão)
- Europa: `api-eu1.com`
- Outros: verificar no painel do ActiveCampaign

### Autenticação

**Método**: API Token via Header

```http
Api-Token: YOUR_API_KEY_HERE
Content-Type: application/json
Accept: application/json
```

**Nota**: Não usa OAuth. Token é fixo e não expira (a menos que revogado manualmente).

---

## 📡 API v3 - Requisições Detalhadas

### 1. Listar Campanhas

#### Request

```http
GET /api/3/campaigns?orders[sdate]=DESC&limit=100&offset=0
Host: gactv22.api-us1.com
Api-Token: abc123xyz789
Content-Type: application/json
```

**Query Parameters:**

| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| `orders[sdate]` | `DESC` | Ordenar por data de envio (descendente) |
| `limit` | `100` | Máximo de resultados por página (max: 100) |
| `offset` | `0` | Paginação (0, 100, 200, ...) |

#### Response (200 OK)

```json
{
  "campaigns": [
    {
      "id": "123",
      "type": "single",
      "name": "Newsletter Janeiro 2026",
      "status": 5,
      "public": "1",
      "tracklinks": "all",
      "trackreads": "1",
      "send_amt": "1543",
      "total_amt": "1600",
      "opens": "892",
      "uniqueopens": "847",
      "linkclicks": "234",
      "uniquelinkclicks": "198",
      "subscriberclicks": "0",
      "forwards": "12",
      "uniqueforwards": "12",
      "hardbounces": "8",
      "softbounces": "5",
      "unsubscribes": "3",
      "unsubreasons": "2",
      "updates": "0",
      "socialshares": "5",
      "replies": "0",
      "uniquereplies": "0",
      "sdate": "2026-01-10T14:30:00-06:00",
      "ldate": "2026-01-10T15:45:00-06:00",
      "lists": ["5", "12"]
    }
  ],
  "meta": {
    "total": 1523,
    "page_input": {
      "limit": 100,
      "offset": 0
    }
  }
}
```

#### Normalização no Código

```typescript
// Status numérico → string
const statusMap = {
  0: 'draft',
  1: 'scheduled',
  2: 'sending',
  3: 'paused',
  4: 'stopped',
  5: 'completed'
}

// Strings → Números
const sent = parseInt(campaign.send_amt, 10)
const uniqueOpens = parseInt(campaign.uniqueopens, 10)

// Calcular rates
const openRate = sent > 0 ? uniqueOpens / sent : 0
```

#### Rate Limiting Headers

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1705180800
```

**Lógica no Código**:
```typescript
if (rateLimitInfo.remaining < 2) {
  const waitTime = rateLimitInfo.reset - Date.now()
  await sleep(waitTime)
}
```

---

### 2. Buscar Listas de uma Campanha

#### Request

```http
GET /api/3/campaigns/123/campaignLists
Host: gactv22.api-us1.com
Api-Token: abc123xyz789
```

**Sem query parameters** (retorna todas as listas da campanha)

#### Response (200 OK)

```json
{
  "campaignLists": [
    {
      "list": "5",
      "listid": "5",
      "campaign": "123",
      "campaignid": "123",
      "status": "1",
      "sdate": "2026-01-10T14:30:00-06:00",
      "senddate": "2026-01-10T14:30:00-06:00"
    },
    {
      "list": "12",
      "listid": "12",
      "campaign": "123",
      "campaignid": "123",
      "status": "1",
      "sdate": "2026-01-10T14:30:00-06:00",
      "senddate": "2026-01-10T14:30:00-06:00"
    }
  ]
}
```

#### Uso no Código

```typescript
const listIds = response.campaignLists.map(cl => cl.list || cl.listid)
// Resultado: ["5", "12"]

// Criar relacionamentos na join table
for (const listId of listIds) {
  await prisma.campaignList.create({
    data: { accountId, campaignId, listId }
  })
}
```

---

### 3. Listar Listas de Contatos

#### Request

```http
GET /api/3/lists?limit=100&offset=0
Host: gactv22.api-us1.com
Api-Token: abc123xyz789
```

#### Response (200 OK)

```json
{
  "lists": [
    {
      "id": "5",
      "name": "Clientes VIP",
      "stringid": "clientes-vip",
      "userid": "1",
      "cdate": "2025-06-15T10:30:00-06:00",
      "udate": "2026-01-10T08:20:00-06:00",
      "p": ["1", "2"],
      "private": "0",
      "subscriber_count": "1234"
    },
    {
      "id": "12",
      "name": "Newsletter Geral",
      "stringid": "newsletter-geral",
      "userid": "1",
      "cdate": "2025-03-20T09:15:00-06:00",
      "udate": "2026-01-09T16:40:00-06:00",
      "p": ["1"],
      "private": "0",
      "subscriber_count": "8567"
    }
  ],
  "meta": {
    "total": 28
  }
}
```

#### Normalização

```typescript
const activeContacts = parseInt(list.subscriber_count, 10)
// subscriber_count pode ser undefined, então usar null como fallback
```

---

### 4. Listar Automações

#### Request

```http
GET /api/3/automations?limit=100&offset=0
Host: gactv22.api-us1.com
Api-Token: abc123xyz789
```

#### Response (200 OK)

```json
{
  "automations": [
    {
      "id": "1",
      "name": "Welcome Series - Novos Clientes",
      "status": "1",
      "defaultscreenshot": "",
      "entered": "523",
      "exited": "498",
      "cdate": "2025-08-15T11:20:00-06:00",
      "mdate": "2026-01-05T14:10:00-06:00"
    },
    {
      "id": "2",
      "name": "Carrinho Abandonado",
      "status": "1",
      "entered": "1245",
      "exited": "1189",
      "cdate": "2025-09-01T09:30:00-06:00",
      "mdate": "2026-01-10T08:45:00-06:00"
    }
  ],
  "meta": {
    "total": 12
  }
}
```

#### Normalização

```typescript
// Status: "1" = active, "0" = inactive
const status = automation.status === "1" ? "active" : "inactive"

// Calcular "active" (aproximação)
const entered = parseInt(automation.entered, 10)
const exited = parseInt(automation.exited, 10)
const active = Math.max(0, entered - exited)
```

**⚠️ LIMITAÇÃO CRÍTICA**: API v3 **não fornece** métricas de emails de automação (opens, clicks, etc). Apenas `entered` e `exited`.

---

### 5. Listar Mensagens (Envios Individuais)

#### Request (com Filtro de Data)

```http
GET /api/3/messages?filters[cdate_gte]=2025-10-15T00:00:00Z&orders[cdate]=DESC&limit=100&offset=0
Host: gactv22.api-us1.com
Api-Token: abc123xyz789
```

**Query Parameters:**

| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| `filters[cdate_gte]` | `2025-10-15T00:00:00Z` | Data de criação >= (ISO 8601) |
| `filters[cdate_lte]` | `2026-01-15T23:59:59Z` | Data de criação <= (opcional) |
| `filters[campaignid]` | `123` | Filtrar por campanha (opcional) |
| `orders[cdate]` | `DESC` | Ordenar por data de criação |
| `limit` | `100` | Limite por página |
| `offset` | `0` | Paginação |

#### Response (200 OK)

```json
{
  "messages": [
    {
      "id": "msg_45678",
      "campaignid": "123",
      "contactid": "9876",
      "userid": "1",
      "cdate": "2026-01-10T14:35:12-06:00",
      "sent": "2026-01-10T14:35:12-06:00",
      "user": "1",
      "opened_count": "3",
      "clicked_count": "1",
      "link_clicked_count": "1",
      "opened": "1",
      "clicked": "1",
      "bounced": "0",
      "bounce_type": null
    }
  ],
  "meta": {
    "total": 15234
  }
}
```

#### Normalização

```typescript
// Parse flags (podem vir como string "1" ou boolean true)
const wasOpened = 
  message.opened === true || 
  message.opened === '1' || 
  parseInt(message.opened_count || '0', 10) > 0

const wasClicked = 
  message.clicked === true || 
  message.clicked === '1' || 
  parseInt(message.clicked_count || '0', 10) > 0

const wasBounced = 
  message.bounced === true || 
  message.bounced === '1' ||
  !!message.bounce_type
```

**Uso**: Sincronizar últimos 90 dias para métricas por período

---

### 6. Contar Contatos

#### Request (Performance Otimizada)

```http
GET /api/3/contacts?limit=1
Host: gactv22.api-us1.com
Api-Token: abc123xyz789
```

**Estratégia**: `limit=1` porque só precisamos do `meta.total`

#### Response (200 OK)

```json
{
  "contacts": [
    {
      "id": "1",
      "email": "exemplo@email.com",
      "firstName": "João",
      "lastName": "Silva"
    }
  ],
  "meta": {
    "total": 15234
  }
}
```

#### Uso no Código

```typescript
const total = parseInt(response.meta.total, 10)
// Atualizar account.contactCount
```

---

### 7. Testar Conexão

#### Request (Endpoint de Usuário)

```http
GET /api/3/users/me
Host: gactv22.api-us1.com
Api-Token: abc123xyz789
```

#### Response (200 OK)

```json
{
  "user": {
    "id": "1",
    "username": "admin",
    "email": "admin@empresa.com",
    "first_name": "Admin",
    "last_name": "Sistema"
  }
}
```

#### Uso

```typescript
// Testar API key válida
try {
  const response = await client.get('/users/me')
  return { valid: true, accountName: response.user?.email }
} catch {
  // Se falhar, tentar endpoint mais básico
  await client.get('/campaigns?limit=1')
}
```

---

## 📡 API v1 - Requisições Legacy

### Por quê usar API v1?

**Razão**: API v3 **não suporta filtros de data** em métricas de campanha.

- API v3: Métricas são **acumuladas** (lifetime)
- API v1: Endpoint `campaign_report_totals` aceita `sdate` e `ldate`

### 1. Métricas de Campanha por Período

#### Request

```http
GET /admin/api.php?api_action=campaign_report_totals&campaignid=123&sdate=2026-01-01&ldate=2026-01-31&api_key=abc123xyz789&api_output=json
Host: gactv22.api-us1.com
```

**Query Parameters:**

| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| `api_action` | `campaign_report_totals` | Ação da API v1 |
| `campaignid` | `123` | ID da campanha |
| `sdate` | `2026-01-01` | Data início (YYYY-MM-DD) |
| `ldate` | `2026-01-31` | Data fim (YYYY-MM-DD) |
| `api_key` | `abc123...` | API Key (query param, não header!) |
| `api_output` | `json` | Formato de saída |

#### Response (200 OK)

```json
{
  "result_code": 1,
  "result_message": "Success: Something is returned",
  "send_amt": "456",
  "total_amt": "500",
  "uniqueopens": "210",
  "subscriberclicks": "45",
  "uniquelinkclicks": "45",
  "totalbounces": "3",
  "unsubscribes": "1",
  "forwards": "2",
  "open_rate": "46.05",
  "clickthrough_rate": "9.87"
}
```

#### Normalização

```typescript
const sent = parseInt(data.send_amt || '0', 10)
const opens = parseInt(data.uniqueopens || '0', 10)
const clicks = parseInt(data.subscriberclicks || data.uniquelinkclicks || '0', 10)
const bounces = parseInt(data.totalbounces || '0', 10)
const unsubscribes = parseInt(data.unsubscribes || '0', 10)

// Calcular rates (API v1 retorna, mas recalcular para consistência)
const openRate = sent > 0 ? opens / sent : 0
const clickRate = sent > 0 ? clicks / sent : 0
```

#### ⚠️ BUG CONHECIDO

**Problema**: Se `sdate = ldate`, API v1 retorna 0 em todas as métricas.

**Exemplo**:
```http
sdate=2026-01-10&ldate=2026-01-10
Resultado: send_amt=0, uniqueopens=0, etc. (ERRADO!)
```

**Solução no Código**:
```typescript
if (sdate === ldate) {
  const nextDay = new Date(dateTo)
  nextDay.setDate(nextDay.getDate() + 1)
  ldate = nextDay.toISOString().split('T')[0]
  
  // Resultado: sdate=2026-01-10, ldate=2026-01-11 (CORRETO!)
}
```

#### Response em Caso de Erro

```json
{
  "result_code": 0,
  "result_message": "Failed: Nothing is returned"
}
```

**Significado**: Campanha não tem dados no período especificado.

**Tratamento**: Retornar métricas zeradas (não lançar erro).

---

### 2. Informações da Conta (Limite de Contatos)

#### Request

```http
GET /admin/api.php?api_action=account_view&api_key=abc123xyz789&api_output=json
Host: gactv22.api-us1.com
```

#### Response (200 OK)

```json
{
  "result_code": 1,
  "result_message": "Success",
  "account": "Empresa XYZ",
  "subscriber_total": "15234",
  "subscriber_limit": "25000",
  "plan_name": "Professional",
  "timezone": "America/Chicago"
}
```

#### Uso

```typescript
const contactCount = parseInt(data.subscriber_total || '0', 10)
const contactLimit = parseInt(data.subscriber_limit || '0', 10)

// Atualizar account
await prisma.account.update({
  where: { id: accountId },
  data: { contactCount, contactLimit, lastContactSync: new Date() }
})
```

**Por quê API v1?** Endpoint `/users/me` da v3 **não retorna** limite de contatos.

---

## ⚡ Rate Limiting e Retry

### Rate Limits do ActiveCampaign

**Padrão**: 5 requests por segundo

**Headers de Resposta**:
```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1705180801
```

### Estratégia de Rate Limiting

```typescript
class ActiveCampaignClient {
  private rateLimitInfo: RateLimitInfo | null = null

  async request(endpoint: string) {
    // 1. Verificar rate limit ANTES da requisição
    if (this.rateLimitInfo && this.rateLimitInfo.remaining < 2) {
      const waitTime = Math.max(1000, this.rateLimitInfo.reset - Date.now())
      console.log(`⏳ Rate limit baixo, aguardando ${waitTime}ms...`)
      await sleep(waitTime)
    }

    // 2. Fazer requisição
    const response = await fetch(url, options)

    // 3. Atualizar info de rate limit
    const remaining = response.headers.get('X-RateLimit-Remaining')
    const reset = response.headers.get('X-RateLimit-Reset')
    if (remaining && reset) {
      this.rateLimitInfo = {
        limit: 5,
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10) * 1000
      }
    }

    return response
  }
}
```

**Benefícios**:
- ✅ Previne erro 429 (Too Many Requests)
- ✅ Não bloqueia desnecessariamente
- ✅ Usa informação real da API

---

### Estratégia de Retry

```typescript
async request(endpoint: string) {
  let attempt = 0
  const maxAttempts = 3

  while (attempt < maxAttempts) {
    try {
      const response = await fetch(url, options)

      // Rate limit hit (429)
      if (response.status === 429) {
        attempt++
        const backoff = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
        console.log(`⚠️ 429 Rate Limit, retry ${attempt}/${maxAttempts} após ${backoff}ms`)
        await sleep(backoff)
        continue
      }

      // Outros erros 5xx (servidor)
      if (response.status >= 500) {
        attempt++
        const backoff = Math.pow(2, attempt) * 1000
        await sleep(backoff)
        continue
      }

      // Sucesso
      return await response.json()
    } catch (error) {
      // Erro de rede (timeout, etc)
      if (attempt === maxAttempts - 1) throw error
      
      attempt++
      const backoff = Math.pow(2, attempt) * 1000
      await sleep(backoff)
    }
  }

  throw new Error('Max retry attempts reached')
}
```

**Exponential Backoff**:
- Tentativa 1: aguarda 1 segundo
- Tentativa 2: aguarda 2 segundos
- Tentativa 3: aguarda 4 segundos

---

## 🔒 Tratamento de Erros

### Códigos HTTP Comuns

| Status | Significado | Ação |
|--------|-------------|------|
| `200` | Sucesso | Processar resposta |
| `401` | API Key inválida | Falhar sync, alertar usuário |
| `403` | Sem permissão | Verificar API Key, pode estar revogada |
| `404` | Endpoint não existe | Erro de implementação |
| `429` | Rate limit excedido | Retry com backoff |
| `500` | Erro no servidor AC | Retry com backoff |
| `503` | Serviço indisponível | Retry com backoff |

### Exemplo de Tratamento

```typescript
if (response.status === 403) {
  throw new Error(
    'Credenciais inválidas ou sem permissão. Verifique sua API Key.'
  )
}

if (response.status === 401) {
  throw new Error(
    'API Key inválida. Verifique suas credenciais.'
  )
}

if (response.status === 404) {
  throw new Error(
    'URL inválida. Verifique a Base URL do ActiveCampaign.'
  )
}
```

### Logs no Console

```typescript
console.log('📧 Sincronizando campanhas da conta MyAccount...')
console.log('✅ 523 campanhas sincronizadas')
console.log('⚠️ Não foi possível sincronizar informações de contatos')
console.log('❌ Erro na sincronização da conta MyAccount: 403 Forbidden')
```

**Padrão de Emojis**:
- 🚀 Início de processo
- 📊 Buscando dados
- ✅ Sucesso
- ⚠️ Warning (não crítico)
- ❌ Erro (crítico)

---

## 🧪 Testando Requisições Manualmente

### cURL - Listar Campanhas

```bash
curl -X GET \
  "https://gactv22.api-us1.com/api/3/campaigns?limit=5" \
  -H "Api-Token: YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### cURL - API v1 (Métricas por Período)

```bash
curl -X GET \
  "https://gactv22.api-us1.com/admin/api.php?api_action=campaign_report_totals&campaignid=123&sdate=2026-01-01&ldate=2026-01-31&api_key=YOUR_API_KEY&api_output=json"
```

### Postman Collection

**Criar Collection**:

1. **Request**: List Campaigns
   - Method: GET
   - URL: `{{baseUrl}}/api/3/campaigns?limit=10`
   - Headers: `Api-Token: {{apiKey}}`

2. **Request**: Campaign Lists
   - Method: GET
   - URL: `{{baseUrl}}/api/3/campaigns/{{campaignId}}/campaignLists`

3. **Request**: Campaign Metrics (v1)
   - Method: GET
   - URL: `{{baseUrl}}/admin/api.php?api_action=campaign_report_totals&campaignid={{campaignId}}&sdate={{sdate}}&ldate={{ldate}}&api_key={{apiKey}}&api_output=json`

**Variables**:
- `baseUrl`: `https://gactv22.api-us1.com`
- `apiKey`: `abc123xyz789`
- `campaignId`: `123`
- `sdate`: `2026-01-01`
- `ldate`: `2026-01-31`

---

## 📊 Fluxo Completo de Sincronização

### Diagrama de Sequência

```
User/Cron → SyncService → ActiveCampaignClient → ActiveCampaign API
                                                         ↓
                                                   Rate Limit?
                                                   ↙Yes   ↘No
                                            Wait + Retry  Continue
                                                         ↓
                                                   Parse JSON
                                                         ↓
                                                   Normalizer
                                                         ↓
                                                   Prisma ORM
                                                         ↓
                                                   PostgreSQL
```

### Ordem de Sincronização

**Importante**: Ordem específica para manter integridade referencial

1. **Listas** (primeiro)
   - Porque: Campanhas referenciam listas via join table
   - Endpoint: `GET /api/3/lists`

2. **Contatos** (informações agregadas)
   - Porque: Atualizar contador da conta
   - Endpoint: `GET /api/3/contacts?limit=1` + `GET /admin/api.php?api_action=account_view`

3. **Campanhas** (depois das listas)
   - Porque: Precisa das listas para criar relacionamentos
   - Endpoint: `GET /api/3/campaigns`
   - Sub-request: `GET /api/3/campaigns/:id/campaignLists` (para cada campanha)

4. **Automações** (independente)
   - Porque: Não tem dependências
   - Endpoint: `GET /api/3/automations`

5. **Messages** (por último)
   - Porque: Precisa das campanhas já sincronizadas
   - Endpoint: `GET /api/3/messages?filters[cdate_gte]=...`

---

## 🎯 Resumo de Endpoints

### API v3

| Endpoint | Método | Descrição | Paginação |
|----------|--------|-----------|-----------|
| `/api/3/campaigns` | GET | Listar campanhas | Sim (limit/offset) |
| `/api/3/campaigns/:id` | GET | Detalhes de campanha | Não |
| `/api/3/campaigns/:id/campaignLists` | GET | Listas de uma campanha | Não |
| `/api/3/lists` | GET | Listar listas | Sim |
| `/api/3/lists/:id` | GET | Detalhes de lista | Não |
| `/api/3/automations` | GET | Listar automações | Sim |
| `/api/3/automations/:id` | GET | Detalhes de automação | Não |
| `/api/3/messages` | GET | Listar envios individuais | Sim |
| `/api/3/messages/:id` | GET | Detalhes de envio | Não |
| `/api/3/contacts` | GET | Listar contatos | Sim |
| `/api/3/users/me` | GET | Dados do usuário (teste) | Não |

### API v1

| Endpoint | Método | Descrição | Filtro Data |
|----------|--------|-----------|-------------|
| `/admin/api.php` (action: `campaign_report_totals`) | GET | Métricas de campanha | Sim (sdate/ldate) |
| `/admin/api.php` (action: `account_view`) | GET | Limite de contatos | Não |

---

## 📝 Checklist de Implementação

Ao adicionar um novo endpoint:

- [ ] Criar método na classe API correspondente (ex: `CampaignsAPI`)
- [ ] Implementar paginação se necessário (usar `client.paginate()`)
- [ ] Definir tipos TypeScript (`ACCampaign`, etc)
- [ ] Criar função de normalização (`normalizeCampaign()`)
- [ ] Adicionar ao `SyncService`
- [ ] Tratar erros específicos
- [ ] Adicionar logs (✅, ⚠️, ❌)
- [ ] Testar com conta real
- [ ] Documentar limitações (se houver)

---

## 🔗 Referências

- **Documentação Oficial**: https://developers.activecampaign.com/reference/overview
- **API v3**: https://developers.activecampaign.com/reference/api-overview
- **API v1**: https://www.activecampaign.com/api/overview.php (legacy)
- **Rate Limits**: https://developers.activecampaign.com/reference/rate-limits

---

**Documento criado por Claude (Cursor AI)**  
**Data:** 13 de Janeiro de 2026

