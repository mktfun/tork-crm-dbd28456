-- Update policy renewal automatic scheduling logic to use exact expiration date.
-- Also synchronize existing pending renewal appointments to the correct expiration date.

-- 1. Update the trigger function
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
    -- MUDANÇA: Usar a data exata de vencimento em vez de 15 dias antes
    target_date := NEW.expiration_date::date;
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

      -- Criar o novo agendamento na data exata do vencimento anual
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

-- 2. Update existing pending appointments to match the current policy expiration date
DO $$
BEGIN
    -- Atualizar todos os agendamentos pendentes de renovação para a data real de vencimento da apólice
    UPDATE public.appointments a
    SET date = p.expiration_date::date
    FROM public.policies p
    WHERE a.policy_id = p.id
      AND a.title LIKE 'Renovação%'
      AND a.status = 'Pendente'
      AND p.status = 'Ativa'
      AND a.date != p.expiration_date::date;
END $$;
