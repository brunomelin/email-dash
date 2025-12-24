#!/bin/bash

# 🔍 Investigação Profunda: Associação Automação → Campanha
# Dev Senior Mode: Entender POR QUE a associação não está funcionando

echo "============================================"
echo "🔍 INVESTIGAÇÃO: Associação Automação-Campanha"
echo "============================================"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DB_NAME="email_dash"
DB_USER="email_dash_user"
DB_HOST="localhost"

# Solicitar senha
echo -e "${YELLOW}🔐 Digite a senha do banco:${NC}"
read -s DB_PASSWORD
export PGPASSWORD="$DB_PASSWORD"

echo ""
echo -e "${YELLOW}📋 Testando conexão...${NC}"

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Erro na conexão!${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Conexão OK!${NC}"
echo ""

OUTPUT_FILE="/tmp/debug-associacao-$(date +%Y%m%d-%H%M%S).txt"
echo -e "${YELLOW}📄 Salvando em: $OUTPUT_FILE${NC}"
echo ""

cat > "$OUTPUT_FILE" << EOF
================================================================
🔍 INVESTIGAÇÃO PROFUNDA: Associação Automação-Campanha
================================================================
Data: $(date)
Conta em análise: gactv1
Período: 2025-12-17 a 2025-12-24
================================================================

EOF

run_query() {
  local query_name="$1"
  local query="$2"
  
  echo -e "${GREEN}▶ $query_name${NC}"
  
  echo "" >> "$OUTPUT_FILE"
  echo "================================================================" >> "$OUTPUT_FILE"
  echo "$query_name" >> "$OUTPUT_FILE"
  echo "================================================================" >> "$OUTPUT_FILE"
  
  psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "$query" >> "$OUTPUT_FILE" 2>&1
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✓ OK${NC}"
  else
    echo -e "${RED}  ✗ Erro${NC}"
  fi
}

# ================================================================
# ANÁLISE ESPECÍFICA DA CONTA gactv1
# ================================================================

run_query "1. AUTOMAÇÕES da conta gactv1" "
SELECT 
  id,
  name,
  status,
  entered,
  completed,
  active
FROM automations
WHERE account_id = 'gactv1'
ORDER BY name;
"

run_query "2. CAMPANHAS de AUTOMAÇÃO da conta gactv1" "
SELECT 
  id,
  name,
  send_date,
  sent,
  unique_opens,
  open_rate,
  is_automation
FROM campaigns
WHERE 
  account_id = 'gactv1'
  AND is_automation = true
ORDER BY send_date DESC NULLS LAST;
"

run_query "3. CAMPANHAS no período (17-24/12) da gactv1" "
SELECT 
  id,
  name,
  send_date,
  sent,
  unique_opens,
  open_rate
FROM campaigns
WHERE 
  account_id = 'gactv1'
  AND is_automation = true
  AND send_date >= '2025-12-17 00:00:00'
  AND send_date <= '2025-12-24 23:59:59'
ORDER BY send_date DESC;
"

run_query "4. TESTE DE ASSOCIAÇÃO: [CO] Email 00" "
-- Automação [CO] Email 00
-- Vamos ver quais campanhas DEVERIAM ser associadas

SELECT 
  'Automação' as tipo,
  name,
  NULL::timestamp as send_date,
  entered as numero
FROM automations
WHERE account_id = 'gactv1' AND name ILIKE '[CO]%'

UNION ALL

SELECT 
  'Campanha (prefixo)' as tipo,
  name,
  send_date,
  sent as numero
FROM campaigns
WHERE 
  account_id = 'gactv1'
  AND is_automation = true
  AND name ILIKE '[CO]%'
ORDER BY tipo, send_date DESC NULLS LAST;
"

run_query "5. TESTE DE ASSOCIAÇÃO: [SHEIN-BV] 00 - Boas Vindas" "
-- Automação [SHEIN-BV] 00 - Boas Vindas
-- Verificar padrão de nome

SELECT 
  'Automação' as tipo,
  name,
  NULL::timestamp as send_date,
  entered as numero
FROM automations
WHERE account_id = 'gactv1' AND name ILIKE '[SHEIN-BV]%'

UNION ALL

SELECT 
  'Campanha (prefixo)' as tipo,
  name,
  send_date,
  sent as numero
FROM campaigns
WHERE 
  account_id = 'gactv1'
  AND is_automation = true
  AND name ILIKE '[SHEIN-BV]%'
ORDER BY tipo, send_date DESC NULLS LAST;
"

run_query "6. TESTE DE ASSOCIAÇÃO: [SK] 00 - Eslovaquia" "
SELECT 
  'Automação' as tipo,
  name,
  NULL::timestamp as send_date,
  entered as numero
FROM automations
WHERE account_id = 'gactv1' AND name ILIKE '[SK]%'

UNION ALL

SELECT 
  'Campanha (prefixo)' as tipo,
  name,
  send_date,
  sent as numero
FROM campaigns
WHERE 
  account_id = 'gactv1'
  AND is_automation = true
  AND name ILIKE '[SK]%'
ORDER BY tipo, send_date DESC NULLS LAST;
"

run_query "7. ANÁLISE: Padrão de nomes - Automações vs Campanhas" "
-- Comparar padrão de nomenclatura
SELECT 
  'AUTOMAÇÃO' as tipo,
  name,
  SUBSTRING(name FROM '^\[[\w\s-]+\]') as prefixo_extraido,
  NULL::timestamp as data
FROM automations
WHERE account_id = 'gactv1'

UNION ALL

SELECT 
  'CAMPANHA' as tipo,
  name,
  SUBSTRING(name FROM '^\[[\w\s-]+\]') as prefixo_extraido,
  send_date as data
FROM campaigns
WHERE 
  account_id = 'gactv1'
  AND is_automation = true
ORDER BY tipo, name;
"

run_query "8. VERIFICAR: Campanhas que NÃO batem com nenhuma automação" "
-- Campanhas que não têm prefixo entre colchetes
SELECT 
  name,
  send_date,
  sent,
  CASE 
    WHEN name ~ '^\[[\w\s-]+\]' THEN 'TEM PREFIXO'
    ELSE 'SEM PREFIXO'
  END as tem_prefixo
FROM campaigns
WHERE 
  account_id = 'gactv1'
  AND is_automation = true
ORDER BY tem_prefixo, send_date DESC NULLS LAST;
"

run_query "9. ANÁLISE CRÍTICA: Por que [CO] não aparece no período?" "
-- [CO] Email 00 - V7 foi enviado em 25/11
-- Não está no período 17-24/12
-- Verificar se há OUTROS emails [CO] no período

SELECT 
  name,
  send_date,
  sent,
  unique_opens,
  CASE 
    WHEN send_date >= '2025-12-17' AND send_date <= '2025-12-24' THEN 'NO PERÍODO'
    WHEN send_date < '2025-12-17' THEN 'ANTES'
    WHEN send_date > '2025-12-24' THEN 'DEPOIS'
    ELSE 'SEM DATA'
  END as status_periodo
FROM campaigns
WHERE 
  account_id = 'gactv1'
  AND is_automation = true
  AND name ILIKE '[CO]%'
ORDER BY send_date DESC NULLS LAST;
"

run_query "10. SIMULAÇÃO: O que o código TypeScript vê" "
-- Simular exatamente o que o automation-metrics-service.ts faz

WITH automacao AS (
  SELECT 
    id,
    name,
    entered,
    SUBSTRING(name FROM '^\[[\w\s-]+\]') as prefixo
  FROM automations
  WHERE account_id = 'gactv1' AND name = '[CO] Email 00'
),
campanhas_encontradas AS (
  SELECT 
    c.name,
    c.send_date,
    c.sent,
    c.unique_opens,
    a.prefixo as automacao_prefixo
  FROM campaigns c
  CROSS JOIN automacao a
  WHERE 
    c.account_id = 'gactv1'
    AND c.is_automation = true
    AND c.name ILIKE a.prefixo || '%'
),
campanhas_no_periodo AS (
  SELECT 
    *,
    CASE 
      WHEN send_date >= '2025-12-17 00:00:00' 
       AND send_date <= '2025-12-24 23:59:59' THEN 'SIM'
      ELSE 'NÃO'
    END as esta_no_periodo
  FROM campanhas_encontradas
)
SELECT 
  name,
  send_date,
  sent,
  unique_opens,
  esta_no_periodo,
  automacao_prefixo
FROM campanhas_no_periodo
ORDER BY send_date DESC NULLS LAST;
"

run_query "11. ANÁLISE FINAL: Resumo por automação" "
-- Para cada automação, quantas campanhas tem e quantas estão no período

SELECT 
  a.name as automacao,
  a.entered,
  SUBSTRING(a.name FROM '^\[[\w\s-]+\]') as prefixo,
  COUNT(c.id) as total_campanhas,
  COUNT(CASE WHEN c.send_date >= '2025-12-17' 
                AND c.send_date <= '2025-12-24' THEN 1 END) as campanhas_no_periodo,
  SUM(CASE WHEN c.send_date >= '2025-12-17' 
           AND c.send_date <= '2025-12-24' THEN c.sent ELSE 0 END) as enviados_no_periodo
FROM automations a
LEFT JOIN campaigns c ON 
  c.account_id = a.account_id
  AND c.is_automation = true
  AND c.name ILIKE SUBSTRING(a.name FROM '^\[[\w\s-]+\]') || '%'
WHERE a.account_id = 'gactv1'
GROUP BY a.id, a.name, a.entered
ORDER BY a.name;
"

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}✓ Investigação concluída!${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo -e "${YELLOW}📄 Resultados completos em:${NC}"
echo "   $OUTPUT_FILE"
echo ""
echo -e "${YELLOW}Para visualizar:${NC}"
echo "   cat $OUTPUT_FILE"
echo ""

