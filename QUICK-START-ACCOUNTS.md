# 🚀 Quick Start - Gerenciamento de Contas

## ✅ Alteração Implementada

Agora você pode **adicionar, editar e deletar contas do ActiveCampaign diretamente pelo frontend**, sem precisar editar arquivos `.env` ou reiniciar o servidor!

---

## 🎯 Como Usar (3 Passos)

### 1️⃣ Iniciar o Projeto
```bash
# Se ainda não rodou migrations
npx prisma migrate dev

# Iniciar servidor
npm run dev
```

### 2️⃣ Adicionar Sua Primeira Conta
1. Acesse **http://localhost:3000**
2. Clique em **"Gerenciar Contas"** (botão no header)
3. Clique em **"Adicionar Conta"**
4. Preencha o formulário:

```
Nome da Conta: Minha Conta Principal
Base URL: https://youraccountname.api-us1.com
API Key: sua-api-key-aqui
Status: ✅ Ativa
```

5. Clique em **"Testar Conexão"** para validar
6. Se aparecer ✅ **"Conexão válida!"**, clique em **"Criar Conta"**

### 3️⃣ Sincronizar e Ver Métricas
1. Volte ao dashboard (clique em "Voltar" ou acesse `/`)
2. Clique no botão **"Sync"** da sua conta
3. Aguarde 30s-2min (dependendo do volume)
4. Pronto! Suas métricas aparecerão 🎉

---

## 📍 Onde Encontrar Credenciais do ActiveCampaign

1. Faça login no ActiveCampaign
2. Vá em **Settings** (⚙️) → **Developer**
3. Copie:
   - **API URL** → Cole em "Base URL"
   - **API Key** → Cole em "API Key"

---

## 🎨 Funcionalidades Disponíveis

### Página `/settings/accounts`

#### ✅ Adicionar Conta
- Botão **"Adicionar Conta"**
- Formulário com validação
- Teste de conexão antes de salvar

#### ✏️ Editar Conta
- Botão **"Editar"** em cada linha
- Atualiza nome, URL ou API Key
- Re-teste conexão se mudar credenciais

#### 🔄 Ativar/Desativar
- Toggle switch em cada conta
- Contas inativas não aparecem no dashboard
- Não sincronizam dados

#### 🗑️ Deletar Conta
- Botão de lixeira em cada linha
- **Com dados**: Apenas desativa (soft delete)
- **Sem dados**: Remove completamente (hard delete)
- Confirmação antes de deletar

---

## 💡 Dicas

### Testar Conexão
Sempre clique em **"Testar Conexão"** antes de salvar:
- ✅ **Sucesso**: Credenciais válidas, pode salvar
- ❌ **Erro**: Verifique URL e API Key

### Múltiplas Contas
Adicione quantas contas quiser:
- Cada conta tem seu botão "Sync" no dashboard
- Métricas são consolidadas automaticamente
- Filtre por conta na tabela de campanhas

### Segurança
⚠️ **MVP**: API Keys em texto plano no banco (OK para desenvolvimento)  
🔒 **Produção**: Implemente encriptação (Fase 5)

---

## 🐛 Problemas Comuns

### "Conexão inválida"
- ✅ Verifique se a URL começa com `https://`
- ✅ Verifique se a URL termina com `.com` (ex: `.api-us1.com`)
- ✅ Copie a API Key sem espaços extras
- ✅ Teste as credenciais direto no ActiveCampaign

### Conta não aparece no dashboard
- ✅ Verifique se o toggle está **ligado** (Ativa)
- ✅ Volte ao dashboard e recarregue a página

### Erro ao deletar
- ✅ Contas com dados sincronizados são apenas desativadas
- ✅ Para remover completamente, delete os dados primeiro

---

## 📊 Fluxo Visual

```
┌─────────────────────────────────────────────────────────┐
│                    Dashboard (/)                         │
│  ┌────────────────────────────────────────────────┐    │
│  │  [Gerenciar Contas]  [Sync Todas]  [Sync A]   │    │
│  └────────────────────────────────────────────────┘    │
│                         ↓                                │
│               Clique "Gerenciar Contas"                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│            /settings/accounts                            │
│  ┌────────────────────────────────────────────────┐    │
│  │  [Adicionar Conta]                              │    │
│  └────────────────────────────────────────────────┘    │
│                         ↓                                │
│               Clique "Adicionar Conta"                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                Modal de Formulário                       │
│  ┌────────────────────────────────────────────────┐    │
│  │  Nome: [________________]                       │    │
│  │  URL:  [________________]                       │    │
│  │  Key:  [________________]                       │    │
│  │  Ativa: [✅]                                    │    │
│  │                                                  │    │
│  │  [Testar Conexão]  ← Clique aqui primeiro!     │    │
│  │  ✅ Conexão válida!                             │    │
│  │                                                  │    │
│  │  [Cancelar]  [Criar Conta]                      │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│            Tabela de Contas                              │
│  ┌────────────────────────────────────────────────┐    │
│  │  Nome  │ URL  │ Status │ Ações                 │    │
│  │  ─────────────────────────────────────────────  │    │
│  │  Conta │ ...  │ [✅]   │ [Editar] [Deletar]    │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          ↓
                  Volte ao Dashboard
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    Dashboard (/)                         │
│  ┌────────────────────────────────────────────────┐    │
│  │  Conta aparece aqui!                            │    │
│  │  [Sync Conta] ← Clique para sincronizar        │    │
│  └────────────────────────────────────────────────┘    │
│                         ↓                                │
│                  Métricas aparecem! 🎉                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Comandos Úteis

```bash
# Ver contas no banco
npm run db:studio
# (Abre GUI em localhost:5555)

# Criar conta de exemplo (opcional)
npm run db:seed

# Limpar banco e recomeçar
npx prisma migrate reset
npm run db:migrate
```

---

## ✅ Checklist de Primeira Configuração

- [ ] Servidor rodando (`npm run dev`)
- [ ] Acesso ao dashboard (`http://localhost:3000`)
- [ ] Clicou em "Gerenciar Contas"
- [ ] Adicionou conta com credenciais reais
- [ ] Testou conexão (✅ sucesso)
- [ ] Salvou conta
- [ ] Voltou ao dashboard
- [ ] Clicou em "Sync"
- [ ] Viu métricas aparecerem

**Tudo OK? Pronto para usar! 🚀**

---

## 📚 Documentação Completa

- **CHANGELOG-ACCOUNTS.md**: Detalhes técnicos da alteração
- **README.md**: Documentação geral do projeto
- **ARCHITECTURE.md**: Arquitetura e extensibilidade

---

**Dúvidas?** Veja os logs no terminal ou abra Prisma Studio para inspecionar o banco.

