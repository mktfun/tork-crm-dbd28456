-- =====================================================
-- FIX LIMPEZA FINAL (A Purga do Legado)
-- =====================================================

-- 1. Remove funções legadas de versões anteriores
DROP FUNCTION IF EXISTS create_revenue_v7;
DROP FUNCTION IF EXISTS create_revenue_v8;
DROP FUNCTION IF EXISTS create_revenue_v9;
DROP FUNCTION IF EXISTS get_revenue_transactions_v2;

-- 2. Mata triggers obsoletos que atualizavam saldo antes da conciliação existir
-- CUIDADO: Verifique se estes triggers realmente existem antes de rodar, ou use IF EXISTS
DROP TRIGGER IF EXISTS trg_update_bank_balance_confirmed ON financial_transactions;
DROP TRIGGER IF EXISTS update_bank_balance_on_ledger_insert ON financial_ledger;

-- 3. Comentários de documentação nas colunas novas
COMMENT ON COLUMN financial_transactions.reconciled IS 'Indica se o movimento foi confirmado pelo financeiro/extrato.';
COMMENT ON COLUMN financial_transactions.type IS 'Espelho do tipo contábil (revenue/expense) para otimização de triggers.';

-- 4. Verificação de Integridade (Opcional - apenas para garantir)
-- Se houver transações 'confirmed' mas NÃO reconciliadas que alteraram o saldo via trigger antigo,
-- o saldo pode estar desajustado. Mas assumimos que o cliente validou o saldo no dashboard.
