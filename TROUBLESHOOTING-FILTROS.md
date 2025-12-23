# 🔍 Troubleshooting - Filtros de Data

## ❌ Problema: "Dados Somem ao Filtrar por Data"

### Causa
Quando você seleciona uma data específica (ex: 21/12/2025), o filtro busca campanhas **enviadas exatamente naquele dia**. Se não houver campanhas enviadas naquela data, a tabela fica vazia.

### Exemplo
```
Suas campanhas:
- 15/12/2025
- 12/12/2025
- 10/12/2025

Filtro selecionado: 21/12/2025 - 21/12/2025
Resultado: 0 campanhas (porque nenhuma foi enviada em 21/12)
```

---

## ✅ Soluções

### 1. Use Períodos Maiores

**Ao invés de selecionar o mesmo dia**, selecione um intervalo:

```
De: 01/12/2025
Até: 31/12/2025
```

Ou use os atalhos:
- **"Últimos 7 dias"**
- **"Últimos 30 dias"**
- **"Últimos 90 dias"**

### 2. Limpar Filtros

Clique no botão **"Limpar Filtros"** para ver todas as campanhas novamente.

### 3. Verificar Datas das Campanhas

Antes de filtrar, veja na coluna **"Data de Envio"** da tabela quais datas você tem campanhas.

---

## 🔧 Melhorias Implementadas

### 1. Mensagem de Aviso
Quando não há campanhas no período filtrado, aparece:
```
"Nenhuma campanha neste período. Tente expandir as datas ou clique em Limpar Filtros."
```

### 2. Filtro Exclui Campanhas Agendadas
Campanhas **agendadas** (sem data de envio ainda) não aparecem quando você filtra por data. Isso é intencional porque elas ainda não foram enviadas.

---

## 📊 Como o Filtro de Data Funciona

### Lógica Implementada:
```typescript
// Se você seleciona: 10/12/2025 - 15/12/2025
// O filtro busca campanhas onde:
sendDate >= 10/12/2025 00:00:00
E
sendDate < 16/12/2025 00:00:00  // +1 dia para incluir o dia inteiro
```

### Por que +1 dia?
Para incluir campanhas enviadas em **15/12/2025 às 23:59:59**. Sem isso, apenas campanhas até 15/12 00:00:00 seriam incluídas.

---

## 🎯 Boas Práticas

### ✅ DO (Faça):
- Use períodos de **pelo menos 7 dias**
- Use os atalhos ("Últimos 30 dias")
- Verifique a coluna "Data de Envio" antes de filtrar
- Combine filtros (data + conta + status)

### ❌ DON'T (Não Faça):
- Selecionar o mesmo dia para início e fim (a menos que saiba que tem campanhas naquele dia)
- Filtrar por datas futuras (não vai ter dados)
- Esquecer de limpar filtros antes de fazer nova busca

---

## 🐛 Ainda Tendo Problemas?

### Debug 1: Ver Todas as Campanhas
1. Clique em "Limpar Filtros"
2. Veja quantas campanhas aparecem
3. Veja as datas na coluna "Data de Envio"

### Debug 2: Testar com Período Conhecido
1. Veja que você tem campanhas em 10/12, 12/12 e 15/12
2. Filtre de **01/12/2025** até **31/12/2025**
3. Deve mostrar todas as 5 campanhas

### Debug 3: Verificar URL
Quando você aplica filtros, a URL muda:
```
http://localhost:3000/?from=2025-12-01&to=2025-12-31
```

Se a URL não mudar, o filtro não está sendo aplicado.

---

## 📝 Notas Técnicas

### Campanhas Sem Data de Envio
Campanhas com `sendDate = null` (agendadas) **NÃO aparecem** quando você filtra por data. Isso é intencional.

Para ver campanhas agendadas:
1. Não use filtro de data
2. OU use filtro de status: "Agendadas"

### Timezone
As datas são comparadas no timezone do servidor. Se houver diferença de fuso horário, pode haver pequenas discrepâncias.

---

## ✅ Checklist de Resolução

Quando os dados "somem":

- [ ] Cliquei em "Limpar Filtros"?
- [ ] Verifiquei as datas das minhas campanhas?
- [ ] Estou usando um período maior que 1 dia?
- [ ] Tenho campanhas no período selecionado?
- [ ] A URL mostra os parâmetros corretos?
- [ ] Recarreguei a página (F5)?

---

**Se ainda tiver problemas, abra o console do navegador (F12) e veja se há erros!**

