-- Primeiro, limpamos duplicatas mantendo apenas o registro mais antigo
DELETE FROM public.clientes a USING public.clientes b 
WHERE a.id > b.id 
  AND a.cpf_cnpj = b.cpf_cnpj 
  AND a.user_id = b.user_id
  AND a.cpf_cnpj IS NOT NULL 
  AND a.cpf_cnpj != '';

-- Agora criamos o índice único para impedir duplicatas futuras
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj_user_unique 
ON public.clientes (user_id, cpf_cnpj) 
WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != '';