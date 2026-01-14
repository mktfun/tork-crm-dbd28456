
-- Criar tabela para clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf_cnpj TEXT,
  birth_date DATE,
  marital_status TEXT CHECK (marital_status IN ('Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)')),
  profession TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  cep TEXT,
  address TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Política para que usuários vejam apenas seus próprios clientes
CREATE POLICY "Usuários podem ver seus próprios clientes" 
  ON public.clientes 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para que usuários criem apenas seus próprios clientes
CREATE POLICY "Usuários podem criar seus próprios clientes" 
  ON public.clientes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Política para que usuários atualizem apenas seus próprios clientes
CREATE POLICY "Usuários podem atualizar seus próprios clientes" 
  ON public.clientes 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Política para que usuários excluam apenas seus próprios clientes
CREATE POLICY "Usuários podem excluir seus próprios clientes" 
  ON public.clientes 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.clientes 
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
