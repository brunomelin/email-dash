'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

interface Account {
  id: string
  name: string
}

interface AccountMultiSelectProps {
  accounts: Account[]
  selectedAccounts: string[]
  onSelectionChange: (selectedAccountIds: string[]) => void
  disabled?: boolean
}

export function AccountMultiSelect({
  accounts,
  selectedAccounts,
  onSelectionChange,
  disabled = false,
}: AccountMultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState('')

  const toggleAccount = (accountId: string) => {
    const newSelection = selectedAccounts.includes(accountId)
      ? selectedAccounts.filter(id => id !== accountId)
      : [...selectedAccounts, accountId]
    
    onSelectionChange(newSelection)
  }

  const selectAll = () => {
    const allAccountIds = accounts.map(account => account.id)
    onSelectionChange(allAccountIds)
  }

  const clearAll = () => {
    onSelectionChange([])
  }

  const selectedAccountsData = accounts.filter(account => 
    selectedAccounts.includes(account.id)
  )

  const filteredAccounts = accounts.filter(account => {
    const searchLower = searchValue.toLowerCase()
    return account.name.toLowerCase().includes(searchLower)
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[220px] justify-between"
          disabled={disabled}
        >
          {selectedAccounts.length === 0 ? (
            <span className="text-muted-foreground">Todas as contas</span>
          ) : selectedAccounts.length === 1 ? (
            <span className="truncate">
              {selectedAccountsData[0]?.name}
            </span>
          ) : selectedAccounts.length === accounts.length ? (
            <span>Todas as contas</span>
          ) : (
            <span>
              {selectedAccounts.length} contas selecionadas
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Buscar conta..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <div className="p-2 border-b">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {selectedAccounts.length > 0 
                    ? `${selectedAccounts.length} selecionada${selectedAccounts.length > 1 ? 's' : ''}`
                    : 'Selecionar contas'
                  }
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={selectAll}
                  >
                    Todas
                  </Button>
                  {selectedAccounts.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={clearAll}
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
              {selectedAccounts.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedAccountsData.slice(0, 3).map(account => (
                    <Badge
                      key={account.id}
                      variant="secondary"
                      className="text-xs"
                    >
                      {account.name}
                      <button
                        className="ml-1 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleAccount(account.id)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {selectedAccounts.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{selectedAccounts.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
            <CommandGroup>
              {filteredAccounts.length === 0 && searchValue === '' && accounts.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma conta disponível
                </div>
              ) : (
                filteredAccounts.map((account) => {
                  const isSelected = selectedAccounts.includes(account.id)
                  
                  return (
                    <CommandItem
                      key={account.id}
                      value={account.name}
                      onSelect={() => toggleAccount(account.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleAccount(account.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-2"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">
                          🏢 {account.name}
                        </span>
                      </div>
                      <Check
                        className={cn(
                          'ml-auto h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  )
                })
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

