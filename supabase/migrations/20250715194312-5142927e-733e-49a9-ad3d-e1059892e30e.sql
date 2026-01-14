
-- OPERAÇÃO EXORCISMO: Removendo as funções RPC do dashboard
-- Estas funções foram criadas mas não estão sendo utilizadas no código atual

DROP FUNCTION IF EXISTS public.get_renewal_metrics(user_uuid uuid);
DROP FUNCTION IF EXISTS public.get_monthly_commissions(user_uuid uuid, months_back integer);
DROP FUNCTION IF EXISTS public.get_branch_distribution(user_uuid uuid);
DROP FUNCTION IF EXISTS public.get_weekly_birthdays(user_uuid uuid);
