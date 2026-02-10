-- ============================================================
-- CORREÇÃO: Permitir transações desbalanceadas (com Banco)
-- 1. Garante coluna bank_account_id em financial_transactions
-- 2. Atualiza triggers para ignorar soma zero se houver banco
-- ============================================================

-- 1. Adicionar coluna se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_transactions' AND column_name = 'bank_account_id') THEN
        ALTER TABLE public.financial_transactions 
        ADD COLUMN bank_account_id UUID REFERENCES public.bank_accounts(id);
    END IF;
END $$;

-- 2. Atualizar Trigger 1 (Constraint Trigger do arquivo 20251227...)
CREATE OR REPLACE FUNCTION public.validate_ledger_zero_sum()
RETURNS TRIGGER AS $$
DECLARE
  v_balance NUMERIC;
  v_bank_account_id UUID;
BEGIN
  -- Verificar se a transação possui conta bancária vinculada
  SELECT bank_account_id INTO v_bank_account_id
  FROM public.financial_transactions 
  WHERE id = NEW.transaction_id;

  -- SE tiver conta bancária, permite desbalanceamento (o saldo restante está no banco)
  IF v_bank_account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Calcular soma de todos os lançamentos da transação
  SELECT SUM(amount) INTO v_balance
  FROM financial_ledger 
  WHERE transaction_id = NEW.transaction_id;
  
  -- Verificar se soma a zero (com tolerância de centavos)
  IF ABS(v_balance) > 0.01 THEN
    RAISE EXCEPTION 'Transação desbalanceada! Soma dos lançamentos: %. Deveria ser 0.', v_balance;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Atualizar Trigger 2 (Trigger padrão do arquivo 20251226...)
CREATE OR REPLACE FUNCTION public.validate_ledger_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
  v_entry_count INTEGER;
  v_bank_account_id UUID;
BEGIN
  -- Verificar se a transação possui conta bancária vinculada
  SELECT bank_account_id INTO v_bank_account_id
  FROM public.financial_transactions 
  WHERE id = NEW.transaction_id;

  -- SE tiver conta bancária, pula validação
  IF v_bank_account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Calcular saldo da transação
  SELECT SUM(amount), COUNT(*) 
  INTO v_balance, v_entry_count
  FROM public.financial_ledger
  WHERE transaction_id = NEW.transaction_id;
  
  -- Permitir inserção parcial (validação será feita na transação completa ou deferida)
  -- Mas se for UPDATE ou INSERT final, valida.
  IF v_entry_count < 2 THEN
    RETURN NEW;
  END IF;
  
  -- Saldo deve ser zero (tolerância de R$0.01 para arredondamentos)
  IF ABS(v_balance) > 0.01 THEN
    RAISE EXCEPTION 'Transação desbalanceada! Soma dos movimentos: R$ %. Deve ser R$ 0.00', v_balance;
  END IF;
  
  RETURN NEW;
END;
$$;
