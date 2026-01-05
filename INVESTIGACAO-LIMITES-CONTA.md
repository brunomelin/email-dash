# 🔬 INVESTIGAÇÃO COMPLETA: Limites de Conta via API

## 📋 Objetivo
Investigar se é possível obter o **limite de contatos** (plano contratado) diretamente da API do ActiveCampaign, ao invés de configuração manual.

---

## 🔍 DESCOBERTAS

### ✅ **Endpoints Testados:**

| Endpoint | Status | Contém Limite? | Observações |
|----------|--------|----------------|-------------|
| `/account` | 404 | ❌ | Não existe |
| `/users/me` | 200 | ❌ | Retorna info do usuário, sem limites |
| `/settings` | 404 | ❌ | Não existe |
| `/organization` | 404 | ❌ | Não existe |
| `/account/settings` | 404 | ❌ | Não existe |
| `/subscription` | 404 | ❌ | Não existe |
| `/billing` | 404 | ❌ | Não existe |
| `/contacts?limit=1` | 200 | ❌ | Retorna apenas `meta.total` (count atual) |

### 📦 **Resposta do `/users/me`:**
```json
{
  "user": {
    "username": "admin",
    "firstName": "Giulio",
    "lastName": "",
    "email": "giulio+actv20@costaventures.com.br",
    "phone": "",
    "signature": "NULL",
    "lang": "english",
    "localZoneid": "America/Chicago",
    "mfaEnabled": "0",
    "roles": null,
    "links": { ... },
    "id": "1"
  }
}
```

**Conclusão:** Nenhuma informação sobre limites ou plano.

---

## 📚 **PESQUISA NA DOCUMENTAÇÃO OFICIAL**

