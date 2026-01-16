#!/usr/bin/env node
/**
 * Diagnóstico para Contas Valdir
 * 
 * Testa conectividade e API das contas valdir-XX
 * para identificar por que não sincronizam corretamente
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function diagnosticarContas() {
  console.log('\n' + '='.repeat(80))
  console.log('🔍 DIAGNÓSTICO - CONTAS VALDIR')
  console.log('='.repeat(80) + '\n')

  try {
    require('tsx/cjs')
    const { ActiveCampaignClient } = require('./src/lib/connectors/activecampaign/client.ts')
    const { ContactsAPI } = require('./src/lib/connectors/activecampaign/contacts.ts')

    // Buscar contas valdir
    const accounts = await prisma.account.findMany({
      where: { 
        name: {
          startsWith: 'valdir'
        }
      },
      select: {
        id: true,
        name: true,
        baseUrl: true,
        apiKey: true,
        contactCount: true,
        contactLimit: true,
        isActive: true,
      },
    })

    if (accounts.length === 0) {
      console.log('⚠️  Nenhuma conta valdir encontrada')
      await prisma.$disconnect()
      return
    }

    console.log(`📋 Encontradas ${accounts.length} contas valdir:\n`)

    for (const account of accounts) {
      console.log('─'.repeat(80))
      console.log(`🏢 Conta: ${account.name}`)
      console.log(`📍 URL: ${account.baseUrl}`)
      console.log(`🔑 API Key: ${account.apiKey.substring(0, 20)}...`)
      console.log(`📊 Ativa: ${account.isActive ? '✅ Sim' : '❌ Não'}`)
      
      console.log('\n📊 Dados Atuais no Banco:')
      console.log(`   contactCount: ${account.contactCount}`)
      console.log(`   contactLimit: ${account.contactLimit}`)
      
      console.log('\n🧪 Testando Conectividade...\n')

      try {
        // 1. Testar endpoint básico (users/me)
        console.log('1️⃣  Testando endpoint /users/me...')
        const client = new ActiveCampaignClient({
          baseUrl: account.baseUrl,
          apiKey: account.apiKey,
        })

        try {
          const userResponse = await client.get('/users/me')
          console.log('   ✅ Endpoint /users/me funcionando')
          console.log(`   → User ID: ${userResponse.user?.id || 'N/A'}`)
        } catch (error) {
          console.log('   ❌ Erro no endpoint /users/me')
          console.log(`   → ${error.message}`)
          
          // Extrair código de status HTTP
          if (error.message.includes('401')) {
            console.log('   ⚠️  DIAGNÓSTICO: API Key INVÁLIDA!')
          } else if (error.message.includes('402')) {
            console.log('   ⚠️  DIAGNÓSTICO: CONTA EXPIRADA ou PAGAMENTO NECESSÁRIO!')
          } else if (error.message.includes('403')) {
            console.log('   ⚠️  DIAGNÓSTICO: PERMISSÕES INSUFICIENTES!')
          } else if (error.message.includes('404')) {
            console.log('   ⚠️  DIAGNÓSTICO: URL BASE INCORRETA!')
          }
        }

        // 2. Testar API v3 - Contatos
        console.log('\n2️⃣  Testando API v3 /contacts?status=1&limit=1...')
        try {
          const contactsResponse = await client.get('/contacts?status=1&limit=1')
          const total = contactsResponse.meta?.total || 0
          console.log('   ✅ API v3 funcionando')
          console.log(`   → Total de contatos ativos: ${total}`)
        } catch (error) {
          console.log('   ❌ Erro na API v3 /contacts')
          console.log(`   → ${error.message}`)
        }

        // 3. Testar API v1 - Account Info
        console.log('\n3️⃣  Testando API v1 account_view...')
        try {
          const params = new URLSearchParams({
            api_key: account.apiKey,
            api_action: 'account_view',
            api_output: 'json',
          })
          
          const url = `${account.baseUrl}/admin/api.php?${params.toString()}`
          const response = await fetch(url)
          const data = await response.json()

          if (data.result_code === 1) {
            console.log('   ✅ API v1 funcionando')
            console.log(`   → Subscriber Total: ${data.subscriber_total}`)
            console.log(`   → Subscriber Limit: ${data.subscriber_limit}`)
          } else {
            console.log('   ❌ API v1 retornou erro')
            console.log(`   → ${data.result_message}`)
          }
        } catch (error) {
          console.log('   ❌ Erro na API v1')
          console.log(`   → ${error.message}`)
        }

        // 4. Testar ContactsAPI completo
        console.log('\n4️⃣  Testando ContactsAPI.getAccountInfo()...')
        const contactsAPI = new ContactsAPI(client)
        
        try {
          const accountInfo = await contactsAPI.getAccountInfo()
          console.log('   ✅ getAccountInfo() funcionou')
          console.log(`   → contactCount: ${accountInfo.contactCount}`)
          console.log(`   → contactLimit: ${accountInfo.contactLimit}`)
          
          if (accountInfo.contactCount === 0 && accountInfo.contactLimit === 0) {
            console.log('   ⚠️  ATENÇÃO: Retornou zeros - indica erro na API!')
          }
        } catch (error) {
          console.log('   ❌ Erro em getAccountInfo()')
          console.log(`   → ${error.message}`)
        }

        console.log('\n' + '─'.repeat(80))
        console.log('✅ Diagnóstico completo para esta conta\n')

      } catch (error) {
        console.error(`\n❌ Erro crítico ao testar conta ${account.name}:`)
        console.error(error)
        console.log()
      }
    }

    console.log('='.repeat(80))
    console.log('🎉 Diagnóstico completo!')
    console.log('='.repeat(80) + '\n')

    console.log('💡 PRÓXIMOS PASSOS:')
    console.log('   1. Verifique os erros acima')
    console.log('   2. Se API Key inválida: atualize no painel /settings/accounts')
    console.log('   3. Se conta expirada (402): verifique status no ActiveCampaign')
    console.log('   4. Se erro de permissão (403): gere nova API Key com permissões completas\n')

  } catch (error) {
    console.error('\n💥 ERRO:', error)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
diagnosticarContas().catch(console.error)

