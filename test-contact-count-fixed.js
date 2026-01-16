#!/usr/bin/env node
/**
 * Script de Teste - Contagem CORRIGIDA de Contatos
 * 
 * Testa a nova implementação que:
 * - Filtra apenas contatos ATIVOS (status=1)
 * - Remove contatos DELETADOS (deleted="1")
 * 
 * Uso:
 * node test-contact-count-fixed.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testContactCountFixed() {
  console.log('\n' + '='.repeat(80))
  console.log('🧪 TESTE DE CONTAGEM CORRIGIDA (status=1 + sem deletados)')
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
      take: 3, // Testar apenas 3 contas
    })

    if (accounts.length === 0) {
      console.log('⚠️  Nenhuma conta ativa encontrada')
      await prisma.$disconnect()
      return
    }

    console.log(`📋 Testando ${accounts.length} conta(s) com a nova lógica:\n`)

    for (const account of accounts) {
      console.log('─'.repeat(80))
      console.log(`🏢 Conta: ${account.name}`)
      console.log(`📍 URL: ${account.baseUrl}`)
      
      console.log('\n📊 Dados Atuais no Banco:')
      console.log(`   Total: ${account.contactCount?.toLocaleString() || 'N/A'}`)
      console.log(`   Limite: ${account.contactLimit?.toLocaleString() || 'N/A'}`)
      
      if (account.contactCount && account.contactLimit) {
        const percentOld = ((account.contactCount / account.contactLimit) * 100).toFixed(1)
        let statusOld = '🟢'
        if (percentOld >= 90) statusOld = '🔴'
        else if (percentOld >= 70) statusOld = '🟡'
        console.log(`   ${statusOld} Uso atual: ${percentOld}%`)
      }
      
      try {
        // Inicializar cliente
        const client = new ActiveCampaignClient({
          baseUrl: account.baseUrl,
          apiKey: account.apiKey,
        })
        const contactsAPI = new ContactsAPI(client)

        console.log('\n🔍 Buscando com a NOVA lógica (status=1 + sem deletados)...\n')

        const startTime = Date.now()
        const activeContacts = await contactsAPI.getTotalContacts()
        const duration = Date.now() - startTime

        console.log(`   ✅ Contatos ATIVOS: ${activeContacts.toLocaleString()}`)
        console.log(`   ⏱️  Tempo: ${duration}ms`)

        // Comparação
        console.log('\n📈 COMPARAÇÃO:')
        
        const diff = activeContacts - (account.contactCount || 0)
        const diffStr = diff > 0 ? `+${diff}` : `${diff}`
        const diffColor = diff < 0 ? '🟢' : '🔴'
        
        console.log(`   ${diffColor} Banco: ${account.contactCount?.toLocaleString() || 0} → API: ${activeContacts.toLocaleString()} [${diffStr}]`)
        
        if (account.contactLimit) {
          const percentNew = ((activeContacts / account.contactLimit) * 100).toFixed(1)
          let statusNew = '🟢'
          if (percentNew >= 90) statusNew = '🔴'
          else if (percentNew >= 70) statusNew = '🟡'
          
          console.log(`\n   ${statusNew} Uso REAL: ${percentNew}% (${activeContacts.toLocaleString()} / ${account.contactLimit.toLocaleString()})`)
          
          if (account.contactCount && account.contactLimit) {
            const percentOld = ((account.contactCount / account.contactLimit) * 100).toFixed(1)
            const diffPercent = (percentNew - percentOld).toFixed(1)
            console.log(`   📉 Diferença: ${diffPercent}% (era ${percentOld}%, agora ${percentNew}%)`)
          }
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
    console.log('   1. Os números agora devem corresponder ao painel do ActiveCampaign ✅')
    console.log('   2. Rode o sync para atualizar o banco: node auto-sync.js')
    console.log('   3. Ou clique em "Sync All Accounts" no dashboard\n')

  } catch (error) {
    console.error('\n💥 ERRO:', error)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
testContactCountFixed().catch(console.error)

