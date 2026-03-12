-- Update existing "Orçamento" policies to "Ativa"
UPDATE apolices SET status = 'Ativa', updated_at = now() WHERE status = 'Orçamento';