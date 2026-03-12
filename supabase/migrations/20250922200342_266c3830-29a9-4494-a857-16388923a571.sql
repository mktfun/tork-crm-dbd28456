-- CORREÇÃO DEFINITIVA: Corrigir agendamentos existentes que têm recurrence_rule mas is_recurring = false
UPDATE public.appointments 
SET is_recurring = true 
WHERE recurrence_rule IS NOT NULL 
  AND recurrence_rule != '' 
  AND is_recurring = false;