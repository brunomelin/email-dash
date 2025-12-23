# ✅ SOLUÇÃO FINAL: API v1 do ActiveCampaign

## 🎯 Descoberta

A **API v1** do ActiveCampaign suporta filtros de data através do endpoint `campaign_report_totals`!

```
GET /admin/api.php?api_action=campaign_report_totals&campaignid=X&sdate=2025-12-21&ldate=2025-12-23
```

## ✅ Testes Confirmados

```
SEM filtro:
  Enviados: 89 (total)
  
COM filtro (21-23/12):
  Enviados: 21  ← Dados reais do período!
  Aberturas: 9
  Cliques: 8
```

**FUNCIONA PERFEITAMENTE!** 🎉

---

## 📋 Implementação

### 1. Criar Connector para API v1

```typescript
// src/lib/connectors/activecampaign/api-v1.ts
export class ActiveCampaignAPIv1 {
  private baseUrl: string
  private apiKey: string

  constructor(config: { baseUrl: string; apiKey: string }) {
    // Remover /api/3 se existir
    this.baseUrl = config.baseUrl.replace(/\/api\/3.*/, '')
    this.apiKey = config.apiKey
  }

  /**
   * Busca métricas de uma campanha com filtro de data
   */
  async getCampaignReportTotals(
    campaignId: string,
    options?: {
      sdate?: string  // YYYY-MM-DD
      ldate?: string  // YYYY-MM-DD
    }
  ): Promise<CampaignReportTotals> {
    const params = new URLSearchParams({
      api_action: 'campaign_report_totals',
      api_output: 'json',
      campaignid: campaignId,
      api_key: this.apiKey,
    })

    if (options?.sdate) {
      params.append('sdate', options.sdate)
    }

    if (options?.ldate) {
      params.append('ldate', options.ldate)
    }

    const url = `${this.baseUrl}/admin/api.php?${params.toString()}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.result_code !== 1) {
      throw new Error(data.result_message || 'Erro na API v1')
    }

    return {
      sent: parseInt(data.send_amt || '0', 10),
      opens: parseInt(data.uniqueopens || '0', 10),
      clicks: parseInt(data.subscriberclicks || '0', 10),
      bounces: parseInt(data.totalbounces || '0', 10),
      unsubscribes: parseInt(data.unsubscribes || '0', 10),
      forwards: parseInt(data.forwards || '0', 10),
    }
  }
}

export interface CampaignReportTotals {
  sent: number
  opens: number
  clicks: number
  bounces: number
  unsubscribes: number
  forwards: number
}
```

### 2. Atualizar getDashboardData

```typescript
// src/app/page.tsx
async function getDashboardData(filters: DashboardFilters = {}) {
  // Buscar contas e campanhas (como antes)
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
  })

  const campaigns = await prisma.campaign.findMany({
    where: {
      accountId: { in: accounts.map(a => a.id) },
      ...(filters.status && { status: filters.status }),
    },
    include: {
      account: true,
    },
  })

  // Se houver filtro de data, buscar métricas da API v1
  if (filters.dateFrom || filters.dateTo) {
    const sdate = filters.dateFrom?.toISOString().split('T')[0]
    const ldate = filters.dateTo?.toISOString().split('T')[0]

    // Buscar métricas por período para cada campanha
    const campaignsWithMetrics = await Promise.all(
      campaigns.map(async (campaign) => {
        try {
          const apiv1 = new ActiveCampaignAPIv1({
            baseUrl: campaign.account.baseUrl,
            apiKey: campaign.account.apiKey,
          })

          const metrics = await apiv1.getCampaignReportTotals(campaign.id, {
            sdate,
            ldate,
          })

          return {
            ...campaign,
            sent: metrics.sent,
            uniqueOpens: metrics.opens,
            uniqueClicks: metrics.clicks,
            bounces: metrics.bounces,
            unsubscribes: metrics.unsubscribes,
            // Recalcular rates
            openRate: metrics.sent > 0 ? metrics.opens / metrics.sent : 0,
            clickRate: metrics.sent > 0 ? metrics.clicks / metrics.sent : 0,
            clickToOpenRate: metrics.opens > 0 ? metrics.clicks / metrics.opens : 0,
          }
        } catch (error) {
          console.error(`Erro ao buscar métricas da campanha ${campaign.id}:`, error)
          // Retornar campanha com métricas zeradas em caso de erro
          return {
            ...campaign,
            sent: 0,
            uniqueOpens: 0,
            uniqueClicks: 0,
          }
        }
      })
    )

    // Filtrar campanhas sem envios no período
    const campaignsWithSends = campaignsWithMetrics.filter(c => c.sent > 0)

    // Calcular KPIs
    const kpiData = campaignsWithSends.reduce(
      (acc, campaign) => ({
        sent: acc.sent + campaign.sent,
        uniqueOpens: acc.uniqueOpens + campaign.uniqueOpens,
        uniqueClicks: acc.uniqueClicks + campaign.uniqueClicks,
        openRate: 0,
        clickRate: 0,
        clickToOpenRate: 0,
      }),
      { sent: 0, uniqueOpens: 0, uniqueClicks: 0, openRate: 0, clickRate: 0, clickToOpenRate: 0 }
    )

    // Calcular rates
    kpiData.openRate = kpiData.sent > 0 ? kpiData.uniqueOpens / kpiData.sent : 0
    kpiData.clickRate = kpiData.sent > 0 ? kpiData.uniqueClicks / kpiData.sent : 0
    kpiData.clickToOpenRate = kpiData.uniqueOpens > 0 ? kpiData.uniqueClicks / kpiData.uniqueOpens : 0

    return {
      accounts,
      kpiData,
      campaigns: campaignsWithSends,
      totalCampaigns: campaignsWithSends.length,
    }
  }

  // Sem filtro de data: usar métricas do banco (como antes)
  const kpiData = campaigns.reduce(
    (acc, campaign) => ({
      sent: acc.sent + campaign.sent,
      uniqueOpens: acc.uniqueOpens + campaign.uniqueOpens,
      uniqueClicks: acc.uniqueClicks + campaign.uniqueClicks,
      openRate: 0,
      clickRate: 0,
      clickToOpenRate: 0,
    }),
    { sent: 0, uniqueOpens: 0, uniqueClicks: 0, openRate: 0, clickRate: 0, clickToOpenRate: 0 }
  )

  kpiData.openRate = kpiData.sent > 0 ? kpiData.uniqueOpens / kpiData.sent : 0
  kpiData.clickRate = kpiData.sent > 0 ? kpiData.uniqueClicks / kpiData.sent : 0
  kpiData.clickToOpenRate = kpiData.uniqueOpens > 0 ? kpiData.uniqueClicks / kpiData.uniqueOpens : 0

  return {
    accounts,
    kpiData,
    campaigns,
    totalCampaigns: campaigns.length,
  }
}
```

### 3. Otimização: Cachear Resultados

```typescript
// src/lib/utils/cache.ts
import { unstable_cache } from 'next/cache'

