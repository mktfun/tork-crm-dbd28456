
-- Função PostgreSQL para automação de renovações
CREATE OR REPLACE FUNCTION public.handle_policy_renewal_schedule()
RETURNS TRIGGER AS $$
DECLARE
  client_name TEXT;
  schedule_title TEXT;
  schedule_date DATE;
  existing_appointment_id UUID;
BEGIN
  -- Verifica se a apólice deve gerar renovação automática
  IF NEW.automatic_renewal = TRUE AND NEW.status != 'Orçamento' THEN
    -- Busca nome do cliente na tabela 'clientes'
    SELECT name INTO client_name FROM public.clientes WHERE id = NEW.client_id;
    
    -- Define título do agendamento
    schedule_title := 'Renovação - ' || COALESCE(NEW.policy_number, 'Apólice') || ' - ' || COALESCE(client_name, 'Cliente');
    
    -- Calcula data: 15 dias antes do vencimento
    schedule_date := NEW.expiration_date - INTERVAL '15 days';
    
    -- Verifica se já existe agendamento de renovação para esta apólice
    SELECT id INTO existing_appointment_id 
    FROM public.appointments 
    WHERE policy_id = NEW.id 
      AND title ILIKE 'Renovação%'
      AND status = 'Pendente';
    
    IF existing_appointment_id IS NULL THEN
      -- Cria novo agendamento apenas se a data for futura
      IF schedule_date >= CURRENT_DATE THEN
        INSERT INTO public.appointments (
          user_id, client_id, policy_id, title, date, time, status, notes
        ) VALUES (
          NEW.user_id,
          NEW.client_id,
          NEW.id,
          schedule_title,
          schedule_date,
          '09:00:00'::time,
          'Pendente',
          'Agendamento automático criado para renovação da apólice'
        );
      END IF;
    ELSE
      -- Atualiza agendamento existente se a data mudou
      UPDATE public.appointments 
      SET date = schedule_date,
          title = schedule_title,
          notes = 'Agendamento automático atualizado para renovação da apólice'
      WHERE id = existing_appointment_id
        AND date != schedule_date;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS on_policy_renewal_automation ON public.apolices;

-- Cria o trigger que aciona a função
CREATE TRIGGER on_policy_renewal_automation
  AFTER INSERT OR UPDATE ON public.apolices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_policy_renewal_schedule();
```
