-- Script para testar a estrutura da tabela condominios
-- Execute este comando no Supabase SQL Editor para verificar se o campo webhook_url existe

\d condominios;

-- Verificar se a coluna webhook_url existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'condominios'
  AND table_schema = 'public'
ORDER BY ordinal_position;