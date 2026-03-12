-- Índice único parcial para evitar duplicatas de clientes por documento
-- Apenas aplica quando cpf_cnpj é não-nulo e não-vazio

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_doc_user 
ON public.clientes (user_id, cpf_cnpj) 
WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != '';