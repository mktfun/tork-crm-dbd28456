-- Remover "(Retroativa)" das descrições de comissões criadas pelo backfill
UPDATE transactions 
SET description = REPLACE(description, ' (Retroativa)', '')
WHERE description LIKE '%Comissão (Retroativa)%' 
  AND nature IN ('RECEITA', 'GANHO');