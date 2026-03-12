
-- Remover constraint antiga que não inclui 'Renovada'
ALTER TABLE public.apolices DROP CONSTRAINT IF EXISTS apolices_status_check;

-- Criar nova constraint incluindo 'Renovada' como status válido
ALTER TABLE public.apolices ADD CONSTRAINT apolices_status_check 
CHECK (status IN ('Aguardando Apólice', 'Ativa', 'Orçamento', 'Cancelada', 'Renovada'));
