# 🚀 Guia de Deploy - Email Dashboard

**Última atualização:** 13 de Janeiro de 2026

---

## ✅ **Commits Realizados**

### **Commit 1: Features** (21ba1b8)
```bash
feat: fix navegação lenta + endpoint direto para automações

- Adiciona prefetch={false} nos Links de navegação (fix lentidão)
- Implementa loading states com Skeleton para /automations e /lists
- Usa endpoint direto /automations/{id}/campaigns para associar emails
- Fallback para heurística por prefixo quando endpoint não funciona
- Melhora performance e UX da navegação
```

**Arquivos alterados:**
- `src/app/page.tsx` - Adiciona prefetch={false}
- `src/lib/connectors/activecampaign/client.ts` - Método getAutomationCampaigns
- `src/lib/services/automation-metrics-service.ts` - Sistema híbrido
- `src/app/automations/loading.tsx` - Loading state (NOVO)
- `src/app/lists/loading.tsx` - Loading state (NOVO)
- `src/components/ui/skeleton.tsx` - Componente Skeleton (NOVO)

### **Commit 2: Documentação** (1c3ffa5)
```bash
docs: adiciona documentação completa do projeto

- Análise profunda do projeto e arquitetura
- Documentação do problema de automações e solução
- Explicação de seriesid no ActiveCampaign
- Scripts SQL de diagnóstico
- Guia de fix de navegação lenta
```

---

## 🌐 **Opções de Deploy**

### **Opção 1: Vercel** ⭐ **RECOMENDADO**

**Por que Vercel:**
- ✅ Otimizado para Next.js
- ✅ Deploy automático a cada push
- ✅ Serverless functions
- ✅ Edge Network (CDN global)
- ✅ HTTPS automático
- ✅ Preview URLs para cada PR

#### **Setup Vercel**

1. **Criar conta/login:**
   ```
   https://vercel.com
   ```

2. **Conectar repositório:**
   - Import Project
   - Conectar GitHub
   - Selecionar repositório: `brunomelin/email-dash`

3. **Configurar variáveis de ambiente:**
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host:5432/database

   # ActiveCampaign (se aplicável)
   # Adicionar outras variáveis conforme necessário
   ```

4. **Deploy:**
   - Clique em "Deploy"
   - Aguarde build (2-3 minutos)
   - Acesse a URL: `https://email-dash.vercel.app`

5. **Configurar domínio customizado (opcional):**
   - Settings → Domains
   - Adicionar: `dashboard.seudominio.com`

---

### **Opção 2: Railway**

**Por que Railway:**
- ✅ Simples e rápido
- ✅ Suporte nativo a PostgreSQL
- ✅ Deploy automático
- ✅ CLI poderosa

#### **Setup Railway**

1. **Instalar CLI:**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Inicializar projeto:**
   ```bash
   cd /Users/brunomelin/email-dash
   railway init
   ```

3. **Adicionar PostgreSQL:**
   ```bash
   railway add --plugin postgresql
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Configurar variáveis:**
   ```bash
   railway variables set DATABASE_URL="..."
   ```

---

### **Opção 3: Docker + Cloud Provider**

**Para AWS, GCP, Azure, DigitalOcean, etc.**

#### **1. Criar Dockerfile:**

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# 1. Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 2. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# 3. Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

#### **2. Criar .dockerignore:**

```
node_modules
.next
.git
.env
*.md
```

#### **3. Build e Deploy:**

```bash
# Build
docker build -t email-dash .

# Run local
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  email-dash

# Push to registry
docker tag email-dash registry.example.com/email-dash
docker push registry.example.com/email-dash
```

---

## 📋 **Checklist de Deploy**

### **Pré-Deploy**

- [x] Commits criados e pushed
- [ ] Tests passando (se houver)
- [ ] Build local funciona: `npm run build`
- [ ] Variáveis de ambiente documentadas
- [ ] Database schema atualizado (migrations)

### **Durante Deploy**

- [ ] Criar projeto no provider escolhido
- [ ] Conectar repositório
- [ ] Configurar variáveis de ambiente
- [ ] Configurar build command: `npm run build`
- [ ] Configurar start command: `npm start`
- [ ] Fazer primeiro deploy

### **Pós-Deploy**

- [ ] Acessar URL de produção
- [ ] Testar navegação (Listas, Automações)
- [ ] Verificar que loading states aparecem
- [ ] Testar filtros de data
- [ ] Verificar métricas carregando corretamente
- [ ] Testar sincronização de contas
- [ ] Monitorar logs por erros

---

## 🔐 **Variáveis de Ambiente Necessárias**

```env
# Database (OBRIGATÓRIO)
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# Next.js
NODE_ENV="production"

# Opcional: Rate Limiting, etc
# Adicionar conforme necessário
```

---

## 🗄️ **Database Migration**

**IMPORTANTE:** Antes do primeiro deploy, garantir que o banco está atualizado:

```bash
# Gerar Prisma Client
npx prisma generate

# Aplicar migrations (se houver pendentes)
npx prisma migrate deploy

# OU Push direto (desenvolvimento)
npx prisma db push
```

---

## 📊 **Monitoramento Pós-Deploy**

### **Verificar Logs:**

**Vercel:**
```bash
vercel logs
```

**Railway:**
```bash
railway logs
```

### **Métricas a Monitorar:**

1. **Performance:**
   - Tempo de carregamento das páginas
   - Tempo de resposta da API
   - Uso de memória/CPU

2. **Erros:**
   - Erros 500 (server errors)
   - Erros 404 (not found)
   - Timeout errors

3. **Uso:**
   - Requisições por minuto
   - Usuários ativos
   - Taxa de erro

---

## 🐛 **Troubleshooting**

### **Erro: Build Failed**

```bash
# Verificar build local
npm run build

# Verificar logs de build no provider
# Geralmente problema com:
# - Variáveis de ambiente faltando
# - Prisma Client não gerado
# - TypeScript errors
```

### **Erro: Database Connection**

```bash
# Verificar DATABASE_URL
# Formato correto:
# postgresql://user:password@host:5432/database

# Testar conexão local
npx prisma db pull
```

### **Erro: Pages Loading Slow**

```bash
# Verificar se prefetch={false} foi aplicado
# Verificar se loading states existem
# Verificar logs de API (ActiveCampaign rate limit?)
```

---

## 🔄 **Deploy Contínuo**

### **Setup CI/CD (GitHub Actions)**

Criar `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 📈 **Próximos Passos (Opcional)**

1. **Adicionar Analytics:**
   - Google Analytics
   - Vercel Analytics
   - Mixpanel

2. **Adicionar Monitoring:**
   - Sentry (error tracking)
   - LogRocket (session replay)
   - Datadog (APM)

3. **Adicionar Testes:**
   - Unit tests (Jest)
   - E2E tests (Playwright)
   - CI/CD para rodar testes

4. **Otimizações:**
   - Cache de Server Components
   - ISR (Incremental Static Regeneration)
   - Edge Functions para rotas críticas

---

## ✅ **Status Atual**

- [x] Código commitado
- [x] Push para GitHub realizado
- [ ] Deploy escolhido e configurado
- [ ] Produção testada
- [ ] Monitoring configurado

---

## 📞 **Suporte**

**Repositório:** https://github.com/brunomelin/email-dash

**Deploy atual:**
- Local: http://localhost:3002
- Produção: [A definir após deploy]

---

**Pronto para deploy! Escolha uma opção acima e siga os passos.** 🚀

