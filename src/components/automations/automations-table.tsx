'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AutomationMetrics } from '@/lib/services/automation-metrics-service'
import { Search, Bot, Mail } from 'lucide-react'

interface AutomationsTableProps {
  automations: AutomationMetrics[]
}

export function AutomationsTable({ automations }: AutomationsTableProps) {
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

      {/* Tabela */}
      <div className="rounded-md border table-container max-h-[calc(100vh-400px)]">
        <Table>
          <TableHeader className="table-sticky-header">
            <TableRow>
              <TableHead>Automação</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Entraram</TableHead>
              <TableHead className="text-center">
                <Mail className="h-4 w-4 inline mr-1" />
                Emails
              </TableHead>
              <TableHead className="text-right">Enviados</TableHead>
              <TableHead className="text-right">Open Rate</TableHead>
              <TableHead className="text-right">Click Rate</TableHead>
              <TableHead>Performance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAutomations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {searchTerm
                    ? 'Nenhuma automação encontrada com esse termo'
                    : 'Nenhuma automação sincronizada ainda'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAutomations.map((automation) => (
                <TableRow key={`${automation.accountId}-${automation.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{automation.name}</div>
                        {automation.totalCampaigns > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {automation.totalCampaigns} {automation.totalCampaigns === 1 ? 'email' : 'emails'}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {automation.accountName}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(automation.status)}</TableCell>
                  <TableCell className="text-right">
                    {(automation.entered || 0).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-center">
                    {automation.totalCampaigns > 0 ? (
                      <Badge variant="secondary">{automation.totalCampaigns}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {automation.totalSent > 0 
                      ? automation.totalSent.toLocaleString('pt-BR')
                      : <span className="text-muted-foreground text-xs">—</span>
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    {automation.totalSent > 0 ? (
                      <span className={automation.openRate >= 0.3 ? 'text-green-600 font-medium' : ''}>
                        {(automation.openRate * 100).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {automation.totalSent > 0 ? (
                      <span className={automation.clickRate >= 0.05 ? 'text-blue-600 font-medium' : ''}>
                        {(automation.clickRate * 100).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getPerformanceBadge(automation.performanceBadge)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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

