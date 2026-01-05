'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  createAccountAction,
  updateAccountAction,
  testConnectionAction,
} from '@/app/actions/accounts'
import { Loader2, CheckCircle2, AlertCircle, Plus } from 'lucide-react'
import type { AccountFormData } from '@/lib/validations'

interface AccountFormDialogProps {
  account?: {
    id: string
    name: string
    baseUrl: string
    apiKey: string
    isActive: boolean
  }
  mode?: 'create' | 'edit'
}

export function AccountFormDialog({ account, mode = 'create' }: AccountFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const [formData, setFormData] = useState<AccountFormData>({
    name: account?.name || '',
    baseUrl: account?.baseUrl || '',
    apiKey: account?.apiKey || '',
    isActive: account?.isActive ?? true,
    contactLimit: (account as any)?.contactLimit || null,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const result = await testConnectionAction(formData.baseUrl, formData.apiKey)

      if (result.success) {
        setTestResult({
          success: true,
          message: `✅ Conexão válida! ${result.data?.accountName || ''}`,
        })
      } else {
        setTestResult({
          success: false,
          message: `❌ ${result.error || 'Falha na conexão'}`,
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: '❌ Erro ao testar conexão',
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const result =
        mode === 'create'
          ? await createAccountAction(formData)
          : await updateAccountAction(account!.id, formData)

      if (result.success) {
        setOpen(false)
        // Reset form
        setFormData({
          name: '',
          baseUrl: '',
          apiKey: '',
          isActive: true,
          contactLimit: null,
        })
        setTestResult(null)
      } else {
        setErrors({ submit: result.error || 'Erro ao salvar conta' })
      }
    } catch (error) {
      setErrors({ submit: 'Erro inesperado ao salvar' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button>
            <Plus className="h-4 w-4" />
            Adicionar Conta
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Adicionar Conta' : 'Editar Conta'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? 'Configure uma nova conta do ActiveCampaign'
                : 'Atualize as informações da conta'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Nome */}
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Conta *</Label>
              <Input
                id="name"
                placeholder="ex: Minha Conta Principal"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Base URL */}
            <div className="grid gap-2">
              <Label htmlFor="baseUrl">Base URL *</Label>
              <Input
                id="baseUrl"
                placeholder="https://account.api-us1.com"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Encontre em Settings → Developer no ActiveCampaign
              </p>
              {errors.baseUrl && (
                <p className="text-sm text-destructive">{errors.baseUrl}</p>
              )}
            </div>

            {/* API Key */}
            <div className="grid gap-2">
              <Label htmlFor="apiKey">API Key *</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Sua API Key"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                required
              />
              {errors.apiKey && (
                <p className="text-sm text-destructive">{errors.apiKey}</p>
              )}
            </div>

            {/* Limite de Contatos */}
            <div className="grid gap-2">
              <Label htmlFor="contactLimit">Limite de Contatos (opcional)</Label>
              <Input
                id="contactLimit"
                type="number"
                placeholder="ex: 2500"
                value={formData.contactLimit || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? null : parseInt(e.target.value, 10)
                  setFormData({ ...formData, contactLimit: value })
                }}
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Defina o limite do plano para monitorar o uso de contatos
              </p>
            </div>

            {/* Botão Testar Conexão */}
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={!formData.baseUrl || !formData.apiKey || testing}
                className="w-full"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testando...
                  </>
                ) : (
                  'Testar Conexão'
                )}
              </Button>

              {testResult && (
                <div
                  className={`mt-2 flex items-center gap-2 text-sm ${
                    testResult.success ? 'text-green-600' : 'text-destructive'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {testResult.message}
                </div>
              )}
            </div>

            {/* Ativa/Inativa */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Conta Ativa</Label>
                <p className="text-xs text-muted-foreground">
                  Sincronizar dados desta conta
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>

            {/* Erro de submit */}
            {errors.submit && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {errors.submit}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : mode === 'create' ? (
                'Criar Conta'
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

