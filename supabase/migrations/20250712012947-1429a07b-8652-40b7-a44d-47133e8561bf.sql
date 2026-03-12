
-- Etapa 1: Limpeza do Banco de Dados - Remover duplicatas de transaction_types
-- Esta query manterá apenas o primeiro registro de cada tipo por usuário

WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY user_id, name, nature 
           ORDER BY created_at ASC
         ) as row_num
  FROM transaction_types
)
DELETE FROM transaction_types 
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Verificar se ainda existem duplicatas (esta query deve retornar 0 linhas)
SELECT user_id, name, nature, COUNT(*) as count
FROM transaction_types 
GROUP BY user_id, name, nature 
HAVING COUNT(*) > 1;
