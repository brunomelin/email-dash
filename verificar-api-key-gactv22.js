#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const expectedKey = 'a41d740c40ae7e3c71c41e2592b5be8483f8458f696ed05aee3a17a00fb656659dd70f27'

async function verificar() {
  try {
    const account = await prisma.account.findFirst({
      where: { name: 'Gactv22' }
    })

    if (!account) {
      console.log('❌ Conta Gactv22 não encontrada no banco')
      return
    }

    console.log('\n📋 Informações da conta Gactv22:')
    console.log('─'.repeat(80))
    console.log(`Nome: ${account.name}`)
    console.log(`Base URL: ${account.baseUrl}`)
    console.log(`Ativa: ${account.isActive ? '✅ Sim' : '❌ Não'}`)
    console.log('')
    console.log('🔑 API Key Atual no Banco:')
    console.log(`   ${account.apiKey}`)
    console.log('')
    console.log('🔑 API Key Esperada (fornecida):')
    console.log(`   ${expectedKey}`)
    console.log('')
    
    if (account.apiKey === expectedKey) {
      console.log('✅ API KEYS SÃO IDÊNTICAS')
      console.log('   A chave no banco está correta.')
    } else {
      console.log('❌ API KEYS SÃO DIFERENTES')
      console.log('')
      console.log('Diferenças encontradas:')
      console.log(`   Tamanho no banco: ${account.apiKey.length} caracteres`)
      console.log(`   Tamanho esperado: ${expectedKey.length} caracteres`)
      
      if (account.apiKey.trim() !== account.apiKey) {
        console.log('   ⚠️  API key no banco tem espaços extras!')
      }
      
      if (expectedKey.trim() !== expectedKey) {
        console.log('   ⚠️  API key fornecida tem espaços extras!')
      }
      
      // Comparar caractere por caractere
      let firstDiff = -1
      for (let i = 0; i < Math.max(account.apiKey.length, expectedKey.length); i++) {
        if (account.apiKey[i] !== expectedKey[i]) {
          firstDiff = i
          break
        }
      }
      
      if (firstDiff >= 0) {
        console.log(`   Primeira diferença na posição ${firstDiff}:`)
        console.log(`     Banco: '${account.apiKey[firstDiff] || '(fim)'}' (char code: ${account.apiKey.charCodeAt(firstDiff) || 'N/A'})`)
        console.log(`     Esperado: '${expectedKey[firstDiff] || '(fim)'}' (char code: ${expectedKey.charCodeAt(firstDiff) || 'N/A'})`)
      }
    }
    
    console.log('─'.repeat(80))
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

verificar()

