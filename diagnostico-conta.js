#!/usr/bin/env node
/**
 * Diagnóstico para uma conta específica
 * 
 * Uso: node diagnostico-conta.js <nome-da-conta>
 * Exemplo: node diagnostico-conta.js gactv1
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function diagnosticarConta(accountName) {
  console.log('\n' + '='.repeat(80))
  console.log(`🔍 DIAGNÓSTICO - CONTA: ${accountName}`)
  console.log('='.repeat(80) + '\n')

  try {
    require('tsx/cjs')
    const { ActiveCampaignClient } = require('./src/lib/connectors/activecampaign/client.ts')
    const { ContactsAPI } = require('./src/lib/connectors/activecampaign/contacts.ts')

    // Buscar conta
    const account = await prisma.account.findFirst({
      where: { 
        name: {
          equals: accountName,
          mode: 'insensitive'
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
        lastContactSync: true,
      },
    })

    if (!account) {
      console.log(`❌ Conta "${accountName}" não encontrada`)
      console.log('\n💡 Contas disponíveis:')
      
      const allAccounts = await prisma.account.findMany({
        select: { name: true, isActive: true },
        orderBy: { name: 'asc' }
      })
      
      allAccounts.forEach(acc => {
        console.log(`   - ${acc.name} ${acc.isActive ? '(ativa)' : '(inativa)'}`)
      })
      
      await prisma.$disconnect()
      return
    }

    console.log(`🏢 Conta: ${account.name}`)
    console.log(`📍 URL: ${account.baseUrl}`)
    console.log(`🔑 API Key: ${account.apiKey.substring(0, 20)}...${account.apiKey.substring(account.apiKey.length - 4)}`)
    console.log(`📊 Ativa: ${account.isActive ? '✅ Sim' : '❌ Não'}`)
    
    console.log('\n📊 Dados Atuais no Banco:')
    console.log(`   contactCount: ${account.contactCount}`)
    console.log(`   contactLimit: ${account.contactLimit}`)
    console.log(`   lastContactSync: ${account.lastContactSync ? account.lastContactSync.toLocaleString('pt-BR') : 'Nunca'}`)
    
    if (account.contactCount <= 1 || account.contactLimit <= 1) {
      console.log('\n⚠️  ALERTA: Valores muito baixos! Provavelmente houve erro no sync.')
    }
    
    console.log('\n🧪 Testando Conectividade...\n')

    try {
      // 1. Testar endpoint básico (users/me)
      console.log('1️⃣  Testando autenticação (/users/me)...')
      const client = new ActiveCampaignClient({
        baseUrl: account.baseUrl,
        apiKey: account.apiKey,
      })

      let authOk = false
      try {
        const userResponse = await client.get('/users/me')
        console.log('   ✅ Autenticação OK')
        console.log(`   → User ID: ${userResponse.user?.id || 'N/A'}`)
        console.log(`   → Username: ${userResponse.user?.username || 'N/A'}`)
        authOk = true
      } catch (error) {
        console.log('   ❌ Erro na autenticação')
        console.log(`   → ${error.message}`)
        
        if (error.message.includes('401')) {
          console.log('\n🚨 DIAGNÓSTICO: API Key INVÁLIDA!')
          console.log('   Solução: Gere uma nova API Key no ActiveCampaign e atualize em /settings/accounts')
        } else if (error.message.includes('402')) {
          console.log('\n🚨 DIAGNÓSTICO: CONTA EXPIRADA ou PAGAMENTO NECESSÁRIO!')
          console.log('   Solução: Verifique o status da conta no painel do ActiveCampaign')
        } else if (error.message.includes('403')) {
          console.log('\n🚨 DIAGNÓSTICO: PERMISSÕES INSUFICIENTES!')
          console.log('   Solução: Gere uma nova API Key com permissões completas')
        } else if (error.message.includes('404')) {
          console.log('\n🚨 DIAGNÓSTICO: URL BASE INCORRETA!')
          console.log(`   URL atual: ${account.baseUrl}`)
          console.log('   Solução: Verifique se a URL está correta (formato: https://ACCOUNT.api-us1.com)')
        }
        
        console.log('\n❌ Pulando testes seguintes (autenticação falhou)\n')
        await prisma.$disconnect()
        return
      }

      // 2. Testar API v3 - Contatos (status=1)
      console.log('\n2️⃣  Testando API v3 /contacts?status=1&limit=100...')
      let v3ContactCount = 0
      let v3DeletedCount = 0
      
      try {
        const contactsResponse = await client.get('/contacts?status=1&limit=100')
        const total = contactsResponse.meta?.total || 0
        
        // Contar deletados no batch
        const contacts = contactsResponse.contacts || []
        v3DeletedCount = contacts.filter(c => c.deleted === "1").length
        v3ContactCount = total - v3DeletedCount
        
        console.log('   ✅ API v3 funcionando')
        console.log(`   → Total (meta.total): ${total}`)
        console.log(`   → Deletados no batch (100): ${v3DeletedCount}`)
        console.log(`   → Contatos ATIVOS: ${v3ContactCount}`)
      } catch (error) {
        console.log('   ❌ Erro na API v3 /contacts')
        console.log(`   → ${error.message}`)
      }

      // 3. Testar API v1 - Account Info
      console.log('\n3️⃣  Testando API v1 account_view...')
      let v1ContactTotal = 0
      let v1ContactLimit = 0
      
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
          v1ContactTotal = parseInt(data.subscriber_total || '0', 10)
          v1ContactLimit = parseInt(data.subscriber_limit || '0', 10)
          
          console.log('   ✅ API v1 funcionando')
          console.log(`   → Subscriber Total: ${v1ContactTotal}`)
          console.log(`   → Subscriber Limit: ${v1ContactLimit}`)
        } else {
          console.log('   ❌ API v1 retornou erro')
          console.log(`   → ${data.result_message}`)
        }
      } catch (error) {
        console.log('   ❌ Erro na API v1')
        console.log(`   → ${error.message}`)
      }

      // 4. Testar ContactsAPI completo (nossa implementação)
      console.log('\n4️⃣  Testando ContactsAPI.getAccountInfo() (nossa implementação)...')
      const contactsAPI = new ContactsAPI(client)
      
      let ourContactCount = 0
      let ourContactLimit = 0
      
      try {
        const accountInfo = await contactsAPI.getAccountInfo()
        ourContactCount = accountInfo.contactCount
        ourContactLimit = accountInfo.contactLimit
        
        console.log('   ✅ getAccountInfo() funcionou')
        console.log(`   → contactCount: ${ourContactCount}`)
        console.log(`   → contactLimit: ${ourContactLimit}`)
      } catch (error) {
        console.log('   ❌ Erro em getAccountInfo()')
        console.log(`   → ${error.message}`)
      }

      // 5. Comparação e Diagnóstico Final
      console.log('\n' + '─'.repeat(80))
      console.log('📊 RESUMO COMPARATIVO')
      console.log('─'.repeat(80))
      
      console.log('\n📈 CONTAGEM DE CONTATOS:')
      console.log(`   Banco de dados:        ${account.contactCount}`)
      console.log(`   API v3 (ativos):       ${v3ContactCount}`)
      console.log(`   API v1 (total):        ${v1ContactTotal}`)
      console.log(`   Nossa implementação:   ${ourContactCount}`)
      
      console.log('\n🎯 LIMITE DE CONTATOS:')
      console.log(`   Banco de dados:        ${account.contactLimit}`)
      console.log(`   API v1:                ${v1ContactLimit}`)
      console.log(`   Nossa implementação:   ${ourContactLimit}`)
      
      console.log('\n' + '─'.repeat(80))
      console.log('💡 DIAGNÓSTICO FINAL')
      console.log('─'.repeat(80) + '\n')
      
      if (account.contactCount !== ourContactCount || account.contactLimit !== ourContactLimit) {
        console.log('⚠️  DESATUALIZADO: Banco de dados tem números diferentes da API!')
        console.log('\n✅ SOLUÇÃO: Execute um sync para atualizar:')
        console.log(`   node auto-sync.js`)
        console.log('\n   Ou sincronize apenas esta conta:')
        console.log(`   node -e "require('./src/lib/services/sync-service.ts').SyncService.syncAccount('${account.id}')"`)
      } else {
        console.log('✅ SINCRONIZADO: Banco de dados está atualizado com a API!')
      }
      
      if (account.contactCount <= 1 && ourContactCount > 1) {
        console.log('\n🚨 ERRO DETECTADO: Conta tem números incorretos no banco (valor 1)')
        console.log('   Isso indica que o último sync falhou silenciosamente.')
        console.log('   Execute um sync para corrigir.')
      }
      
      console.log()

    } catch (error) {
      console.error(`\n❌ Erro crítico ao testar conta ${account.name}:`)
      console.error(error)
      console.log()
    }

  } catch (error) {
    console.error('\n💥 ERRO:', error)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

// Parse argumentos
const accountName = process.argv[2]

if (!accountName) {
  console.error('\n❌ Erro: Nome da conta não fornecido')
  console.log('\n📖 Uso:')
  console.log('   node diagnostico-conta.js <nome-da-conta>')
  console.log('\n📝 Exemplos:')
  console.log('   node diagnostico-conta.js gactv1')
  console.log('   node diagnostico-conta.js valdir-01')
  console.log()
  process.exit(1)
}

// Executar
diagnosticarConta(accountName).catch(console.error)

