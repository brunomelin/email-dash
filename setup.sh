#!/bin/bash

echo "🚀 Iniciando setup do Email Dashboard..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar se PostgreSQL está instalado
echo "1️⃣  Verificando PostgreSQL..."
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL instalado${NC}"
else
    echo -e "${RED}❌ PostgreSQL não instalado${NC}"
    echo ""
    echo "Instale o PostgreSQL com uma destas opções:"
    echo ""
    echo "Opção A - Homebrew:"
    echo "  brew install postgresql@14"
    echo "  brew services start postgresql@14"
    echo "  createdb email_dash"
    echo ""
    echo "Opção B - Postgres.app:"
    echo "  Baixe em: https://postgresapp.com/"
    echo ""
    echo "Opção C - Docker:"
    echo "  docker run --name email-dash-db \\"
    echo "    -e POSTGRES_PASSWORD=postgres \\"
    echo "    -e POSTGRES_DB=email_dash \\"
    echo "    -p 5432:5432 -d postgres:14"
    echo ""
    exit 1
fi

# 2. Verificar se o banco está rodando
echo ""
echo "2️⃣  Verificando conexão com banco..."
if psql -lqt | cut -d \| -f 1 | grep -qw email_dash 2>/dev/null; then
    echo -e "${GREEN}✅ Banco 'email_dash' existe${NC}"
else
    echo -e "${YELLOW}⚠️  Banco 'email_dash' não existe${NC}"
    echo "Criando banco..."
    createdb email_dash 2>/dev/null && echo -e "${GREEN}✅ Banco criado${NC}" || {
        echo -e "${RED}❌ Erro ao criar banco${NC}"
        echo "Tente manualmente: createdb email_dash"
        exit 1
    }
fi

# 3. Verificar node_modules
echo ""
echo "3️⃣  Verificando dependências..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ Dependências instaladas${NC}"
else
    echo -e "${YELLOW}⚠️  Instalando dependências...${NC}"
    npm install
fi

# 4. Verificar .env
echo ""
echo "4️⃣  Verificando arquivo .env..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ Arquivo .env existe${NC}"
else
    echo -e "${YELLOW}⚠️  Criando .env...${NC}"
    cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/email_dash?schema=public"
EOF
    echo -e "${GREEN}✅ Arquivo .env criado${NC}"
fi

# 5. Gerar Prisma Client
echo ""
echo "5️⃣  Gerando Prisma Client..."
npx prisma generate

# 6. Rodar migrations
echo ""
echo "6️⃣  Rodando migrations..."
npx prisma migrate dev --name init

# 7. Rodar seed (opcional)
echo ""
echo "7️⃣  Deseja popular o banco com uma conta de exemplo? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    npm run db:seed
fi

echo ""
echo -e "${GREEN}🎉 Setup completo!${NC}"
echo ""
echo "Próximos passos:"
echo "  1. npm run dev"
echo "  2. Acesse: http://localhost:3000"
echo "  3. Vá em 'Gerenciar Contas' para adicionar suas contas do ActiveCampaign"
echo ""

