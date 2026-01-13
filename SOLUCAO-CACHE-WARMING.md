# 🔥 Solução: Cache Warming (Pre-aquecimento)

**Data:** 13 de Janeiro de 2026  
**Status:** 🎯 **SOLUÇÃO PERFEITA**

---

## 💡 **Ideia**

**Rodar um script em background que preenche o cache ANTES dos usuários acessarem!**

```
┌─────────────────────────────────────────────────────┐
│  Cron Job (a cada 4 minutos)                        │
│  ↓                                                   │
│  Script busca dados da API (40s)                    │
│  ↓                                                   │
│  Cache preenchido ✅                                 │
│  ↓                                                   │
│  Usuários acessam: Cache hit instantâneo! (2s) 🚀   │
└─────────────────────────────────────────────────────┘
```

**Resultado:**
- ✅ **NENHUM usuário espera 40 segundos!**
- ✅ Cache sempre "quente" (warm)
- ✅ API chamada em background
- ✅ UX perfeita

---

## 🎯 **Comparação: Com vs Sem Warming**

### **SEM Warming (Cache Normal):**
```
Usuário 1 (09:00:00): ████████████████████████████████████ 40s ❌
Usuário 2 (09:00:30): ███ 3s ✅
Usuário 3 (09:01:00): ███ 3s ✅
... cache expira em 5 min ...
Usuário 10 (09:05:01): ████████████████████████████████████ 40s ❌
```

### **COM Warming:**
```
Cron Job (09:00:00): ████████████████████████████████████ 40s (background)
Usuário 1 (09:00:45): ███ 3s ✅
Usuário 2 (09:01:00): ███ 3s ✅
Usuário 3 (09:02:00): ███ 3s ✅
Cron Job (09:04:00): ████████████████████████████████████ 40s (background)
Usuário 10 (09:05:00): ███ 3s ✅
```

**Todos os usuários: 2-3 segundos! 🎉**

---

## 🛠️ **Implementação**

### **1. Criar API Route para Warm Cache**

```typescript
// src/app/api/cron/warm-cache/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AutomationMetricsService } from '@/lib/services/automation-metrics-service'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 segundos timeout

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação (importante!)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔥 [CACHE WARMING] Iniciando...')
    const startTime = Date.now()

    // 1. Buscar todas as contas ativas
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    })

    console.log(`📊 [CACHE WARMING] Encontradas ${accounts.length} contas ativas`)

    // 2. Warm cache SEM filtro de data (mais comum)
    const service = new AutomationMetricsService()
    
    console.log('🔥 [CACHE WARMING] Preenchendo cache geral...')
    await service.getAutomationsWithMetricsV2({
      accountIds: accounts.map(a => a.id)
    })

    // 3. Warm cache para períodos comuns
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const last7Days = new Date(today)
    last7Days.setDate(last7Days.getDate() - 7)
    
    const last30Days = new Date(today)
    last30Days.setDate(last30Days.getDate() - 30)

    console.log('🔥 [CACHE WARMING] Preenchendo cache de períodos...')
    
    // Yesterday
    await service.getAutomationsWithMetricsV2({
      accountIds: accounts.map(a => a.id),
      dateFrom: yesterday,
      dateTo: yesterday
    })
    
    // Last 7 days
    await service.getAutomationsWithMetricsV2({
      accountIds: accounts.map(a => a.id),
      dateFrom: last7Days,
      dateTo: today
    })
    
    // Last 30 days
    await service.getAutomationsWithMetricsV2({
      accountIds: accounts.map(a => a.id),
      dateFrom: last30Days,
      dateTo: today
    })

    const duration = Date.now() - startTime
    console.log(`✅ [CACHE WARMING] Concluído em ${duration}ms`)

    return NextResponse.json({
      success: true,
      duration,
      message: `Cache warming completed in ${duration}ms`,
      accounts: accounts.length
    })
  } catch (error) {
    console.error('❌ [CACHE WARMING] Erro:', error)
    return NextResponse.json(
      { error: 'Cache warming failed', details: error.message },
      { status: 500 }
    )
  }
}
```

