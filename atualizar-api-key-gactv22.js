#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const newApiKey = 'a41d740c40ae7e3c71c41e2592b5be8483f8458f696ed05aee3a17a00fb656659dd70f27'

async function atualizar() {
  try {
    // 1. Buscar conta atual
    const accountBefore = await prisma.account.findFirst({
      where: { name: 'Gactv22' }
    })

    if (!accountBefore) {
      console.log('❌ Conta Gactv22 não encontrada no banco')
      return
    }

    console.log('\n📋 ANTES DA ATUALIZAÇÃO:')
    console.log('─'.repeat(80))
    console.log(`Nome: ${accountBefore.name}`)
    console.log(`Base URL: ${accountBefore.baseUrl}`)
    console.log(`API Key Antiga: ${accountBefore.apiKey}`)
    console.log('')

    // 2. Atualizar API key
    const accountAfter = await prisma.account.update({
      where: { id: accountBefore.id },
      data: { 
        apiKey: newApiKey,
        updatedAt: new Date()
      }
    })

    console.log('✅ API KEY ATUALIZADA COM SUCESSO!')
    console.log('─'.repeat(80))
    console.log(`Nome: ${accountAfter.name}`)
    console.log(`Base URL: ${accountAfter.baseUrl}`)
    console.log(`API Key Nova: ${accountAfter.apiKey}`)
    console.log(`Atualizado em: ${accountAfter.updatedAt}`)
    console.log('─'.repeat(80))

    // 3. Verificar se ficou igual
    if (accountBefore.apiKey === newApiKey) {
      console.log('\n⚠️  OBSERVAÇÃO: A API key já era essa mesma.')
      console.log('   Não houve mudança no valor, mas o timestamp foi atualizado.')
    } else {
      console.log('\n✨ API key foi alterada!')
      console.log(`   De: ${accountBefore.apiKey.substring(0, 20)}...`)
      console.log(`   Para: ${newApiKey.substring(0, 20)}...`)
    }

    console.log('\n📝 Próximos passos:')
    console.log('   1. Testar API key: npx tsx diagnostico-api-key.js Gactv22')
    console.log('   2. Rodar sync: npx tsx auto-sync.js')
    console.log('')

  } catch (error) {
    console.error('❌ Erro ao atualizar:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

atualizar()


