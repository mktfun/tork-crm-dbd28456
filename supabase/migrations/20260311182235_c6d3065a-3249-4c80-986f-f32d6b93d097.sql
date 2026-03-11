-- Archive legacy financial transactions for user 65b85549-c928-4513-8d56-a3ef41512dc8
UPDATE public.financial_transactions 
SET archived = true 
WHERE user_id = '65b85549-c928-4513-8d56-a3ef41512dc8' 
  AND related_entity_type = 'legacy_transaction' 
  AND COALESCE(archived, false) = false;