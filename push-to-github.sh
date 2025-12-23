#!/bin/bash

# 🚀 Script de Push para GitHub - Automatizado
# Executa todas as verificações de segurança antes de fazer push

echo "🚀 Preparando para subir projeto para GitHub..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Diretório correto${NC}"

# 2. Verificar .gitignore
echo ""
echo "🔍 Verificando .gitignore..."
if [ ! -f ".gitignore" ]; then
    echo -e "${RED}❌ .gitignore não encontrado!${NC}"
    exit 1
fi

if ! grep -q "node_modules" .gitignore || ! grep -q ".env" .gitignore; then
    echo -e "${RED}❌ .gitignore incompleto! Adicione node_modules e .env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ .gitignore ok${NC}"

# 3. Buscar possíveis senhas ou chaves de API
echo ""
echo "🔐 Buscando possíveis senhas nos arquivos..."
FOUND_SECRETS=0

# Buscar padrões suspeitos
if grep -r "8R\$B8)oxBfeP5wD" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git --exclude="*.sh" 2>/dev/null | grep -v "Binary file"; then
    echo -e "${RED}⚠️  ATENÇÃO: Senha do PostgreSQL encontrada!${NC}"
    FOUND_SECRETS=1
fi

if grep -r "api_key.*=.*['\"].*[a-f0-9]{32}" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git --exclude="*.md" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Possível API key encontrada${NC}"
    FOUND_SECRETS=1
fi

if [ $FOUND_SECRETS -eq 1 ]; then
    echo ""
    echo -e "${RED}❌ Encontradas possíveis credenciais sensíveis!${NC}"
    echo -e "${YELLOW}Recomendação: Remova manualmente antes de continuar.${NC}"
    read -p "Deseja continuar mesmo assim? (digite 'sim' para confirmar): " confirm
    if [ "$confirm" != "sim" ]; then
        echo "Operação cancelada."
        exit 1
    fi
else
    echo -e "${GREEN}✅ Nenhuma credencial sensível encontrada${NC}"
fi

# 4. Verificar se .env está no .gitignore
echo ""
echo "🔍 Verificando arquivos .env..."
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env existe localmente (ok, não será commitado)${NC}"
fi

