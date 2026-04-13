
-- Criar tabela transaction_payments para registrar pagamentos parciais
CREATE TABLE public.transaction_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount_paid NUMERIC NOT NULL CHECK (amount_paid > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar índices para melhor performance
CREATE INDEX idx_transaction_payments_transaction_id ON public.transaction_payments(transaction_id);
CREATE INDEX idx_transaction_payments_user_id ON public.transaction_payments(user_id);
CREATE INDEX idx_transaction_payments_payment_date ON public.transaction_payments(payment_date);

-- Adicionar RLS (Row Level Security)
ALTER TABLE public.transaction_payments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para transaction_payments
CREATE POLICY "Users can view their own transaction payments" 
  ON public.transaction_payments 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transaction payments" 
  ON public.transaction_payments 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transaction payments" 
  ON public.transaction_payments 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transaction payments" 
  ON public.transaction_payments 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Adicionar novo status PARCIALMENTE_PAGO às transações
-- Primeiro, vamos verificar se existe alguma constraint de CHECK no status
-- Se existir, vamos atualizá-la para incluir o novo status

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at_transaction_payments()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_updated_at_transaction_payments
    BEFORE UPDATE ON public.transaction_payments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_transaction_payments();

-- Comentários para documentação
COMMENT ON TABLE public.transaction_payments IS 'Tabela para registrar pagamentos parciais de transações';
COMMENT ON COLUMN public.transaction_payments.transaction_id IS 'ID da transação principal (mãe)';
COMMENT ON COLUMN public.transaction_payments.amount_paid IS 'Valor efetivamente pago nesta baixa parcial';
COMMENT ON COLUMN public.transaction_payments.payment_date IS 'Data em que o pagamento foi realizado';
