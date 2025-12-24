# 🚀 Atualizar Servidor - Filtro de Data nas Automações

## ✅ O que foi implementado:
- Filtro de data (Date Range Picker) na página `/automations`
- Funciona exatamente igual ao filtro da página principal
- Query params compartilháveis: `?from=2024-01-01&to=2024-01-31&accountIds=...`

---

## 📋 Comandos para executar NO SERVIDOR:

```bash
# 1. Conectar no servidor
ssh root@138.197.8.242

# 2. Navegar até o projeto
cd /root/apps/email-dash

# 3. Atualizar código do GitHub
git pull origin main

# 4. Recompilar o projeto
npm run build

# 5. Reiniciar PM2
pm2 restart email-dashboard

# 6. Verificar status
pm2 status

# 7. Ver logs (se necessário)
pm2 logs email-dashboard --lines 50
```

---

## 🧪 Teste após deploy:

1. Acesse: `http://crazymail.costaventures.com.br/automations`
2. Clique no filtro de data (ícone de calendário)
3. Selecione um período
4. Verifique se a URL mudou: `?from=...&to=...`
5. Verifique se a tabela foi filtrada pelos dados do período

---

## ✨ Funcionalidades:
- ✅ Seleção de intervalo de datas
- ✅ Combinação com filtro de contas
- ✅ Botão "Limpar Filtros" limpa data + contas
- ✅ URL compartilhável
- ✅ Recalcula métricas baseado no período

