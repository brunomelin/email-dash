/**
 * Script para testar endpoints da API do ActiveCampaign
 * relacionados a contatos em automações
 * 
 * COMO USAR:
 * 1. Configure suas credenciais abaixo
 * 2. Execute: node test-api-contactautomations.js
 */

const https = require('https')

// ============================================
// CONFIGURAÇÃO - Preencha com suas credenciais
// ============================================
const CONFIG = {
  baseUrl: 'ACCOUNT.api-us1.com',  // Substitua ACCOUNT pela sua conta
  apiKey: 'YOUR_API_KEY_HERE',     // Sua chave da API
  automationId: '123',              // ID de uma automação para testar
  contactId: '456'                  // ID de um contato para testar
}

// ============================================
// FUNÇÃO AUXILIAR: Fazer requisição à API
// ============================================
function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CONFIG.baseUrl,
      port: 443,
      path: path,
      method: method,
      headers: {
        'Api-Token': CONFIG.apiKey,
        'Content-Type': 'application/json'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          })
        }
      })
    })

    req.on('error', (e) => {
      reject(e)
    })

    req.end()
  })
}

// ============================================
// TESTES
// ============================================
async function runTests() {
  console.log('\n🔬 =========================================')
  console.log('   TESTE DE ENDPOINTS: ContactAutomations')
  console.log('=========================================\n')

  if (CONFIG.baseUrl === 'ACCOUNT.api-us1.com' || CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
    console.log('❌ ERRO: Configure suas credenciais no script!')
    console.log('   Edite o arquivo e preencha CONFIG.baseUrl e CONFIG.apiKey')
    return
  }

  console.log(`📡 Base URL: ${CONFIG.baseUrl}`)
  console.log(`🔑 API Key: ${CONFIG.apiKey.substring(0, 10)}...`)
  console.log(`🤖 Automation ID: ${CONFIG.automationId}`)
  console.log(`👤 Contact ID: ${CONFIG.contactId}\n`)

  // ========================================
  // TESTE 1: /api/3/contacts?automation=X
  // ========================================
  console.log('─'.repeat(80))
  console.log('TEST 1: GET /api/3/contacts?automation={id}')
  console.log('─'.repeat(80))
  
  try {
    const response1 = await makeRequest(
      `/api/3/contacts?automation=${CONFIG.automationId}&limit=10`
    )
    
    console.log(`Status: ${response1.status}`)
    
    if (response1.status === 200) {
      console.log('✅ ENDPOINT EXISTE!\n')
      console.log('Estrutura de resposta:')
      console.log(JSON.stringify(response1.data, null, 2).substring(0, 500) + '...')
      
      // Verificar se retorna data de entrada
      if (response1.data.contacts && response1.data.contacts.length > 0) {
        const firstContact = response1.data.contacts[0]
        console.log('\n📊 Campos disponíveis no primeiro contato:')
        console.log(Object.keys(firstContact).join(', '))
        
        const dateFields = Object.keys(firstContact).filter(k => 
          k.includes('date') || k.includes('Date') || k.includes('entered') || k.includes('Entered')
        )
        
        if (dateFields.length > 0) {
          console.log('\n✅ Campos de data encontrados:')
          dateFields.forEach(field => {
            console.log(`   - ${field}: ${firstContact[field]}`)
          })
        } else {
          console.log('\n❌ Nenhum campo de data de entrada encontrado')
        }
      }
    } else if (response1.status === 404) {
      console.log('❌ ENDPOINT NÃO EXISTE (404)\n')
      console.log('Resposta:', response1.data)
    } else {
      console.log(`⚠️  RESPOSTA INESPERADA (${response1.status})\n`)
      console.log('Resposta:', response1.data)
    }
  } catch (error) {
    console.log('❌ ERRO NA REQUISIÇÃO:', error.message)
  }

  // ========================================
  // TESTE 2: /api/3/contactAutomations
  // ========================================
  console.log('\n' + '─'.repeat(80))
  console.log('TEST 2: GET /api/3/contactAutomations?filters[seriesid]={id}')
  console.log('─'.repeat(80))
  
  try {
    const response2 = await makeRequest(
      `/api/3/contactAutomations?filters[seriesid]=${CONFIG.automationId}&limit=10`
    )
    
    console.log(`Status: ${response2.status}`)
    
    if (response2.status === 200) {
      console.log('✅ ENDPOINT EXISTE!\n')
      console.log('Estrutura de resposta:')
      console.log(JSON.stringify(response2.data, null, 2).substring(0, 500) + '...')
      
      // Verificar campos de data
      if (response2.data.contactAutomations && response2.data.contactAutomations.length > 0) {
        const first = response2.data.contactAutomations[0]
        console.log('\n📊 Campos disponíveis:')
        console.log(Object.keys(first).join(', '))
        
        const dateFields = Object.keys(first).filter(k => 
          k.includes('date') || k.includes('Date') || k.includes('entered') || k.includes('Entered')
        )
        
        if (dateFields.length > 0) {
          console.log('\n✅ Campos de data encontrados:')
          dateFields.forEach(field => {
            console.log(`   - ${field}: ${first[field]}`)
          })
        } else {
          console.log('\n❌ Nenhum campo de data de entrada encontrado')
        }
      }
    } else if (response2.status === 404) {
      console.log('❌ ENDPOINT NÃO EXISTE (404)\n')
      console.log('Resposta:', response2.data)
    } else {
      console.log(`⚠️  RESPOSTA INESPERADA (${response2.status})\n`)
      console.log('Resposta:', response2.data)
    }
  } catch (error) {
    console.log('❌ ERRO NA REQUISIÇÃO:', error.message)
  }

  // ========================================
  // TESTE 3: /api/3/contacts/{id}/contactAutomations
  // ========================================
  console.log('\n' + '─'.repeat(80))
  console.log(`TEST 3: GET /api/3/contacts/${CONFIG.contactId}/contactAutomations`)
  console.log('─'.repeat(80))
  
  try {
    const response3 = await makeRequest(
      `/api/3/contacts/${CONFIG.contactId}/contactAutomations`
    )
    
    console.log(`Status: ${response3.status}`)
    
    if (response3.status === 200) {
      console.log('✅ ENDPOINT EXISTE!\n')
      console.log('Estrutura de resposta:')
      console.log(JSON.stringify(response3.data, null, 2).substring(0, 500) + '...')
      
      // Verificar campos de data
      if (response3.data.contactAutomations && response3.data.contactAutomations.length > 0) {
        const first = response3.data.contactAutomations[0]
        console.log('\n📊 Campos disponíveis:')
        console.log(Object.keys(first).join(', '))
        
        const dateFields = Object.keys(first).filter(k => 
          k.includes('date') || k.includes('Date') || k.includes('entered') || k.includes('Entered')
        )
        
        if (dateFields.length > 0) {
          console.log('\n✅ Campos de data encontrados:')
          dateFields.forEach(field => {
            console.log(`   - ${field}: ${first[field]}`)
          })
        } else {
          console.log('\n❌ Nenhum campo de data de entrada encontrado')
        }
      }
    } else if (response3.status === 404) {
      console.log('❌ ENDPOINT NÃO EXISTE (404)\n')
      console.log('Resposta:', response3.data)
    } else {
      console.log(`⚠️  RESPOSTA INESPERADA (${response3.status})\n`)
      console.log('Resposta:', response3.data)
    }
  } catch (error) {
    console.log('❌ ERRO NA REQUISIÇÃO:', error.message)
  }

  // ========================================
  // RESUMO
  // ========================================
  console.log('\n' + '='.repeat(80))
  console.log('📋 RESUMO DOS TESTES')
  console.log('='.repeat(80) + '\n')
  
  console.log('Copie os resultados acima e compartilhe para análise.')
  console.log('Isso ajudará a decidir se a Opção 2 é viável.\n')
}

// Executar testes
runTests().catch(console.error)

