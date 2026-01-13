import { NextRequest, NextResponse } from 'next/server'
import { AutomationMetricsService } from '@/lib/services/automation-metrics-service'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos timeout

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!process.env.CRON_SECRET) {
      console.error('❌ [CACHE WARMING] CRON_SECRET não configurado!')
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      )
    }
    
    if (authHeader !== expectedAuth) {
      console.warn('⚠️  [CACHE WARMING] Tentativa de acesso não autorizado')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔥 [CACHE WARMING] Iniciando cache warming...')
    const startTime = Date.now()

    // 1. Buscar todas as contas ativas
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    })

    if (accounts.length === 0) {
      console.log('⚠️  [CACHE WARMING] Nenhuma conta ativa encontrada')
      return NextResponse.json({
        success: true,
        message: 'No active accounts to warm cache'
      })
    }

    console.log(`📊 [CACHE WARMING] Encontradas ${accounts.length} contas ativas`)

    const service = new AutomationMetricsService()
    const accountIds = accounts.map(a => a.id)
    
    // 2. Warm cache SEM filtro de data (mais comum - 80% dos acessos)
    console.log('🔥 [CACHE WARMING] Preenchendo cache geral (sem filtro)...')
    const generalStart = Date.now()
    await service.getAutomationsWithMetricsV2({
      accountIds
    })
    console.log(`✅ [CACHE WARMING] Cache geral: ${Date.now() - generalStart}ms`)

    // 3. Warm cache para YESTERDAY (mais comum - 15% dos acessos)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    
    console.log('🔥 [CACHE WARMING] Preenchendo cache de ontem...')
    const yesterdayStart = Date.now()
    await service.getAutomationsWithMetricsV2({
      accountIds,
      dateFrom: yesterday,
      dateTo: yesterday
    })
    console.log(`✅ [CACHE WARMING] Cache ontem: ${Date.now() - yesterdayStart}ms`)

    // 4. (Opcional) Warm para Last 7 days - descomente se necessário
    // const last7Days = new Date(today)
    // last7Days.setDate(last7Days.getDate() - 7)
    // await service.getAutomationsWithMetricsV2({
    //   accountIds,
    //   dateFrom: last7Days,
    //   dateTo: today
    // })

    const totalDuration = Date.now() - startTime
    console.log(`✅ [CACHE WARMING] Concluído em ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}s)`)

    return NextResponse.json({
      success: true,
      duration: totalDuration,
      durationSeconds: (totalDuration / 1000).toFixed(1),
      accounts: accounts.length,
      message: `Cache warming completed successfully`
    })
  } catch (error: any) {
    console.error('❌ [CACHE WARMING] Erro:', error)
    return NextResponse.json(
      {
        error: 'Cache warming failed',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// Permitir POST também (para facilitar testes)
export async function POST(request: NextRequest) {
  return GET(request)
}

