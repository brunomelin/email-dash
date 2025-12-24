'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DateRange } from 'react-day-picker'
import { DateRangePicker } from '@/components/filters/date-range-picker'
import { AccountMultiSelect } from '@/components/filters/account-multi-select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface AutomationsFiltersProps {
  accounts: Array<{ id: string; name: string }>
}

export function AutomationsFilters({ accounts }: AutomationsFiltersProps) {
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

  const updateFilters = (filters: {
    dateRange?: DateRange
    accountIds?: string[]
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

    const queryString = params.toString()
    startTransition(() => {
      router.push(queryString ? `/automations?${queryString}` : '/automations')
    })
  }

  const handleDateChange = (date: DateRange | undefined) => {
    setDateRange(date)
    updateFilters({ dateRange: date, accountIds: selectedAccounts })
  }

  const handleAccountsChange = (accountIds: string[]) => {
    setSelectedAccounts(accountIds)
    updateFilters({ dateRange, accountIds })
  }

  const clearFilters = () => {
    setDateRange(undefined)
    setSelectedAccounts([])
    router.push('/automations')
  }

  const hasFilters = dateRange || selectedAccounts.length > 0

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

