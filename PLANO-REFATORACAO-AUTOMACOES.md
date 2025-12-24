# 🚀 PLANO DE AÇÃO: Refatoração do Filtro de Automações

## 🎯 **OBJETIVO:**
Inverter a lógica de busca: **partir das campanhas do período** (que têm `send_date`) ao invés das automações (que não têm data).

## 📊 **RESULTADO ESPERADO:**
- ✅ Filtro de data funciona DIRETO no banco (WHERE send_date)
- ✅ Performance melhorada (menos queries)
- ✅ Duas seções na UI:
  - **"Automações com atividade no período"** (com métricas de email)
  - **"Outras automações"** (apenas dados da API: entered/exited)

---

## 📋 **PLANO DE AÇÃO - 6 ETAPAS:**

---

### **ETAPA 1: Criar nova função de busca** 
**Arquivo:** `src/lib/services/automation-metrics-service.ts`

#### **1.1 - Criar função auxiliar para agrupar campanhas por prefixo**
```typescript
/**
 * Agrupa campanhas por prefixo de automação
 */
private groupCampaignsByPrefix(campaigns: Campaign[]): Map<string, Campaign[]> {
  const groups = new Map<string, Campaign[]>()
  
  for (const campaign of campaigns) {
    // Extrair prefixo do nome
    const prefixMatch = campaign.name.match(/^(\[[\w\s-]+\])/)
    const prefix = prefixMatch ? prefixMatch[1] : null
    
    if (prefix) {
      const existing = groups.get(prefix) || []
      groups.set(prefix, [...existing, campaign])
    } else {
      // Campanhas sem prefixo vão para grupo especial
      const existing = groups.get('__sem_prefixo__') || []
      groups.set('__sem_prefixo__', [...existing, campaign])
    }
  }
  
  return groups
}
```

#### **1.2 - Criar função principal: getAutomationsWithMetricsV2**
```typescript
/**
 * NOVA LÓGICA: Busca campanhas do período primeiro
 * Depois agrupa por automação
 */
async getAutomationsWithMetricsV2(filters: AutomationFilters = {}): Promise<{
  withActivity: AutomationMetrics[]
  withoutActivity: AutomationMetrics[]
}> {
  // 1. Buscar TODAS as automações (para ter entered/exited)
  const automations = await prisma.automation.findMany({
    where: {
      ...(filters.accountIds && { accountId: { in: filters.accountIds } }),
      ...(filters.status && { status: filters.status })
    },
    include: { account: { select: { name: true } } }
  })
  
  // 2. Buscar campanhas DO PERÍODO (filtro no banco!)
  const campaignsWhere: any = {
    isAutomation: true,
    sendDate: { not: null }  // Só campanhas com data
  }
  
  if (filters.accountIds) {
    campaignsWhere.accountId = { in: filters.accountIds }
  }
  
  if (filters.dateFrom) {
    const dateFrom = new Date(filters.dateFrom)
    dateFrom.setHours(0, 0, 0, 0)
    campaignsWhere.sendDate = { gte: dateFrom }
  }
  
  if (filters.dateTo) {
    const dateTo = new Date(filters.dateTo)
    dateTo.setHours(23, 59, 59, 999)
    if (campaignsWhere.sendDate) {
      campaignsWhere.sendDate.lte = dateTo
    } else {
      campaignsWhere.sendDate = { lte: dateTo }
    }
  }
  
  const campaignsInPeriod = await prisma.campaign.findMany({
    where: campaignsWhere,
    select: {
      accountId: true,
      name: true,
      sent: true,
      uniqueOpens: true,
      uniqueClicks: true,
      sendDate: true
    }
  })
  
  // 3. Agrupar campanhas por prefixo
  const campaignsByPrefix = this.groupCampaignsByPrefix(campaignsInPeriod)
  
  // 4. Criar métricas para cada automação
  const withActivity: AutomationMetrics[] = []
  const withoutActivity: AutomationMetrics[] = []
  
  for (const automation of automations) {
    // Extrair prefixo da automação
    const prefixMatch = automation.name.match(/^(\[[\w\s-]+\])/)
    const prefix = prefixMatch ? prefixMatch[1] : null
    
    // Buscar campanhas desse prefixo
    const campaigns = prefix ? (campaignsByPrefix.get(prefix) || []) : []
    
    // Filtrar apenas campanhas da mesma conta
    const sameCampaigns = campaigns.filter(c => c.accountId === automation.accountId)
    
    // Calcular métricas
    const metrics = this.calculateMetrics(automation, sameCampaigns)
    
    // Separar em "com atividade" vs "sem atividade"
    if (sameCampaigns.length > 0) {
      withActivity.push(metrics)
    } else {
      withoutActivity.push(metrics)
    }
  }
  
  return {
    withActivity: withActivity.sort((a, b) => b.openRate - a.openRate),
    withoutActivity: withoutActivity.sort((a, b) => a.name.localeCompare(b.name))
  }
}
```