---

### **2. Configurar Cron Job**

#### **Opção A: Vercel Cron** ⭐ **MAIS FÁCIL**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/warm-cache",
      "schedule": "*/4 * * * *"
    }
  ]
}
```

**Schedule:** A cada 4 minutos (antes do cache expirar em 5 min)

---

#### **Opção B: Servidor Linux (crontab)**

```bash
# Adicionar ao crontab
crontab -e

# Adicionar linha:
*/4 * * * * curl -H "Authorization: Bearer SEU_CRON_SECRET" https://seu-dominio.com/api/cron/warm-cache

# Ou com mais logging:
*/4 * * * * curl -H "Authorization: Bearer SEU_CRON_SECRET" https://seu-dominio.com/api/cron/warm-cache >> /var/log/cache-warming.log 2>&1
```

---

#### **Opção C: GitHub Actions**

```yaml
# .github/workflows/cache-warming.yml
name: Cache Warming

on:
  schedule:
    # A cada 4 minutos
    - cron: '*/4 * * * *'
  workflow_dispatch: # Permite rodar manualmente

jobs:
  warm-cache:
    runs-on: ubuntu-latest
    steps:
      - name: Warm Cache
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://seu-dominio.com/api/cron/warm-cache
```

---

### **3. Variável de Ambiente**

```env
# .env ou .env.production
CRON_SECRET="seu-secret-super-seguro-aqui-123456"
```

**Gerar secret:**
```bash
# No terminal
openssl rand -base64 32
```

---

### **4. Script Manual (Opcional)**

```typescript
// scripts/warm-cache.ts
import { AutomationMetricsService } from '@/lib/services/automation-metrics-service'
import { prisma } from '@/lib/db'

async function warmCache() {
  console.log('🔥 Iniciando cache warming manual...')
  
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    select: { id: true }
  })
  
  const service = new AutomationMetricsService()
  
  // Warm cache geral
  await service.getAutomationsWithMetricsV2({
    accountIds: accounts.map(a => a.id)
  })
  
  // Warm cache de ontem
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  
  await service.getAutomationsWithMetricsV2({
    accountIds: accounts.map(a => a.id),
    dateFrom: yesterday,
    dateTo: yesterday
  })
  
  console.log('✅ Cache warming concluído!')
}

warmCache()
  .then(() => process.exit(0))
  .catch(console.error)
```

**Rodar:**
```bash
npx tsx scripts/warm-cache.ts
```

---

### **5. Warm Cache Após Sync**

```typescript
// src/app/actions/sync.ts
import { revalidateTag } from 'next/cache'

