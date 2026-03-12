
-- Remover a constraint existente
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Adicionar nova constraint que inclui 'Cancelado'
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('Pendente', 'Realizado', 'Cancelado'));
