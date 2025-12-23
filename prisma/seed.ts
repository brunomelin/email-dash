import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Verificar se já existem contas
  const existingAccounts = await prisma.account.count()

  if (existingAccounts > 0) {
    console.log(`ℹ️  ${existingAccounts} conta(s) já existem no banco.`)
    console.log('💡 Seed pulado. Use o frontend para gerenciar contas.')
    return
  }

  console.log('📝 Nenhuma conta encontrada. Criando contas de exemplo...')
  console.log('⚠️  IMPORTANTE: Configure as credenciais reais via /settings/accounts')

  // Criar contas de exemplo (opcional - apenas para desenvolvimento)
  const exampleAccount = await prisma.account.create({
    data: {
      name: 'Conta de Exemplo',
      baseUrl: 'https://example.api-us1.com',
      apiKey: 'dummy-api-key-change-me',
      isActive: false, // Inativa por padrão
    },
  })

  console.log('✅ Conta de exemplo criada:', exampleAccount.name)
  console.log('')
  console.log('🚀 Próximos passos:')
  console.log('   1. Inicie o servidor: npm run dev')
  console.log('   2. Acesse: http://localhost:3000/settings/accounts')
  console.log('   3. Adicione suas contas reais do ActiveCampaign')
  console.log('')
  console.log('🎉 Seed completed!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })

