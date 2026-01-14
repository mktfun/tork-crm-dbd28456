
-- Operação "Orçamento Vira-lata" - Permitir orçamentos sem seguradora/ramo
-- Remover restrições NOT NULL das colunas insurance_company e type

ALTER TABLE public.apolices ALTER COLUMN insurance_company DROP NOT NULL;
ALTER TABLE public.apolices ALTER COLUMN type DROP NOT NULL;
