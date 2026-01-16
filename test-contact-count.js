#!/usr/bin/env node
/**
 * Script de Teste - Contagem de Contatos (v3 vs v1)
 * 
 * Testa a nova estratégia híbrida:
 * - API v3 para total de contatos
 * - API v1 para limite de contatos
 * 
 * Uso:
 * node test-contact-count.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testContactCount() {
  console.log('\n' + '='.repeat(80))
  console.log('🧪 TESTE DE CONTAGEM DE CONTATOS (v3 + v1)')
  console.log('='.repeat(80) + '\n')

  try {
    // Importar dinamicamente com tsx
    require('tsx/cjs')
    const { ActiveCampaignClient } = require('./src/lib/connectors/activecampaign/client.ts')
    const { ContactsAPI } = require('./src/lib/connectors/activecampaign/contacts.ts')

    // Buscar contas ativas
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        baseUrl: true,
        apiKey: true,
        contactCount: true,
        contactLimit: true,
      },
      take: 3, // Testar apenas 3 contas para ser rápido
    })

    if (accounts.length === 0) {
      console.log('⚠️  Nenhuma conta ativa encontrada')
      await prisma.$disconnect()
      return
    }

    console.log(`📋 Testando ${accounts.length} conta(s):\n`)

    for (const account of accounts) {
      console.log('─'.repeat(80))
      console.log(`🏢 Conta: ${account.name}`)
      console.log(`📍 URL: ${account.baseUrl}`)
      console.log('\n📊 Dados Atuais no Banco:')
      console.log(`   Total: ${account.contactCount?.toLocaleString() || 'N/A'}`)
      console.log(`   Limite: ${account.contactLimit?.toLocaleString() || 'N/A'}`)
      
      try {
        // Inicializar cliente
        const client = new ActiveCampaignClient({
          baseUrl: account.baseUrl,
          apiKey: account.apiKey,
        })
        const contactsAPI = new ContactsAPI(client)

        console.log('\n🔍 Buscando dados atualizados da API...\n')

        // Testar API v3 (total de contatos)
        console.log('1️⃣  API v3 - Total de Contatos:')
        const startV3 = Date.now()
        const totalV3 = await contactsAPI.getTotalContacts()
        const durationV3 = Date.now() - startV3
        console.log(`   ✅ Total: ${totalV3.toLocaleString()}`)
        console.log(`   ⏱️  Tempo: ${durationV3}ms\n`)

        // Testar API v1 (limite de contatos)
        console.log('2️⃣  API v1 - Limite de Contatos:')
        const startV1 = Date.now()
        const limitV1 = await contactsAPI.getContactLimit()
        const durationV1 = Date.now() - startV1
        console.log(`   ✅ Limite: ${limitV1.toLocaleString()}`)
        console.log(`   ⏱️  Tempo: ${durationV1}ms\n`)

        // Comparação
        console.log('📈 Comparação:')
        
        const diffTotal = totalV3 - (account.contactCount || 0)
        const diffTotalStr = diffTotal > 0 ? `+${diffTotal}` : `${diffTotal}`
        console.log(`   Total: ${account.contactCount?.toLocaleString() || 0} (banco) → ${totalV3.toLocaleString()} (v3) [${diffTotalStr}]`)
        
        const diffLimit = limitV1 - (account.contactLimit || 0)
        const diffLimitStr = diffLimit > 0 ? `+${diffLimit}` : `${diffLimit}`
        console.log(`   Limite: ${account.contactLimit?.toLocaleString() || 0} (banco) → ${limitV1.toLocaleString()} (v1) [${diffLimitStr}]`)
        
        if (limitV1 > 0) {
          const percentage = ((totalV3 / limitV1) * 100).toFixed(1)
          let status = '🟢'
          if (percentage >= 90) status = '🔴'
          else if (percentage >= 70) status = '🟡'
          
          console.log(`\n   ${status} Uso: ${percentage}% (${totalV3.toLocaleString()} / ${limitV1.toLocaleString()})`)
        }

        console.log('\n✅ Teste concluído com sucesso para esta conta\n')
      } catch (error) {
        console.error(`\n❌ Erro ao testar conta ${account.name}:`, error.message)
      }
    }

    console.log('='.repeat(80))
    console.log('🎉 Teste completo!')
    console.log('='.repeat(80) + '\n')

    console.log('💡 PRÓXIMOS PASSOS:')
    console.log('   1. Se os números da API v3 estão corretos, rode o sync para atualizar o banco')
    console.log('   2. Comando: npm run dev (em outro terminal) e clique em "Sync All Accounts"')
    console.log('   3. Ou rode: node auto-sync.js\n')

  } catch (error) {
    console.error('\n💥 ERRO:', error)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
testContactCount().catch(console.error)

