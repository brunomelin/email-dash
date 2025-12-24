#!/bin/bash

# 🔍 Script de Debug: Automações
# Este script coleta dados do banco para diagnosticar o problema do filtro de data

echo "============================================"
echo "🔍 DEBUG: Filtro de Automações"
echo "============================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuração do banco
DB_NAME="email_dash"
DB_USER="email_dash_user"

echo -e "${YELLOW}📋 Coletando dados do banco de dados...${NC}"
echo ""

# Criar arquivo de output
OUTPUT_FILE="/tmp/debug-automacoes-$(date +%Y%m%d-%H%M%S).txt"
echo "Salvando resultados em: $OUTPUT_FILE"
echo ""

# Adicionar header ao arquivo
cat > "$OUTPUT_FILE" << 'EOF'
================================================================
🔍 DEBUG: Filtro de Automações - Resultados
================================================================
Data: $(date)
================================================================

EOF

# Função para executar query e adicionar ao output
run_query() {
  local query_name="$1"
  local query="$2"
  
  echo -e "${GREEN}▶ Executando: $query_name${NC}"
  
  echo "" >> "$OUTPUT_FILE"
  echo "================================================================" >> "$OUTPUT_FILE"
  echo "QUERY: $query_name" >> "$OUTPUT_FILE"
  echo "================================================================" >> "$OUTPUT_FILE"
  
  PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -c "$query" >> "$OUTPUT_FILE" 2>&1
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✓ Sucesso${NC}"
  else
    echo -e "${RED}  ✗ Erro${NC}"
  fi
  
  echo "" >> "$OUTPUT_FILE"
}

# ================================================================
# QUERIES DE DIAGNÓSTICO
# ================================================================

echo ""
echo -e "${YELLOW}📊 Iniciando coleta de dados...${NC}"
echo ""

# QUERY 1: Campanhas com/sem data
run_query "1. Campanhas com/sem sendDate" "
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
"

# QUERY 2: Campanhas no período 23/12
run_query "2. Campanhas em 23/12/2025" "
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
"

# QUERY 3: Campanhas com prefixos
run_query "3. Campanhas com prefixos [SHEIN-BV], [BR], [CO], [DE]" "
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
LIMIT 50;
"

# QUERY 4: Comparação SHEIN-BV (funciona) vs BR (não funciona)
run_query "4. Comparação: [SHEIN-BV] vs [BR]" "
SELECT 
  'FUNCIONA: [SHEIN-BV]' as status,
  COUNT(c.id) as campaigns_found,
  COUNT(CASE WHEN c.send_date IS NOT NULL THEN 1 END) as campaigns_with_date,
  COUNT(CASE WHEN c.send_date >= '2025-12-23' AND c.send_date < '2025-12-24' THEN 1 END) as campaigns_in_period,
  STRING_AGG(DISTINCT LEFT(c.name, 60), ' | ') as sample_campaigns
FROM campaigns c
WHERE 
  c.is_automation = true 
  AND c.name ILIKE '[SHEIN-BV]%'

UNION ALL

SELECT 
  'NAO FUNCIONA: [BR]' as status,
  COUNT(c.id) as campaigns_found,
  COUNT(CASE WHEN c.send_date IS NOT NULL THEN 1 END) as campaigns_with_date,
  COUNT(CASE WHEN c.send_date >= '2025-12-23' AND c.send_date < '2025-12-24' THEN 1 END) as campaigns_in_period,
  STRING_AGG(DISTINCT LEFT(c.name, 60), ' | ') as sample_campaigns
FROM campaigns c
WHERE 
  c.is_automation = true 
  AND c.name ILIKE '[BR]%';
"

# QUERY 5: Distribuição de datas (último mês)
run_query "5. Distribuição de datas (último mês)" "
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
  AND send_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY account_id, DATE(send_date)
ORDER BY send_day DESC, account_id
LIMIT 50;
"

# QUERY 6: Sample de raw_payload
run_query "6. Sample de raw_payload (primeiras 5 campanhas)" "
SELECT 
  account_id,
  name,
  send_date,
  sent,
  raw_payload::jsonb->>'sdate' as raw_sdate,
  raw_payload::jsonb->>'type' as raw_type,
  raw_payload::jsonb->>'status' as raw_status
FROM campaigns
WHERE 
  is_automation = true
  AND name ILIKE '[%]%'
ORDER BY send_date DESC NULLS LAST
LIMIT 5;
"

# ================================================================
# FINALIZAÇÃO
# ================================================================

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}✓ Coleta concluída!${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo -e "${YELLOW}📄 Arquivo gerado: $OUTPUT_FILE${NC}"
echo ""
echo -e "${YELLOW}📋 Para visualizar os resultados:${NC}"
echo "   cat $OUTPUT_FILE"
echo ""
echo -e "${YELLOW}📤 Para enviar os resultados:${NC}"
echo "   cat $OUTPUT_FILE"
echo ""

