#!/bin/bash

# 🔍 Script de Debug SIMPLIFICADO: Automações
# Este script solicita a senha e executa as queries

echo "============================================"
echo "🔍 DEBUG: Filtro de Automações (Simples)"
echo "============================================"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuração do banco
DB_NAME="email_dash"
DB_USER="email_dash_user"
DB_HOST="localhost"

# Solicitar senha
echo -e "${YELLOW}🔐 Digite a senha do banco de dados:${NC}"
read -s DB_PASSWORD
export PGPASSWORD="$DB_PASSWORD"

echo ""
echo -e "${YELLOW}📋 Testando conexão...${NC}"

# Testar conexão
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Erro na conexão! Verifique a senha.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Conexão OK!${NC}"
echo ""

# Criar arquivo de output
OUTPUT_FILE="/tmp/debug-automacoes-$(date +%Y%m%d-%H%M%S).txt"
echo -e "${YELLOW}📄 Salvando em: $OUTPUT_FILE${NC}"
echo ""

# Header
cat > "$OUTPUT_FILE" << EOF
================================================================
🔍 DEBUG: Filtro de Automações - Resultados
================================================================
Data: $(date)
================================================================

EOF

# Função para executar query
run_query() {
  local query_name="$1"
  local query="$2"
  
  echo -e "${GREEN}▶ $query_name${NC}"
  
  echo "" >> "$OUTPUT_FILE"
  echo "================================================================" >> "$OUTPUT_FILE"
  echo "QUERY: $query_name" >> "$OUTPUT_FILE"
  echo "================================================================" >> "$OUTPUT_FILE"
  
  psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "$query" >> "$OUTPUT_FILE" 2>&1
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✓ OK${NC}"
  else
    echo -e "${RED}  ✗ Erro${NC}"
  fi
}

# ================================================================
# QUERIES
# ================================================================

run_query "1. Campanhas com/sem sendDate" "
SELECT 
  account_id,
  COUNT(*) as total_campaigns,
  COUNT(send_date) as with_date,
  COUNT(*) - COUNT(send_date) as without_date
FROM campaigns
WHERE is_automation = true
GROUP BY account_id
ORDER BY account_id;
"

run_query "2. Campanhas em 23/12/2025" "
SELECT 
  account_id,
  name,
  send_date,
  sent,
  unique_opens
FROM campaigns
WHERE 
  is_automation = true
  AND send_date >= '2025-12-23 00:00:00'
  AND send_date <= '2025-12-23 23:59:59'
ORDER BY account_id, send_date DESC
LIMIT 20;
"

run_query "3. Campanhas com prefixos" "
SELECT 
  account_id,
  LEFT(name, 40) as campaign_name,
  send_date,
  sent
FROM campaigns
WHERE 
  is_automation = true
  AND name ~ '^\[(SHEIN-BV|BR|CO|DE)\]'
ORDER BY send_date DESC
LIMIT 30;
"

run_query "4. Comparação [SHEIN-BV] vs [BR]" "
SELECT 
  CASE 
    WHEN name ~ '^\[SHEIN-BV\]' THEN 'SHEIN-BV (funciona)'
    WHEN name ~ '^\[BR\]' THEN 'BR (não funciona)'
  END as tipo,
  COUNT(*) as total_campanhas,
  COUNT(send_date) as com_data,
  COUNT(CASE WHEN send_date >= '2025-12-23' AND send_date < '2025-12-24' THEN 1 END) as no_periodo
FROM campaigns
WHERE 
  is_automation = true
  AND (name ~ '^\[SHEIN-BV\]' OR name ~ '^\[BR\]')
GROUP BY tipo;
"

run_query "5. Últimas 30 campanhas com data" "
SELECT 
  account_id,
  LEFT(name, 50) as name,
  send_date,
  sent,
  unique_opens
FROM campaigns
WHERE 
  is_automation = true
  AND send_date IS NOT NULL
ORDER BY send_date DESC
LIMIT 30;
"

run_query "6. Sample de dados brutos" "
SELECT 
  account_id,
  LEFT(name, 40) as name,
  send_date,
  raw_payload::jsonb->>'sdate' as raw_sdate
FROM campaigns
WHERE 
  is_automation = true
ORDER BY created_at DESC
LIMIT 10;
"

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}✓ Coleta concluída!${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo -e "${YELLOW}📄 Resultados salvos em:${NC}"
echo "   $OUTPUT_FILE"
echo ""
echo -e "${YELLOW}📋 Para ver os resultados:${NC}"
echo "   cat $OUTPUT_FILE"
echo ""

