-- 🔍 DIAGNÓSTICO: Discrepância de Dados em Automações
-- Execute este script no PostgreSQL para identificar o problema

-- ====================================================================
-- 1. VERIFICAR SE MESSAGES ESTÃO SENDO SINCRONIZADOS
-- ====================================================================

\echo '📊 1. Messages sincronizados nos últimos 7 dias:'
SELECT 
  DATE(cm.sent_at) as data_envio,
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE c.is_automation = true) as messages_automacao,
  COUNT(*) FILTER (WHERE c.is_automation = false) as messages_campanha
FROM campaign_messages cm
JOIN campaigns c ON c.account_id = cm.account_id AND c.id = cm.campaign_id
WHERE cm.sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(cm.sent_at)
ORDER BY DATE(cm.sent_at) DESC;

\echo ''
\echo '⏱️  Último message sincronizado:'
SELECT 
  a.name as conta,
  c.name as campanha,
  c.is_automation,
  cm.sent_at,
  cm.was_opened,
  cm.was_clicked
FROM campaign_messages cm
JOIN campaigns c ON c.account_id = cm.account_id AND c.id = cm.campaign_id
JOIN accounts a ON a.id = cm.account_id
ORDER BY cm.sent_at DESC
LIMIT 5;

-- ====================================================================
-- 2. COMPARAR MÉTRICAS: Acumuladas vs Período
-- ====================================================================

\echo ''
\echo '📈 2. Comparação: Métricas Acumuladas vs Últimos 7 Dias'
\echo ''
\echo 'Campanhas de Automação (Top 10 por envios):'

SELECT 
  a.name as conta,
  c.name as campanha,
  c.send_date as data_criacao,
  c.sent as total_acumulado,
  c.unique_opens as opens_acumulado,
  
  -- Métricas dos últimos 7 dias via messages
  (
    SELECT COUNT(*)
    FROM campaign_messages cm2
    WHERE cm2.account_id = c.account_id
      AND cm2.campaign_id = c.id
      AND cm2.sent_at >= CURRENT_DATE - INTERVAL '7 days'
  ) as enviados_7dias,
  
  (
    SELECT COUNT(*)
    FROM campaign_messages cm2
    WHERE cm2.account_id = c.account_id
      AND cm2.campaign_id = c.id
      AND cm2.sent_at >= CURRENT_DATE - INTERVAL '7 days'
      AND cm2.was_opened = true
  ) as opens_7dias

FROM campaigns c
JOIN accounts a ON a.id = c.account_id
WHERE c.is_automation = true
  AND a.is_active = true
ORDER BY c.sent DESC
LIMIT 10;

-- ====================================================================
-- 3. VERIFICAR AUTOMAÇÕES SEM MESSAGES
-- ====================================================================

\echo ''
\echo '⚠️  3. Automações que TÊM campanhas MAS NÃO têm messages recentes:'

SELECT 
  a.name as conta,
  au.name as automacao,
  au.status,
  au.entered,
  
  -- Quantas campanhas associadas (heurística)
  (
    SELECT COUNT(*)
    FROM campaigns c
    WHERE c.account_id = au.account_id
      AND c.is_automation = true
      AND (
        c.name LIKE '%' || SUBSTRING(au.name FROM 2 FOR POSITION(']' IN au.name) - 2) || '%'
        OR c.name ILIKE '%' || au.name || '%'
      )
  ) as total_campanhas,
  
  -- Quantos messages nos últimos 7 dias
  (
    SELECT COUNT(*)
    FROM campaign_messages cm
    JOIN campaigns c ON c.account_id = cm.account_id AND c.id = cm.campaign_id
    WHERE c.account_id = au.account_id
      AND c.is_automation = true
      AND (
        c.name LIKE '%' || SUBSTRING(au.name FROM 2 FOR POSITION(']' IN au.name) - 2) || '%'
        OR c.name ILIKE '%' || au.name || '%'
      )
      AND cm.sent_at >= CURRENT_DATE - INTERVAL '7 days'
  ) as messages_7dias

FROM automations au
JOIN accounts a ON a.id = au.account_id
WHERE a.is_active = true
  AND au.status = 'active'
