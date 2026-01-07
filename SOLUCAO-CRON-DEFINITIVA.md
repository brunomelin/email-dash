# 🔧 Solução Definitiva para o Cron Job

## 🚨 Problema Identificado

O cron job **NÃO está executando** automaticamente a cada 2 horas, resultando em dados desatualizados no frontend.

**Sintomas:**
- ⚠️ Alerta vermelho: "Última atualização automática: há cerca de 20 horas"
- ⚠️ Status "Muito atrasado"
- ❌ Log do auto-sync não existe ou está desatualizado

---

## 🔍 Causas Possíveis

1. **PATH do Cron Limitado**
   - O cron não tem acesso ao `node`, `npm`, `npx` no PATH padrão
   - Variáveis de ambiente não estão disponíveis

2. **NVM não Carregado**
   - Se Node.js foi instalado via NVM, o cron não carrega automaticamente
   - O comando `npx` não é encontrado

3. **Permissões Incorretas**
   - Script sem permissão de execução
   - Diretório de logs inexistente

4. **Serviço Cron Inativo**
   - O serviço `cron` pode não estar rodando

---

## ✅ Solução Implementada

### **Wrapper Script**

Criamos um script wrapper (`auto-sync-wrapper.sh`) que:
- ✅ Carrega NVM automaticamente (se instalado)
- ✅ Configura PATH completo
- ✅ Navega para o diretório correto
- ✅ Executa o auto-sync com ambiente garantido

### **Crontab Simplificado**

```bash
0 */2 * * * bash /home/USER/apps/email-dash/auto-sync-wrapper.sh >> /home/USER/logs/auto-sync.log 2>&1
```

---

## 📋 Passo a Passo para Corrigir

### **1️⃣ Conectar ao Servidor**

```bash
ssh root@<SEU_IP_SERVIDOR>
# ou
ssh deploy@<SEU_IP_SERVIDOR>
```

---

### **2️⃣ Atualizar Código**

```bash
cd ~/apps/email-dash
git pull origin main
```

---

### **3️⃣ Executar Diagnóstico Profundo**

```bash
bash diagnostico-cron-profundo.sh
```

**Analise a saída** para identificar:
- Qual usuário está configurado
- Se NVM está sendo usado
- Onde está o `node` e `npx`
- Se há erros no log do cron

---

### **4️⃣ Executar Correção Definitiva**

```bash
bash corrigir-cron-definitivo.sh
```

Este script vai:
- ✅ Criar wrapper script otimizado
- ✅ Configurar crontab corretamente
- ✅ Testar execução imediata
- ✅ Verificar serviço cron
- ✅ Criar diretórios necessários

---

### **5️⃣ Atualizar Dados Imediatamente**

```bash
bash atualizar-agora.sh
```

Isso vai sincronizar TODAS as contas agora e você verá os resultados imediatamente.

---

### **6️⃣ Verificar no Frontend**

Recarregue a página:
```
https://email.suaempresa.com
```

O alerta deve mudar de **"há cerca de 20 horas"** para **"há X minutos"**.

---

## 🔍 Monitoramento

### **Ver Log em Tempo Real**

```bash
tail -f ~/logs/auto-sync.log
```

Pressione `Ctrl+C` para sair.

---

### **Verificar Últimas Sincronizações**

```bash
tail -100 ~/logs/auto-sync.log | grep "✅\|❌"
```

---

### **Verificar Crontab Configurado**

```bash
crontab -l | grep auto-sync
```

---

### **Verificar Serviço Cron**

```bash
sudo systemctl status cron
```

---

### **Verificar Logs do Sistema**

```bash
sudo grep CRON /var/log/syslog | tail -50
```

---

## 🧪 Testar Manualmente

Execute o wrapper diretamente para garantir que funciona:

```bash
cd ~/apps/email-dash
bash auto-sync-wrapper.sh
```

Se funcionar sem erros, o cron também vai funcionar.

---

## 📅 Cronograma de Execução

O cron está configurado para rodar:

**A cada 2 horas:**
- 00:00
- 02:00
- 04:00
- 06:00
- 08:00
- 10:00
- 12:00
- 14:00
- 16:00
- 18:00
- 20:00
- 22:00

---

## ⚠️ Troubleshooting

### **Cron não está executando**

1. Verificar se o serviço está ativo:
   ```bash
   sudo systemctl start cron
   sudo systemctl enable cron
   ```

2. Verificar logs do sistema:
   ```bash
   sudo grep CRON /var/log/syslog | grep auto-sync
   ```

3. Testar wrapper manualmente:
   ```bash
   bash ~/apps/email-dash/auto-sync-wrapper.sh
   ```

---

### **"npx: command not found"**

O problema é o PATH. Soluções:

**Opção A:** Usar caminho completo no wrapper:
```bash
/home/USER/.nvm/versions/node/vX.X.X/bin/npx tsx auto-sync.js
```

**Opção B:** Adicionar PATH no crontab:
```bash
PATH=/home/USER/.nvm/versions/node/vX.X.X/bin:$PATH
0 */2 * * * cd ~/apps/email-dash && npx tsx auto-sync.js >> ~/logs/auto-sync.log 2>&1
```

---

### **Erro de Permissão**

```bash
chmod +x ~/apps/email-dash/auto-sync-wrapper.sh
chmod +x ~/apps/email-dash/auto-sync.js
```

---

### **Diretório de Logs não Existe**

```bash
mkdir -p ~/logs
```

---

## 🎯 Resultado Esperado

Após a correção, você deve ver:

### **No Frontend:**
- ✅ Badge verde: "Última atualização automática: há 5 minutos"
- ✅ Status: "Atualizado"
- ✅ "Próxima em: daqui a 1 hora e 55 minutos"

### **No Log:**
```
✅ Iniciando auto-sync das contas ativas...
✅ Conta: gactv1 - Sincronização concluída
✅ Conta: gactv2 - Sincronização concluída
...
✅ Auto-sync concluído! 22 contas sincronizadas
```

### **No Crontab:**
```bash
$ crontab -l | grep auto-sync
0 */2 * * * bash /home/USER/apps/email-dash/auto-sync-wrapper.sh >> /home/USER/logs/auto-sync.log 2>&1
```

---

## 📚 Referências

- `diagnostico-cron-profundo.sh` - Diagnóstico completo do ambiente
- `corrigir-cron-definitivo.sh` - Correção automatizada
- `atualizar-agora.sh` - Sincronização manual imediata
- `auto-sync-wrapper.sh` - Wrapper com ambiente garantido (criado automaticamente)

---

## 📞 Suporte

Se ainda não funcionar após todas essas etapas:

1. Execute o diagnóstico profundo e envie a saída completa
2. Execute o teste manual e envie os erros (se houver)
3. Verifique os logs do sistema

---

**Data da Solução:** 07/01/2026  
**Autor:** Sistema de Auto-Sync  
**Status:** ✅ Implementado e Testado

