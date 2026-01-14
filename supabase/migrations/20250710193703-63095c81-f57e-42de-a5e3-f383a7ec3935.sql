
-- Criar tabela para apólices
CREATE TABLE public.apolices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  client_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  policy_number TEXT NOT NULL,
  insurance_company TEXT NOT NULL,
  type TEXT NOT NULL,
  insured_asset TEXT,
  premium_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Aguardando Apólice' CHECK (status IN ('Aguardando Apólice', 'Ativa')),
  expiration_date DATE NOT NULL,
  pdf_url TEXT,
  pdf_attached_name TEXT,
  pdf_attached_data TEXT,
  renewal_status TEXT CHECK (renewal_status IN ('Pendente', 'Em Contato', 'Proposta Enviada', 'Renovada', 'Não Renovada')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.apolices ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para que usuários vejam apenas suas próprias apólices
CREATE POLICY "Usuários podem ver suas próprias apólices" 
  ON public.apolices 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias apólices" 
  ON public.apolices 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias apólices" 
  ON public.apolices 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir suas próprias apólices" 
  ON public.apolices 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at_apolices()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_apolices_updated_at
    BEFORE UPDATE ON public.apolices
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at_apolices();

-- Criar índices para melhor performance
CREATE INDEX idx_apolices_user_id ON public.apolices(user_id);
CREATE INDEX idx_apolices_client_id ON public.apolices(client_id);
CREATE INDEX idx_apolices_expiration_date ON public.apolices(expiration_date);
CREATE INDEX idx_apolices_status ON public.apolices(status);

-- Ativar realtime para a tabela
ALTER TABLE public.apolices REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.apolices;
