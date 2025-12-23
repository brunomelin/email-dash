import { prisma } from '@/lib/db'
import { AccountsTable } from '@/components/settings/accounts-table'
import { AccountFormDialog } from '@/components/settings/account-form-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Gerenciar Contas - Email Dashboard',
  description: 'Gerencie suas contas do ActiveCampaign',
}

async function getAccounts() {
  const accountsRaw = await prisma.account.findMany({
    include: {
      _count: {
        select: {
          campaigns: true,
          lists: true,
          automations: true,
        },
      },
    },
  })

  // Ordenação natural (case-insensitive + numeric)
  const accounts = accountsRaw.sort((a, b) => 
    a.name.localeCompare(b.name, 'pt-BR', {
      numeric: true,      // gactv2 < gactv10
      sensitivity: 'base' // ignora maiúsculas/minúsculas
    })
  )

  return accounts
}

export default async function AccountsSettingsPage() {
  const accounts = await getAccounts()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Gerenciar Contas</h1>
                <p className="text-muted-foreground">
                  Configure e gerencie suas contas do ActiveCampaign
                </p>
              </div>
            </div>
            <AccountFormDialog mode="create" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Informações */}
        <Card>
          <CardHeader>
            <CardTitle>Sobre as Contas</CardTitle>
            <CardDescription>
              Adicione múltiplas contas do ActiveCampaign para consolidar métricas no
              dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <p>
                <strong>Base URL:</strong> Encontre em Settings → Developer no
                ActiveCampaign (ex: https://account.api-us1.com)
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <p>
                <strong>API Key:</strong> Também disponível em Settings → Developer
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <p>
                <strong>Teste a Conexão:</strong> Valide suas credenciais antes de salvar
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <p>
                <strong>Status:</strong> Apenas contas ativas serão sincronizadas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Contas */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Contas Cadastradas</h2>
              <p className="text-sm text-muted-foreground">
                {accounts.length} {accounts.length === 1 ? 'conta' : 'contas'}{' '}
                cadastrada{accounts.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <AccountsTable accounts={accounts} />
        </div>

        {/* Dicas de Segurança */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">⚠️ Segurança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-orange-900">
            <p>
              <strong>Para MVP:</strong> API Keys são armazenadas em texto plano no banco
              de dados.
            </p>
            <p>
              <strong>Para Produção:</strong> Considere implementar encriptação de API
              Keys ou uso de serviços de vault (HashiCorp Vault, AWS Secrets Manager).
            </p>
            <p>
              <strong>Acesso:</strong> Certifique-se de implementar autenticação adequada
              antes de colocar em produção.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

