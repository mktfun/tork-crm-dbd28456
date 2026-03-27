

# Plano: Forçar seleção de banco ao conciliar itens sem banco

## Problema

Três fluxos de conciliação permitem conciliar itens sem banco (consolidado) sem perguntar para qual banco atribuir:

1. **Conciliação Agregada FIFO** (`handleAggregateConfirm`) — chama `reconcile_insurance_aggregate_fifo` com `p_target_bank_id: null` sempre. Nunca pergunta o banco.
2. **Conciliação Manual na ReconciliationPage** (`reconcileManualMutation`) — chama `reconcile_transactions` que nem aceita `p_target_bank_id`. Concilia direto sem banco.
3. **Conciliação "Confirmar Tudo"** na ReconciliationPage — loop de `reconcileManualMutation` sem banco.

O único fluxo que já pergunta o banco é o `handleReconcile` do Workbench (via `getTargetBankId` → `showBankModal`), mas os outros caminhos ignoram isso.

Resultado: transações conciliadas ficam "no limbo" sem banco, ou pior, a RPC atribui a um banco aleatório/default e altera saldos incorretamente (caso do Bradesco 60k→48k).

## Mudanças

### 1. `ReconciliationWorkbench.tsx` — Aggregate FIFO pede banco

No `handleAggregateConfirm`, antes de executar, verificar se os itens de extrato selecionados têm `bank_account_id`. Se nenhum tiver, abrir o `showBankModal` e guardar o contexto (aggregate mode). Ao confirmar o banco no modal, chamar `reconcileAggregate` com o `targetBankId`.

### 2. `useReconcileAggregate.ts` — Aceitar `targetBankId` dinâmico

Mudar o tipo `ReconcileAggregateParams` para incluir `targetBankId?: string` e passar para `p_target_bank_id` em vez do hardcoded `null`.

### 3. `ReconciliationPage.tsx` — Conciliação manual pede banco

Nos botões "Conciliar" (match automático e "Confirmar Tudo"), antes de chamar `reconcileManualMutation`, verificar se o `selectedBankAccountId` da página está definido. Se não estiver (modo consolidado), abrir um modal de seleção de banco antes de prosseguir.

### 4. `useReconciliation.ts` — `useReconcileManual` aceitar `targetBankId`

Adicionar `targetBankId?: string` ao parâmetro e passar como `p_target_bank_id` na chamada RPC `reconcile_transactions` (se a RPC aceitar). Se a RPC não aceitar, usar `reconcile_transaction_partial` que já aceita.

## Resumo técnico

| Arquivo | Mudança |
|---|---|
| `ReconciliationWorkbench.tsx` | Aggregate FIFO verifica banco antes de executar; reutiliza `showBankModal` com contexto |
| `useReconcileAggregate.ts` | `targetBankId` dinâmico no param |
| `ReconciliationPage.tsx` | Modal de banco antes de conciliar no modo consolidado |
| `useReconciliation.ts` | `useReconcileManual` passa `p_target_bank_id` |

## Resultado

Nenhuma conciliação no modo consolidado (sem banco selecionado) será executada sem que o usuário escolha explicitamente para qual banco atribuir. Isso previne movimentações fantasma de saldo.

