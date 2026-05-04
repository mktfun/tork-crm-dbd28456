# Tasks: Finance Deletions Fix

- [x] Criar nova migration `supabase/migrations/20260504193000_fix_finance_deletions.sql`
  - [x] Adicionar DROP CONSTRAINT de `financial_transactions_reconciled_statement_id_fkey`
  - [x] Adicionar ADD CONSTRAINT com `ON DELETE SET NULL`
  - [x] Implementar a função RPC `migrate_and_delete_bank` para aceitar `p_source_bank_id` e `p_target_bank_id`
- [x] Editar `src/features/finance/components/reconciliation/ReconciliationPage.tsx`
  - [x] Adicionar botão "Excluir N" na barra flutuante
  - [x] Implementar `handleBatchDelete` (verificar se é deleção de extrato ou de transação)
  - [x] Adicionar feedback com toast
- [ ] Aplicar mudanças no frontend e instruir o usuário a aplicar a migração no banco de dados
