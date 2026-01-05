# 🔍 Validação do Endpoint /contacts

## 📋 Resumo

Este documento explica como **garantir** que o endpoint `/api/3/contacts` está correto e funciona conforme esperado para obter o total de contatos de uma conta ActiveCampaign.

---

## ✅ Endpoint Utilizado

```
GET /api/3/contacts?limit=1
```

**Motivo para usar `limit=1`:**
- Só precisamos do `meta.total` (total de contatos)
- Não precisamos buscar todos os contatos
- Performance otimizada (resposta mais rápida)

---

## 📚 Documentação Oficial

**ActiveCampaign Developer Documentation:**
- 🔗 [List All Contacts](https://developers.activecampaign.com/reference/list-all-contacts)
- 🔗 [Contact Object](https://developers.activecampaign.com/reference/contact)

**Endpoint:** `GET /api/3/contacts`

**Parâmetros disponíveis:**
- `limit` - Número de registros por página (padrão: 20, máximo: 100)
- `offset` - Offset para paginação
- `email` - Filtrar por email específico
- `status` - Filtrar por status (0=unconfirmed, 1=active, 2=unsubscribed, 3=bounced)

**Resposta esperada:**
```json
{
  "contacts": [
    {
      "id": "1",
      "email": "contato@example.com",
      "firstName": "João",
      "lastName": "Silva",
      "phone": "",
      "cdate": "2024-01-15T10:30:00-06:00",
      "udate": "2024-01-20T14:45:00-06:00",
      ...
    }
  ],
  "meta": {
    "total": "2500"  // ← Este é o valor que precisamos!
  }
}
```

---

## 🧪 Como Testar

### **Opção 1: Script de Teste (Recomendado)**

Execute o script de teste que criamos:

```bash
# Com credenciais do .env
node test-contacts-endpoint.js

# OU passando credenciais manualmente
node test-contacts-endpoint-manual.js "https://suaconta.api-us1.com" "sua-api-key"
```

**O script valida:**
- ✅ Se o endpoint responde corretamente
- ✅ Se `meta.total` está presente
- ✅ Se o tipo do dado é número
- ✅ Mostra exemplo de contato retornado

---

### **Opção 2: Teste Manual com cURL**

```bash
curl -X GET "https://suaconta.api-us1.com/api/3/contacts?limit=1" \
  -H "Api-Token: SUA_API_KEY_AQUI" \
  -H "Content-Type: application/json"
```

**Saída esperada:**
```json
{
  "contacts": [...],
  "meta": {
    "total": "2500"
  }
}
```

---

### **Opção 3: Teste via Postman/Insomnia**

1. **Método:** GET
2. **URL:** `https://suaconta.api-us1.com/api/3/contacts?limit=1`
3. **Headers:**
   - `Api-Token`: SUA_API_KEY
   - `Content-Type`: application/json
4. **Enviar** e verificar resposta

---

## 🔒 Permissões Necessárias

A API Key precisa ter permissão para:
- ✅ **Ler contatos** (Read Contacts)

**Como verificar permissões:**
1. Login no ActiveCampaign
2. **Settings** → **Developer**
3. Clique na API Key em uso
4. Verifique se **"Contacts"** está marcado

---

## 🚨 Possíveis Erros

### **Erro 401 Unauthorized**
```json
{
  "message": "API Key is invalid or missing"
}
```

**Solução:**
- Verifique se a API Key está correta
- Confirme que está usando a API Key da conta certa

---

### **Erro 403 Forbidden**
```json
{
  "message": "You do not have permission to access this resource"
}
```

**Solução:**
- A API Key não tem permissão para ler contatos
- Gere uma nova API Key com permissões corretas
- Ou entre em contato com o administrador da conta

---

### **Erro 404 Not Found**
```json
{
  "message": "Not Found"
}
```

**Solução:**
- Verifique a Base URL (deve ser como `https://account.api-us1.com`)
- Confirme que o endpoint `/api/3/contacts` existe (deveria existir em todas as versões)

---

## 📊 Alternativas (Se o endpoint não funcionar)

Se por algum motivo o endpoint `/contacts` não estiver disponível, existem alternativas:

### **Alternativa 1: Somar subscriber_count das listas**

```javascript
// GET /api/3/lists
const lists = await client.get('/lists')
let totalContacts = 0

for (const list of lists.lists) {
  totalContacts += parseInt(list.subscriber_count || '0', 10)
}

// ⚠️ PROBLEMA: Contatos em múltiplas listas são contados múltiplas vezes
```

**Desvantagens:**
- ❌ Duplicação: um contato em 3 listas = contado 3 vezes
- ❌ Não é o total real de contatos únicos
- ❌ Múltiplas requisições HTTP

---

### **Alternativa 2: Usar API v1 (Deprecated)**

```bash
curl "https://suaconta.api-us1.com/admin/api.php?api_action=contact_list&api_key=SUA_KEY&ids=all&limit=1"
```

**Desvantagens:**
- ❌ API v1 está deprecated
- ❌ Pode ser removida no futuro
- ❌ Menos confiável

---

## ✅ Conclusão

O endpoint **`GET /api/3/contacts?limit=1`** é a forma **oficial e recomendada** de obter o total de contatos, pois:

- ✅ Está documentado oficialmente
- ✅ Retorna total de contatos **únicos**
- ✅ Performance otimizada (apenas metadata)
- ✅ Não conta duplicatas
- ✅ Suportado por todas as versões da API v3

---

## 🔗 Links Úteis

- [ActiveCampaign API v3 Docs](https://developers.activecampaign.com/reference/overview)
- [Authentication](https://developers.activecampaign.com/reference/authentication)
- [Rate Limits](https://developers.activecampaign.com/reference/rate-limits)
- [Contact Object Reference](https://developers.activecampaign.com/reference/contact)

---

## 🧪 Resultado do Teste

**Execute o script de teste e cole o resultado aqui:**

```bash
node test-contacts-endpoint-manual.js "https://suaconta.api-us1.com" "sua-api-key"
```

**Resultado esperado:**
```
✅ O endpoint /contacts ESTÁ FUNCIONANDO CORRETAMENTE!
✅ Podemos usar meta.total para obter o total de contatos.
   Total de contatos na conta: 2500
```

---

**Pronto! Com este documento você pode validar que o endpoint está correto. ✅**

