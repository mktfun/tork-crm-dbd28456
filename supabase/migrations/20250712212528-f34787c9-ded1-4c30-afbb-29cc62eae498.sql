
-- Adiciona as colunas necessárias para o módulo financeiro na tabela transactions existente
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS nature TEXT CHECK (nature IN ('RECEITA', 'DESPESA')),
ADD COLUMN IF NOT EXISTS transaction_date DATE,
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Atualiza registros existentes para ter valores padrão válidos
UPDATE public.transactions 
SET 
  nature = 'RECEITA',
  transaction_date = date,
  due_date = date
WHERE nature IS NULL;

-- Torna as novas colunas obrigatórias após popular com dados padrão
ALTER TABLE public.transactions 
ALTER COLUMN nature SET NOT NULL,
ALTER COLUMN transaction_date SET NOT NULL,
ALTER COLUMN due_date SET NOT NULL;

-- Atualiza a coluna status para incluir os novos valores
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_status_check;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('PREVISTO', 'REALIZADO', 'PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO'));

-- Adiciona comentário atualizado na tabela
COMMENT ON TABLE public.transactions IS 'Armazena todas as transações financeiras: comissões automáticas, receitas, despesas e outros lançamentos do módulo financeiro.';

-- Adiciona comentários nas colunas para documentação
COMMENT ON COLUMN public.transactions.nature IS 'Natureza da transação: RECEITA ou DESPESA';
COMMENT ON COLUMN public.transactions.transaction_date IS 'Data da transação financeira';
COMMENT ON COLUMN public.transactions.due_date IS 'Data de vencimento da transação';
COMMENT ON COLUMN public.transactions.type_id IS 'Referência ao tipo de transação (usado para categorização)';
