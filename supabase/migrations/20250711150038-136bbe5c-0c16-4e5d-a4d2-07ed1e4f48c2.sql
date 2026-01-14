
-- COMANDO 1: TURBINANDO A TABELA DE CORRETORAS
-- Adicionando campos essenciais para as corretoras
ALTER TABLE public.brokerages
ADD COLUMN cnpj TEXT,
ADD COLUMN susep_code TEXT,
ADD COLUMN logo_url TEXT;

-- COMANDO 2: CRIANDO A NOVA TABELA DE PRODUTORES
CREATE TABLE public.producers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brokerage_id BIGINT NOT NULL REFERENCES public.brokerages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- COMANDO 3: ADICIONANDO O PRODUTOR NA APÓLICE
-- Agora cada apólice saberá quem foi o produtor responsável
ALTER TABLE public.apolices
ADD COLUMN producer_id UUID REFERENCES public.producers(id) ON DELETE SET NULL;

-- COMANDO 4: SEGURANÇA PARA A NOVA TABELA
ALTER TABLE public.producers ENABLE ROW LEVEL SECURITY;

-- Políticas para produtores
CREATE POLICY "Users can view their own producers"
ON public.producers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own producers"
ON public.producers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own producers"
ON public.producers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own producers"
ON public.producers FOR DELETE
USING (auth.uid() = user_id);

-- COMANDO 5: TRIGGER PARA UPDATED_AT DOS PRODUTORES
CREATE OR REPLACE FUNCTION public.handle_updated_at_producers()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE TRIGGER handle_updated_at_producers
BEFORE UPDATE ON public.producers
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_producers();
