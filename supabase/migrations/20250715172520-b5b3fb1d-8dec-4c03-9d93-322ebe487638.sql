
-- Adicionar coluna bonus_class na tabela apolices para o sistema de renovação
ALTER TABLE public.apolices 
ADD COLUMN IF NOT EXISTS bonus_class text;

-- Comentário explicativo da coluna
COMMENT ON COLUMN public.apolices.bonus_class IS 'Classe de bônus da apólice para cálculo de renovação (ex: 0, 1, 2, 3, etc.)';
