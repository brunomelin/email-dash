#!/bin/bash
# Instalação Definitiva do Cron Job

echo "════════════════════════════════════════════════════════════════════════════════"
echo "🔧 INSTALAÇÃO DEFINITIVA DO CRON JOB"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

CURRENT_USER=$(whoami)
APP_DIR="$HOME/apps/email-dash"
LOG_DIR="$HOME/logs"
WRAPPER_SCRIPT="$APP_DIR/auto-sync-wrapper.sh"

# 1. Verificar se estamos no diretório correto
echo "1️⃣  Verificando diretórios..."
if [ ! -d "$APP_DIR" ]; then
    echo "❌ Diretório não encontrado: $APP_DIR"
    exit 1
fi

cd "$APP_DIR" || exit 1
echo "✅ Diretório do projeto: $(pwd)"
echo ""

# 2. Criar diretório de logs
echo "2️⃣  Criando diretório de logs..."
mkdir -p "$LOG_DIR"
echo "✅ Diretório de logs: $LOG_DIR"
echo ""

# 3. Dar permissão de execução ao wrapper
echo "3️⃣  Configurando permissões..."
chmod +x "$WRAPPER_SCRIPT"
chmod +x "$APP_DIR/auto-sync.js"
echo "✅ Permissões configuradas"
echo ""

# 4. Testar wrapper manualmente
echo "4️⃣  Testando wrapper script..."
echo "────────────────────────────────────────────────────────────────────────────────"
bash "$WRAPPER_SCRIPT"
TEST_EXIT_CODE=$?
echo "────────────────────────────────────────────────────────────────────────────────"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Teste do wrapper bem-sucedido!"
else
    echo "❌ Teste do wrapper falhou com exit code: $TEST_EXIT_CODE"
    echo "   Verifique os erros acima antes de prosseguir."
    exit 1
fi
echo ""

# 5. Remover entradas antigas do crontab
echo "5️⃣  Configurando crontab..."
echo "────────────────────────────────────────────────────────────────────────────────"

# Backup do crontab atual
crontab -l > /tmp/crontab.backup 2>/dev/null || true
echo "✅ Backup do crontab criado em /tmp/crontab.backup"

# Remover todas as linhas relacionadas a auto-sync
crontab -l 2>/dev/null | grep -v "auto-sync" > /tmp/crontab.new || true

# Adicionar nova linha usando wrapper
echo "0 */2 * * * bash $WRAPPER_SCRIPT" >> /tmp/crontab.new

# Instalar novo crontab
crontab /tmp/crontab.new
echo "✅ Novo crontab instalado"
echo ""

# Mostrar configuração
echo "Configuração do cron:"
crontab -l | grep auto-sync
echo ""

# 6. Verificar serviço cron
echo "6️⃣  Verificando serviço cron..."
if systemctl is-active --quiet cron 2>/dev/null; then
    echo "✅ Serviço cron está ativo"
elif service cron status > /dev/null 2>&1; then
    echo "✅ Serviço cron está ativo"
else
    echo "⚠️  Tentando iniciar serviço cron..."
    sudo systemctl start cron 2>/dev/null || sudo service cron start 2>/dev/null || true
fi
echo ""

# 7. Criar script de monitoramento
MONITOR_SCRIPT="$APP_DIR/monitorar-cron.sh"
cat > "$MONITOR_SCRIPT" << 'MONITOR_EOF'
#!/bin/bash
# Script de Monitoramento do Cron

echo "════════════════════════════════════════════════════════════════════════════════"
echo "📊 MONITORAMENTO DO CRON JOB"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

echo "1️⃣  Crontab configurado:"
echo "────────────────────────────────────────────────────────────────────────────────"
crontab -l | grep auto-sync
echo ""

echo "2️⃣  Últimas 5 execuções completas:"
echo "────────────────────────────────────────────────────────────────────────────────"
grep "Finalizado em:" ~/logs/auto-sync.log 2>/dev/null | tail -5 || echo "Nenhuma execução encontrada"
echo ""

echo "3️⃣  Última execução registrada pelo sistema:"
echo "────────────────────────────────────────────────────────────────────────────────"
sudo grep "auto-sync" /var/log/syslog 2>/dev/null | tail -3 || echo "Logs não disponíveis"
echo ""

echo "4️⃣  Processos em execução:"
echo "────────────────────────────────────────────────────────────────────────────────"
ps aux | grep "auto-sync\|tsx.*auto-sync" | grep -v grep || echo "Nenhum processo rodando"
echo ""

echo "5️⃣  Status do lock file:"
echo "────────────────────────────────────────────────────────────────────────────────"
if [ -f ~/logs/auto-sync.lock ]; then
    LOCK_PID=$(cat ~/logs/auto-sync.lock)
    echo "⚠️  Lock file existe (PID: $LOCK_PID)"
    if ps -p "$LOCK_PID" > /dev/null 2>&1; then
        echo "   Processo está rodando"
    else
        echo "   ❌ Processo não existe (lock antigo - pode ser removido)"
    fi
else
    echo "✅ Nenhum lock file (nenhuma execução em andamento)"
fi
echo ""

echo "6️⃣  Próxima execução estimada:"
echo "────────────────────────────────────────────────────────────────────────────────"
CURRENT_HOUR=$(date +%H)
NEXT_HOUR=$(( (CURRENT_HOUR / 2) * 2 + 2 ))
if [ $NEXT_HOUR -ge 24 ]; then
    NEXT_HOUR=$((NEXT_HOUR - 24))
    echo "⏰ Amanhã às $(printf "%02d" $NEXT_HOUR):00"
else
    echo "⏰ Hoje às $(printf "%02d" $NEXT_HOUR):00"
fi
echo ""

echo "════════════════════════════════════════════════════════════════════════════════"
MONITOR_EOF

chmod +x "$MONITOR_SCRIPT"
echo "✅ Script de monitoramento criado: $MONITOR_SCRIPT"
echo ""

# 8. Informações finais
echo "════════════════════════════════════════════════════════════════════════════════"
echo "✅ INSTALAÇÃO CONCLUÍDA!"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "📁 Arquivos:"
echo "   - Wrapper: $WRAPPER_SCRIPT"
echo "   - Log principal: $LOG_DIR/auto-sync.log"
echo "   - Log de erros: $LOG_DIR/auto-sync-error.log"
echo "   - Monitoramento: $MONITOR_SCRIPT"
echo ""
echo "📅 Cronograma:"
echo "   - Execução: A cada 2 horas (00:00, 02:00, 04:00, ...)"
echo ""
echo "🔍 Comandos úteis:"
echo "   - Monitorar: bash $MONITOR_SCRIPT"
echo "   - Ver log: tail -f $LOG_DIR/auto-sync.log"
echo "   - Testar manual: bash $WRAPPER_SCRIPT"
echo "   - Ver erros: cat $LOG_DIR/auto-sync-error.log"
echo ""

# Calcular próxima execução
CURRENT_HOUR=$(date +%H)
CURRENT_MIN=$(date +%M)
NEXT_HOUR=$(( (CURRENT_HOUR / 2) * 2 + 2 ))
if [ $NEXT_HOUR -ge 24 ]; then
    NEXT_HOUR=$((NEXT_HOUR - 24))
    echo "⏰ Próxima execução automática: Amanhã às $(printf "%02d" $NEXT_HOUR):00"
else
    MINS_UNTIL=$((120 - CURRENT_MIN - (CURRENT_HOUR % 2) * 60))
    echo "⏰ Próxima execução automática: Hoje às $(printf "%02d" $NEXT_HOUR):00 (em ~$MINS_UNTIL minutos)"
fi
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"