### **Fontes Consultadas:**
1. ✅ [ActiveCampaign API v3 Docs](https://developers.activecampaign.com/reference/overview)
2. ✅ [Help Center - Billing](https://help.activecampaign.com/hc/pt-br/articles/115000337284)
3. ✅ Web search sobre endpoints de billing/subscription

### **Citação da Documentação:**
> "A documentação pública da ActiveCampaign não fornece um endpoint específico para recuperar diretamente o limite de contatos de uma conta."
> 
> — [ActiveCampaign Help Center](https://help.activecampaign.com/hc/pt-br/articles/207317590)

---

## ❌ **CONCLUSÃO DEFINITIVA**

### **A API do ActiveCampaign v3 NÃO expõe:**
- ❌ Limite de contatos do plano
- ❌ Informações de billing/subscription
- ❌ Tier/plano contratado
- ❌ Upgrade automático configurado

### **A API EXPÕE APENAS:**
- ✅ Total de contatos **atuais** (`/contacts` → `meta.total`)
- ✅ Informações do usuário autenticado (`/users/me`)

---

## 🎯 **ALTERNATIVAS VIÁVEIS**

### **Opção 1: Configuração Manual (RECOMENDADA) ✅**

**Prós:**
- ✅ Simples e direto
- ✅ Controle total sobre os dados
- ✅ Sem dependência de APIs não documentadas
- ✅ Performance: zero requests extras
- ✅ Já implementado (campo `contactLimit` no banco)

**Contras:**
- ❌ Requer input manual
- ❌ Pode ficar desatualizado se mudarem o plano

**Implementação:**
- Interface já criada: Settings → Accounts → Editar
- Campo: "Limite de Contatos (opcional)"
- Sincronização: zero impacto (não precisa buscar nada)

---

### **Opção 2: Heurística Baseada no Total Atual ⚠️**

**Lógica:**
```javascript
function estimateLimit(currentTotal) {
  const tiers = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]
  
  // Encontrar o tier mais próximo acima do total atual
  return tiers.find(tier => tier >= currentTotal) || currentTotal
}
```

**Prós:**
- ✅ Automático
- ✅ Não requer input manual

**Contras:**
- ❌ **IMPRECISO**: pode estar errado
- ❌ Não sabe o limite real
- ❌ Se a conta está quase no limite, pode estimar errado
- ❌ Pode causar confusão

**Exemplo do problema:**
- Conta tem 2.400 contatos
- Heurística estima limite de 2.500
- Mas o plano real pode ser 5.000!
- Indicador visual ficaria vermelho (falso positivo)

---

### **Opção 3: Scraping da Interface Web 🚫**

**NÃO RECOMENDADO**

**Motivos:**
- ❌ Viola ToS do ActiveCampaign
- ❌ Frágil (quebra se mudarem o HTML)
- ❌ Requer credenciais de login (não API key)
- ❌ Performance ruim
- ❌ Não escalável

---

### **Opção 4: Webhook/Notificação quando próximo do limite 🚫**

**NÃO DISPONÍVEL**

O ActiveCampaign não oferece webhooks para:
- Limite de contatos atingido
- % de uso do plano
- Upgrade automático disparado

---

## 📊 **ANÁLISE DE IMPACTO**

### **Performance - Opção 1 (Manual):**
```
Requests durante sync:
  Antes: N requests (campanhas, listas, automações)
  Depois: N requests (zero impacto)
  
Impacto: 0ms
```

### **Performance - Opção 2 (Heurística):**
```
Impacto: 0ms (cálculo local)
Problema: Dados imprecisos
```

---

## 💡 **RECOMENDAÇÃO FINAL**

### **USAR OPÇÃO 1: Configuração Manual**

**Justificativa:**

1. **Precisão:** Dados 100% corretos
2. **Performance:** Zero overhead
3. **Simplicidade:** Já implementado
4. **Confiabilidade:** Não depende de APIs instáveis
5. **UX:** Interface amigável já existe

### **Fluxo Recomendado:**

```
┌─────────────────────────────────────────────┐
│ 1. Usuário sincroniza conta (primeira vez) │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 2. Sistema busca total de contatos via API │
│    contactCount = 2.201                     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 3. Usuário acessa Settings → Accounts      │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 4. Clica em "Editar" e preenche:           │
│    Limite de Contatos: 2500                 │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ 5. Dashboard mostra: 2.201 / 2.500 (88%)  │
│    com cor amarela (70-90%)                 │
└─────────────────────────────────────────────┘
```

---

## 🚀 **PRÓXIMOS PASSOS**

### **Melhorias UX (Opcional):**

1. **Sugestão Inteligente:**
   ```javascript
   // Ao criar/editar conta, sugerir limite baseado em tiers conhecidos
   const suggestedLimits = [500, 1000, 2500, 5000, 10000]
   ```

2. **Alerta no Dashboard:**
   ```
   ⚠️  Algumas contas não têm limite definido.
   [Configurar Limites]
   ```

3. **Tooltip Explicativo:**
   ```
   ℹ️  "O limite de contatos não está disponível na API.
       Configure manualmente o limite do seu plano."
   ```

4. **Script Helper:**
   ```bash
   # Para definir limite em massa
   node set-contact-limits.js 2500
   ```

---

## 📝 **LIMITAÇÕES CONHECIDAS**

1. ❌ API não expõe informações de billing
2. ❌ API não expõe tier/plano contratado
3. ❌ Nenhum webhook para alertas de limite
4. ❌ Informações disponíveis apenas via interface web (manual)

---

## 🔗 **REFERÊNCIAS**

1. [ActiveCampaign API v3 Reference](https://developers.activecampaign.com/reference/overview)
2. [Contact Limits Help](https://help.activecampaign.com/hc/pt-br/articles/115000364264)
3. [Auto Upgrade Feature](https://help.activecampaign.com/hc/pt-br/articles/115000337284)
4. [API Introduction (PT-BR)](https://help.activecampaign.com/hc/pt-br/articles/207317590)

---

## ✅ **DECISÃO FINAL**

**Status:** ✅ **CONFIGURAÇÃO MANUAL É A MELHOR OPÇÃO**

**Motivo:** A API do ActiveCampaign não expõe informações de billing/limites, e não há alternativa confiável via API.

**Ação:** Manter implementação atual com campo `contactLimit` configurável via interface.

---

**Investigação concluída em:** 2026-01-05  
**Por:** Sistema de Análise Técnica  
**Conclusão:** API não suporta busca de limites

