-- Create bank_accounts table for managing bank accounts
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_number TEXT,
  agency TEXT,
  account_type TEXT NOT NULL DEFAULT 'corrente' CHECK (account_type IN ('corrente', 'poupanca', 'investimento', 'giro')),
  current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  last_sync_date TIMESTAMPTZ,
  color TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own bank accounts"
  ON public.bank_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bank accounts"
  ON public.bank_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts"
  ON public.bank_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts"
  ON public.bank_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create get_bank_balance function if not exists
CREATE OR REPLACE FUNCTION public.get_bank_balance(
  p_bank_account_id UUID,
  p_include_pending BOOLEAN DEFAULT false
)
RETURNS DECIMAL AS $$
DECLARE
  v_balance DECIMAL(15,2);
BEGIN
  -- For now, return the current_balance from the bank account
  -- In the future, this can be enhanced to calculate from transactions
  SELECT current_balance INTO v_balance
  FROM public.bank_accounts
  WHERE id = p_bank_account_id
    AND user_id = auth.uid();
  
  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create get_unbanked_transactions function if not exists
CREATE OR REPLACE FUNCTION public.get_unbanked_transactions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  transaction_id UUID,
  transaction_date DATE,
  description TEXT,
  amount DECIMAL,
  transaction_type TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.id as transaction_id,
    ft.transaction_date::DATE,
    ft.description,
    COALESCE(ABS(fl.amount), 0) as amount,
    CASE 
      WHEN fa.type = 'revenue' THEN 'receita'
      WHEN fa.type = 'expense' THEN 'despesa'
      ELSE 'outro'
    END as transaction_type,
    COALESCE(ft.status, 'pending') as status
  FROM public.financial_transactions ft
  JOIN public.financial_ledger fl ON fl.transaction_id = ft.id
  JOIN public.financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = p_user_id
    AND COALESCE(ft.is_void, false) = false
  ORDER BY ft.transaction_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create assign_bank_to_transactions function
CREATE OR REPLACE FUNCTION public.assign_bank_to_transactions(
  p_transaction_ids UUID[],
  p_bank_account_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- For now just return 0 as placeholder
  -- This can be enhanced to actually link transactions to bank accounts
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create distribute_transaction_to_banks function
CREATE OR REPLACE FUNCTION public.distribute_transaction_to_banks(
  p_transaction_id UUID,
  p_distributions JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Placeholder function
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;