if [ -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env.local existe localmente (ok, não será commitado)${NC}"
fi

# 5. Criar .env.example se não existir
if [ ! -f ".env.example" ]; then
    echo ""
    echo "📝 Criando .env.example..."
    cat > .env.example << 'EOF'
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/email_dash"

# Next.js
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Analytics, Monitoring
# NEXT_PUBLIC_GA_ID=
# SENTRY_DSN=
EOF
    echo -e "${GREEN}✅ .env.example criado${NC}"
fi

# 6. Verificar se é um repositório Git
echo ""
echo "🔍 Verificando repositório Git..."
if [ ! -d ".git" ]; then
    echo "📦 Inicializando repositório Git..."
    git init
    git branch -M main
    echo -e "${GREEN}✅ Git inicializado${NC}"
else
    echo -e "${GREEN}✅ Repositório Git já existe${NC}"
fi

# 7. Mostrar status
echo ""
echo "📊 Status do Git:"
git status --short

# 8. Perguntar sobre remote
echo ""
if git remote get-url origin 2>/dev/null; then
    REMOTE_URL=$(git remote get-url origin)
    echo -e "${GREEN}✅ Remote já configurado: ${REMOTE_URL}${NC}"
else
    echo -e "${YELLOW}⚠️  Nenhum remote configurado${NC}"
    echo ""
    echo "Antes de continuar:"
    echo "1. Crie um repositório no GitHub: https://github.com/new"
    echo "2. Escolha um nome (ex: email-dashboard)"
    echo "3. Marque como PRIVATE"
    echo "4. NÃO adicione README, .gitignore ou license"
    echo ""
    read -p "Você já criou o repositório no GitHub? (s/n): " created_repo
    
    if [ "$created_repo" != "s" ]; then
        echo ""
        echo "Por favor, crie o repositório no GitHub primeiro e execute este script novamente."
        exit 0
    fi
    
    echo ""
    read -p "Cole a URL do repositório (ex: https://github.com/user/repo.git): " repo_url
    
    if [ -z "$repo_url" ]; then
        echo -e "${RED}❌ URL vazia. Operação cancelada.${NC}"
        exit 1
    fi
    
    git remote add origin "$repo_url"
    echo -e "${GREEN}✅ Remote adicionado: ${repo_url}${NC}"
fi

# 9. Adicionar arquivos
echo ""
echo "📦 Adicionando arquivos ao Git..."
git add .

# 10. Mostrar o que será commitado
echo ""
echo "📋 Arquivos que serão commitados:"
git status --short

# Verificar se há arquivos .env sendo adicionados (última verificação)
if git status --short | grep -E "^\s*[AM]\s+\.env"; then
    echo -e "${RED}❌ ERRO: Arquivo .env está sendo adicionado!${NC}"
    echo "Execute: git reset HEAD .env"
    exit 1
fi

# 11. Confirmar commit
echo ""
read -p "Deseja fazer o commit? (s/n): " do_commit

if [ "$do_commit" != "s" ]; then
    echo "Operação cancelada."
    exit 0
fi

# 12. Mensagem de commit
echo ""
echo "Mensagem padrão do commit:"
echo "---"
echo "feat: initial commit - email dashboard MVP"
echo ""
echo "- Next.js 15 + TypeScript + Prisma"
echo "- Multi-account ActiveCampaign integration"
echo "- Dashboard with campaigns, lists, and automations"
echo "- Advanced filters (date, account, list)"
echo "- API v1 integration for date-based metrics"
echo "---"
echo ""
read -p "Usar esta mensagem? (s para sim, n para customizar): " use_default_msg

if [ "$use_default_msg" = "s" ]; then
    COMMIT_MSG="feat: initial commit - email dashboard MVP

- Next.js 15 + TypeScript + Prisma
- Multi-account ActiveCampaign integration
- Dashboard with campaigns, lists, and automations
- Advanced filters (date, account, list)
- API v1 integration for date-based metrics
- PM2-ready for production deployment"
else
    read -p "Digite a mensagem do commit: " COMMIT_MSG
fi

# 13. Fazer commit
echo ""
echo "💾 Fazendo commit..."
git commit -m "$COMMIT_MSG"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao fazer commit${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Commit realizado${NC}"

# 14. Push para GitHub
echo ""
read -p "Deseja fazer push para GitHub agora? (s/n): " do_push

if [ "$do_push" != "s" ]; then
    echo ""
    echo "Commit realizado localmente."
    echo "Para fazer push manualmente, execute: git push -u origin main"
    exit 0
fi

echo ""
echo "🚀 Fazendo push para GitHub..."
git push -u origin main

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ Erro ao fazer push${NC}"
    echo ""
    echo "Possíveis soluções:"
    echo "1. Se for 'permission denied': Configure SSH key no GitHub"
    echo "2. Se for 'updates were rejected': Execute 'git pull --rebase' primeiro"
    echo "3. Tente fazer push manualmente: git push -u origin main"
    exit 1
fi

# 15. Sucesso!
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 SUCESSO! Projeto enviado para GitHub!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

REMOTE_URL=$(git remote get-url origin)
# Extrair URL do navegador (remover .git e trocar : por /)
BROWSER_URL=$(echo "$REMOTE_URL" | sed 's/\.git$//' | sed 's/git@github.com:/https:\/\/github.com\//')

echo "🌐 Seu repositório: $BROWSER_URL"
echo ""
echo "✅ Verificações finais:"
echo "  1. Acesse o repositório no browser"
echo "  2. Verifique se NÃO tem arquivo .env"
echo "  3. Verifique se NÃO tem node_modules"
echo "  4. Verifique se NÃO tem senhas visíveis"
echo ""
echo "📚 Próximos passos:"
echo "  - Fazer deploy: Siga DEPLOY-DIGITAL-OCEAN.md"
echo "  - Clonar em outro lugar: git clone $REMOTE_URL"
echo "  - Fazer mudanças: git add . && git commit && git push"
echo ""