#### **1.3 - Função auxiliar de cálculo de métricas**
```typescript
/**
 * Calcula métricas agregadas de campanhas
 */
private calculateMetrics(
  automation: Automation & { account: { name: string } },
  campaigns: Array<{ sent: number; uniqueOpens: number; uniqueClicks: number }>
): AutomationMetrics {
  const totalCampaigns = campaigns.length
  const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0)
  const totalOpens = campaigns.reduce((sum, c) => sum + c.uniqueOpens, 0)
  const totalClicks = campaigns.reduce((sum, c) => sum + c.uniqueClicks, 0)
  
  const openRate = totalSent > 0 ? totalOpens / totalSent : 0
  const clickRate = totalSent > 0 ? totalClicks / totalSent : 0
  const clickToOpenRate = totalOpens > 0 ? totalClicks / totalOpens : 0
  
  let performanceBadge: 'excellent' | 'good' | 'average' | 'low' | 'none' = 'none'
  if (totalCampaigns > 0) {
    if (openRate >= 0.4) performanceBadge = 'excellent'
    else if (openRate >= 0.3) performanceBadge = 'good'
    else if (openRate >= 0.2) performanceBadge = 'average'
    else performanceBadge = 'low'
  }
  
  return {
    id: automation.id,
    accountId: automation.accountId,
    accountName: automation.account.name,
    name: automation.name,
    status: automation.status,
    entered: automation.entered || 0,
    totalCampaigns,
    totalSent,
    totalOpens,
    totalClicks,
    openRate,
    clickRate,
    clickToOpenRate,
    lastUpdated: automation.updatedAt,
    createdAt: automation.createdAt,
    performanceBadge
  }
}
```

---

### **ETAPA 2: Atualizar função de stats**
**Arquivo:** `src/lib/services/automation-metrics-service.ts`

```typescript
/**
 * NOVA: Busca estatísticas considerando a separação
 */
async getAutomationsStatsV2(filters: AutomationFilters = {}): Promise<{
  total: AutomationStats
  withActivity: AutomationStats
  withoutActivity: AutomationStats
}> {
  const { withActivity, withoutActivity } = await this.getAutomationsWithMetricsV2(filters)
  
  const calculateStats = (automations: AutomationMetrics[]): AutomationStats => ({
    totalAutomations: automations.length,
    activeAutomations: automations.filter(a => a.status === '1').length,
    totalEntered: automations.reduce((sum, a) => sum + a.entered, 0),
    automationsWithEmails: automations.filter(a => a.totalCampaigns > 0).length
  })
  
  return {
    total: calculateStats([...withActivity, ...withoutActivity]),
    withActivity: calculateStats(withActivity),
    withoutActivity: calculateStats(withoutActivity)
  }
}
```

---

### **ETAPA 3: Atualizar página de automações**
**Arquivo:** `src/app/automations/page.tsx`

#### **3.1 - Atualizar busca de dados**
```typescript
// Usar nova função
const service = new AutomationMetricsService()
const { withActivity, withoutActivity } = await service.getAutomationsWithMetricsV2(filters)
const stats = await service.getAutomationsStatsV2(filters)
```

