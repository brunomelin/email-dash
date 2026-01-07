#!/bin/bash
# Script de Correção Imediata do Cron
# Execute este script NO SERVIDOR para corrigir o cron job

echo "════════════════════════════════════════════════════════════════════════════════"
echo "🔧 CORRIGINDO CRON JOB - Auto-Sync"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# 1. Dar permissão de execução ao script
echo "1️⃣  Dando permissão de execução ao auto-sync.js..."
chmod +x ~/apps/email-dash/auto-sync.js
if [ -x ~/apps/email-dash/auto-sync.js ]; then
    echo "✅ Permissão concedida"
else
    echo "❌ Falha ao dar permissão"
fi
echo ""

# 2. Garantir que diretório de logs existe
echo "2️⃣  Verificando diretório de logs..."
mkdir -p ~/logs
echo "✅ Diretório ~/logs criado/verificado"
echo ""

# 3. Testar execução manual
echo "3️⃣  Testando execução manual do auto-sync..."
echo "────────────────────────────────────────────────────────────────────────────────"
cd ~/apps/email-dash
npx tsx auto-sync.js 2>&1 | head -50
echo ""
echo "────────────────────────────────────────────────────────────────────────────────"
echo ""

# 4. Verificar se o log foi criado
if [ -f ~/logs/auto-sync.log ]; then
    echo "✅ Arquivo de log foi criado com sucesso!"
    echo ""
    echo "Últimas linhas do log:"
    tail -10 ~/logs/auto-sync.log
else
    echo "⚠️  Arquivo de log não foi criado (verifique erros acima)"
fi
echo ""

# 5. Reconfigurar crontab (garantir que está correto)
echo "4️⃣  Reconfigurando crontab..."
echo "────────────────────────────────────────────────────────────────────────────────"

# Remover linhas antigas do auto-sync e adicionar nova
(crontab -l 2>/dev/null | grep -v "auto-sync.js"; echo "0 */2 * * * cd /home/$(whoami)/apps/email-dash && npx tsx auto-sync.js >> /home/$(whoami)/logs/auto-sync.log 2>&1") | crontab -

echo "✅ Crontab reconfigurado"
echo ""
echo "Configuração atual:"
crontab -l | grep auto-sync
echo ""

# 6. Informações finais
echo "════════════════════════════════════════════════════════════════════════════════"
echo "✅ CORREÇÃO CONCLUÍDA!"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "📅 Próxima execução automática:"
echo "   - Horários: 00:00, 02:00, 04:00, 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00"
echo ""
CURRENT_HOUR=$(date +%H)
NEXT_HOUR=$(( (CURRENT_HOUR / 2) * 2 + 2 ))
if [ $NEXT_HOUR -ge 24 ]; then
    NEXT_HOUR=$((NEXT_HOUR - 24))
    echo "   - Próxima: Amanhã às $(printf "%02d" $NEXT_HOUR):00"
else
    echo "   - Próxima: Hoje às $(printf "%02d" $NEXT_HOUR):00"
fi
echo ""
echo "🔍 Para monitorar:"
echo "   tail -f ~/logs/auto-sync.log"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"


