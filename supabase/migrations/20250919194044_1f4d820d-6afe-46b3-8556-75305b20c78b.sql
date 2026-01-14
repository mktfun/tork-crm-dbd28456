-- FASE 1: Adicionar colunas de configuração de automação na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS settle_commissions_automatically BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS commission_settlement_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS commission_settlement_strategy TEXT DEFAULT 'first';

-- Garante que os valores não sejam nulos
UPDATE public.profiles 
SET settle_commissions_automatically = false 
WHERE settle_commissions_automatically IS NULL;

UPDATE public.profiles 
SET commission_settlement_days = 7 
WHERE commission_settlement_days IS NULL;

UPDATE public.profiles 
SET commission_settlement_strategy = 'first' 
WHERE commission_settlement_strategy IS NULL;

-- Define as colunas como NOT NULL após preencher valores padrão
ALTER TABLE public.profiles
ALTER COLUMN settle_commissions_automatically SET NOT NULL,
ALTER COLUMN commission_settlement_days SET NOT NULL,
ALTER COLUMN commission_settlement_strategy SET NOT NULL;

-- FASE 3: Função de automação de baixa de comissões
CREATE OR REPLACE FUNCTION public.settle_due_commissions()
RETURNS text AS $$
DECLARE
  updated_count integer;
BEGIN
  WITH target_users AS (
    SELECT 
      id, 
      commission_settlement_days,
      commission_settlement_strategy
    FROM public.profiles 
    WHERE settle_commissions_automatically = true
  ),
  transactions_to_update AS (
    SELECT DISTINCT t.id
    FROM public.transactions t
    JOIN target_users u ON t.user_id = u.id
    JOIN public.apolices a ON t.policy_id = a.id
    WHERE t.nature = 'RECEITA'
      AND t.status = 'PENDENTE'
      AND a.status = 'Ativa'
      AND t.due_date <= (CURRENT_DATE - (u.commission_settlement_days || ' days')::interval)
      AND (
        -- Estratégia 'first': apenas primeira parcela (installment = 1)
        (u.commission_settlement_strategy = 'first' AND (t.installment_number IS NULL OR t.installment_number = 1))
        OR 
        -- Estratégia 'all': todas as parcelas
        (u.commission_settlement_strategy = 'all')
        OR
        -- Estratégia 'custom': por enquanto trata como 'first' (futuro: expandir)
        (u.commission_settlement_strategy = 'custom' AND (t.installment_number IS NULL OR t.installment_number = 1))
      )
  )
  UPDATE public.transactions
  SET 
    status = 'PAGO',
    transaction_date = CURRENT_DATE
  WHERE id IN (SELECT id FROM transactions_to_update);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log da operação para auditoria
  INSERT INTO public.notifications (user_id, message)
  SELECT DISTINCT 
    t.user_id,
    'Automação: ' || COUNT(*) || ' comissão(ões) marcada(s) como paga(s) automaticamente'
  FROM public.transactions t
  JOIN target_users u ON t.user_id = u.id
  WHERE t.status = 'PAGO' 
    AND t.transaction_date = CURRENT_DATE
    AND t.nature = 'RECEITA'
  GROUP BY t.user_id
  HAVING COUNT(*) > 0;
  
  RETURN 'Baixa automática concluída. Transações atualizadas: ' || updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FASE 4: Agendamento do Cron Job para rodar diariamente às 3h da manhã
SELECT cron.schedule(
  'daily-commission-settlement',
  '0 3 * * *',
  $$ SELECT public.settle_due_commissions(); $$
);