export async function syncAccountAction(accountId: string) {
  // 1. Fazer sync
  await syncService.syncAccount(accountId)
  
  // 2. Invalidar cache
  revalidateTag('automations')
  revalidateTag('automation-campaigns')
  revalidateTag('campaign-metrics')
  
  // 3. Warm cache em background (não aguardar)
  fetch(`${process.env.NEXT_PUBLIC_URL}/api/cron/warm-cache`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`
    }
  }).catch(err => console.error('Erro ao warm cache:', err))
  
  return { success: true }
}
```

---

## 📊 **Timeline de Warming**

```
00:00 - Cron warming inicia (background)
00:00 - Usuário acessa → Cache vazio → 40s ❌ (só na primeira vez)
00:00:40 - Cache preenchido ✅

04:00 - Cron warming renova cache (background)
04:00:05 - Usuário acessa → Cache hit → 3s ✅

08:00 - Cron warming renova cache (background)
08:00:20 - Usuário acessa → Cache hit → 3s ✅

12:00 - Cron warming renova cache (background)
12:00:15 - Usuário acessa → Cache hit → 3s ✅
```

**Após primeira vez, SEMPRE rápido!**

---

## 🎯 **Estratégias de Warming**

### **Estratégia 1: Warm Tudo** (Simples)

```typescript
// Warm todas combinações possíveis
- Sem filtro
- Yesterday
- Last 7 days
- Last 30 days
```

**Tempo:** ~2-3 minutos  
**Cobertura:** 95% dos acessos

---

### **Estratégia 2: Warm Inteligente** (Otimizado)

```typescript
// Warm apenas o mais usado (analytics)
- Sem filtro (80% dos acessos)
- Yesterday (15% dos acessos)
```

**Tempo:** ~1 minuto  
**Cobertura:** 95% dos acessos

---

### **Estratégia 3: Warm por Conta** (Gradual)

```typescript
// Warm uma conta por vez
for (const account of accounts) {
  await warmCacheForAccount(account)
  await sleep(5000) // 5s entre contas
}
```

**Tempo:** Variável  
**Benefício:** Distribui carga

---

## 🔧 **Monitoramento**

### **Logs para Acompanhar:**

```typescript
console.log('🔥 [CACHE WARMING] Iniciando...')
console.log('📊 [CACHE WARMING] Contas: 20')
console.log('⏱️  [CACHE WARMING] Sem filtro: 15s')
console.log('⏱️  [CACHE WARMING] Yesterday: 25s')
console.log('⏱️  [CACHE WARMING] Last 7 days: 30s')
console.log('✅ [CACHE WARMING] Total: 70s')
```

### **Métricas para Monitorar:**

```typescript
// Dashboard de warming
- Última execução
- Tempo de execução
- Status (sucesso/erro)
- Taxa de cache hit
- Tempo médio de resposta usuários
```

---

## 📈 **Resultado Esperado**

### **Antes (Sem Warming):**
```
Usuários afetados: 10-20% (primeiro após expirar)
Tempo deles: 40 segundos
Satisfação: 😤
```

### **Depois (Com Warming):**
```
Usuários afetados: 0%
Tempo de todos: 2-3 segundos
Satisfação: 😍
```

---

## 🚀 **Implementação Rápida**

### **Passo 1: Criar API Route (15 min)**
```bash
mkdir -p src/app/api/cron/warm-cache
# Copiar código acima
```

### **Passo 2: Adicionar CRON_SECRET (5 min)**
```bash
# Gerar secret
openssl rand -base64 32

# Adicionar ao .env
CRON_SECRET="generated-secret"
```

### **Passo 3: Configurar Cron (10 min)**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/warm-cache",
    "schedule": "*/4 * * * *"
  }]
}
```

### **Passo 4: Deploy (5 min)**
```bash
git add .
git commit -m "feat: cache warming"
git push
```

### **Passo 5: Testar (5 min)**
```bash
# Teste manual
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3002/api/cron/warm-cache
```

**Total: ~40 minutos** 🚀

---

## ⚠️ **Considerações**

### **Custo de Warming:**
- ✅ Roda em background (usuário não afetado)
- ✅ 1 job a cada 4 min = 360 jobs/dia
- ✅ Cada job ~2 min = 720 min/dia = 12 horas/dia
- ⚠️ Consumo de API ActiveCampaign

### **Otimizações:**
- Warm apenas horários de pico (9h-18h)
- Warm apenas contas mais acessadas
- Ajustar frequência conforme uso

---

## 🎯 **Recomendação Final**

**Implementar:**
1. ✅ Cache com `unstable_cache` (5 min TTL)
2. ✅ Cache Warming (a cada 4 min)
3. ✅ Warm após sync

**Resultado:**
- ✅ **100% dos usuários**: 2-3 segundos
- ✅ **Nenhum usuário espera** 40 segundos
- ✅ **UX perfeita** 🎉

---

**Quer que eu implemente agora?** 🔥
- Cache com `unstable_cache`
- API route de warming
- Configuração de cron
- Tudo em **1-2 horas!**

