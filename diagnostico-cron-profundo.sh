#!/bin/bash
# Diagnóstico Profundo do Cron Job
# Este script identifica EXATAMENTE por que o cron não está rodando

echo "════════════════════════════════════════════════════════════════════════════════"
echo "🔬 DIAGNÓSTICO PROFUNDO DO CRON JOB"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# 1. Identificar usuário atual
CURRENT_USER=$(whoami)
echo "1️⃣  Usuário atual: $CURRENT_USER"
echo ""

# 2. Verificar crontab do usuário atual
echo "2️⃣  Crontab do usuário $CURRENT_USER:"
echo "────────────────────────────────────────────────────────────────────────────────"
crontab -l 2>/dev/null | grep -v "^#" | grep -v "^$"
if [ $? -ne 0 ]; then
    echo "❌ NENHUM CRON CONFIGURADO para o usuário $CURRENT_USER"
fi
echo ""

# 3. Verificar crontab do root (se não for root)
if [ "$CURRENT_USER" != "root" ]; then
    echo "3️⃣  Verificando crontab do ROOT:"
    echo "────────────────────────────────────────────────────────────────────────────────"
    sudo crontab -l 2>/dev/null | grep auto-sync
    if [ $? -ne 0 ]; then
        echo "❌ Nenhum auto-sync encontrado no crontab do ROOT"
    fi
    echo ""
fi

# 4. Verificar serviço do cron
echo "4️⃣  Status do serviço cron:"
echo "────────────────────────────────────────────────────────────────────────────────"
sudo systemctl status cron --no-pager | head -10
echo ""

# 5. Verificar PATH disponível para cron
echo "5️⃣  PATH disponível no ambiente normal:"
echo "────────────────────────────────────────────────────────────────────────────────"
echo $PATH
echo ""

# 6. Verificar onde está o node e npx
echo "6️⃣  Localização dos executáveis:"
echo "────────────────────────────────────────────────────────────────────────────────"
echo "Node: $(which node)"
echo "NPM: $(which npm)"
echo "NPX: $(which npx)"
echo ""

# 7. Verificar NVM (se instalado)
echo "7️⃣  Verificando NVM:"
echo "────────────────────────────────────────────────────────────────────────────────"
if [ -f ~/.nvm/nvm.sh ]; then
    echo "✅ NVM instalado em: ~/.nvm/nvm.sh"
    source ~/.nvm/nvm.sh
    echo "Versão do Node via NVM: $(node -v)"
    echo "⚠️  CRON NÃO TEM ACESSO AO NVM automaticamente!"
else
    echo "❌ NVM não encontrado"
fi
echo ""

# 8. Verificar logs do cron
echo "8️⃣  Últimas execuções do CRON (últimas 50 linhas):"
echo "────────────────────────────────────────────────────────────────────────────────"
sudo grep -i cron /var/log/syslog 2>/dev/null | tail -50 | grep -i "auto-sync\|$(whoami)" || echo "Nenhum log encontrado"
echo ""

# 9. Verificar arquivo de log do auto-sync
echo "9️⃣  Conteúdo do log do auto-sync:"
echo "────────────────────────────────────────────────────────────────────────────────"
if [ -f ~/logs/auto-sync.log ]; then
    echo "Últimas 30 linhas:"
    tail -30 ~/logs/auto-sync.log
else
    echo "❌ Arquivo ~/logs/auto-sync.log NÃO EXISTE"
    echo "   Isso confirma que o cron NUNCA rodou com sucesso"
fi
echo ""

# 10. Teste manual com PATH limitado (simular ambiente do cron)
echo "🔟 Testando execução com PATH limitado (simular cron):"
echo "────────────────────────────────────────────────────────────────────────────────"
echo "Testando com PATH mínimo..."
(
    export PATH=/usr/bin:/bin:/usr/sbin:/sbin
    cd ~/apps/email-dash 2>/dev/null || cd /home/deploy/apps/email-dash 2>/dev/null || cd /home/root/apps/email-dash
    echo "Diretório: $(pwd)"
    echo "PATH: $PATH"
    echo "Tentando executar: npx tsx auto-sync.js"
    npx tsx auto-sync.js 2>&1 | head -20
)
echo ""

# 11. Sugestão de linha correta para o crontab
echo "════════════════════════════════════════════════════════════════════════════════"
echo "📋 LINHA CORRETA PARA O CRONTAB"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Se você usa NVM, precisa de uma linha especial:"
echo ""
echo "# Opção 1: Com NVM (se node foi instalado via NVM)"
echo "0 */2 * * * /bin/bash -c 'source ~/.nvm/nvm.sh && cd /home/$CURRENT_USER/apps/email-dash && npx tsx auto-sync.js >> /home/$CURRENT_USER/logs/auto-sync.log 2>&1'"
echo ""
echo "# Opção 2: Com PATH completo (se node está em /usr/bin ou similar)"
NODE_PATH=$(which node | sed 's|/node$||')
NPX_PATH=$(which npx | sed 's|/npx$||')
echo "0 */2 * * * PATH=$NODE_PATH:$NPX_PATH:/usr/bin:/bin cd /home/$CURRENT_USER/apps/email-dash && npx tsx auto-sync.js >> /home/$CURRENT_USER/logs/auto-sync.log 2>&1"
echo ""
echo "# Opção 3: Especificando caminho completo do node e npx"
echo "0 */2 * * * cd /home/$CURRENT_USER/apps/email-dash && $(which npx) tsx auto-sync.js >> /home/$CURRENT_USER/logs/auto-sync.log 2>&1"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"

