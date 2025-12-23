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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data de Envio</TableHead>
              <TableHead className="text-right">Enviados</TableHead>
              <TableHead className="text-right">Aberturas</TableHead>
              <TableHead className="text-right">Open Rate</TableHead>
              <TableHead className="text-right">Cliques</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">CTOR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  Nenhuma campanha encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((campaign) => (
                <TableRow key={`${campaign.accountId}-${campaign.id}`}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{campaign.accountName}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[campaign.status] || 'outline'}>
                      {statusLabels[campaign.status] || campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(campaign.sendDate)}</TableCell>
                  <TableCell className="text-right">{formatNumber(campaign.sent)}</TableCell>
                  <TableCell className="text-right">{formatNumber(campaign.uniqueOpens)}</TableCell>
                  <TableCell className="text-right">{formatPercent(campaign.openRate)}</TableCell>
                  <TableCell className="text-right">{formatNumber(campaign.uniqueClicks)}</TableCell>
                  <TableCell className="text-right">{formatPercent(campaign.clickRate)}</TableCell>
                  <TableCell className="text-right">{formatPercent(campaign.clickToOpenRate)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

