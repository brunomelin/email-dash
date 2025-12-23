'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(() => {
    const accountIds = searchParams.get('accountIds')
    return accountIds ? accountIds.split(',') : []
  })

  const updateFilters = (accountIds: string[]) => {
    const params = new URLSearchParams()

    if (accountIds && accountIds.length > 0) {
      params.set('accountIds', accountIds.join(','))
    }

    const queryString = params.toString()
    startTransition(() => {
      router.push(queryString ? `/automations?${queryString}` : '/automations')
    })
  }

  const handleAccountsChange = (accountIds: string[]) => {
    setSelectedAccounts(accountIds)
    updateFilters(accountIds)
  }

  const clearFilters = () => {
    setSelectedAccounts([])
    router.push('/automations')
  }

  const hasFilters = selectedAccounts.length > 0

  return (
    <div className="flex flex-wrap items-center gap-3">
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

