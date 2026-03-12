
-- UPGRADE DA TABELA appointments

-- Adiciona uma coluna para anotações/observações em cada agendamento
ALTER TABLE public.appointments
ADD COLUMN notes TEXT;

-- Adiciona uma coluna booleana para marcar se um agendamento é recorrente
ALTER TABLE public.appointments
ADD COLUMN is_recurring BOOLEAN DEFAULT false;

-- Adiciona uma coluna para vincular um agendamento recorrente ao seu "pai"
-- Isso nos permite rastrear a cadeia de recorrências
ALTER TABLE public.appointments
ADD COLUMN parent_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;
