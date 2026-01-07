#!/bin/bash
# Auto-Sync Wrapper Script
# Este wrapper garante que o ambiente está correto e previne execuções simultâneas

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$HOME/logs"
LOG_FILE="$LOG_DIR/auto-sync.log"
LOCK_FILE="$LOG_DIR/auto-sync.lock"
ERROR_LOG="$LOG_DIR/auto-sync-error.log"

# Criar diretório de logs se não existir
mkdir -p "$LOG_DIR"

# Função para logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$ERROR_LOG" "$LOG_FILE"
}

# Verificar se já está rodando (lock file)
if [ -f "$LOCK_FILE" ]; then
    LOCK_PID=$(cat "$LOCK_FILE")
    # Verificar se o processo realmente existe
    if ps -p "$LOCK_PID" > /dev/null 2>&1; then
        log_error "Auto-sync já está rodando (PID: $LOCK_PID). Abortando."
        exit 1
    else
        log "Lock file encontrado mas processo não existe. Removendo lock antigo."
        rm -f "$LOCK_FILE"
    fi
fi

# Criar lock file
echo $$ > "$LOCK_FILE"

# Garantir que o lock será removido ao finalizar
cleanup() {
    rm -f "$LOCK_FILE"
    log "Lock file removido"
}
trap cleanup EXIT INT TERM

# Carregar NVM se existir
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    source "$NVM_DIR/nvm.sh"
    log "NVM carregado"
fi

# Garantir PATH completo
export PATH="$HOME/.nvm/versions/node/$(nvm current 2>/dev/null)/bin:$PATH:/usr/local/bin:/usr/bin:/bin"

# Ir para o diretório do projeto
cd "$SCRIPT_DIR" || {
    log_error "Falha ao acessar diretório: $SCRIPT_DIR"
    exit 1
}

log "====================================================================="
log "🔄 INICIANDO AUTO-SYNC via WRAPPER"
log "Diretório: $(pwd)"
log "Usuário: $(whoami)"
log "Node: $(which node)"
log "NPX: $(which npx)"
log "PID: $$"
log "====================================================================="

# Executar auto-sync
log "Executando: npx tsx auto-sync.js"
npx tsx auto-sync.js 2>&1 | tee -a "$LOG_FILE"
EXIT_CODE=${PIPESTATUS[0]}

if [ $EXIT_CODE -eq 0 ]; then
    log "✅ Auto-sync concluído com sucesso (exit code: 0)"
else
    log_error "Auto-sync falhou com exit code: $EXIT_CODE"
fi

log "====================================================================="

exit $EXIT_CODE

