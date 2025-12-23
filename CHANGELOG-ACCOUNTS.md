# 🔄 Changelog - Gerenciamento de Contas no Frontend

## ✅ Alteração Implementada

**Data**: 22/12/2025  
**Objetivo**: Permitir que usuários gerenciem contas do ActiveCampaign diretamente pelo frontend, sem depender de variáveis de ambiente.

---

## 📋 O Que Mudou

### ❌ Antes (Fase 1 Original)
- Contas configuradas via variáveis `ACCOUNT_*` no `.env`
- Seed script buscava credenciais do `.env`
- Impossível adicionar/editar contas sem reiniciar servidor
- Não escalável para múltiplos usuários

### ✅ Depois (Atualização)
- **CRUD completo de contas via frontend**
- Interface visual em `/settings/accounts`
- Teste de conexão antes de salvar
- Ativar/desativar contas com toggle
- Soft delete (desativa se tiver dados) ou hard delete
- Seed opcional (apenas cria exemplo se banco vazio)

---

## 🆕 Arquivos Criados

### 1. Validações e Actions
```
src/lib/validations.ts                    ← Schemas Zod
src/app/actions/accounts.ts               ← Server Actions (CRUD + teste)
```

### 2. Componentes UI (shadcn)
```
src/components/ui/dialog.tsx              ← Modal
src/components/ui/input.tsx               ← Input de formulário
src/components/ui/label.tsx               ← Label
src/components/ui/switch.tsx              ← Toggle on/off
```

### 3. Componentes de Negócio
```
src/components/settings/account-form-dialog.tsx   ← Modal de criar/editar
src/components/settings/accounts-table.tsx        ← Tabela de contas
```

### 4. Página de Settings
```
src/app/settings/accounts/page.tsx        ← Página de gerenciamento
```

---

## 🔧 Arquivos Modificados

### 1. `src/app/page.tsx` (Dashboard)
**Mudanças**:
- ✅ Adicionado botão "Gerenciar Contas" no header
- ✅ Link para `/settings/accounts`
- ✅ Mensagem melhorada quando não há contas
- ✅ Botão "Adicionar Conta" quando vazio

### 2. `prisma/seed.ts` (Seed)
**Mudanças**:
- ✅ Verifica se já existem contas antes de criar
- ✅ Cria apenas 1 conta de exemplo (inativa)
- ✅ Não limpa dados existentes
- ✅ Mensagem orientando usar o frontend

---

## 🎯 Funcionalidades Implementadas

### 1. Página `/settings/accounts`
- ✅ Listar todas as contas
- ✅ Visualizar estatísticas (campanhas, listas, automações)
- ✅ Botão "Adicionar Conta"
- ✅ Informações sobre onde encontrar credenciais
- ✅ Aviso de segurança sobre API Keys

### 2. Modal de Criação/Edição
- ✅ Formulário com validação Zod
- ✅ Campos: Nome, Base URL, API Key, Status
- ✅ Botão "Testar Conexão" (valida credenciais)
- ✅ Feedback visual (✅ sucesso / ❌ erro)
- ✅ Loading states
- ✅ Tratamento de erros

### 3. Tabela de Contas
- ✅ Colunas: Nome, URL, Status, Estatísticas, Data, Ações
- ✅ Toggle para ativar/desativar
- ✅ Botão "Editar"
- ✅ Botão "Deletar" (com confirmação)
- ✅ Soft delete se tiver dados associados
- ✅ Hard delete se não tiver dados
- ✅ Estado vazio com call-to-action

### 4. Server Actions
```typescript
// src/app/actions/accounts.ts

✅ testConnectionAction()        // Valida credenciais
✅ createAccountAction()         // Cria conta
✅ updateAccountAction()         // Atualiza conta
✅ deleteAccountAction()         // Deleta (soft/hard)
✅ toggleAccountActiveAction()   // Ativa/desativa
✅ listAccountsAction()          // Lista todas
```

---

## 🔐 Segurança

