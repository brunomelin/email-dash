-- Script para verificar a chave de API da conta gactv22
-- Execute este script em AMBOS os bancos (local e produção) e compare os resultados

SELECT 
  id,
  name,
  base_url,
  -- Mostra primeiros 10 caracteres da chave (para segurança)
  SUBSTRING(api_key, 1, 10) || '...' as api_key_preview,
  -- Mostra tamanho da chave
  LENGTH(api_key) as api_key_length,
  -- Hash MD5 da chave (para comparar sem expor)
  MD5(api_key) as api_key_hash,
  is_active,
  contact_count,
  contact_limit,
  created_at,
  updated_at
FROM accounts
WHERE name = 'gactv22';

-- Se você quiser ver a chave completa (CUIDADO: não compartilhe!)
-- Descomente a linha abaixo:
-- SELECT api_key FROM accounts WHERE name = 'gactv22';

