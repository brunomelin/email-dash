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
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { formatDate } from '@/lib/utils'
import {
  deleteAccountAction,
  toggleAccountActiveAction,
} from '@/app/actions/accounts'
import { AccountFormDialog } from './account-form-dialog'
import { Trash2, Database } from 'lucide-react'

interface Account {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  isActive: boolean
  createdAt: Date
  _count?: {
    campaigns: number
    lists: number
    automations: number
  }
}

interface AccountsTableProps {
  accounts: Account[]
}

export function AccountsTable({ accounts: initialAccounts }: AccountsTableProps) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleToggleActive = async (accountId: string) => {
    const result = await toggleAccountActiveAction(accountId)
    if (result.success) {
      setAccounts(
        accounts.map((acc) =>
          acc.id === accountId ? { ...acc, isActive: result.data!.isActive } : acc
        )
      )
    }
  }

  const handleDelete = async (accountId: string, accountName: string) => {
    const confirmed = confirm(
      `Tem certeza que deseja deletar a conta "${accountName}"?\n\nSe houver dados associados, a conta será apenas desativada.`
    )

    if (!confirmed) return

    setDeletingId(accountId)
    try {
      const result = await deleteAccountAction(accountId)
      if (result.success) {
        if (result.data?.softDelete) {
          // Soft delete: apenas desativou
          setAccounts(
            accounts.map((acc) =>
              acc.id === accountId ? { ...acc, isActive: false } : acc
            )
          )
          alert(
            `Conta "${accountName}" foi desativada pois possui dados associados.`
          )
        } else {
          // Hard delete: removeu
          setAccounts(accounts.filter((acc) => acc.id !== accountId))
          alert(`Conta "${accountName}" foi deletada.`)
        }
      } else {
        alert(`Erro ao deletar: ${result.error}`)
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <Database className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Nenhuma conta configurada</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Adicione sua primeira conta do ActiveCampaign para começar.
        </p>
        <div className="mt-6">
          <AccountFormDialog mode="create" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Base URL</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Campanhas</TableHead>
            <TableHead className="text-right">Listas</TableHead>
            <TableHead className="text-right">Automações</TableHead>
            <TableHead>Criada em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="font-medium">{account.name}</TableCell>
              <TableCell>
                <code className="text-xs">{account.baseUrl}</code>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={account.isActive}
                    onCheckedChange={() => handleToggleActive(account.id)}
                    disabled={deletingId === account.id}
                  />
                  <Badge variant={account.isActive ? 'default' : 'secondary'}>
                    {account.isActive ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {account._count?.campaigns || 0}
              </TableCell>
              <TableCell className="text-right">
                {account._count?.lists || 0}
              </TableCell>
              <TableCell className="text-right">
                {account._count?.automations || 0}
              </TableCell>
              <TableCell>{formatDate(account.createdAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <AccountFormDialog
                    account={{
                      id: account.id,
                      name: account.name,
                      baseUrl: account.baseUrl,
                      apiKey: account.apiKey,
                      isActive: account.isActive,
                    }}
                    mode="edit"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(account.id, account.name)}
                    disabled={deletingId === account.id}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