### MVP (Atual)
- ⚠️ API Keys armazenadas em **texto plano** no banco
- ✅ Aceitável para MVP/desenvolvimento
- ✅ Avisos visíveis na UI

### Produção (Futuro - Fase 5)
- 🔒 Encriptar API Keys com `crypto` + chave no `.env`
- 🔒 Implementar autenticação de usuários
- 🔒 Row-Level Security (RLS) no Postgres
- 🔒 Audit log de alterações
- 🔒 Considerar vault (HashiCorp, AWS Secrets Manager)

---

## 🚀 Como Usar (Novo Fluxo)

### 1. Primeira Configuração
```bash
# 1. Rodar migrations (se ainda não rodou)
npx prisma migrate dev

# 2. Rodar seed (opcional - cria conta de exemplo)
npm run db:seed

# 3. Iniciar servidor
npm run dev
```

### 2. Adicionar Conta Real
1. Acesse **http://localhost:3000**
2. Clique em **"Gerenciar Contas"** (ou acesse `/settings/accounts`)
3. Clique em **"Adicionar Conta"**
4. Preencha:
   - **Nome**: "Minha Conta Principal"
   - **Base URL**: `https://account.api-us1.com` (do ActiveCampaign)
   - **API Key**: Sua API Key
5. Clique em **"Testar Conexão"** para validar
6. Se válido, clique em **"Criar Conta"**
7. Conta aparece na lista e no dashboard

### 3. Sincronizar Dados
1. Volte ao dashboard (`/`)
2. Clique em **"Sync"** da conta desejada
3. Aguarde sincronização
4. Veja métricas!

---

## 🔄 Migração (Se Você Já Tinha Contas no .env)

### Opção 1: Recriar via Frontend (Recomendado)
```bash
# 1. Limpar contas antigas
npx prisma studio
# (Deletar contas antigas manualmente)

# 2. Adicionar via frontend
# Acesse /settings/accounts e adicione novamente
```

### Opção 2: Manter Contas Existentes
```bash
# Contas criadas pelo seed antigo continuam funcionando!
# Apenas edite-as via /settings/accounts se necessário
```

### Opção 3: Script de Migração (Opcional)
Se você tem muitas contas no `.env` e quer migrar automaticamente, crie:

```typescript
// scripts/migrate-env-to-db.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
  // Buscar todas ACCOUNT_* do process.env
  const accounts = Object.keys(process.env)
    .filter(key => key.startsWith('ACCOUNT_') && key.endsWith('_BASE_URL'))
    .map(key => {
      const name = key.replace('ACCOUNT_', '').replace('_BASE_URL', '')
      return {
        name: `Account ${name}`,
        baseUrl: process.env[key]!,
        apiKey: process.env[`ACCOUNT_${name}_API_KEY`]!,
        isActive: true,
      }
    })

  for (const account of accounts) {
    await prisma.account.upsert({
      where: { baseUrl: account.baseUrl },
      create: account,
      update: account,
    })
  }

  console.log(`✅ Migrated ${accounts.length} accounts`)
}

migrate()
```

---

## 📊 Estatísticas da Alteração

### Arquivos
- **Criados**: 10 arquivos
- **Modificados**: 2 arquivos
- **Deletados**: 0 arquivos

### Linhas de Código
- **Adicionadas**: ~800 linhas
- **Removidas**: ~30 linhas

### Componentes
- **Server Actions**: 6 funções
- **Componentes React**: 2 novos
- **Componentes UI**: 4 novos (shadcn)
- **Páginas**: 1 nova

---

## 🧪 Testes Recomendados

### Teste 1: Criar Conta
1. Acesse `/settings/accounts`
2. Clique "Adicionar Conta"
3. Preencha com credenciais **inválidas**
4. Clique "Testar Conexão"
5. ✅ Deve mostrar erro
6. Corrija credenciais
7. Teste novamente
8. ✅ Deve mostrar sucesso
9. Salve
10. ✅ Conta aparece na lista

### Teste 2: Editar Conta
1. Clique "Editar" em uma conta
2. Mude o nome
3. Salve
4. ✅ Nome atualizado na lista

