-- Tabela para armazenar itens detalhados da apólice (veículos, imóveis, etc.)
CREATE TABLE IF NOT EXISTS public.apolice_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apolice_id uuid NOT NULL REFERENCES public.apolices(id) ON DELETE CASCADE,
  tipo_item text NOT NULL DEFAULT 'VEICULO',
  placa text,
  chassi text,
  modelo text,
  marca text,
  ano_fabricacao integer,
  ano_modelo integer,
  -- Campos para imóveis
  cep text,
  endereco text,
  -- Metadados
  dados_extras jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL
);

-- RLS
ALTER TABLE public.apolice_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own apolice items"
ON public.apolice_itens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own apolice items"
ON public.apolice_itens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own apolice items"
ON public.apolice_itens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own apolice items"
ON public.apolice_itens FOR DELETE
USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_apolice_itens_apolice_id ON public.apolice_itens(apolice_id);
CREATE INDEX IF NOT EXISTS idx_apolice_itens_placa ON public.apolice_itens(placa) WHERE placa IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apolice_itens_chassi ON public.apolice_itens(chassi) WHERE chassi IS NOT NULL;

-- Índice para busca exata de CPF/CNPJ em clientes (otimização do lookup)
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj_exact ON public.clientes(cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;