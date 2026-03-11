

# Arquivar Legado Financeiro + Expandir Modais de Conciliação + Audit Log

## 1. Migration SQL: Arquivar transações legadas (apenas financeiro)

Executar UPDATE para marcar `archived = true` apenas nas `financial_transactions` do usuário `65b85549-c928-4513-8d56-a3ef41512dc8` onde `related_entity_type = 'legacy_transaction'`. Apólices e dados de prêmio/comissão ficam intactos nos relatórios (filtrados por período).

## 2. Expandir modal "Criar Lançamento" (`showCreateModal`)

Adicionar dois campos ao modal existente (linhas 828-926 do Workbench):
- **Banco de destino** — `Select` com `bankAccounts` (obrigatório)
- **Nome do responsável** — `Input` text (obrigatório)

Estado: dois novos `useState` (`createBankId`, `operatorName`).

Atualizar `handleCreateTransaction` para:
1. Passar o `bankAccountId` selecionado para a RPC (atualizar `create_transaction_from_statement` para aceitar `p_bank_account_id uuid DEFAULT NULL` e usar esse valor ao invés de `v_entry.bank_account_id` quando fornecido)
2. Após sucesso, inserir registro no `reconciliation_audit_log` com `action_type = 'create'`, `operator_name`, `bank_account_id`, `amount`, `statement_entry_id`

## 3. Expandir modal "Banco para Conciliar" (`showBankModal`)

Adicionar ao modal existente (linhas 951-989):
- **Nome do responsável** — `Input` text (obrigatório)

Estado: reutilizar `operatorName`.

Atualizar `handleBankModalConfirm` e `executeReconcile` para, após sucesso, inserir audit log com `action_type = 'reconcile'`.

## 4. Audit log em todas as ações de conciliação

Em `executeReconcile`, `handlePartialReconcile`, e `handleAggregateConfirm`: após cada operação bem-sucedida, inserir no `reconciliation_audit_log` via `supabase.from('reconciliation_audit_log').insert(...)`.

Para fluxos que já têm banco (sem modal), o `operatorName` será solicitado via um prompt inline no action bar antes de executar.

## 5. Atualizar RPC `create_transaction_from_statement`

Adicionar parâmetro opcional `p_bank_account_id uuid DEFAULT NULL`. Quando fornecido, usar esse valor no INSERT ao invés de `v_entry.bank_account_id`. Isso permite atribuir banco a entries importadas sem banco.

## 6. Histórico detalhado na aba Histórico

Criar hook `useAuditLogByBatch(batchId)` que busca registros do `reconciliation_audit_log` cujo `statement_entry_id` pertence ao batch. Exibir na seção de detalhes do batch no `ReconciliationPage` — quem conciliou, quando, valor, banco destino.

## Resumo de entregas
- **1 migration**: UPDATE para arquivar legado + ALTER na RPC `create_transaction_from_statement`
- **Frontend**: Expandir 2 modais com campos de banco + nome do responsável
- **Frontend**: Inserir audit logs em todos os fluxos de conciliação
- **Frontend**: Exibir audit log no histórico de importação

