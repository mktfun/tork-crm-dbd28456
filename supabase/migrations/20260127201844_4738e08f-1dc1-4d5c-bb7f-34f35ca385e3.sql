-- 1. Adicionar campos de suporte a múltiplos documentos
ALTER TABLE public.apolices 
ADD COLUMN IF NOT EXISTS carteirinha_url text,
ADD COLUMN IF NOT EXISTS last_ocr_type text;

-- 2. Comentários para documentação
COMMENT ON COLUMN public.apolices.carteirinha_url IS 'URL do arquivo de carteirinha no storage';
COMMENT ON COLUMN public.apolices.last_ocr_type IS 'Tipo do último documento processado: apolice ou carteirinha';

-- 3. Índice para busca rápida de clientes por CPF/CNPJ
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON public.clientes (cpf_cnpj);