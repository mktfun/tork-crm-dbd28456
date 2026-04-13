UPDATE apolices 
SET automatic_renewal = true, updated_at = now()
WHERE status = 'Ativa' 
  AND automatic_renewal = false;