/**
 * Camada de definições de métricas
 * Facilita adicionar novas métricas sem mexer em múltiplos componentes
 */

export type MetricAggregation = 'sum' | 'avg' | 'rate' | 'custom'

export interface MetricDefinition {
  key: string
  label: string
  shortLabel?: string
  description?: string
  format: (value: number) => string
  aggregation: MetricAggregation
  dependencies?: string[] // Para métricas calculadas (ex: openRate depende de opens e sent)
  calculate?: (data: Record<string, number>) => number // Função customizada de cálculo
}

export const METRICS: Record<string, MetricDefinition> = {
  // Métricas básicas (soma)
  sent: {
    key: 'sent',
    label: 'Emails Enviados',
    shortLabel: 'Enviados',
    description: 'Total de emails enviados',
    format: (n) => n.toLocaleString('pt-BR'),
    aggregation: 'sum',
  },
  
  opens: {
    key: 'opens',
    label: 'Aberturas Totais',
    shortLabel: 'Aberturas',
    description: 'Total de vezes que emails foram abertos (inclui múltiplas aberturas)',
    format: (n) => n.toLocaleString('pt-BR'),
    aggregation: 'sum',
  },
  
  uniqueOpens: {
    key: 'uniqueOpens',
    label: 'Aberturas Únicas',
    shortLabel: 'Aberturas Únicas',
    description: 'Número de pessoas únicas que abriram o email',
    format: (n) => n.toLocaleString('pt-BR'),
    aggregation: 'sum',
  },
  
  clicks: {
    key: 'clicks',
    label: 'Cliques Totais',
    shortLabel: 'Cliques',
    description: 'Total de cliques em links (inclui múltiplos cliques)',
    format: (n) => n.toLocaleString('pt-BR'),
    aggregation: 'sum',
  },
  
  uniqueClicks: {
    key: 'uniqueClicks',
    label: 'Cliques Únicos',
    shortLabel: 'Cliques Únicos',
    description: 'Número de pessoas únicas que clicaram em links',
    format: (n) => n.toLocaleString('pt-BR'),
    aggregation: 'sum',
  },
  
  bounces: {
    key: 'bounces',
    label: 'Bounces',
    shortLabel: 'Bounces',
    description: 'Emails que retornaram (hard + soft bounces)',
    format: (n) => n.toLocaleString('pt-BR'),
    aggregation: 'sum',
  },
  
  unsubscribes: {
    key: 'unsubscribes',
    label: 'Descadastros',
    shortLabel: 'Unsubs',
    description: 'Número de descadastros',
    format: (n) => n.toLocaleString('pt-BR'),
    aggregation: 'sum',
  },

  // Métricas calculadas (rates)
  openRate: {
    key: 'openRate',
    label: 'Taxa de Abertura',
    shortLabel: 'Open Rate',
    description: 'Percentual de aberturas únicas sobre envios (uniqueOpens / sent)',
    format: (n) => `${(n * 100).toFixed(1)}%`,
    aggregation: 'rate',
    dependencies: ['uniqueOpens', 'sent'],
    calculate: (data) => data.sent > 0 ? data.uniqueOpens / data.sent : 0,
  },
  
  clickRate: {
    key: 'clickRate',
    label: 'Taxa de Cliques (CTR)',
    shortLabel: 'CTR',
    description: 'Percentual de cliques únicos sobre envios (uniqueClicks / sent)',
    format: (n) => `${(n * 100).toFixed(1)}%`,
    aggregation: 'rate',
    dependencies: ['uniqueClicks', 'sent'],
    calculate: (data) => data.sent > 0 ? data.uniqueClicks / data.sent : 0,
  },
  
  clickToOpenRate: {
    key: 'clickToOpenRate',
    label: 'Click-to-Open Rate (CTOR)',
    shortLabel: 'CTOR',
    description: 'Percentual de cliques únicos sobre aberturas únicas (uniqueClicks / uniqueOpens)',
    format: (n) => `${(n * 100).toFixed(1)}%`,
    aggregation: 'rate',
    dependencies: ['uniqueClicks', 'uniqueOpens'],
    calculate: (data) => data.uniqueOpens > 0 ? data.uniqueClicks / data.uniqueOpens : 0,
  },
  
  bounceRate: {
    key: 'bounceRate',
    label: 'Taxa de Bounce',
    shortLabel: 'Bounce Rate',
    description: 'Percentual de bounces sobre envios (bounces / sent)',
    format: (n) => `${(n * 100).toFixed(1)}%`,
    aggregation: 'rate',
    dependencies: ['bounces', 'sent'],
    calculate: (data) => data.sent > 0 ? data.bounces / data.sent : 0,
  },
  
  unsubscribeRate: {
    key: 'unsubscribeRate',
    label: 'Taxa de Descadastro',
    shortLabel: 'Unsub Rate',
    description: 'Percentual de descadastros sobre envios (unsubscribes / sent)',
    format: (n) => `${(n * 100).toFixed(1)}%`,
    aggregation: 'rate',
    dependencies: ['unsubscribes', 'sent'],
    calculate: (data) => data.sent > 0 ? data.unsubscribes / data.sent : 0,
  },
}

/**
 * Formata uma métrica com base na sua definição
 */
export function formatMetric(metricKey: string, value: number): string {
  const metric = METRICS[metricKey]
  if (!metric) {
    return value.toLocaleString('pt-BR')
  }
  return metric.format(value)
}

/**
 * Calcula métricas agregadas a partir de dados brutos
 */
export function calculateAggregatedMetrics(
  data: Record<string, number>[],
  metricKeys: string[]
): Record<string, number> {
  const result: Record<string, number> = {}

  for (const metricKey of metricKeys) {
    const metric = METRICS[metricKey]
    if (!metric) continue

    switch (metric.aggregation) {
      case 'sum':
        result[metricKey] = data.reduce((sum, item) => sum + (item[metricKey] || 0), 0)
        break
      
      case 'avg':
        const values = data.map(item => item[metricKey] || 0)
        result[metricKey] = values.length > 0 
          ? values.reduce((sum, val) => sum + val, 0) / values.length 
          : 0
        break
      
      case 'rate':
      case 'custom':
        if (metric.calculate && metric.dependencies) {
          // Primeiro calcular as dependências
          for (const dep of metric.dependencies) {
            if (!(dep in result)) {
              const depMetric = METRICS[dep]
              if (depMetric && depMetric.aggregation === 'sum') {
                result[dep] = data.reduce((sum, item) => sum + (item[dep] || 0), 0)
              }
            }
          }
          // Depois calcular a métrica
          result[metricKey] = metric.calculate(result)
        }
        break
    }
  }

  return result
}

/**
 * Retorna lista de métricas KPI principais
 */
export function getKPIMetrics(): MetricDefinition[] {
  return [
    METRICS.sent,
    METRICS.uniqueOpens,
    METRICS.openRate,
    METRICS.uniqueClicks,
    METRICS.clickRate,
    METRICS.clickToOpenRate,
  ]
}

/**
 * Retorna lista de métricas para tabelas de campanhas
 */
export function getCampaignTableMetrics(): MetricDefinition[] {
  return [
    METRICS.sent,
    METRICS.uniqueOpens,
    METRICS.openRate,
    METRICS.uniqueClicks,
    METRICS.clickRate,
    METRICS.clickToOpenRate,
    METRICS.bounces,
    METRICS.unsubscribes,
  ]
}

