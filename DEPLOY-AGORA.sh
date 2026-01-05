#!/bin/bash
# ===================================================================
# SCRIPT DE DEPLOY - Email Dashboard
# ===================================================================
# 
# Features incluídas neste deploy:
# 1. Contador de contatos com limite automático (via API)
# 2. Auto-sync (cron job a cada 2 horas)
# 3. Display do último sync no frontend
#
# IMPORTANTE: Execute este script NO SERVIDOR (via SSH)
# ===================================================================

set -e  # Parar se qualquer comando falhar

echo "================================================================================"
echo "🚀 DEPLOY - Email Dashboard"
echo "================================================================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para log
log_step() {
    echo -e "${GREEN}▶ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}✖ $1${NC}"
}

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    log_error "Erro: package.json não encontrado. Execute este script no diretório do projeto."
    exit 1
fi

log_step "1/10: Verificando diretório do projeto..."
pwd
echo ""

log_step "2/10: Fazendo backup do banco de dados..."
BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sql"
pg_dump -h localhost -U email_dash_user email_dash > ~/"$BACKUP_FILE" 2>/dev/null || log_warning "Não foi possível fazer backup (pode não ter privilégios)"
echo "Backup salvo em: ~/$BACKUP_FILE"
echo ""

log_step "3/10: Baixando código atualizado do GitHub..."
git pull origin main
echo ""

log_step "4/10: Instalando/atualizando dependências..."
npm install
echo ""

log_step "5/10: Gerando Prisma Client..."
npx prisma generate
echo ""

log_step "6/10: Aplicando migrations no banco de dados..."
echo "Migrations que serão aplicadas:"
echo "  - 20260105133518_add_contact_tracking (contador de contatos)"
echo "  - 20260105204903_add_is_automatic_to_sync_jobs (auto-sync)"
npx prisma migrate deploy
echo ""

log_step "7/10: Compilando Next.js..."
npm run build
echo ""

log_step "8/10: Reiniciando aplicação com PM2..."
pm2 restart email-dashboard
sleep 2
pm2 status email-dashboard
echo ""

log_step "9/10: Criando diretório de logs para auto-sync..."
mkdir -p ~/logs
echo "Diretório criado: ~/logs"
echo ""

log_step "10/10: Verificando logs da aplicação..."
pm2 logs email-dashboard --lines 20 --nostream
echo ""

echo "================================================================================"
echo -e "${GREEN}✅ DEPLOY CONCLUÍDO COM SUCESSO!${NC}"
echo "================================================================================"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. CONFIGURAR CRON JOB (auto-sync a cada 2 horas):"
echo "   $ crontab -e"
echo ""
echo "   Adicione esta linha:"
echo "   0 */2 * * * cd ~/apps/email-dash && npx tsx auto-sync.js >> ~/logs/auto-sync.log 2>&1"
echo ""
echo "   Salve e saia (ESC + :wq no vim, ou Ctrl+X no nano)"
echo ""
echo "2. TESTAR AUTO-SYNC MANUALMENTE (opcional):"
echo "   $ cd ~/apps/email-dash"
echo "   $ npx tsx auto-sync.js"
echo ""
echo "3. VER LOGS DO AUTO-SYNC:"
echo "   $ tail -f ~/logs/auto-sync.log"
echo ""
echo "4. VERIFICAR FRONTEND:"
echo "   Abra: https://email.suaempresa.com"
echo "   Deve exibir o contador de contatos nos badges"
echo "   Após primeira execução do cron, mostrará 'há X minutos'"
echo ""
echo "================================================================================"
echo "📚 DOCUMENTAÇÃO COMPLETA:"
echo "   - DEPLOY-CONTADOR-CONTATOS.md"
echo "   - DEPLOY-AUTO-SYNC.md"
echo "================================================================================"
echo ""

