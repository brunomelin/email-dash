#!/bin/bash
# Script para comparar a conta gactv22 entre Local e Produção

echo "════════════════════════════════════════════════════════════════════════════════"
echo "🔍 COMPARAÇÃO DA CONTA GACTV22: Local vs Produção"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# Função para executar query no banco
execute_query() {
    local env=$1
    local db_url=$2
    
    echo "📊 $env:"
    echo "────────────────────────────────────────────────────────────────────────────────"
    
    # Usar psql para executar a query
    psql "$db_url" -c "
        SELECT 
          id,
          name,
          base_url,
          SUBSTRING(api_key, 1, 10) || '...' as api_key_preview,
          LENGTH(api_key) as api_key_length,
          MD5(api_key) as api_key_hash,
          is_active,
          contact_count,
          contact_limit
        FROM accounts
        WHERE name = 'gactv22';
    "
    echo ""
}

# BANCO LOCAL
# Ajuste a DATABASE_URL conforme necessário
LOCAL_DB="postgresql://brunomelin@localhost:5432/email_dash?schema=public"

# BANCO DE PRODUÇÃO
# Obter da variável de ambiente no servidor
PROD_DB="${DATABASE_URL:-}"

if [ -z "$PROD_DB" ]; then
    echo "⚠️  Variável DATABASE_URL não definida"
    echo "   No servidor, execute: echo \$DATABASE_URL"
    echo ""
fi

# Comparar
echo "🔍 Execute este script em AMBOS os ambientes:"
echo ""
echo "1️⃣  LOCAL (Mac):"
echo "   cd ~/email-dash"
echo "   psql \"$LOCAL_DB\" -f compare-api-key-gactv22.sql"
echo ""
echo "2️⃣  PRODUÇÃO (Servidor):"
echo "   cd ~/apps/email-dash"
echo "   psql \"\$DATABASE_URL\" -f compare-api-key-gactv22.sql"
echo ""
echo "3️⃣  Compare os resultados:"
echo "   - api_key_hash deve ser IGUAL se as chaves são iguais"
echo "   - api_key_length deve ser IGUAL"
echo "   - Se diferentes, a chave de prod está incorreta"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"

