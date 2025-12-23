'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
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

interface Account {
  id: string
  name: string
}

interface AccountSelectProps {
  accounts: Account[]
  selectedAccountId?: string
  onAccountChange: (accountId: string | undefined) => void
  disabled?: boolean
}

export function AccountSelect({
  accounts,
  selectedAccountId,
  onAccountChange,
  disabled = false,
}: AccountSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState('')

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
          disabled={disabled}
        >
          {selectedAccount ? selectedAccount.name : 'Todas as contas'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Buscar conta..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  onAccountChange(undefined)
                  setOpen(false)
                  setSearchValue('')
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    !selectedAccountId ? 'opacity-100' : 'opacity-0'
                  )}
                />
                Todas as contas
              </CommandItem>
              {accounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={account.name}
                  onSelect={() => {
                    onAccountChange(account.id === selectedAccountId ? undefined : account.id)
                    setOpen(false)
                    setSearchValue('')
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedAccountId === account.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {account.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

