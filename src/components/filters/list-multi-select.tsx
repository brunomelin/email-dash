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

interface List {
  id: string
  accountId: string
  name: string
  accountName?: string
}

interface ListMultiSelectProps {
  lists: List[]
  selectedLists: string[]
  onSelectionChange: (selectedListIds: string[]) => void
  disabled?: boolean
}

export function ListMultiSelect({
  lists,
  selectedLists,
  onSelectionChange,
  disabled = false,
}: ListMultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState('')

  const toggleList = (listKey: string) => {
    const newSelection = selectedLists.includes(listKey)
      ? selectedLists.filter(id => id !== listKey)
      : [...selectedLists, listKey]
    
    onSelectionChange(newSelection)
  }

  const selectAll = () => {
    const allListKeys = lists.map(list => `${list.accountId}:${list.id}`)
    onSelectionChange(allListKeys)
  }

  const clearAll = () => {
    onSelectionChange([])
  }

  const selectedListsData = lists.filter(list => 
    selectedLists.includes(`${list.accountId}:${list.id}`)
  )

  const filteredLists = lists.filter(list => {
    const searchLower = searchValue.toLowerCase()
    return (
      list.name.toLowerCase().includes(searchLower) ||
      (list.accountName || '').toLowerCase().includes(searchLower)
    )
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between"
          disabled={disabled}
        >
          {selectedLists.length === 0 ? (
            <span className="text-muted-foreground">Todas as listas</span>
          ) : selectedLists.length === 1 ? (
            <span className="truncate">
              📋 {selectedListsData[0]?.name}
              <span className="text-xs text-muted-foreground ml-1">
                ({selectedListsData[0]?.accountName})
              </span>
            </span>
          ) : (
            <span>
              {selectedLists.length} listas selecionadas
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Buscar lista ou conta..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <div className="p-2 border-b">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {selectedLists.length > 0 
                    ? `${selectedLists.length} selecionada${selectedLists.length > 1 ? 's' : ''}`
                    : 'Selecionar listas'
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
                  {selectedLists.length > 0 && (
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
              {selectedLists.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedListsData.slice(0, 3).map(list => (
                    <Badge
                      key={`${list.accountId}-${list.id}`}
                      variant="secondary"
                      className="text-xs"
                    >
                      {list.name}
                      <button
                        className="ml-1 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleList(`${list.accountId}:${list.id}`)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {selectedLists.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{selectedLists.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <CommandEmpty>Nenhuma lista encontrada.</CommandEmpty>
            <CommandGroup>
              {filteredLists.length === 0 && searchValue === '' && lists.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma lista disponível
                </div>
              ) : (
                filteredLists.map((list) => {
                  const listKey = `${list.accountId}:${list.id}`
                  const isSelected = selectedLists.includes(listKey)
                  
                  return (
                    <CommandItem
                      key={listKey}
                      value={`${list.name} ${list.accountName}`}
                      onSelect={() => toggleList(listKey)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleList(listKey)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-2"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            📋 {list.name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {list.accountName || list.accountId}
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

