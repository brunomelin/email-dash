'use client'

import { useState } from 'react'
import { ListMetrics } from '@/lib/services/list-metrics-service'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Link from 'next/link'

interface ListsTableProps {
  lists: ListMetrics[]
}

export function ListsTable({ lists }: ListsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filtrar listas pela busca
  const filteredLists = lists.filter(list =>
    list.listName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    list.accountName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Função para formatar números
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num)
  }

  // Função para formatar porcentagem
  const formatPercent = (value: number) => {
    return (value * 100).toFixed(1) + '%'
  }

  // Função para determinar badge de performance
  const getPerformanceBadge = (openRate: number) => {
    if (openRate >= 0.4) {
      return <Badge variant="default" className="bg-green-500">🔥 Excelente</Badge>
    } else if (openRate >= 0.25) {
      return <Badge variant="default" className="bg-blue-500">⭐ Bom</Badge>
    } else if (openRate >= 0.15) {
      return <Badge variant="secondary">➖ Médio</Badge>
    } else if (openRate > 0) {
      return <Badge variant="outline" className="text-orange-500">⚠️ Baixo</Badge>
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar listas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabela */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lista</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Contatos</TableHead>
              <TableHead className="text-right">Campanhas</TableHead>
              <TableHead className="text-right">Enviados</TableHead>
              <TableHead className="text-right">Open Rate</TableHead>
              <TableHead className="text-right">Click Rate</TableHead>
              <TableHead className="text-right">CTOR</TableHead>
              <TableHead>Performance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  {searchTerm ? 'Nenhuma lista encontrada' : 'Nenhuma lista sincronizada'}
                </TableCell>
              </TableRow>
            ) : (
              filteredLists.map((list) => (
                <TableRow key={`${list.accountId}-${list.listId}`} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link
                      href={`/lists/${list.accountId}/${list.listId}`}
                      className="hover:underline"
                    >
                      {list.listName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {list.accountName}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-medium">{formatNumber(list.activeContacts)}</span>
                      <span className="text-xs text-muted-foreground">
                        de {formatNumber(list.totalContacts)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(list.totalCampaigns)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(list.totalSent)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={list.openRate >= 0.3 ? 'font-semibold text-green-600' : ''}>
                      {formatPercent(list.openRate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={list.clickRate >= 0.05 ? 'font-semibold text-blue-600' : ''}>
                      {formatPercent(list.clickRate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercent(list.clickToOpenRate)}
                  </TableCell>
                  <TableCell>
                    {getPerformanceBadge(list.openRate)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Resumo */}
      {filteredLists.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Mostrando {filteredLists.length} {filteredLists.length === 1 ? 'lista' : 'listas'}
          {searchTerm && ` (filtrado de ${lists.length} total)`}
        </div>
      )}
    </div>
  )
}

