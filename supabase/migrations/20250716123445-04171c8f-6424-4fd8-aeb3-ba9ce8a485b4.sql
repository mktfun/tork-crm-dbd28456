
-- Tabela para rastrear saudações de aniversário enviadas
CREATE TABLE public.birthday_greetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    year INT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_greeting_per_year UNIQUE(user_id, client_id, year)
);

-- Habilitar RLS
ALTER TABLE public.birthday_greetings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem gerenciar suas próprias saudações"
ON public.birthday_greetings
FOR ALL
USING (auth.uid() = user_id);

-- Adicionar coluna para template de mensagem no perfil
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birthday_message_template TEXT;
