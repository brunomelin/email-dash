#!/bin/bash

# 🚀 Script de Deploy Rápido - Email Dashboard
# Execute no servidor após conectar via SSH

set -e  # Para em caso de erro

echo "🚀 Deploy Email Dashboard - Iniciando..."
echo ""

# 1. Navegar para diretório (ajuste se necessário)
echo "📁 Navegando para diretório..."
cd ~/apps/email-dash || { echo "❌ Diretório não encontrado! Ajuste o caminho."; exit 1; }

# 2. Parar aplicação atual
echo "⏹️  Parando aplicação..."
pm2 stop email-dash 2>/dev/null || echo "⚠️  App não estava rodando"

# 3. Atualizar código do GitHub
echo "📥 Puxando alterações do GitHub..."
git pull origin main

# 4. Instalar dependências
echo "📦 Instalando dependências..."
npm ci

# 5. Gerar Prisma Client
echo "🔧 Gerando Prisma Client..."
npx prisma generate

# 6. Atualizar banco de dados
echo "🗄️  Atualizando schema do banco..."
npx prisma db push --accept-data-loss --skip-generate

# 7. Build da aplicação
echo "🏗️  Building aplicação..."
npm run build

# 8. Iniciar/Reiniciar aplicação
echo "▶️  Iniciando aplicação..."
pm2 restart email-dash 2>/dev/null || pm2 start npm --name "email-dash" -- start

# 9. Salvar configuração PM2
pm2 save

echo ""
echo "✅ Deploy concluído com sucesso!"
echo ""
echo "📊 Status da aplicação:"
pm2 status

echo ""
echo "📋 Últimas 20 linhas de log:"
pm2 logs email-dash --lines 20 --nostream

echo ""
echo "🌐 Testando aplicação..."
sleep 2
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Aplicação está respondendo em http://localhost:3000"
else
    echo "⚠️  Aplicação não está respondendo. Verifique os logs:"
    echo "   pm2 logs email-dash"
fi

echo ""
echo "🎉 Deploy finalizado!"

