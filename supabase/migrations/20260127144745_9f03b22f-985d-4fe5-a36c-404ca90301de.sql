-- Índices para busca otimizada por nome e documento
-- Esses índices aceleram as operações de reconciliação do Identity Linker

-- Índice para busca por nome de cliente (text_pattern_ops para LIKE)
CREATE INDEX IF NOT EXISTS idx_clientes_nome_search ON public.clientes (user_id, name);

-- Índice para busca por nome de seguradora
CREATE INDEX IF NOT EXISTS idx_companies_nome_search ON public.companies (user_id, name);