#### **3.2 - Passar dados separados para componentes**
```typescript
return (
  <div>
    {/* Stats Cards */}
    <AutomationsStatsCards 
      stats={stats.total}
      withActivity={stats.withActivity}
      withoutActivity={stats.withoutActivity}
    />
    
    {/* Seção 1: Com atividade */}
    {withActivity.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>
            🔥 Automações com Atividade no Período ({withActivity.length})
          </CardTitle>
          <CardDescription>
            Automações que enviaram emails entre {formatDate(dateFrom)} e {formatDate(dateTo)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AutomationsTable automations={withActivity} />
        </CardContent>
      </Card>
    )}
    
    {/* Seção 2: Sem atividade */}
    {withoutActivity.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>
            📊 Outras Automações ({withoutActivity.length})
          </CardTitle>
          <CardDescription>
            Automações sem emails enviados neste período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AutomationsTable 
            automations={withoutActivity} 
            hideEmailColumns={true}  {/* Nova prop */}
          />
        </CardContent>
      </Card>
    )}
  </div>
)
```

---

### **ETAPA 4: Atualizar componente de tabela**
**Arquivo:** `src/components/automations/automations-table.tsx`

#### **4.1 - Adicionar prop para esconder colunas**
```typescript
interface AutomationsTableProps {
  automations: AutomationMetrics[]
  hideEmailColumns?: boolean  // Nova prop
}
```

#### **4.2 - Renderização condicional**
```tsx
<TableHeader>
  <TableRow>
    <TableHead>Automação</TableHead>
    <TableHead>Conta</TableHead>
    <TableHead>Status</TableHead>
    <TableHead>Entraram</TableHead>
    
    {/* Colunas de email - só mostra se não estiver escondido */}
    {!hideEmailColumns && (
      <>
        <TableHead>📧 Emails</TableHead>
        <TableHead>Enviados</TableHead>
        <TableHead>Open Rate</TableHead>
        <TableHead>Click Rate</TableHead>
        <TableHead>Performance</TableHead>
      </>
    )}
  </TableRow>
</TableHeader>

<TableBody>
  {automations.map(automation => (
    <TableRow key={...}>
      {/* Colunas básicas */}
      <TableCell>{automation.name}</TableCell>
      <TableCell>{automation.accountName}</TableCell>
      <TableCell>{automation.status}</TableCell>
      <TableCell>{automation.entered}</TableCell>
      
      {/* Colunas de email - condicional */}
      {!hideEmailColumns && (
        <>
          <TableCell>{automation.totalCampaigns}</TableCell>
          <TableCell>{automation.totalSent}</TableCell>
          <TableCell>{formatPercent(automation.openRate)}</TableCell>
          <TableCell>{formatPercent(automation.clickRate)}</TableCell>
          <TableCell>
            <Badge variant={getBadgeVariant(automation.performanceBadge)}>
              {automation.performanceBadge}
            </Badge>
          </TableCell>
        </>
      )}
    </TableRow>
  ))}
</TableBody>
```

---

### **ETAPA 5: Atualizar componente de stats**
**Arquivo:** `src/components/automations/automations-stats-cards.tsx`

```tsx
interface AutomationsStatsCardsProps {
  stats: AutomationStats
  withActivity?: AutomationStats
  withoutActivity?: AutomationStats
}

export function AutomationsStatsCards({ 
  stats, 
  withActivity, 
  withoutActivity 
}: AutomationsStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            Total de Automações
          </CardTitle>
          <Bot className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAutomations}</div>
          <p className="text-xs text-muted-foreground">
            {stats.activeAutomations} ativas
          </p>
        </CardContent>
      </Card>
      
      {/* Card 2: Com atividade */}
      {withActivity && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Com Atividade
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {withActivity.automationsWithEmails}
            </div>
            <p className="text-xs text-muted-foreground">
              Enviaram emails no período
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Card 3: Sem atividade */}
      {withoutActivity && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Sem Atividade
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {withoutActivity.totalAutomations}
            </div>
            <p className="text-xs text-muted-foreground">
              Sem emails no período
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Card 4: Total entraram */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            Total Entraram
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalEntered}</div>
          <p className="text-xs text-muted-foreground">
            Contatos nas automações
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### **ETAPA 6: Testes e ajustes finais**

#### **6.1 - Testar localmente**
```bash
npm run dev
# Acessar: http://localhost:3000/automations?from=2025-12-17&to=2025-12-24
```

**Validar:**
- ✅ Duas seções aparecem
- ✅ "Com atividade" mostra apenas automações com emails no período
- ✅ "Sem atividade" mostra automações sem emails no período
- ✅ Filtro de data funciona instantaneamente
- ✅ Métricas estão corretas
- ✅ Performance melhorou

#### **6.2 - Verificar edge cases**
- [ ] Período sem nenhuma campanha
- [ ] Todas automações com atividade
- [ ] Todas automações sem atividade
- [ ] Campanhas sem prefixo (onde aparecem?)
- [ ] Múltiplas contas filtradas

#### **6.3 - Linter e build**
```bash
npm run build
```

#### **6.4 - Commit e deploy**
```bash
git add -A
git commit -m "refactor: inverter lógica de filtro de automações (partir de campanhas)"
git push origin main

