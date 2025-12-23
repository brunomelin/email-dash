# 🧪 Como Testar o Sync de Messages

## ✅ O Que Está Pronto

1. **✅ Migração aplicada** - Tabela `campaign_messages` criada
2. **✅ Campanhas marcadas como automações** - 5 campanhas identificadas
3. **✅ Código atualizado** - `getDashboardData()` refatorado para usar messages
4. **✅ Warnings do Next.js corrigidos** - `searchParams` agora é awaited
5. **✅ SyncButton atualizado** - Mostra contador de messages sincronizadas

## ❌ O Que Falta

**Não há messages no banco de dados!**

```
📧 Campanhas: 5
📬 Messages: 0  ← Precisa sincronizar!
🤖 Automações: 5
```

---

## 🚀 Como Testar Agora

### Passo 1: Verificar se o servidor está rodando

O servidor já está rodando em: `http://localhost:3000`

### Passo 2: Executar Sync

1. Acesse `http://localhost:3000`
2. Clique no botão **"Sync Todas"** no canto superior direito
3. Aguarde a sincronização (pode demorar 1-3 minutos)
4. Você verá um alerta com:
   ```
   ✅ Sincronização de todas as contas concluída!
   
   Campanhas: X
   Listas: X
   Automações: X
   Messages: X  ← IMPORTANTE: Este número deve ser > 0
   ```

### Passo 3: Verificar Dados

Após o sync, a página recarregará automaticamente e você deverá ver:

- **KPIs atualizados** com dados reais (não mais zerados)
- **Tabela de campanhas** populada
- **Filtros de data funcionando**

---

## 🐛 Se Der Erro no Sync

### Console do Servidor

Acompanhe o terminal onde está rodando `npm run dev`. Você verá:

```
📋 Sincronizando listas da conta...
✅ X listas sincronizadas

📧 Sincronizando campanhas da conta...
✅ X campanhas sincronizadas

🤖 Sincronizando automações da conta...
✅ X automações sincronizadas

📬 Sincronizando mensagens dos últimos 90 dias da conta...
✅ X mensagens sincronizadas  ← DEVE APARECER ISSO!
```

### Possíveis Erros

#### 1. "Cannot find module '@prisma/client'"

**Solução:**
```bash
npx prisma generate
```

#### 2. Erro 403 ou 401 da API

**Problema:** Credenciais do ActiveCampaign incorretas ou expiradas

**Solução:**
1. Ir em "Gerenciar Contas"
2. Editar a conta
3. Verificar API Key e Base URL
4. Testar conexão

#### 3. Erro de timeout

**Problema:** Muitas messages para sincronizar

**Solução:** É normal na primeira vez, aguarde alguns minutos

#### 4. Erro "campaignId not found"

**Problema:** API retornou message de campanha que não existe

**Solução:** Isso é normal, o código já trata esse caso (pula a message)

---

## 📊 Verificar Manualmente no Banco

Se quiser ver os dados diretamente:

```bash
npx prisma studio
```

Navegue até:
- **CampaignMessage** - Ver messages sincronizadas
- **Campaign** - Ver campanhas (campo `isAutomation`)
- **SyncJob** - Ver histórico de syncs

---

## 🔍 Debug: Verificar Messages Via Script

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const total = await prisma.campaignMessage.count();
  console.log('Total de messages:', total);
  
  if (total > 0) {
    const sample = await prisma.campaignMessage.findFirst();
    console.log('Exemplo:', sample);
  }
  
  await prisma.\$disconnect();
})();
"
```

---

## ✅ Sucesso Esperado

Após o sync bem-sucedido, você verá:

### Dashboard com Filtros

```
Filtros:
[Date Range: Last 7 days] [Account: All] [Status: All]

Métricas Consolidadas:
Emails Enviados: 45  ← Não mais zero!
Aberturas: 12        ← Baseado em messages reais
Cliques: 5           ← Baseado em messages reais
CTOR: 41.67%

Campanhas Recentes:
- Email 00 - Boas Vindas - Entrada - V2  🤖 Automação
  Enviados: 12 | Open Rate: 33.3% | CTR: 8.3%
  
- Email 00 - Boas Vindas - Resposta Confirmação  🤖 Automação
  Enviados: 8 | Open Rate: 25.0% | CTR: 12.5%
```

### Filtros Funcionando

1. Selecione "Last 30 days" → Métricas mudam
2. Selecione "Last 7 days" → Métricas mostram apenas últimos 7 dias
3. Selecione uma data específica → Métricas daquele dia

---

## 🎉 Quando Estiver Funcionando

Você terá:

- ✅ Sync de messages dos últimos 90 dias
- ✅ Métricas precisas por período
- ✅ Filtros de data funcionando
- ✅ Automações identificadas corretamente
- ✅ Dashboard totalmente funcional!

---

## 📝 Próximos Passos (Após Funcionar)

1. **Adicionar badge "Automação"** na tabela
2. **Melhorar feedback visual** durante sync (progress bar)
3. **Implementar Fase 3** - Visualização de Listas
4. **Adicionar gráficos** de tendência ao longo do tempo

---

**Agora teste clicando em "Sync Todas"! 🚀**

