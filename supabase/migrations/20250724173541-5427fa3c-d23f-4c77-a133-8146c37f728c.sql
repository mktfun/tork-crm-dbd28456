
-- Forçando as funções a se comportarem e olharem para o lugar certo
ALTER FUNCTION public.handle_updated_at_appointments() SET search_path = 'public';
ALTER FUNCTION public.handle_updated_at_transaction_types() SET search_path = 'public';
ALTER FUNCTION public.handle_updated_at_companies() SET search_path = 'public';
ALTER FUNCTION public.handle_updated_at_company_branches() SET search_path = 'public';
ALTER FUNCTION public.handle_updated_at_transaction_payments() SET search_path = 'public';
ALTER FUNCTION public.check_upcoming_appointments() SET search_path = 'public';
ALTER FUNCTION public.handle_updated_at_producers() SET search_path = 'public';
ALTER FUNCTION public.handle_updated_at() SET search_path = 'public';
ALTER FUNCTION public.handle_updated_at_apolices() SET search_path = 'public';
ALTER FUNCTION public.handle_updated_at_tasks() SET search_path = 'public';
ALTER FUNCTION public.handle_updated_at_transactions() SET search_path = 'public';

-- Criando um cantinho VIP só para as extensões
CREATE SCHEMA IF NOT EXISTS extensions;

-- Mandando a pg_net para o seu novo lar
ALTER EXTENSION pg_net SET SCHEMA extensions;