### Teste 3: Toggle Ativo/Inativo
1. Clique no switch de uma conta
2. ✅ Badge muda de "Ativa" para "Inativa"
3. Volte ao dashboard
4. ✅ Conta inativa não aparece mais

### Teste 4: Deletar Conta
1. Sincronize uma conta (para ter dados)
2. Tente deletar
3. ✅ Deve apenas desativar (soft delete)
4. Crie uma conta nova (sem sincronizar)
5. Delete
6. ✅ Deve remover completamente (hard delete)

### Teste 5: Fluxo Completo
1. Banco vazio
2. Rode seed: `npm run db:seed`
3. ✅ Cria 1 conta de exemplo (inativa)
4. Acesse dashboard
5. ✅ Mostra mensagem "Adicionar Conta"
6. Clique "Adicionar Conta"
7. Adicione conta real
8. Volte ao dashboard
9. Clique "Sync"
10. ✅ Dados sincronizam e aparecem

---

## 🐛 Troubleshooting

### Erro: "Cannot find module '@radix-ui/react-dialog'"
```bash
npm install @radix-ui/react-dialog @radix-ui/react-switch @radix-ui/react-label
```

### Erro: "Prisma Client not generated"
```bash
npx prisma generate
```

### Contas não aparecem no dashboard
- Verifique se estão **ativas** (toggle ligado)
- Abra Prisma Studio: `npm run db:studio`
- Cheque campo `isActive = true`

### Teste de conexão sempre falha
- Verifique Base URL (deve incluir `https://`)
- Verifique API Key (sem espaços)
- Teste credenciais direto no ActiveCampaign
- Cheque logs do servidor (terminal)

---

## 📝 Notas Importantes

### 1. Backward Compatibility
✅ **Totalmente compatível** com contas criadas pelo seed antigo  
✅ Contas existentes continuam funcionando  
✅ Apenas adiciona novas funcionalidades  

### 2. Dependências Adicionadas
```json
{
  "@radix-ui/react-dialog": "^1.1.2",
  "@radix-ui/react-switch": "^1.1.1",
  "@radix-ui/react-label": "^2.1.1"
}
```
(Já incluídas no `package.json`)

### 3. Variáveis de Ambiente
- ✅ `.env` não é mais necessário para contas
- ✅ Apenas `DATABASE_URL` é obrigatório
- ✅ Variáveis `ACCOUNT_*` são **opcionais** agora

### 4. Seed Script
- ✅ Não deleta dados existentes
- ✅ Apenas cria conta de exemplo se banco vazio
- ✅ Pode rodar múltiplas vezes sem problemas

---

## 🎯 Próximos Passos Sugeridos

### Curto Prazo (Opcional)
- [ ] Toast notifications (substituir `alert()`)
- [ ] Validação de URL mais robusta
- [ ] Copiar API Key (botão "copy")
- [ ] Últimas sincronizações na tabela

### Médio Prazo (Fase 5)
- [ ] Encriptação de API Keys
- [ ] Autenticação de usuários
- [ ] Permissões por usuário
- [ ] Audit log de alterações

### Longo Prazo
- [ ] Multi-provider (Mailchimp, SendGrid)
- [ ] Webhooks do ActiveCampaign
- [ ] Backup/restore de contas
- [ ] Import/export de configurações

---

## ✅ Checklist de Implementação

- [x] Validações Zod
- [x] Server Actions (CRUD completo)
- [x] Componentes UI (dialog, input, label, switch)
- [x] AccountFormDialog (criar/editar)
- [x] AccountsTable (listar/deletar/toggle)
- [x] Página `/settings/accounts`
- [x] Atualizar dashboard (link + mensagens)
- [x] Atualizar seed (tornar opcional)
- [x] Testes manuais
- [x] Documentação (este arquivo)

---

**Alteração concluída com sucesso! 🎉**

O sistema agora permite gerenciamento completo de contas via frontend, tornando-o muito mais prático e escalável.

