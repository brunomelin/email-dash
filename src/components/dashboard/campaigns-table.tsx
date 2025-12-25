'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatNumber, formatPercent, formatDate } from '@/lib/utils'

interface Campaign {
  id: string
  accountId: string
  name: string
  status: string
  sendDate: Date | null
  sent: number
  uniqueOpens: number
  openRate: number
  uniqueClicks: number
  clickRate: number
  clickToOpenRate: number
  accountName: string
}

interface CampaignsTableProps {
  campaigns: Campaign[]
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  sending: 'secondary',
  scheduled: 'outline',
  draft: 'outline',
  paused: 'destructive',
  stopped: 'destructive',
}

const statusLabels: Record<string, string> = {
  completed: 'Enviada',
  sending: 'Enviando',
  scheduled: 'Agendada',
  draft: 'Rascunho',
  paused: 'Pausada',
  stopped: 'Parada',
}

export function CampaignsTable({ campaigns }: CampaignsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.accountName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Buscar campanhas..."
          className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">
          {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'campanha' : 'campanhas'}
        </span>
      </div>

      {/* Cabeçalho Fixo */}
      <div className="sticky top-0 z-20 bg-white border rounded-t-md shadow-sm">
        <div className="grid gap-4 px-4 py-3 text-sm font-medium text-muted-foreground" style={{
          gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1fr 1fr 1fr 1fr 1fr 1fr'
        }}>
          <div>Nome</div>
          <div>Conta</div>
          <div>Status</div>
          <div>Data de Envio</div>
          <div className="text-right">Enviados</div>
          <div className="text-right">Aberturas</div>
          <div className="text-right">Open Rate</div>
          <div className="text-right">Cliques</div>
          <div className="text-right">CTR</div>
          <div className="text-right">CTOR</div>
        </div>
      </div>

      {/* Lista de Campanhas */}
      <div className="rounded-b-md border border-t-0 overflow-auto bg-white" style={{ maxHeight: 'calc(100vh - 400px)' }}>
        {filteredCampaigns.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            Nenhuma campanha encontrada.
          </div>
        ) : (
          filteredCampaigns.map((campaign) => (
            <div 
              key={`${campaign.accountId}-${campaign.id}`}
              className="grid gap-4 px-4 py-3 border-b hover:bg-gray-50 transition-colors items-center"
              style={{
                gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1fr 1fr 1fr 1fr 1fr 1fr'
              }}
            >
              {/* Nome */}
              <div className="font-medium truncate">{campaign.name}</div>
              
              {/* Conta */}
              <div>
                <Badge variant="outline">{campaign.accountName}</Badge>
              </div>
              
              {/* Status */}
              <div>
                <Badge variant={statusColors[campaign.status] || 'outline'}>
                  {statusLabels[campaign.status] || campaign.status}
                </Badge>
              </div>
              
              {/* Data de Envio */}
              <div className="text-sm">{formatDate(campaign.sendDate)}</div>
              
              {/* Enviados */}
              <div className="text-right">{formatNumber(campaign.sent)}</div>
              
              {/* Aberturas */}
              <div className="text-right">{formatNumber(campaign.uniqueOpens)}</div>
              
              {/* Open Rate */}
              <div className="text-right">{formatPercent(campaign.openRate)}</div>
              
              {/* Cliques */}
              <div className="text-right">{formatNumber(campaign.uniqueClicks)}</div>
              
              {/* CTR */}
              <div className="text-right">{formatPercent(campaign.clickRate)}</div>
              
              {/* CTOR */}
              <div className="text-right">{formatPercent(campaign.clickToOpenRate)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

