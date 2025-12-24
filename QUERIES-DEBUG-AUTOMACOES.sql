-- 🔍 QUERIES DE DEBUG: Filtro de Automações
-- Execute essas queries no banco de dados para diagnosticar o problema

-- ================================================================
-- QUERY 1: Verificar se campanhas de automação têm sendDate
-- ================================================================
SELECT 
  account_id,
  COUNT(*) as total_campaigns,
  COUNT(send_date) as campaigns_with_date,
  COUNT(*) - COUNT(send_date) as campaigns_without_date,
  MIN(send_date) as oldest_date,
  MAX(send_date) as newest_date
FROM campaigns
WHERE is_automation = true
GROUP BY account_id
ORDER BY account_id;

-- ================================================================
-- QUERY 2: Campanhas no período específico (23/12/2025)
-- ================================================================
SELECT 
  c.account_id,
  c.name as campaign_name,
  c.send_date,
  c.sent,
  c.unique_opens,
  c.unique_clicks
FROM campaigns c
WHERE 
  c.is_automation = true
  AND c.send_date >= '2025-12-23 00:00:00'
  AND c.send_date <= '2025-12-23 23:59:59'
ORDER BY c.account_id, c.send_date DESC;

-- ================================================================
-- QUERY 3: Verificar associação Automação → Campanha
-- ================================================================
SELECT 
  a.account_id,
  a.name as automation_name,
  a.entered,
  a.status,
  COUNT(c.id) as matching_campaigns,
  STRING_AGG(c.name, ', ' ORDER BY c.send_date DESC) as campaign_names,
  MIN(c.send_date) as oldest_campaign,
  MAX(c.send_date) as newest_campaign,
  SUM(c.sent) as total_sent,
  SUM(c.unique_opens) as total_opens
FROM automations a
LEFT JOIN campaigns c ON 
  c.account_id = a.account_id AND
  c.is_automation = true AND
  (
    -- Padrão 1: Prefixo com colchetes
    (a.name SIMILAR TO '\[[\w\s-]+\]%' AND c.name ILIKE SUBSTRING(a.name FROM '^\[[\w\s-]+\]') || '%')
    OR
    -- Padrão 2: Nome completo
    c.name ILIKE '%' || a.name || '%'
  )
WHERE a.account_id IN ('gactv10', 'gactv6', 'gactv1', 'gactv2', 'gactv17')
GROUP BY a.account_id, a.name, a.entered, a.status
ORDER BY a.account_id, a.name;

-- ================================================================
-- QUERY 4: Campanhas com prefixos específicos
-- ================================================================
SELECT 
  account_id,
  name,
  send_date,
  sent,
  unique_opens,
  open_rate
FROM campaigns
WHERE 
  is_automation = true
  AND (
    name ILIKE '[SHEIN-BV]%' OR
    name ILIKE '[BR]%' OR
    name ILIKE '[CO]%' OR
    name ILIKE '[DE]%'
  )
ORDER BY 
  CASE 
    WHEN name ILIKE '[SHEIN-BV]%' THEN 1
    WHEN name ILIKE '[BR]%' THEN 2
    WHEN name ILIKE '[CO]%' THEN 3
    WHEN name ILIKE '[DE]%' THEN 4
  END,
  send_date DESC
LIMIT 100;

-- ================================================================
-- QUERY 5: Automações sem campanhas associadas
-- ================================================================
SELECT 
  a.account_id,
  a.name as automation_name,
  a.entered,
  a.status,
  COUNT(c.id) as matching_campaigns
FROM automations a
LEFT JOIN campaigns c ON 
  c.account_id = a.account_id AND
  c.is_automation = true AND
  c.name ILIKE a.name || '%'
GROUP BY a.account_id, a.name, a.entered, a.status
HAVING COUNT(c.id) = 0
ORDER BY a.account_id, a.entered DESC
LIMIT 50;

