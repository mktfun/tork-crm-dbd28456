
-- BLOCO 1: Adicionar brokerage_id na tabela de apólices
ALTER TABLE public.apolices
ADD COLUMN IF NOT EXISTS brokerage_id BIGINT REFERENCES public.brokerages(id) ON DELETE SET NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.apolices.brokerage_id IS 'ID da corretora que produziu esta apólice.';

-- BLOCO 2: Adicionar ambas as colunas na tabela de transações
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS brokerage_id BIGINT REFERENCES public.brokerages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS producer_id UUID REFERENCES public.producers(id) ON DELETE SET NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.transactions.brokerage_id IS 'ID da corretora associada a esta transação.';
COMMENT ON COLUMN public.transactions.producer_id IS 'ID do produtor associado a esta transação.';
