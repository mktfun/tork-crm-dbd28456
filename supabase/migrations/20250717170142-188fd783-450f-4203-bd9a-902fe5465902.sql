
-- Adicionar coluna para controlar se o usuário já completou o onboarding
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
