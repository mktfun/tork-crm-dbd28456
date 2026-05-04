# Design: Finance Deletions Fix

## UI Component: Bulk Delete Button

Na barra `Floating Action Bar` do componente `ReconciliationPage.tsx`, será inserida uma nova condição para exibir o botão de Exclusão ao lado do botão de Conciliação.
- O botão só fará sentido se estivermos excluindo "Lixo" (registros que vieram do banco mas não pertencem ao sistema) ou deletando transações.
- Como `selectedIds` contém IDs de `PaginatedStatementItem`, precisamos identificar se são transações de sistema ou extrato.
- Se for extrato, usaremos a mutação `useDeleteBankStatementEntries`. Se for sistema, `useDeleteFinancialTransactions`.

## Backend API (RPC)

O procedimento `migrate_and_delete_bank` precisa ser criado no schema `public`.
Ele deve aceitar:
1. `p_source_bank_id` (UUID): Banco a ser excluído.
2. `p_target_bank_id` (UUID): Banco de destino (opcional).

Comportamento:
- Se `p_target_bank_id` for fornecido, todas as transações, recebimentos e extratos devem ter seu `bank_account_id` atualizado para o novo banco.
- Caso contrário, os vínculos bancários das transações serão definidos como `null` (como se fossem pagamentos em carteira ou pendentes sem banco específico).
- Em seguida, a tabela `bank_accounts` deleta o banco de origem.

## Schema Fix: Foreign Key

A restrição atual do banco de dados na tabela `financial_transactions` é rígida:
```sql
ALTER TABLE "public"."financial_transactions"
  ADD CONSTRAINT "financial_transactions_reconciled_statement_id_fkey"
  FOREIGN KEY ("reconciled_statement_id")
  REFERENCES "public"."bank_statement_entries"("id");
```
A mudança necessária é:
```sql
ALTER TABLE "public"."financial_transactions"
  DROP CONSTRAINT "financial_transactions_reconciled_statement_id_fkey";

ALTER TABLE "public"."financial_transactions"
  ADD CONSTRAINT "financial_transactions_reconciled_statement_id_fkey"
  FOREIGN KEY ("reconciled_statement_id")
  REFERENCES "public"."bank_statement_entries"("id")
  ON DELETE SET NULL;
```
