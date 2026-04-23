-- Fix batch update from migration 20260413 which referenced non-existent table 'public.policies'.
-- The correct table is 'public.apolices'.
-- This updates all pending renewal appointments to match the actual policy expiration date.

DO $$
BEGIN
    UPDATE public.appointments a
    SET date = p.expiration_date::date
    FROM public.apolices p
    WHERE a.policy_id = p.id
      AND a.title LIKE 'Renovação%'
      AND a.status = 'Pendente'
      AND p.status = 'Ativa'
      AND a.date != p.expiration_date::date;
    
    RAISE NOTICE 'Agendamentos de renovação pendentes sincronizados com data de vencimento.';
END $$;
