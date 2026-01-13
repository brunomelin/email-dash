# 🚀 Solução: Cache a Nível de Servidor

**Data:** 13 de Janeiro de 2026  
**Status:** ⭐ **RECOMENDADO**

---

## 🎯 **Visão Geral**

Implementar cache a nível de servidor para cachear:
1. **Resultado de `/automations/{id}/campaigns`** (87 automações)
2. **Resultado de API v1 por período** (métricas de data)
3. **Queries de automações do banco**

**Benefícios:**
- ✅ **Cache compartilhado** entre todos os usuários
- ✅ **Persiste entre requests**
- ✅ **TTL configurável** (ex: 5 minutos)
- ✅ **Reduz 90%+ das chamadas à API**

---

## 📊 **Comparação de Performance**

### **SEM Cache (Atual):**
```
Usuário 1: 347 HTTP requests → 40 segundos
Usuário 2: 347 HTTP requests → 40 segundos  
Usuário 3: 347 HTTP requests → 40 segundos
Total: 1041 requests em 2 minutos
```

### **COM Cache:**
```
Usuário 1: 347 requests → 40s (preenche cache)
Usuário 2: 0 requests → 2s (cache hit!)
Usuário 3: 0 requests → 2s (cache hit!)
Após 5min: 347 requests → 40s (renova cache)
Total: 347 requests em 2 minutos
```

**Redução:** 70% menos requests, 95% mais rápido para usuários subsequentes!

---

## 🔧 **3 Opções de Implementação**

### **Opção 1: Next.js `unstable_cache`** ⭐ **RECOMENDADO**

**Descrição:** Cache nativo do Next.js 14/15

**Vantagens:**
- ✅ Built-in (zero dependências)
- ✅ Funciona em Vercel, Railway, etc
- ✅ API simples
- ✅ Cache entre requests
- ✅ TTL automático

**Código:**

```typescript
// src/lib/cache/server-cache.ts
import { unstable_cache } from 'next/cache'

/**
 * Cache para chamadas de API do ActiveCampaign
 * TTL: 5 minutos
 */
export const getCachedAutomationCampaigns = unstable_cache(
  async (automationId: string, baseUrl: string, apiKey: string) => {
    const client = new ActiveCampaignClient({ baseUrl, apiKey })
    return await client.getAutomationCampaigns(automationId)
  },
  ['automation-campaigns'], // cache key prefix
  {
    revalidate: 300, // 5 minutos
    tags: ['automation-campaigns']
  }
)

/**
 * Cache para métricas de campanha (API v1)
 */
export const getCachedCampaignMetrics = unstable_cache(
  async (
    campaignId: string,
    sdate: string,
    ldate: string,
    baseUrl: string,
    apiKey: string
  ) => {
    const apiv1 = new ActiveCampaignAPIv1({ baseUrl, apiKey })
    return await apiv1.getCampaignReportTotals(campaignId, { sdate, ldate })
  },
  ['campaign-metrics'],
  {
    revalidate: 300,
    tags: ['campaign-metrics']
  }
)

/**
 * Cache para lista de automações
 */
export const getCachedAutomations = unstable_cache(
  async (accountIds: string[]) => {
    return await prisma.automation.findMany({
      where: { accountId: { in: accountIds } },
      include: {
        account: {
          select: { name: true, baseUrl: true, apiKey: true }
        }
      },
      orderBy: { name: 'asc' }
    })
  },
  ['automations-list'],
  {
    revalidate: 300,
    tags: ['automations']
  }
)
```

**Uso no Service:**

```typescript
// src/lib/services/automation-metrics-service.ts
import { getCachedAutomationCampaigns, getCachedCampaignMetrics } from '@/lib/cache/server-cache'

async getAutomationsWithMetricsV2(filters: AutomationFilters = {}) {
  // 1. Buscar automações (CACHADO)
  const automations = await getCachedAutomations(filters.accountIds || [])
  
  // 2. Para cada automação, buscar campanhas (CACHADO)
  const automationsWithCampaigns = await Promise.all(
    automations.map(async (automation) => {
      try {
        // ✅ Cache hit = instantâneo!
        const apiCampaigns = await getCachedAutomationCampaigns(
          automation.id,
          automation.account.baseUrl,
          automation.account.apiKey
        )
        
        // Buscar do banco (pode adicionar cache também)
        const campaigns = await prisma.campaign.findMany(...)
        
        return { automation, campaigns }
      } catch (error) {
        // Fallback...
      }
    })
  )
  
  // 3. Se filtro de data, buscar métricas (CACHADO)
  if (filters.dateFrom || filters.dateTo) {
    for (const item of automationsWithCampaigns) {
      item.campaigns = await Promise.all(
        item.campaigns.map(async (campaign) => {
          // ✅ Cache hit = instantâneo!
          const metrics = await getCachedCampaignMetrics(
            campaign.id,
            sdate,
            ldate,
            item.automation.account.baseUrl,
            item.automation.account.apiKey
          )
          
          return { ...campaign, ...metrics }
        })
      )
    }
  }
  
  // Resto do código...
}
```

