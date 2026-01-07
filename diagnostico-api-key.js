#!/usr/bin/env node
/**
 * Script de Diagnóstico de API Key
 * 
 * Testa se uma API key está válida e funcionando
 * Útil para diagnosticar erros 403 Forbidden
 * 
 * Uso:
 * node diagnostico-api-key.js gactv22
 * node diagnostico-api-key.js --all  (testa todas as contas)
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAPIKey(account) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`🔍 Testando: ${account.name}`)
  console.log(`   Base URL: ${account.baseUrl}`)
  console.log(`   API Key: ${account.apiKey.substring(0, 20)}...`)
  console.log('='.repeat(80))

  const tests = []

  // Teste 1: API v3 - Me (informações da conta)
  try {
    const url = `${account.baseUrl}/api/3/users/me`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Api-Token': account.apiKey,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      tests.push({ 
        name: 'GET /users/me (API v3)', 
        status: '✅ OK',
        details: `User: ${data.user?.email || 'N/A'}`
      })
    } else {
      const errorText = await response.text()
      tests.push({ 
        name: 'GET /users/me (API v3)', 
        status: `❌ ${response.status} ${response.statusText}`,
        details: errorText.substring(0, 100)
      })
    }
  } catch (error) {
    tests.push({ 
      name: 'GET /users/me (API v3)', 
      status: '❌ ERRO',
      details: error.message
    })
  }

  // Teste 2: API v3 - Lists
  try {
    const url = `${account.baseUrl}/api/3/lists?limit=1`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Api-Token': account.apiKey,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      tests.push({ 
        name: 'GET /lists (API v3)', 
        status: '✅ OK',
        details: `${data.meta?.total || 0} listas encontradas`
      })
    } else {
      const errorText = await response.text()
      tests.push({ 
        name: 'GET /lists (API v3)', 
        status: `❌ ${response.status} ${response.statusText}`,
        details: errorText.substring(0, 100)
      })
    }
  } catch (error) {
    tests.push({ 
      name: 'GET /lists (API v3)', 
      status: '❌ ERRO',
      details: error.message
    })
  }

  // Teste 3: API v3 - Contacts
  try {
    const url = `${account.baseUrl}/api/3/contacts?limit=1`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Api-Token': account.apiKey,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      const total = typeof data.meta?.total === 'string' 
        ? parseInt(data.meta.total, 10) 
        : data.meta?.total || 0
      tests.push({ 
        name: 'GET /contacts (API v3)', 
        status: '✅ OK',
        details: `${total.toLocaleString()} contatos`
      })
    } else {
      const errorText = await response.text()
      tests.push({ 
        name: 'GET /contacts (API v3)', 
        status: `❌ ${response.status} ${response.statusText}`,
        details: errorText.substring(0, 100)
      })
    }
  } catch (error) {
    tests.push({ 
      name: 'GET /contacts (API v3)', 
      status: '❌ ERRO',
      details: error.message
    })
  }

  // Teste 4: API v1 - Account Info
  try {
    const params = new URLSearchParams({
      api_key: account.apiKey,
      api_action: 'account_view',
      api_output: 'json',
    })
    const url = `${account.baseUrl}/admin/api.php?${params.toString()}`
    const response = await fetch(url, { method: 'GET' })

    if (response.ok) {
      const data = await response.json()
      if (data.result_code === 1) {
        tests.push({ 
          name: 'account_view (API v1)', 
          status: '✅ OK',
          details: `Limite: ${data.subscriber_limit || 'N/A'}`
        })
      } else {
        tests.push({ 
          name: 'account_view (API v1)', 
          status: '⚠️  API v1 não disponível',
          details: data.result_message || 'Erro desconhecido'
        })
      }
    } else {
      tests.push({ 
        name: 'account_view (API v1)', 
        status: `❌ ${response.status}`,
        details: await response.text().substring(0, 100)
      })
    }
  } catch (error) {
    tests.push({ 
      name: 'account_view (API v1)', 
      status: '❌ ERRO',
      details: error.message
    })
  }

  // Exibir resultados
  console.log('\n📊 Resultados dos Testes:\n')
  tests.forEach((test, idx) => {
    console.log(`${idx + 1}. ${test.name}`)
    console.log(`   Status: ${test.status}`)
    console.log(`   Detalhes: ${test.details}`)
    console.log('')
  })

  // Diagnóstico
  const failedTests = tests.filter(t => t.status.includes('❌'))
  const hasErrors = failedTests.length > 0

  if (!hasErrors) {
    console.log('✅ TODAS AS VERIFICAÇÕES PASSARAM')
    console.log('   A API key está válida e funcionando corretamente.')
  } else {
    console.log(`❌ ${failedTests.length} TESTE(S) FALHARAM`)
    console.log('\n🔧 RECOMENDAÇÕES:')
    
    if (failedTests.some(t => t.status.includes('403'))) {
      console.log('   1. A API key está inválida, expirada ou sem permissões')
      console.log('   2. Gerar nova API key no ActiveCampaign:')
      console.log(`      https://${account.baseUrl.match(/\/\/(.*?)\./)?.[1]}.activehosted.com/admin/`)
      console.log('      → Settings → Developer')
      console.log('   3. Atualizar no banco de dados ou desativar a conta')
    }
    
    if (failedTests.some(t => t.status.includes('401'))) {
      console.log('   • Erro 401: API key incorreta ou ausente')
    }
    
    if (failedTests.some(t => t.status.includes('404'))) {
      console.log('   • Erro 404: Endpoint não encontrado (verificar base URL)')
    }
  }

  console.log('='.repeat(80))

  return !hasErrors
}

async function main() {
  const accountName = process.argv[2]

  if (!accountName) {
    console.error('\n❌ Erro: Forneça o nome da conta')
    console.error('\nUso:')
    console.error('  node diagnostico-api-key.js gactv22')
    console.error('  node diagnostico-api-key.js --all')
    process.exit(1)
  }

  try {
    if (accountName === '--all') {
      console.log('🔍 Testando TODAS as contas ativas...\n')
      
      const accounts = await prisma.account.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      })

      console.log(`Encontradas ${accounts.length} contas ativas\n`)

      let successCount = 0
      let failCount = 0

      for (const account of accounts) {
        const success = await testAPIKey(account)
        if (success) {
          successCount++
        } else {
          failCount++
        }
        await new Promise(resolve => setTimeout(resolve, 500)) // Pequeno delay
      }

      console.log('\n' + '='.repeat(80))
      console.log('📊 RESUMO GERAL')
      console.log('='.repeat(80))
      console.log(`✅ Sucesso: ${successCount} contas`)
      console.log(`❌ Falhas: ${failCount} contas`)
      console.log('='.repeat(80))

    } else {
      const account = await prisma.account.findFirst({
        where: { name: { equals: accountName, mode: 'insensitive' } },
      })

      if (!account) {
        console.error(`\n❌ Conta "${accountName}" não encontrada`)
        process.exit(1)
      }

      await testAPIKey(account)
    }

  } catch (error) {
    console.error('\n💥 Erro fatal:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()


