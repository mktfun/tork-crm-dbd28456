
-- Remover a constraint atual que não inclui status 'Cancelada'
ALTER TABLE public.apolices DROP CONSTRAINT apolices_status_check;

-- Criar nova constraint que aceita também 'Cancelada'
ALTER TABLE public.apolices ADD CONSTRAINT apolices_status_check 
CHECK (status IN ('Aguardando Apólice', 'Ativa', 'Orçamento', 'Cancelada'));