-- ================================================================
-- QUERY 6: Distribuição de datas de campanhas de automação
-- ================================================================
SELECT 
  account_id,
  DATE(send_date) as send_day,
  COUNT(*) as campaigns_sent,
  SUM(sent) as total_sent,
  SUM(unique_opens) as total_opens
FROM campaigns
WHERE 
  is_automation = true
  AND send_date IS NOT NULL
  AND send_date >= '2025-12-01'  -- Último mês
GROUP BY account_id, DATE(send_date)
ORDER BY send_day DESC, account_id;

-- ================================================================
-- QUERY 7: Verificar timezone de sendDate
-- ================================================================
SELECT 
  account_id,
  name,
  send_date,
  send_date AT TIME ZONE 'UTC' as send_date_utc,
  send_date AT TIME ZONE 'America/Sao_Paulo' as send_date_brt,
  EXTRACT(HOUR FROM send_date) as hour_raw,
  EXTRACT(TIMEZONE_HOUR FROM send_date) as timezone_offset
FROM campaigns
WHERE 
  is_automation = true
  AND send_date >= '2025-12-23 00:00:00'
  AND send_date <= '2025-12-24 00:00:00'
ORDER BY send_date DESC
LIMIT 20;

-- ================================================================
-- QUERY 8: Campanhas específicas da conta gactv17 (que funciona)
-- ================================================================
SELECT 
  c.name,
  c.send_date,
  c.sent,
  c.unique_opens,
  c.open_rate
FROM campaigns c
WHERE 
  c.account_id = 'gactv17'
  AND c.is_automation = true
  AND c.name ILIKE '[SHEIN-BV]%'
ORDER BY c.send_date DESC;

-- ================================================================
-- QUERY 9: Comparar automação que funciona vs que não funciona
-- ================================================================
-- [SHEIN-BV] - FUNCIONA
SELECT 
  'FUNCIONA' as status,
  a.name as automation_name,
  COUNT(c.id) as campaigns_found,
  COUNT(CASE WHEN c.send_date IS NOT NULL THEN 1 END) as campaigns_with_date,
  STRING_AGG(DISTINCT LEFT(c.name, 50), ' | ' ORDER BY LEFT(c.name, 50)) as sample_campaigns
FROM automations a
LEFT JOIN campaigns c ON 
  c.account_id = a.account_id AND
  c.is_automation = true AND
  c.name ILIKE '[SHEIN-BV]%'
WHERE a.name ILIKE '[SHEIN-BV]%'
GROUP BY a.name

UNION ALL

-- [BR] - NÃO FUNCIONA
SELECT 
  'NAO FUNCIONA' as status,
  a.name as automation_name,
  COUNT(c.id) as campaigns_found,
  COUNT(CASE WHEN c.send_date IS NOT NULL THEN 1 END) as campaigns_with_date,
  STRING_AGG(DISTINCT LEFT(c.name, 50), ' | ' ORDER BY LEFT(c.name, 50)) as sample_campaigns
FROM automations a
LEFT JOIN campaigns c ON 
  c.account_id = a.account_id AND
  c.is_automation = true AND
  c.name ILIKE '[BR]%'
WHERE a.name ILIKE '[BR]%'
GROUP BY a.name
LIMIT 20;

-- ================================================================
-- QUERY 10: Raw data das primeiras campanhas de cada automação
-- ================================================================
WITH campaign_samples AS (
  SELECT 
    c.account_id,
    c.name,
    c.send_date,
    c.sent,
    c.raw_payload,
    ROW_NUMBER() OVER (PARTITION BY LEFT(c.name, 10) ORDER BY c.send_date DESC) as rn
  FROM campaigns c
  WHERE c.is_automation = true
)
SELECT 
  account_id,
  name,
  send_date,
  sent,
  raw_payload::jsonb->>'sdate' as raw_sdate,
  raw_payload::jsonb->>'type' as raw_type
FROM campaign_samples
WHERE rn = 1
ORDER BY account_id, name
LIMIT 50;

