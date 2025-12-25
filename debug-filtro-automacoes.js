/**
 * Script de debug para testar o filtro de data das automações
 * 
 * Como usar:
 * node debug-filtro-automacoes.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debugFiltro() {
  console.log('\n🔍 ================================')
  console.log('   DEBUG: Filtro de Automações')
  console.log('================================\n')

  // Simular filtro de data (ajuste conforme necessário)
  const dateFrom = '2025-12-23'
  const dateTo = '2025-12-24'
  
  console.log(`📅 Período: ${dateFrom} até ${dateTo}\n`)

  // 1. Converter para Date (como faz a página)
  const filters = {
    dateFrom: new Date(dateFrom),
    dateTo: new Date(dateTo)
  }

  console.log('1️⃣  DATAS CONVERTIDAS:')
  console.log('   dateFrom:', filters.dateFrom.toISOString())
  console.log('   dateTo:', filters.dateTo.toISOString())
  console.log('')

  // 2. Montar query como faz o service
  const campaignsWhere = {
    isAutomation: true,
    sendDate: { not: null }
  }

  if (filters.dateFrom || filters.dateTo) {
    const dateFilters = { not: null }
    
    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom)
      dateFrom.setHours(0, 0, 0, 0)
      dateFilters.gte = dateFrom
    }
    
    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo)
      dateTo.setHours(23, 59, 59, 999)
      dateFilters.lte = dateTo
    }
    
    campaignsWhere.sendDate = dateFilters
  }

  console.log('2️⃣  QUERY MONTADA:')
  console.log(JSON.stringify(campaignsWhere, null, 2))
  console.log('')

  // 3. Buscar campanhas
  console.log('3️⃣  BUSCANDO CAMPANHAS...\n')
  
  const campaigns = await prisma.campaign.findMany({
    where: campaignsWhere,
    select: {
      id: true,
      accountId: true,
      name: true,
      sendDate: true,
      sent: true,
      uniqueOpens: true,
      uniqueClicks: true,
    },
    orderBy: {
      sendDate: 'desc'
    },
    take: 10
  })

  console.log(`   Encontradas: ${campaigns.length} campanhas\n`)

  if (campaigns.length > 0) {
    console.log('📊 PRIMEIRAS 10 CAMPANHAS:')
    console.log('─'.repeat(80))
    campaigns.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name.substring(0, 40).padEnd(40)} | ${c.sendDate ? c.sendDate.toISOString().split('T')[0] : 'null'} | Sent: ${c.sent}`)
    })
  } else {
    console.log('⚠️  NENHUMA CAMPANHA ENCONTRADA!')
    console.log('')
    console.log('💡 Possíveis causas:')
    console.log('   1. Não há campanhas nesse período')
    console.log('   2. Problema de timezone')
    console.log('   3. Dados não sincronizados')
  }

  console.log('')
  console.log('─'.repeat(80))

  // 4. Verificar se há campanhas sem filtro
  console.log('\n4️⃣  COMPARAÇÃO - Campanhas SEM filtro de data:')
  
  const allCampaigns = await prisma.campaign.findMany({
    where: {
      isAutomation: true,
      sendDate: { not: null }
    },
    select: {
      sendDate: true
    },
    orderBy: {
      sendDate: 'desc'
    },
    take: 5
  })

  if (allCampaigns.length > 0) {
    console.log(`   Total: ${allCampaigns.length} campanhas`)
    console.log('   Últimas 5 datas:')
    allCampaigns.forEach((c, i) => {
      console.log(`     ${i + 1}. ${c.sendDate.toISOString()}`)
    })
  }

  console.log('\n✅ DEBUG CONCLUÍDO!\n')

  await prisma.$disconnect()
}

debugFiltro().catch(console.error)

