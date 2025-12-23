'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DateRange } from 'react-day-picker'
import { DateRangePicker } from './date-range-picker'
import { ListMultiSelect } from './list-multi-select'
import { AccountMultiSelect } from './account-multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface GlobalFiltersProps {
  accounts: Array<{ id: string; name: string }>
  lists?: Array<{ id: string; accountId: string; name: string; accountName?: string }>
}

export function GlobalFilters({ accounts, lists = [] }: GlobalFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Estado inicial baseado nos query params
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (from && to) {
      return {
        from: new Date(from),
        to: new Date(to),
      }
    }
    return undefined
  })

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(() => {
    const accountIds = searchParams.get('accountIds')
    return accountIds ? accountIds.split(',') : []
  })

  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(
    searchParams.get('status') || undefined
  )

  const [selectedLists, setSelectedLists] = useState<string[]>(() => {
    const listIds = searchParams.get('listIds')
    return listIds ? listIds.split(',') : []
  })

  const updateFilters = (filters: {
    dateRange?: DateRange
    accountIds?: string[]
    status?: string
    listIds?: string[]
  }) => {
    const params = new URLSearchParams()

    if (filters.dateRange?.from) {
      params.set('from', filters.dateRange.from.toISOString().split('T')[0])
    }
    if (filters.dateRange?.to) {
      params.set('to', filters.dateRange.to.toISOString().split('T')[0])
    }
    if (filters.accountIds && filters.accountIds.length > 0) {
      params.set('accountIds', filters.accountIds.join(','))
    }
    if (filters.status && filters.status !== 'all') {
      params.set('status', filters.status)
    }
    if (filters.listIds && filters.listIds.length > 0) {
      params.set('listIds', filters.listIds.join(','))
    }

    const queryString = params.toString()
    startTransition(() => {
      router.push(queryString ? `/?${queryString}` : '/')
    })
  }

  const handleDateChange = (date: DateRange | undefined) => {
    setDateRange(date)
    updateFilters({ dateRange: date, accountIds: selectedAccounts, status: selectedStatus, listIds: selectedLists })
  }

  const handleAccountsChange = (accountIds: string[]) => {
    setSelectedAccounts(accountIds)
    setSelectedLists([]) // Limpar listas ao mudar contas
    updateFilters({ dateRange, accountIds, status: selectedStatus, listIds: [] })
  }

  const handleStatusChange = (value: string) => {
    const status = value === 'all' ? undefined : value
    setSelectedStatus(status)
    updateFilters({ dateRange, accountIds: selectedAccounts, status, listIds: selectedLists })
  }

  const handleListsChange = (listIds: string[]) => {
    setSelectedLists(listIds)
    updateFilters({ dateRange, accountIds: selectedAccounts, status: selectedStatus, listIds })
  }

  const clearFilters = () => {
    setDateRange(undefined)
    setSelectedAccounts([])
    setSelectedStatus(undefined)
    setSelectedLists([])
    router.push('/')
  }

  const hasFilters = dateRange || selectedAccounts.length > 0 || selectedStatus || selectedLists.length > 0

  // Filtrar listas pelas contas selecionadas e adicionar accountName
  const availableLists = (selectedAccounts.length > 0
    ? lists.filter(list => selectedAccounts.includes(list.accountId))
    : lists
  ).map(list => {
    const account = accounts.find(acc => acc.id === list.accountId)
    return {
      ...list,
      accountName: account?.name || list.accountId
    }
  }).sort((a, b) => {
    // Ordenar por nome da conta primeiro, depois por nome da lista
    const accountCompare = (a.accountName || '').localeCompare(b.accountName || '')
    if (accountCompare !== 0) return accountCompare
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date Range Picker */}
      <DateRangePicker date={dateRange} onDateChange={handleDateChange} />

      {/* Account Filter */}
      {accounts.length > 1 && (
        <AccountMultiSelect
          accounts={accounts}
          selectedAccounts={selectedAccounts}
          onSelectionChange={handleAccountsChange}
        />
      )}

      {/* Status Filter */}
      <Select value={selectedStatus || 'all'} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Todos os status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="completed">Enviadas</SelectItem>
          <SelectItem value="scheduled">Agendadas</SelectItem>
          <SelectItem value="sending">Enviando</SelectItem>
          <SelectItem value="draft">Rascunho</SelectItem>
          <SelectItem value="paused">Pausadas</SelectItem>
        </SelectContent>
      </Select>

      {/* List Filter - Multi-Select */}
      {lists.length > 0 && (
        <ListMultiSelect
          lists={availableLists}
          selectedLists={selectedLists}
          onSelectionChange={handleListsChange}
          disabled={lists.length === 0}
        />
      )}

      {/* Clear Filters Button */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Limpar Filtros
        </Button>
      )}

      {/* Loading Indicator */}
      {isPending && (
        <span className="text-sm text-muted-foreground">Filtrando...</span>
      )}
    </div>
  )
}

