-- Fix the policy renewal automatic scheduling bug.
-- The previous version only checked if ANY appointment with title like 'Renovação%' existed.
-- This caused new renewals (e.g. 2026 -> 2027) to fail creating the 2027 appointment because the 2026 one still existed in the DB.
-- The new logic checks for an appointment specifically in the target year, upserting if needed.

CREATE OR REPLACE FUNCTION public.handle_policy_renewal_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  target_date DATE;
  target_year INTEGER;
  existing_appointment_id UUID;
BEGIN
  -- Só processar se for uma apólice ativa com renovação automática habilitada
  IF NEW.status = 'Ativa' AND NEW.automatic_renewal = true THEN
    target_date := (NEW.expiration_date - INTERVAL '15 days')::date;
    target_year := EXTRACT(YEAR FROM target_date);
    
    -- Procurar especificamente se há um agendamento de renovação PARA ESTE ANO CICLO
    SELECT id INTO existing_appointment_id 
    FROM public.appointments 
    WHERE policy_id = NEW.id 
      AND title LIKE 'Renovação%'
      AND EXTRACT(YEAR FROM date) = target_year
    LIMIT 1;

    IF existing_appointment_id IS NOT NULL THEN
      -- Se já existe um agendamento para este ciclo, e a data "alvo" mudou uns dias, nós atualizamos
      UPDATE public.appointments 
      SET date = target_date
      WHERE id = existing_appointment_id 
        AND date != target_date;
    ELSE
      -- Se NÃO existe agendamento de renovação para esse ano, é um NOVO CICLO!

      -- Higiene Crítica: O cliente empurrou o vencimento de 2026 para 2027, então as tarefas de 2026 que 
      -- ainda ficaram "Pendentes" (pois ele pode ter esquecido de dar check no sistema) podem ser "Concluídas".
      UPDATE public.appointments 
      SET status = 'Concluído' 
      WHERE policy_id = NEW.id 
        AND title LIKE 'Renovação%' 
        AND status = 'Pendente' 
        AND EXTRACT(YEAR FROM date) < target_year;

      -- Criar o novo agendamento 15 dias antes do novo vencimento anual
      INSERT INTO public.appointments (
        user_id,
        client_id,
        policy_id,
        title,
        date,
        time,
        status,
        notes
      ) VALUES (
        NEW.user_id,
        NEW.client_id,
        NEW.id,
        'Renovação - Apólice ' || COALESCE(NEW.policy_number, 'Orçamento #' || LEFT(NEW.id::text, 8)),
        target_date,
        '09:00:00',
        'Pendente',
        'Agendamento automático para renovação da apólice. Entrar em contato com o cliente para negociar a renovação.'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
