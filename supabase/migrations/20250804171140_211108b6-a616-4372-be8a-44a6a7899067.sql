
-- Adicionar coluna para controle de renovação automática na tabela apolices
ALTER TABLE public.apolices 
ADD COLUMN automatic_renewal BOOLEAN DEFAULT TRUE NOT NULL;
