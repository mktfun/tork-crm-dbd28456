# Proposal: Fix Finance Deletions — Bugs Remanescentes (057)

## Contexto

Após a implementação da spec 056 (`fix(finance): add bulk delete...`), três bugs persistem em produção reportados pelo cliente Marcos Vinycius:

1. **Banco não pode ser excluído** — `migrate_and_delete_bank` retorna 404 (schema cache / função não existe no banco)
2. **Transações/extratos excluídos não somem da lista** — o DELETE retorna 200 mas a tela não reflete a mudança (cache não limpo)
3. **`get_bank_linked_count` retorna 404** — função auxiliar usada antes de excluir banco também está faltando no banco

---

## O Que Já Existe (reutilizável)

### Frontend — Já implementado na spec 056
- `useBulkDeleteStatementEntries` em `src/features/finance/api/useReconciliation.ts` ✅
- `useBulkDeleteSystemTransactions` em `src/features/finance/api/useReconciliation.ts` ✅
- `handleBatchDelete` em `ReconciliationPage.tsx` ✅ (mas com lógica de categorização de tipo quebrada)
- `handleDeleteBatch` (extrato OFX do histórico) em `ReconciliationPage.tsx` ✅ (usa `removeQueries`, OK)
- `useMigrateAndDeleteBank` em `src/hooks/useBancos.ts` ✅
- `useBankLinkedDataCount` em `src/hooks/useBancos.ts` ✅

### Backend — O que FALTA no banco de dados
| Função | Status |
|---|---|
| `migrate_and_delete_bank(uuid, uuid)` | ❌ Não existe — retorna 404 |
| `get_bank_linked_count(uuid)` | ❌ Não existe — retorna 404 |
| FK `financial_transactions_reconciled_statement_id_fkey` com `ON DELETE SET NULL` | ✅ Aplicado pelo usuário via SQL Editor |

---

## Bugs Diagnosticados e Causa Raiz

### Bug 1: migrate_and_delete_bank 404
**Causa:** A migration `20260504225220_fix_finance_deletions.sql` criou a função com parâmetros `DEFAULT NULL` no `p_target_bank_id`. O PostgREST resolve overloads por assinatura de parâmetros. Como o frontend sempre envia os dois parâmetros (mesmo que null), a assinatura `(uuid, uuid)` deveria funcionar. O 404 indica que a função **não foi aplicada** ou o schema cache do PostgREST está desatualizado. **Ação necessária:** Fornecer SQL completo e instrutivo para o usuário aplicar (já confirmado que eles usam o SQL Editor).

### Bug 2: get_bank_linked_count 404
**Causa:** Esta função nunca existiu em nenhuma migration. Foi referenciada no código (`useBancos.ts` linha 500) mas nunca criada no banco. **Ação necessária:** Criar a função.

### Bug 3: Itens não somem da lista após DELETE
**Causa:** Os hooks `useBulkDeleteStatementEntries` e `useBulkDeleteSystemTransactions` usam `invalidateQueries` para `bank-statement-paginated`. React Query marca a query como "stale" mas não refetch imediatamente se não houver observer ativo. Como a lista ainda está montada, o refetch ocorre mas com os dados antigos do cache. **Solução:** Trocar para `removeQueries` que limpa o cache instantaneamente, forçando o componente a recarregar os dados do servidor.

### Bug 4: handleBatchDelete — lógica de categorização incorreta
**Causa:** O código usa `item.type === 'statement'` para determinar se o item vem de `bank_statement_entries` ou `financial_transactions`. Porém, no `PaginatedStatementItem`, `type` é `'revenue'` ou `'expense'`, não a tabela de origem. Isso faz a categorização falhar e os IDs vão para a tabela errada. **Solução:** Tentar deletar das duas tabelas em paralelo — como os UUIDs são únicos globalmente, a tabela incorreta simplesmente deleta 0 linhas, sem erro.

---

## Mudanças Propostas

### Backend (SQL — usuário executa no SQL Editor)

#### Criar `get_bank_linked_count(uuid)`
Conta quantas transações e extratos estão vinculados a um banco antes de permitir exclusão.

#### Criar/Recriar `migrate_and_delete_bank(uuid, uuid)`
Migra ou desvincula transações, extratos e históricos do banco origem, então deleta o banco.

---

### Frontend

#### [MODIFY] `src/features/finance/api/useReconciliation.ts`
- `useBulkDeleteStatementEntries.onSuccess`: trocar `invalidateQueries` → `removeQueries` para `bank-statement-paginated` e `bank-statement-entries`
- `useBulkDeleteSystemTransactions.onSuccess`: trocar `invalidateQueries` → `removeQueries` para `bank-statement-paginated` e `bank-statement-detailed`

#### [MODIFY] `src/features/finance/components/reconciliation/ReconciliationPage.tsx`
- `handleBatchDelete`: substituir a lógica de categorização por tipo (quebrada) por um `Promise.all` deletando das duas tabelas em paralelo, seguido de `removeQueries` direto (não via mutation hook)

---

## Critérios de Aceite

- [ ] Excluir banco na tela de Gestão de Bancos não retorna 404
- [ ] Após excluir lançamentos selecionados, os itens somem da lista imediatamente
- [ ] `get_bank_linked_count` retorna contagem correta antes do modal de exclusão de banco
- [ ] Excluir lote OFX do histórico remove o item da lista de histórico imediatamente

---

## Tasks

- [ ] Fornecer SQL final ao usuário com as 2 funções para rodar no SQL Editor
- [ ] Fix `useBulkDeleteStatementEntries` — invalidate → removeQueries
- [ ] Fix `useBulkDeleteSystemTransactions` — invalidate → removeQueries
- [ ] Fix `handleBatchDelete` — substituir categorização por delete em paralelo
- [ ] Commit e push para `origin` e `lovable`
