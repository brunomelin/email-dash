/**
 * Script de Auditoria de Nomenclatura
 * 
 * Verifica quais automações seguem o padrão recomendado e quais precisam ser renomeadas.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function auditarNomenclatura() {
  console.log('🔍 Auditoria de Nomenclatura de Automações\n')
  console.log('=' .repeat(80))
  console.log('')

  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  })

  const allStats = {
    totalAutomations: 0,
    withPattern: 0,
    withEmails: 0,
    needsRename: [],
    goodExamples: [],
    accountSummary: []
  }

  for (const account of accounts) {
    console.log(`\n📊 CONTA: ${account.name}`)
    console.log('-'.repeat(80))

    const automations = await prisma.automation.findMany({
      where: { accountId: account.id },
      orderBy: { name: 'asc' }
    })

    const campaigns = await prisma.campaign.findMany({
      where: {
        accountId: account.id,
        isAutomation: true
      },
      select: { id: true, name: true, sent: true }
    })

    const stats = {
      total: automations.length,
      withPattern: 0,
      withEmails: 0,
      needsRename: []
    }

    for (const auto of automations) {
      const autoName = auto.name
      
      // Verificar se segue o padrão (começa com números)
      const hasPattern = /^\d+/.test(autoName)
      
      // Extrair código se houver
      const codeMatch = autoName.match(/^(\d+)/)
      const code = codeMatch ? codeMatch[1] : null
      
      // Contar emails associados usando a mesma lógica do dashboard
      let associatedCampaigns = []
      
      if (code) {
        // Buscar por "Email {code}"
        associatedCampaigns = campaigns.filter(c => {
          const cName = c.name.toLowerCase()
          return (
            cName.includes(autoName.toLowerCase()) ||
            cName.startsWith(`email ${code} -`) ||
            cName.includes(` email ${code} `)
          )
        })
      } else {
        // Buscar por nome completo
        associatedCampaigns = campaigns.filter(c => 
          c.name.toLowerCase().includes(autoName.toLowerCase())
        )
      }

      const emailCount = associatedCampaigns.length
      const totalSent = associatedCampaigns.reduce((sum, c) => sum + c.sent, 0)

      // Estatísticas
      if (hasPattern) stats.withPattern++
      if (emailCount > 0) stats.withEmails++

      // Símbolo de status
      let status = '❌'
      let recommendation = ''
      
      if (hasPattern && emailCount > 0) {
        status = '✅'
        allStats.goodExamples.push({ account: account.name, automation: autoName, emails: emailCount })
      } else if (hasPattern && emailCount === 0) {
        status = '⚠️'
        recommendation = `Tem código "${code}" mas nenhum email encontrado. Certifique-se que os emails começam com "Email ${code} -"`
        stats.needsRename.push({ name: autoName, reason: recommendation })
        allStats.needsRename.push({ account: account.name, automation: autoName, reason: recommendation })
      } else {
        status = '❌'
        const suggestedCode = String(automations.indexOf(auto)).padStart(2, '0')
        recommendation = `Sem padrão. Sugestão: "${suggestedCode} - ${autoName}"`
        stats.needsRename.push({ name: autoName, reason: recommendation })
        allStats.needsRename.push({ account: account.name, automation: autoName, reason: recommendation })
      }

      // Exibir linha
      console.log(`${status} ${autoName}`)
      console.log(`   Código: ${code || 'N/A'} | Emails: ${emailCount} | Enviados: ${totalSent.toLocaleString('pt-BR')}`)
      if (recommendation) {
        console.log(`   💡 ${recommendation}`)
      }
      console.log('')
    }

    // Resumo da conta
    const coverage = stats.total > 0 ? ((stats.withEmails / stats.total) * 100).toFixed(0) : 0
    console.log(`\n📈 RESUMO ${account.name}:`)
    console.log(`   Total: ${stats.total} automações`)
    console.log(`   Com padrão numérico: ${stats.withPattern} (${((stats.withPattern/stats.total)*100).toFixed(0)}%)`)
    console.log(`   Com emails associados: ${stats.withEmails} (${coverage}%)`)
    console.log(`   Precisam renomear: ${stats.needsRename.length}`)

    allStats.totalAutomations += stats.total
    allStats.withPattern += stats.withPattern
    allStats.withEmails += stats.withEmails
    allStats.accountSummary.push({
      name: account.name,
      total: stats.total,
      withPattern: stats.withPattern,
      withEmails: stats.withEmails,
      coverage: coverage
    })
  }

  // Resumo geral
  console.log('\n')
  console.log('=' .repeat(80))
  console.log('📊 RESUMO GERAL - TODAS AS CONTAS')
  console.log('=' .repeat(80))
  console.log('')
  console.log(`Total de automações: ${allStats.totalAutomations}`)
  console.log(`Com padrão numérico: ${allStats.withPattern} (${((allStats.withPattern/allStats.totalAutomations)*100).toFixed(0)}%)`)
  console.log(`Com emails associados: ${allStats.withEmails} (${((allStats.withEmails/allStats.totalAutomations)*100).toFixed(0)}%)`)
  console.log(`Precisam atenção: ${allStats.needsRename.length}`)
  console.log('')

  // Top contas com melhor cobertura
  console.log('🏆 TOP 5 - Melhor Cobertura:')
  allStats.accountSummary
    .sort((a, b) => parseFloat(b.coverage) - parseFloat(a.coverage))
    .slice(0, 5)
    .forEach((acc, idx) => {
      console.log(`   ${idx + 1}. ${acc.name}: ${acc.coverage}% (${acc.withEmails}/${acc.total})`)
    })
  console.log('')

  // Contas que precisam atenção
  const needsAttention = allStats.accountSummary.filter(acc => parseFloat(acc.coverage) < 80)
  if (needsAttention.length > 0) {
    console.log('⚠️  CONTAS QUE PRECISAM ATENÇÃO (<80% cobertura):')
    needsAttention.forEach(acc => {
      console.log(`   - ${acc.name}: ${acc.coverage}% (${acc.withEmails}/${acc.total})`)
    })
    console.log('')
  }

  // Exemplos de boas práticas
  if (allStats.goodExamples.length > 0) {
    console.log('✅ EXEMPLOS DE BOM USO:')
    allStats.goodExamples.slice(0, 5).forEach(ex => {
      console.log(`   ✅ ${ex.account} → "${ex.automation}" (${ex.emails} emails)`)
    })
    console.log('')
  }

  // Lista de ações necessárias
  if (allStats.needsRename.length > 0) {
    console.log('📋 AÇÕES NECESSÁRIAS:')
    console.log('')
    
    // Agrupar por conta
    const byAccount = {}
    allStats.needsRename.forEach(item => {
      if (!byAccount[item.account]) byAccount[item.account] = []
      byAccount[item.account].push(item)
    })

    Object.entries(byAccount).forEach(([accountName, items]) => {
      console.log(`   ${accountName}:`)
      items.forEach(item => {
        console.log(`      ❌ "${item.automation}"`)
        console.log(`         ${item.reason}`)
      })
      console.log('')
    })
  }

  // Conclusão
  console.log('=' .repeat(80))
  console.log('✨ CONCLUSÃO')
  console.log('=' .repeat(80))
  console.log('')
  
  const overallCoverage = ((allStats.withEmails / allStats.totalAutomations) * 100).toFixed(0)
  
  if (overallCoverage >= 90) {
    console.log('🎉 EXCELENTE! Você tem uma cobertura de ' + overallCoverage + '%')
    console.log('   Continue mantendo o padrão de nomenclatura!')
  } else if (overallCoverage >= 70) {
    console.log('👍 BOM! Você tem uma cobertura de ' + overallCoverage + '%')
    console.log('   Renomeie as ' + allStats.needsRename.length + ' automações restantes para chegar a 100%')
  } else {
    console.log('⚠️  ATENÇÃO! Você tem apenas ' + overallCoverage + '% de cobertura')
    console.log('   Recomendamos fortemente padronizar a nomenclatura')
    console.log('   Consulte: GUIA-NOMENCLATURA-AUTOMACOES.md')
  }
  console.log('')
  console.log('📖 Guia completo: GUIA-NOMENCLATURA-AUTOMACOES.md')
  console.log('📋 Referência rápida: QUICK-REFERENCE-NOMENCLATURA.md')
  console.log('')

  await prisma.$disconnect()
}

auditarNomenclatura().catch(console.error)

