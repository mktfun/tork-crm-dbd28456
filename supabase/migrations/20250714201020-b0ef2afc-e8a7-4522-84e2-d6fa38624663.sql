
-- Permitir valores NULL na coluna policy_number da tabela apolices
-- Isso é necessário para permitir a criação de orçamentos
ALTER TABLE public.apolices ALTER COLUMN policy_number DROP NOT NULL;
