
-- Remover a constraint atual que só aceita 'Aguardando Apólice' e 'Ativa'
ALTER TABLE public.apolices DROP CONSTRAINT apolices_status_check;

-- Criar nova constraint que aceita também 'Orçamento'
ALTER TABLE public.apolices ADD CONSTRAINT apolices_status_check 
CHECK (status IN ('Aguardando Apólice', 'Ativa', 'Orçamento'));