export const getCampaignMetricsWithCache = unstable_cache(
  async (campaignId: string, baseUrl: string, apiKey: string, sdate?: string, ldate?: string) => {
    const apiv1 = new ActiveCampaignAPIv1({ baseUrl, apiKey })
    return await apiv1.getCampaignReportTotals(campaignId, { sdate, ldate })
  },
  ['campaign-metrics'],
  {
    revalidate: 3600, // 1 hora
    tags: ['campaign-metrics'],
  }
)
```

---

## 🎯 Vantagens

✅ **Dados reais por período** - 100% precisos
✅ **Sem estimativas** - API retorna dados exatos
✅ **Funciona para automações** - API v1 suporta
✅ **Sem mudanças no banco** - Usa dados da API
✅ **Implementação simples** - ~30 minutos

---

## ⚠️ Considerações

### Performance

Para muitas campanhas (ex: 50+), fazer 50 requests pode ser lento.

**Soluções:**
1. **Paralelizar requests** (já faz com `Promise.all`)
2. **Cache** (Next.js `unstable_cache`)
3. **Loading state** na UI
4. **Background job** para pré-calcular métricas populares

### Rate Limiting

API v1 pode ter limites diferentes.

**Soluções:**
1. Implementar retry com backoff
2. Limitar número de campanhas exibidas
3. Paginação na tabela

---

## 📊 Resultado Esperado

```
Dashboard

Filtros:
[Date Range: 21/12 - 23/12] [Account: All] [Status: All]

Métricas Consolidadas (21-23/12):
Emails Enviados: 45  ← Dados REAIS do período!
Aberturas: 18
Cliques: 12
Open Rate: 40%
CTR: 26.7%

Campanhas Recentes:
- Email Boas Vindas V2  🤖 Automação
  Enviados: 21 | Open Rate: 42.9% | CTR: 38.1%
  
- Email Confirmação  🤖 Automação
  Enviados: 15 | Open Rate: 33.3% | CTR: 20.0%
```

---

## 🚀 Próximos Passos

1. **Implementar connector API v1**
2. **Atualizar getDashboardData**
3. **Adicionar loading state**
4. **Testar com dados reais**
5. **Deploy!**

---

## 🎉 Créditos

**Obrigado por compartilhar o código que usa API v1!**

Isso mudou completamente a abordagem e nos deu a solução perfeita! 🙌

---

**Quer que eu implemente isso agora?** 🚀

