/**
 * Script para comparar as queries da página principal vs página de automações
 * 
 * Uso: node debug-comparacao-queries.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debug() {
  console.log('\n🔍 ================================')
  console.log('   DEBUG: Comparação de Queries')
  console.log('================================\n')

  const accountId = 'gactv1'
  const dateFrom = '2025-12-24'
  const dateTo = '2025-12-24'

  console.log(`📊 Conta: ${accountId}`)
  console.log(`📅 Período: ${dateFrom} até ${dateTo}\n`)

  // ============================================
  // QUERY 1: Como a PÁGINA PRINCIPAL busca
  // ============================================
  console.log('1️⃣  PÁGINA PRINCIPAL (/):\n')
  console.log('   Query: Busca TODAS as campanhas (sem filtro de sendDate)')
  
  const where1 = {
    accountId: accountId,
    // NÃO filtra por sendDate
    // NÃO filtra por isAutomation
  }
  
  const campanhasPaginaPrincipal = await prisma.campaign.findMany({
    where: where1,
    select: {
      id: true,
      name: true,
      sendDate: true,
      isAutomation: true,
      sent: true,
      uniqueOpens: true,
    },
    orderBy: { sendDate: 'desc' },
    take: 10
  })
  
  console.log(`   ✅ Encontradas: ${campanhasPaginaPrincipal.length} campanhas\n`)
  
  if (campanhasPaginaPrincipal.length > 0) {
    console.log('   Primeiras 5:')
    campanhasPaginaPrincipal.slice(0, 5).forEach((c, i) => {
      const prefixMatch = c.name.match(/^(\[[\w\s-]+\])/)
      const prefix = prefixMatch ? prefixMatch[1] : 'SEM PREFIXO'
      console.log(`     ${i + 1}. ${prefix.padEnd(15)} | ${c.sendDate ? c.sendDate.toISOString().split('T')[0] : 'null'.padEnd(10)} | isAuto: ${c.isAutomation} | Sent: ${c.sent}`)
    })
  }
  
  console.log('\n' + '─'.repeat(80) + '\n')

  // ============================================
  // QUERY 2: Como a PÁGINA DE AUTOMAÇÕES busca (ATUAL - BUGADA)
  // ============================================
  console.log('2️⃣  PÁGINA DE AUTOMAÇÕES (/automations) - QUERY ATUAL:\n')
  
  const dateFromObj = new Date(dateFrom)
  dateFromObj.setHours(0, 0, 0, 0)
  
  const dateToObj = new Date(dateTo)
  dateToObj.setHours(23, 59, 59, 999)
  
  console.log('   Query: Filtra por isAutomation + sendDate no banco')
  console.log(`   dateFrom ajustado: ${dateFromObj.toISOString()}`)
  console.log(`   dateTo ajustado: ${dateToObj.toISOString()}\n`)
  
  const where2 = {
    accountId: accountId,
    isAutomation: true,
    sendDate: {
      not: null,
      gte: dateFromObj,
      lte: dateToObj
    }
  }
  
  const campanhasPaginaAutomacoes = await prisma.campaign.findMany({
    where: where2,
    select: {
      id: true,
      name: true,
      sendDate: true,
      isAutomation: true,
      sent: true,
      uniqueOpens: true,
    },
    orderBy: { sendDate: 'desc' }
  })
  
  console.log(`   ${campanhasPaginaAutomacoes.length > 0 ? '✅' : '❌'} Encontradas: ${campanhasPaginaAutomacoes.length} campanhas\n`)
  
  if (campanhasPaginaAutomacoes.length > 0) {
    console.log('   Campanhas encontradas:')
    campanhasPaginaAutomacoes.forEach((c, i) => {
      const prefixMatch = c.name.match(/^(\[[\w\s-]+\])/)
      const prefix = prefixMatch ? prefixMatch[1] : 'SEM PREFIXO'
      console.log(`     ${i + 1}. ${prefix.padEnd(15)} | ${c.sendDate.toISOString().split('T')[0]} | Sent: ${c.sent}`)
    })
  }
  
  console.log('\n' + '─'.repeat(80) + '\n')

  // ============================================
  // ANÁLISE: Ver campanhas de automação desse dia
  // ============================================
  console.log('3️⃣  ANÁLISE: Campanhas de automação no banco (sem filtro de data):\n')
  
  const where3 = {
    accountId: accountId,
    isAutomation: true,
    sendDate: { not: null }
  }
  
  const todasAutomacoes = await prisma.campaign.findMany({
    where: where3,
    select: {
      id: true,
      name: true,
      sendDate: true,
      sent: true,
    },
    orderBy: { sendDate: 'desc' },
    take: 20
  })
  
  console.log(`   Total de campanhas de automação: ${todasAutomacoes.length}\n`)
  
  if (todasAutomacoes.length > 0) {
    console.log('   Últimas 10 datas de envio:')
    todasAutomacoes.slice(0, 10).forEach((c, i) => {
      const prefixMatch = c.name.match(/^(\[[\w\s-]+\])/)
      const prefix = prefixMatch ? prefixMatch[1] : 'SEM PREFIXO'
      console.log(`     ${i + 1}. ${c.sendDate.toISOString().padEnd(30)} | ${prefix.padEnd(15)} | ${c.name.substring(0, 40)}`)
    })
  }

  console.log('\n' + '─'.repeat(80) + '\n')

  // ============================================
  // DIAGNÓSTICO: Comparar datas
  // ============================================
  console.log('4️⃣  DIAGNÓSTICO: Por que não encontra?\n')
  
  // Verificar se alguma campanha está no período esperado
  const campanhasNoPeriodo = todasAutomacoes.filter(c => {
    const sendDate = c.sendDate
    return sendDate >= dateFromObj && sendDate <= dateToObj
  })
  
  if (campanhasNoPeriodo.length > 0) {
    console.log(`   ✅ Existem ${campanhasNoPeriodo.length} campanhas no período!`)
    console.log('   Campanhas:')
    campanhasNoPeriodo.forEach((c, i) => {
      console.log(`     ${i + 1}. ${c.name} - ${c.sendDate.toISOString()}`)
    })
    console.log('\n   ⚠️  MAS O PRISMA NÃO ESTÁ ENCONTRANDO!')
    console.log('   🐛 Possível problema de TIMEZONE ou comparação de datas\n')
  } else {
    console.log(`   ❌ Não há campanhas de automação no período ${dateFrom} até ${dateTo}`)
    console.log(`   💡 A data mais recente é: ${todasAutomacoes[0]?.sendDate.toISOString()}\n`)
  }

  console.log('✅ DEBUG CONCLUÍDO!\n')

  await prisma.$disconnect()
}

debug().catch(console.error)