**Invalidação de Cache:**

```typescript
// Após sincronização, invalidar cache
import { revalidateTag } from 'next/cache'

// src/app/actions/sync.ts
export async function syncAccountAction(accountId: string) {
  await syncService.syncAccount(accountId)
  
  // Invalidar caches relacionados
  revalidateTag('automations')
  revalidateTag('automation-campaigns')
  revalidateTag('campaign-metrics')
  
  return { success: true }
}
```

**Resultado:**
- **Primeira carga:** 30-40s (preenche cache)
- **Cargas subsequentes:** 2-5s (cache hit)
- **Após 5 minutos:** Cache expira, renova automaticamente

---

### **Opção 2: Cache em Memória (Map)** 🔄

**Descrição:** Cache simples usando `Map` do JavaScript

**Vantagens:**
- ✅ Muito simples
- ✅ Zero dependências
- ✅ Controle total

**Desvantagens:**
- ⚠️ Perde ao reiniciar servidor
- ⚠️ Não funciona em serverless (Vercel)
- ⚠️ Não compartilha entre instâncias

**Código:**

```typescript
// src/lib/cache/memory-cache.ts
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  
  set<T>(key: string, data: T, ttlSeconds: number = 300) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    })
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Verificar TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }
  
  clear(prefix?: string) {
    if (!prefix) {
      this.cache.clear()
      return
    }
    
    // Limpar por prefixo
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }
  
  // Limpar cache expirado periodicamente
  startCleanup(intervalMs: number = 60000) {
    setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key)
        }
      }
    }, intervalMs)
  }
}

export const serverCache = new MemoryCache()

// Iniciar cleanup ao iniciar servidor
serverCache.startCleanup()
```

**Uso:**

```typescript
// Wrapper com cache
async function getAutomationCampaignsWithCache(
  automationId: string,
  client: ActiveCampaignClient
) {
  const cacheKey = `automation:${automationId}:campaigns`
  
  // Tentar do cache
  const cached = serverCache.get<any[]>(cacheKey)
  if (cached) {
    console.log(`✅ Cache hit: ${cacheKey}`)
    return cached
  }
  
  // Buscar da API
  console.log(`📡 Cache miss: ${cacheKey}, buscando da API...`)
  const data = await client.getAutomationCampaigns(automationId)
  
  // Salvar no cache (5 minutos)
  serverCache.set(cacheKey, data, 300)
  
  return data
}
```

---

### **Opção 3: Redis** 🗄️ **MAIS ROBUSTO**

**Descrição:** Cache distribuído usando Redis

**Vantagens:**
- ✅ Persiste entre restarts
- ✅ Compartilha entre múltiplas instâncias
- ✅ TTL automático
- ✅ Escalável

**Desvantagens:**
- ⚠️ Requer infraestrutura Redis
- ⚠️ Mais complexo
- ⚠️ Custo adicional

**Setup:**

```bash
# Instalar dependências
npm install ioredis
```

**Código:**

```typescript
// src/lib/cache/redis-cache.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await redis.get(key)
  return data ? JSON.parse(data) : null
}

export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds: number = 300
): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
}

export async function cacheDel(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}
```

**Uso:**

```typescript
const cacheKey = `automation:${automationId}:campaigns`

// Tentar cache
let data = await cacheGet<any[]>(cacheKey)

if (!data) {
  // Buscar da API
  data = await client.getAutomationCampaigns(automationId)
  
  // Salvar no cache
  await cacheSet(cacheKey, data, 300)
}
```

---

## 📊 **Comparação de Opções**

