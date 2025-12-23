'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { accountSchema, accountUpdateSchema, type AccountFormData } from '@/lib/validations'
import { ActiveCampaignClient } from '@/lib/connectors/activecampaign'

export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Testa conexão com ActiveCampaign
 */
export async function testConnectionAction(
  baseUrl: string,
  apiKey: string
): Promise<ActionResult<{ valid: boolean; accountName?: string }>> {
  try {
    // Validar formato básico
    if (!baseUrl || !apiKey) {
      return {
        success: false,
        error: 'URL e API Key são obrigatórios',
      }
    }

    // Tentar fazer uma requisição simples à API
    const client = new ActiveCampaignClient({ baseUrl, apiKey })
    
    // Testar com endpoint /users/me (disponível em todos os planos)
    // Se falhar, tenta /campaigns (mais básico)
    try {
      const response = await client.get('/users/me') as any
      
      return {
        success: true,
        data: {
          valid: true,
          accountName: response?.user?.email || 'Conexão válida',
        },
      }
    } catch (userError) {
      // Se /users/me falhar, tenta /campaigns com limit=1
      const response = await client.get('/campaigns?limit=1')
      
      return {
        success: true,
        data: {
          valid: true,
          accountName: 'Conexão válida',
        },
      }
    }
  } catch (error) {
    console.error('Erro ao testar conexão:', error)
    
    // Extrair mensagem de erro mais amigável
    let errorMessage = 'Falha ao conectar. Verifique as credenciais.'
    
    if (error instanceof Error) {
      if (error.message.includes('403')) {
        errorMessage = 'Credenciais inválidas ou sem permissão. Verifique sua API Key.'
      } else if (error.message.includes('401')) {
        errorMessage = 'API Key inválida. Verifique suas credenciais.'
      } else if (error.message.includes('404')) {
        errorMessage = 'URL inválida. Verifique a Base URL do ActiveCampaign.'
      } else {
        errorMessage = error.message
      }
    }
    
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Cria nova conta
 */
export async function createAccountAction(
  data: AccountFormData
): Promise<ActionResult<{ id: string }>> {
  try {
    // Validar dados
    const validated = accountSchema.parse(data)

    // Verificar se já existe conta com mesmo baseUrl
    const existing = await prisma.account.findFirst({
      where: { baseUrl: validated.baseUrl },
    })

    if (existing) {
      return {
        success: false,
        error: 'Já existe uma conta com esta URL',
      }
    }

    // Criar conta
    const account = await prisma.account.create({
      data: validated,
    })

    revalidatePath('/')
    revalidatePath('/settings/accounts')

    return {
      success: true,
      data: { id: account.id },
    }
  } catch (error) {
    console.error('Erro ao criar conta:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar conta',
    }
  }
}

/**
 * Atualiza conta existente
 */
export async function updateAccountAction(
  id: string,
  data: Partial<AccountFormData>
): Promise<ActionResult> {
  try {
    // Validar dados
    const validated = accountUpdateSchema.parse({ id, ...data })

    // Verificar se conta existe
    const account = await prisma.account.findUnique({
      where: { id },
    })

    if (!account) {
      return {
        success: false,
        error: 'Conta não encontrada',
      }
    }

    // Atualizar
    await prisma.account.update({
      where: { id },
      data: {
        name: validated.name,
        baseUrl: validated.baseUrl,
        apiKey: validated.apiKey,
        isActive: validated.isActive,
      },
    })

    revalidatePath('/')
    revalidatePath('/settings/accounts')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Erro ao atualizar conta:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar conta',
    }
  }
}

/**
 * Deleta conta (soft delete - marca como inativa, ou hard delete)
 */
export async function deleteAccountAction(id: string): Promise<ActionResult> {
  try {
    // Verificar se conta existe
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        campaigns: { take: 1 },
        lists: { take: 1 },
        automations: { take: 1 },
      },
    })

    if (!account) {
      return {
        success: false,
        error: 'Conta não encontrada',
      }
    }

    // Verificar se tem dados associados
    const hasData =
      account.campaigns.length > 0 ||
      account.lists.length > 0 ||
      account.automations.length > 0

    if (hasData) {
      // Soft delete: apenas desativar
      await prisma.account.update({
        where: { id },
        data: { isActive: false },
      })

      revalidatePath('/')
      revalidatePath('/settings/accounts')

      return {
        success: true,
        data: { softDelete: true },
      }
    } else {
      // Hard delete: sem dados, pode deletar completamente
      await prisma.account.delete({
        where: { id },
      })

      revalidatePath('/')
      revalidatePath('/settings/accounts')

      return {
        success: true,
        data: { softDelete: false },
      }
    }
  } catch (error) {
    console.error('Erro ao deletar conta:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao deletar conta',
    }
  }
}

/**
 * Lista todas as contas
 */
export async function listAccountsAction(): Promise<
  ActionResult<
    Array<{
      id: string
      name: string
      baseUrl: string
      isActive: boolean
      createdAt: Date
      _count?: {
        campaigns: number
        lists: number
        automations: number
      }
    }>
  >
> {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
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

    return {
      success: true,
      data: accounts,
    }
  } catch (error) {
    console.error('Erro ao listar contas:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao listar contas',
    }
  }
}

/**
 * Toggle ativo/inativo
 */
export async function toggleAccountActiveAction(
  id: string
): Promise<ActionResult<{ isActive: boolean }>> {
  try {
    const account = await prisma.account.findUnique({
      where: { id },
      select: { isActive: true },
    })

    if (!account) {
      return {
        success: false,
        error: 'Conta não encontrada',
      }
    }

    const updated = await prisma.account.update({
      where: { id },
      data: { isActive: !account.isActive },
    })

    revalidatePath('/')
    revalidatePath('/settings/accounts')

    return {
      success: true,
      data: { isActive: updated.isActive },
    }
  } catch (error) {
    console.error('Erro ao alterar status da conta:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao alterar status',
    }
  }
}

