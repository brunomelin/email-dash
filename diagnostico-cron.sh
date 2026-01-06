#!/bin/bash
# Script de Diagnóstico do Cron Job
# Execute este script NO SERVIDOR para diagnosticar problemas com o auto-sync

echo "════════════════════════════════════════════════════════════════════════════════"
echo "🔍 DIAGNÓSTICO DO CRON JOB - Auto-Sync"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# 1. Verificar se cron service está rodando
echo "1️⃣  Verificando serviço cron..."
echo "────────────────────────────────────────────────────────────────────────────────"
if systemctl is-active --quiet cron 2>/dev/null || systemctl is-active --quiet crond 2>/dev/null; then
    echo "✅ Serviço cron está ATIVO"
    systemctl status cron 2>/dev/null || systemctl status crond 2>/dev/null | head -5
else
    echo "❌ Serviço cron está INATIVO ou não encontrado"
    echo "   Solução: sudo systemctl start cron"
fi
echo ""

# 2. Verificar crontab do usuário
echo "2️⃣  Verificando crontab do usuário $(whoami)..."
echo "────────────────────────────────────────────────────────────────────────────────"
if crontab -l &>/dev/null; then
    echo "Crontab configurado:"
    crontab -l | grep -v '^#' | grep -v '^$'
    
    if crontab -l | grep -q "auto-sync.js"; then
        echo ""
        echo "✅ Linha do auto-sync ENCONTRADA no crontab"
    else
        echo ""
        echo "❌ Linha do auto-sync NÃO ENCONTRADA no crontab"
        echo "   Solução: crontab -e e adicionar a linha"
    fi
else
    echo "❌ Nenhum crontab configurado para este usuário"
    echo "   Solução: crontab -e e adicionar a linha"
fi
echo ""

# 3. Verificar diretório e arquivos
echo "3️⃣  Verificando diretório do projeto..."
echo "────────────────────────────────────────────────────────────────────────────────"
if [ -d ~/apps/email-dash ]; then
    echo "✅ Diretório existe: ~/apps/email-dash"
    
    if [ -f ~/apps/email-dash/auto-sync.js ]; then
        echo "✅ Script existe: auto-sync.js"
        
        if [ -x ~/apps/email-dash/auto-sync.js ]; then
            echo "✅ Script tem permissão de execução"
        else
            echo "⚠️  Script NÃO tem permissão de execução"
            echo "   Solução: chmod +x ~/apps/email-dash/auto-sync.js"
        fi
    else
        echo "❌ Script auto-sync.js NÃO ENCONTRADO"
    fi
    
    if [ -f ~/apps/email-dash/package.json ]; then
        echo "✅ package.json existe"
    fi
else
    echo "❌ Diretório ~/apps/email-dash NÃO EXISTE"
fi
echo ""

# 4. Verificar diretório de logs
echo "4️⃣  Verificando diretório de logs..."
echo "────────────────────────────────────────────────────────────────────────────────"
if [ -d ~/logs ]; then
    echo "✅ Diretório ~/logs existe"
    
    if [ -f ~/logs/auto-sync.log ]; then
        echo "✅ Arquivo auto-sync.log existe"
        echo ""
        echo "📄 Últimas 10 linhas do log:"
        tail -10 ~/logs/auto-sync.log
    else
        echo "⚠️  Arquivo auto-sync.log NÃO EXISTE (ainda não rodou nenhuma vez)"
    fi
else
    echo "❌ Diretório ~/logs NÃO EXISTE"
    echo "   Solução: mkdir -p ~/logs"
fi
echo ""

# 5. Verificar logs do sistema (se disponível)
echo "5️⃣  Verificando logs do sistema para cron..."
echo "────────────────────────────────────────────────────────────────────────────────"
if [ -f /var/log/syslog ]; then
    echo "Últimas execuções do cron (últimas 24h):"
    grep "CRON" /var/log/syslog 2>/dev/null | grep "$(whoami)" | tail -5
elif [ -f /var/log/cron ]; then
    echo "Últimas execuções do cron:"
    tail -10 /var/log/cron | grep "$(whoami)"
else
    echo "⚠️  Logs do sistema não acessíveis (precisa sudo)"
fi
echo ""

# 6. Testar comando manualmente
echo "6️⃣  Testando comandos..."
echo "────────────────────────────────────────────────────────────────────────────────"

echo "Verificando Node.js:"
if command -v node &> /dev/null; then
    node --version
    echo "✅ Node.js instalado"
else
    echo "❌ Node.js NÃO ENCONTRADO"
fi

echo ""
echo "Verificando npx:"
if command -v npx &> /dev/null; then
    echo "✅ npx disponível"
else
    echo "❌ npx NÃO ENCONTRADO"
fi

echo ""
echo "Verificando tsx:"
if command -v tsx &> /dev/null; then
    echo "✅ tsx global instalado"
elif npx -v &> /dev/null && [ -d ~/apps/email-dash ]; then
    cd ~/apps/email-dash && npx tsx --version &> /dev/null && echo "✅ tsx disponível via npx" || echo "⚠️  tsx não encontrado"
else
    echo "⚠️  tsx não verificado"
fi
echo ""

# 7. Sugestão de teste manual
echo "════════════════════════════════════════════════════════════════════════════════"
echo "🧪 TESTE MANUAL"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Para testar manualmente, execute:"
echo ""
echo "  cd ~/apps/email-dash && npx tsx auto-sync.js"
echo ""
echo "Se der erro, você verá a mensagem de erro detalhada."
echo ""

# 8. Linha correta do crontab
echo "════════════════════════════════════════════════════════════════════════════════"
echo "📋 LINHA CORRETA PARA O CRONTAB"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Execute: crontab -e"
echo ""
echo "Adicione esta linha:"
echo ""
echo "0 */2 * * * cd /home/$(whoami)/apps/email-dash && npx tsx auto-sync.js >> /home/$(whoami)/logs/auto-sync.log 2>&1"
echo ""
echo "Isso executará a cada 2 horas (00:00, 02:00, 04:00, etc.)"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"

