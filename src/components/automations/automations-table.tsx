'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AutomationMetrics } from '@/lib/services/automation-metrics-service'
import { Search, Bot, Mail } from 'lucide-react'

interface AutomationsTableProps {
  automations: AutomationMetrics[]
  hideEmailColumns?: boolean  // Nova prop para esconder colunas de email
}

export function AutomationsTable({ automations, hideEmailColumns = false }: AutomationsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredAutomations = automations.filter(automation =>
    automation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    automation.accountName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      '1': { label: '🟢 Ativa', variant: 'default' },
      '0': { label: '🔴 Pausada', variant: 'destructive' },
    }
    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' as const }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  const getPerformanceBadge = (badge: string) => {
    const badgeMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'excellent': { label: '🔥 Excelente', variant: 'default' },
      'good': { label: '⭐ Bom', variant: 'secondary' },
      'average': { label: '➖ Médio', variant: 'secondary' },
      'low': { label: '⚠️ Baixo', variant: 'destructive' },
      'none': { label: '—', variant: 'outline' },
    }
    const badgeInfo = badgeMap[badge] || { label: '—', variant: 'outline' as const }
    return <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome da automação ou conta..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Cabeçalho Fixo */}
      <div className="sticky top-0 z-20 bg-white border rounded-t-md shadow-sm">
        <div className="grid gap-4 px-4 py-3 text-sm font-medium text-muted-foreground" style={{
          gridTemplateColumns: hideEmailColumns 
            ? '2fr 1fr 1fr 1fr'
            : '2fr 1fr 1fr 1fr 0.8fr 1fr 1fr 1fr 1.2fr'
        }}>
          <div>Automação</div>
          <div>Conta</div>
          <div>Status</div>
          <div className="text-right">Entraram</div>
          
          {!hideEmailColumns && (
            <>
              <div className="text-center flex items-center justify-center gap-1">
                <Mail className="h-4 w-4" />
                Emails
              </div>
              <div className="text-right">Enviados</div>
              <div className="text-right">Open Rate</div>
              <div className="text-right">Click Rate</div>
              <div>Performance</div>
            </>
          )}
        </div>
      </div>

      {/* Lista de Automações (sem usar Table nativo) */}
      <div className="rounded-b-md border border-t-0 overflow-auto bg-white" style={{ maxHeight: 'calc(100vh - 400px)' }}>
        {filteredAutomations.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            {searchTerm
              ? 'Nenhuma automação encontrada com esse termo'
              : 'Nenhuma automação sincronizada ainda'}
          </div>
        ) : (
          filteredAutomations.map((automation) => (
            <div 
              key={`${automation.accountId}-${automation.id}`}
              className="grid gap-4 px-4 py-3 border-b hover:bg-gray-50 transition-colors items-center"
              style={{
                gridTemplateColumns: hideEmailColumns 
                  ? '2fr 1fr 1fr 1fr'
                  : '2fr 1fr 1fr 1fr 0.8fr 1fr 1fr 1fr 1.2fr'
              }}
            >
              {/* Automação */}
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{automation.name}</div>
                  {!hideEmailColumns && automation.totalCampaigns > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {automation.totalCampaigns} {automation.totalCampaigns === 1 ? 'email' : 'emails'}
                    </div>
                  )}
                </div>
              </div>

              {/* Conta */}
              <div className="text-sm text-muted-foreground truncate">
                {automation.accountName}
              </div>

              {/* Status */}
              <div>{getStatusBadge(automation.status)}</div>

              {/* Entraram */}
              <div className="text-right">
                {(automation.entered || 0).toLocaleString('pt-BR')}
              </div>

              {/* Colunas de email */}
              {!hideEmailColumns && (
                <>
                  {/* Emails */}
                  <div className="text-center">
                    {automation.totalCampaigns > 0 ? (
                      <Badge variant="secondary">{automation.totalCampaigns}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </div>

                  {/* Enviados */}
                  <div className="text-right">
                    {automation.totalSent > 0 
                      ? automation.totalSent.toLocaleString('pt-BR')
                      : <span className="text-muted-foreground text-xs">—</span>
                    }
                  </div>

                  {/* Open Rate */}
                  <div className="text-right">
                    {automation.totalSent > 0 ? (
                      <span className={automation.openRate >= 0.3 ? 'text-green-600 font-medium' : ''}>
                        {(automation.openRate * 100).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </div>

                  {/* Click Rate */}
                  <div className="text-right">
                    {automation.totalSent > 0 ? (
                      <span className={automation.clickRate >= 0.05 ? 'text-blue-600 font-medium' : ''}>
                        {(automation.clickRate * 100).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </div>

                  {/* Performance */}
                  <div>{getPerformanceBadge(automation.performanceBadge)}</div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Resumo */}
      {filteredAutomations.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Mostrando {filteredAutomations.length} de {automations.length} automações
        </div>
      )}
    </div>
  )
}

