#!/usr/bin/env node
/**
 * Lista URLs e API Keys completas de todas as contas
 * 
 * ⚠️  ATENÇÃO: Este script exibe credenciais sensíveis!
 * Use apenas em ambiente seguro.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function listarCredenciais() {
  console.log('\n' + '='.repeat(80))
  console.log('🔑 TODAS AS CONTAS - URLs e API Keys Completas')
  console.log('='.repeat(80))
  console.log('⚠️  ATENÇÃO: Informações sensíveis! Não compartilhe este output.\n')

  try {
    const accounts = await prisma.account.findMany({
      select: {
        name: true,
        baseUrl: true,
        apiKey: true,
        isActive: true,
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
      console.log(`${index + 1}. ${account.name} ${account.isActive ? '✅ Ativa' : '❌ Inativa'}`)
      console.log(`   URL:     ${account.baseUrl}`)
      console.log(`   API Key: ${account.apiKey}`)
      console.log()
    })

    console.log('='.repeat(80))

    // Formato para copiar/colar (opcional)
    console.log('\n📋 FORMATO CSV (para planilha):\n')
    console.log('Nome,URL,API Key,Status')
    accounts.forEach(acc => {
      console.log(`${acc.name},${acc.baseUrl},${acc.apiKey},${acc.isActive ? 'Ativa' : 'Inativa'}`)
    })
    console.log()

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listarCredenciais().catch(console.error)