HAVING 
  -- Tem campanhas mas não tem messages
  (SELECT COUNT(*) FROM campaigns c 
   WHERE c.account_id = au.account_id 
     AND c.is_automation = true 
     AND (c.name LIKE '%' || SUBSTRING(au.name FROM 2 FOR POSITION(']' IN au.name) - 2) || '%'
          OR c.name ILIKE '%' || au.name || '%')) > 0
ORDER BY total_campanhas DESC
LIMIT 10;

-- ====================================================================
-- 4. VERIFICAR ÚLTIMO SYNC
-- ====================================================================

\echo ''
\echo '🔄 4. Últimas sincronizações:'

SELECT 
  a.name as conta,
  sj.started_at,
  sj.finished_at,
  sj.status,
  sj.campaigns_synced,
  sj.messages_synced,
  sj.is_automatic,
  EXTRACT(EPOCH FROM (sj.finished_at - sj.started_at)) as duracao_segundos
FROM sync_jobs sj
JOIN accounts a ON a.id = sj.account_id
WHERE sj.finished_at IS NOT NULL
ORDER BY sj.started_at DESC
LIMIT 5;

-- ====================================================================
-- 5. ESTATÍSTICAS GERAIS
-- ====================================================================

\echo ''
\echo '📊 5. Estatísticas Gerais:'

SELECT 
  'Total de Automações' as metrica,
  COUNT(*) as valor
FROM automations
WHERE account_id IN (SELECT id FROM accounts WHERE is_active = true)

UNION ALL

SELECT 
  'Campanhas de Automação',
  COUNT(*)
FROM campaigns
WHERE is_automation = true
  AND account_id IN (SELECT id FROM accounts WHERE is_active = true)

UNION ALL

SELECT 
  'Messages Total',
  COUNT(*)
FROM campaign_messages
WHERE account_id IN (SELECT id FROM accounts WHERE is_active = true)

UNION ALL

SELECT 
  'Messages Últimos 7 Dias',
  COUNT(*)
FROM campaign_messages
WHERE account_id IN (SELECT id FROM accounts WHERE is_active = true)
  AND sent_at >= CURRENT_DATE - INTERVAL '7 days'

UNION ALL

SELECT 
  'Messages Ontem',
  COUNT(*)
FROM campaign_messages
WHERE account_id IN (SELECT id FROM accounts WHERE is_active = true)
  AND sent_at >= CURRENT_DATE - INTERVAL '1 day'
  AND sent_at < CURRENT_DATE;

-- ====================================================================
-- 6. ANÁLISE DE SENDDATE vs MESSAGES
-- ====================================================================

\echo ''
\echo '🔍 6. Exemplo: sendDate vs Datas Reais dos Messages'
\echo '   (Mostra por que o filtro por sendDate não funciona)'

SELECT 
  c.name as campanha,
  c.send_date as data_criacao_campanha,
  c.sent as total_acumulado,
  
  MIN(cm.sent_at) as primeiro_envio_real,
  MAX(cm.sent_at) as ultimo_envio_real,
  COUNT(cm.id) as messages_sincronizados,
  
  -- Diferença em dias
  DATE_PART('day', MIN(cm.sent_at) - c.send_date) as dias_diferenca

FROM campaigns c
LEFT JOIN campaign_messages cm ON cm.account_id = c.account_id AND cm.campaign_id = c.id
WHERE c.is_automation = true
  AND c.account_id IN (SELECT id FROM accounts WHERE is_active = true)
  AND c.sent > 10  -- Apenas campanhas com envios
GROUP BY c.id, c.name, c.send_date, c.sent
ORDER BY c.sent DESC
LIMIT 5;

\echo ''
\echo '✅ Diagnóstico completo!'
\echo ''
\echo '📝 INTERPRETAÇÃO DOS RESULTADOS:'
\echo ''
\echo '1. Se "Messages Ontem" = 0:'
\echo '   → Sync de messages não está funcionando OU não houve envios ontem'
\echo ''
\echo '2. Se "messages_7dias" > 0 mas "enviados_7dias" = 0 na query 2:'
\echo '   → Problema na associação entre automações e campanhas (heurística falhou)'
\echo ''
\echo '3. Se "dias_diferenca" > 0 na query 6:'
\echo '   → Confirma que sendDate ≠ data real de envio'
\echo '   → Filtro por sendDate NÃO funciona para automações'
\echo ''
\echo '4. Se "messages_synced" = 0 nos últimos syncs:'
\echo '   → Sync de messages está pulando (verificar logs)'
\echo ''

