
-- Remover a constraint atual que não aceita 'PARCIALMENTE_PAGO'
ALTER TABLE public.transactions DROP CONSTRAINT transactions_status_check;

-- Criar nova constraint que aceita o novo status de pagamento parcial
ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('PREVISTO', 'REALIZADO', 'PENDENTE', 'PAGO', 'PARCIALMENTE_PAGO', 'ATRASADO', 'CANCELADO'));