# No servidor
cd /root/apps/email-dash
git pull origin main
npm run build
pm2 restart email-dashboard
```

---

## 📊 **COMPARAÇÃO: ANTES vs DEPOIS**

### **ANTES (Lógico mas ineficiente):**
```typescript
// 1. Buscar automações (sem data)
SELECT * FROM automations

// 2. Para CADA automação (N queries):
SELECT * FROM campaigns WHERE name LIKE '[prefixo]%'

// 3. Filtrar por data em JavaScript
filtered = campaigns.filter(c => c.sendDate >= dateFrom)

// 4. Se filter eliminar tudo → "—"
```

**Problemas:**
- ❌ N+1 queries
- ❌ Filtro de data em memória
- ❌ Mostra automações vazias
- ❌ Confuso para o usuário

### **DEPOIS (Eficiente e claro):**
```typescript
// 1. Buscar campanhas DO PERÍODO (1 query com filtro no banco)
SELECT * FROM campaigns 
WHERE send_date >= dateFrom AND send_date <= dateTo

// 2. Agrupar por prefixo (em memória, rápido)
groupBy(campaigns, c => extractPrefix(c.name))

// 3. Juntar com automações
merge(automations, campaignGroups)

// 4. Separar em duas listas
withActivity = automations com campanhas
withoutActivity = automações sem campanhas
```

**Vantagens:**
- ✅ Menos queries (melhor performance)
- ✅ Filtro no banco (mais rápido)
- ✅ Duas seções claras
- ✅ Usuário entende o que está vendo

---

## 🎯 **RESULTADO ESPERADO:**

### **Tela com atividade:**
```
🔥 Automações com Atividade no Período (1)
┌────────────────────────────────────────────────────────┐
│ [SHEIN-BV] 00 - Boas Vindas | gactv1 | 820 | 1 email  │
│   64 enviados | 42.2% OR | 32.8% CR | 🔥 Excelente    │
└────────────────────────────────────────────────────────┘
```

### **Tela sem atividade:**
```
📊 Outras Automações (4)
┌────────────────────────────────────────────────────────┐
│ [CO] Email 00               | gactv1 | 418 entraram   │
│ [SHEIN-CLICK] 00 - Clique   | gactv1 | 680 entraram   │
│ [SHEIN-RES] - Resposta      | gactv1 | 680 entraram   │
│ [SK] 00 - Eslovaquia        | gactv1 | 107 entraram   │
└────────────────────────────────────────────────────────┘
```

---

## ⏱️ **ESTIMATIVA DE TEMPO:**

| Etapa | Tempo | Dificuldade |
|-------|-------|-------------|
| Etapa 1 | 30min | ⭐⭐⭐ |
| Etapa 2 | 10min | ⭐⭐ |
| Etapa 3 | 20min | ⭐⭐⭐ |
| Etapa 4 | 15min | ⭐⭐ |
| Etapa 5 | 10min | ⭐ |
| Etapa 6 | 15min | ⭐⭐ |
| **TOTAL** | **~100min** | **⭐⭐⭐** |

---

## ✅ **CHECKLIST PRÉ-IMPLEMENTAÇÃO:**

- [ ] Plano revisado e aprovado
- [ ] Entendimento claro da nova arquitetura
- [ ] Backup do código atual (já está no git)
- [ ] Ambiente local funcionando
- [ ] Tempo disponível (~2h)

---

## 🚀 **PRÓXIMOS PASSOS:**

1. **Revisar este plano** - você concorda com a abordagem?
2. **Esclarecer dúvidas** - tem algo que não ficou claro?
3. **Implementar** - seguir o plano passo a passo
4. **Testar** - validar localmente
5. **Deploy** - subir para produção

---

**Revisou o plano? Posso começar a implementação? 🚀**