| Opção | Setup | Performance | Escalabilidade | Custo | Recomendado |
|-------|-------|-------------|----------------|-------|-------------|
| **unstable_cache** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Grátis | ✅ Sim |
| **Memory Cache** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | Grátis | ⚠️ Serverless não |
| **Redis** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $$ | 🔵 Produção |

---

## 🎯 **Estratégia de Cache Recomendada**

### **Camada 1: Query Cache (unstable_cache)**

```typescript
// Cache queries do banco
const automations = await getCachedAutomations(accountIds)
const campaigns = await getCachedCampaigns(automationIds)
```

**TTL:** 5 minutos  
**Invalidação:** Após sync

### **Camada 2: API Cache (unstable_cache)**

```typescript
// Cache chamadas ActiveCampaign
const apiCampaigns = await getCachedAutomationCampaigns(...)
const metrics = await getCachedCampaignMetrics(...)
```

**TTL:** 5 minutos  
**Invalidação:** Após sync

### **Camada 3: Computed Results (opcional)**

```typescript
// Cache resultado final processado
const results = await getCachedAutomationsWithMetrics(filters)
```

**TTL:** 2 minutos  
**Invalidação:** Ao mudar filtros

---

## 📈 **Impacto Esperado**

### **Cenário Real (10 usuários/hora):**

**SEM Cache:**
```
10 usuários × 347 requests = 3,470 requests/hora
Tempo médio: 40 segundos
ActiveCampaign API: Rate limit issues
```

**COM Cache:**
```
1º usuário: 347 requests (preenche cache)
9 usuários: ~30 requests (cache hits)
Total: ~377 requests/hora (89% redução!)
Tempo médio: 3-5 segundos (87% mais rápido!)
```

---

## 🛠️ **Implementação Passo a Passo**

### **Fase 1: Setup Cache (30 min)**

```bash
# 1. Criar arquivo de cache
touch src/lib/cache/server-cache.ts

# 2. Implementar funções de cache (código acima)

# 3. Adicionar types se necessário
```

### **Fase 2: Integrar no Service (1 hora)**

```typescript
// Substituir chamadas diretas por versões cachadas
- await client.getAutomationCampaigns(id)
+ await getCachedAutomationCampaigns(id, baseUrl, apiKey)

- await apiv1.getCampaignReportTotals(id, dates)
+ await getCachedCampaignMetrics(id, sdate, ldate, baseUrl, apiKey)
```

### **Fase 3: Invalidação (30 min)**

```typescript
// Em sync-service.ts e actions/sync.ts
import { revalidateTag } from 'next/cache'

async syncAccount() {
  // ... sync logic
  
  // Invalidar caches
  revalidateTag('automations')
  revalidateTag('automation-campaigns')
  revalidateTag('campaign-metrics')
}
```

### **Fase 4: Teste (30 min)**

```bash
# 1. Primeira carga (deve ser lenta)
# 2. Segunda carga (deve ser rápida!)
# 3. Após 5 min (deve renovar cache)
# 4. Após sync (deve invalidar)
```

---

## 🧪 **Validação**

### **Métricas de Sucesso:**

```
✅ Primeira carga: 30-40s (aceitável)
✅ Cargas subsequentes: 2-5s (excelente!)
✅ Cache hit rate: >80%
✅ Requests à API: -89%
```

### **Logs para Monitorar:**

```typescript
console.log(`✅ Cache hit: automation:${id}`)
console.log(`📡 Cache miss: automation:${id}, fetching from API`)
console.log(`🔄 Cache invalidated: automations`)
```

---

## ⚠️ **Considerações**

### **Dados Desatualizados:**
- Cache de 5 minutos = dados podem ter até 5 min de atraso
- Solução: Invalidar cache após sync

### **Memória:**
- Cache em memória cresce com uso
- Solução: Cleanup automático, TTL curto

### **Serverless (Vercel):**
- Memory cache não funciona bem
- Solução: Usar `unstable_cache` (recomendado)

---

## 🚀 **Próximos Passos**

1. ✅ Implementar `unstable_cache` (Opção 1)
2. ✅ Integrar no `automation-metrics-service.ts`
3. ✅ Adicionar invalidação após sync
4. ✅ Testar performance
5. 🔵 (Futuro) Migrar para Redis se escalar muito

---

**Quer que eu implemente a Opção 1 (unstable_cache) agora?** 🚀

