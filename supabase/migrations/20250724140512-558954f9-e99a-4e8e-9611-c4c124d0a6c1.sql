
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar tabela de notificações
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de notificações
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para notificações
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
  ON public.notifications 
  FOR INSERT 
  WITH CHECK (true);

-- Função para verificar agendamentos próximos e criar notificações
CREATE OR REPLACE FUNCTION public.check_upcoming_appointments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  upcoming_appointment RECORD;
BEGIN
  -- Buscar agendamentos que começam em 15 minutos e ainda não têm notificação
  FOR upcoming_appointment IN
    SELECT 
      a.id,
      a.user_id,
      a.title,
      a.date,
      a.time,
      a.client_id
    FROM public.appointments a
    WHERE 
      a.status = 'Pendente'
      AND (a.date::timestamp + a.time::time) BETWEEN 
          (now() + interval '14 minutes') AND 
          (now() + interval '16 minutes')
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n 
        WHERE n.appointment_id = a.id 
        AND n.message LIKE '%Lembrete:%'
      )
  LOOP
    -- Criar notificação para o agendamento
    INSERT INTO public.notifications (user_id, appointment_id, message)
    VALUES (
      upcoming_appointment.user_id,
      upcoming_appointment.id,
      'Lembrete: "' || upcoming_appointment.title || '" começa em 15 minutos'
    );
  END LOOP;
END;
$$;

-- Trigger para updated_at automático
CREATE TRIGGER handle_updated_at_notifications
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Agendar a função para executar a cada 5 minutos
SELECT cron.schedule(
  'check-upcoming-appointments',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT public.check_upcoming_appointments();
  $$
);

-- Habilitar realtime para a tabela de notificações
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
