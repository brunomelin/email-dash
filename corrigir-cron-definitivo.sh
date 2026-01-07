#!/bin/bash
# Correção Definitiva do Cron Job
# Este script configura o cron corretamente independente do ambiente

echo "════════════════════════════════════════════════════════════════════════════════"
echo "🔧 CORREÇÃO DEFINITIVA DO CRON JOB"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

CURRENT_USER=$(whoami)
APP_DIR="/home/$CURRENT_USER/apps/email-dash"
LOG_DIR="/home/$CURRENT_USER/logs"
LOG_FILE="$LOG_DIR/auto-sync.log"

# 1. Criar diretórios necessários
echo "1️⃣  Criando diretórios necessários..."
mkdir -p "$LOG_DIR"
mkdir -p "$APP_DIR"
echo "✅ Diretórios criados"
echo ""

# 2. Detectar onde está o Node/NPX
echo "2️⃣  Detectando instalação do Node.js..."
NODE_BIN=$(which node)
NPX_BIN=$(which npx)
NODE_DIR=$(dirname "$NODE_BIN")

echo "Node: $NODE_BIN"
echo "NPX: $NPX_BIN"
echo "Diretório: $NODE_DIR"
echo ""

# 3. Verificar se usa NVM
echo "3️⃣  Verificando NVM..."
if [ -f ~/.nvm/nvm.sh ]; then
    echo "✅ NVM detectado"
    USE_NVM=true
else
    echo "❌ NVM não detectado - usando node do sistema"
    USE_NVM=false
fi
echo ""

# 4. Criar wrapper script que sempre funcionará
echo "4️⃣  Criando wrapper script..."
WRAPPER_SCRIPT="$APP_DIR/auto-sync-wrapper.sh"

cat > "$WRAPPER_SCRIPT" << 'WRAPPER_EOF'
#!/bin/bash
# Wrapper para garantir que o ambiente está correto antes de executar auto-sync

# Se NVM existe, carrega ele
if [ -f ~/.nvm/nvm.sh ]; then
    export NVM_DIR="$HOME/.nvm"
    source "$NVM_DIR/nvm.sh"
fi

# Define PATH completo
export PATH="$HOME/.nvm/versions/node/$(nvm current)/bin:$PATH:/usr/local/bin:/usr/bin:/bin"

# Vai para o diretório do projeto
cd "$(dirname "$0")"

# Executa o auto-sync
npx tsx auto-sync.js
WRAPPER_EOF

chmod +x "$WRAPPER_SCRIPT"
echo "✅ Wrapper criado: $WRAPPER_SCRIPT"
echo ""

# 5. Testar wrapper
echo "5️⃣  Testando wrapper script..."
echo "────────────────────────────────────────────────────────────────────────────────"
cd "$APP_DIR"
bash "$WRAPPER_SCRIPT" 2>&1 | head -50
echo "────────────────────────────────────────────────────────────────────────────────"
echo ""

# 6. Configurar crontab
echo "6️⃣  Configurando crontab..."
echo "────────────────────────────────────────────────────────────────────────────────"

# Remove linhas antigas do auto-sync
crontab -l 2>/dev/null | grep -v "auto-sync" > /tmp/crontab.tmp

# Adiciona nova linha usando wrapper
echo "0 */2 * * * bash $WRAPPER_SCRIPT >> $LOG_FILE 2>&1" >> /tmp/crontab.tmp

# Instala novo crontab
crontab /tmp/crontab.tmp
rm /tmp/crontab.tmp

echo "✅ Crontab configurado"
echo ""
echo "Configuração atual:"
crontab -l | grep auto-sync
echo ""

# 7. Verificar serviço cron
echo "7️⃣  Verificando serviço cron..."
if sudo systemctl is-active --quiet cron; then
    echo "✅ Serviço cron está ativo"
else
    echo "⚠️  Serviço cron não está ativo, tentando iniciar..."
    sudo systemctl start cron
    sudo systemctl enable cron
fi
echo ""

# 8. Forçar execução imediata
echo "8️⃣  Executando sincronização AGORA..."
echo "────────────────────────────────────────────────────────────────────────────────"
cd "$APP_DIR"
bash "$WRAPPER_SCRIPT" >> "$LOG_FILE" 2>&1 &
SYNC_PID=$!
echo "✅ Sincronização iniciada em background (PID: $SYNC_PID)"
echo ""
echo "Aguardando 10 segundos para verificar log..."
sleep 10

if [ -f "$LOG_FILE" ]; then
    echo ""
    echo "Últimas linhas do log:"
    tail -20 "$LOG_FILE"
else
    echo "⚠️  Log ainda não foi criado"
fi
echo "────────────────────────────────────────────────────────────────────────────────"
echo ""

# 9. Informações finais
echo "════════════════════════════════════════════════════════════════════════════════"
echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "📁 Arquivos criados:"
echo "   - Wrapper: $WRAPPER_SCRIPT"
echo "   - Log: $LOG_FILE"
echo ""
echo "📅 Cronograma:"
echo "   - Execução: A cada 2 horas (00:00, 02:00, 04:00, ...)"
echo ""
echo "🔍 Monitoramento:"
echo "   tail -f $LOG_FILE"
echo ""
echo "🧪 Testar manualmente:"
echo "   bash $WRAPPER_SCRIPT"
echo ""

# Calcular próxima execução
CURRENT_HOUR=$(date +%H)
NEXT_HOUR=$(( (CURRENT_HOUR / 2) * 2 + 2 ))
if [ $NEXT_HOUR -ge 24 ]; then
    NEXT_HOUR=$((NEXT_HOUR - 24))
    echo "⏰ Próxima execução automática: Amanhã às $(printf "%02d" $NEXT_HOUR):00"
else
    echo "⏰ Próxima execução automática: Hoje às $(printf "%02d" $NEXT_HOUR):00"
fi
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"

