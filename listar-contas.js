#!/usr/bin/env node
/**
 * Lista todas as contas no banco de dados
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function listarContas() {
  console.log('\n' + '='.repeat(80))
  console.log('📋 LISTANDO TODAS AS CONTAS')
  console.log('='.repeat(80) + '\n')

  try {
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        name: true,
        baseUrl: true,
        contactCount: true,
        contactLimit: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    if (accounts.length === 0) {
      console.log('⚠️  Nenhuma conta encontrada no banco de dados')
      await prisma.$disconnect()
      return
    }

    console.log(`✅ Encontradas ${accounts.length} contas:\n`)

    accounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.name}`)
      console.log(`   ID: ${account.id}`)
      console.log(`   URL: ${account.baseUrl}`)
      console.log(`   Status: ${account.isActive ? '✅ Ativa' : '❌ Inativa'}`)
      console.log(`   Contatos: ${account.contactCount || 0} / ${account.contactLimit || 0}`)
      console.log(`   Criada em: ${account.createdAt.toLocaleDateString('pt-BR')}`)
      console.log()
    })

    console.log('='.repeat(80))

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listarContas().catch(console.error)

