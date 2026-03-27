

# Plano: KPI "Recebido" não reflete conciliações — coluna errada

## Problema

Existem **duas colunas** na tabela `financial_transactions`: `reconciled` e `is_reconciled`. Elas deveriam estar sincronizadas mas não estão.

- `get_financial_summary` (KPIs) verifica `COALESCE(t.reconciled, false)` 
- `reconcile_transactions` (match manual com extrato) seta apenas `is_reconciled = TRUE` — **nunca seta `reconciled`**
- `reconcile_transaction_partial` (ambas assinaturas, 3 e 4 args) seta apenas `is_reconciled` — **nunca seta `reconciled`**
- `manual_reconcile_transaction` seta `reconciled = TRUE` — OK
- `reconcile_insurance_aggregate_fifo` seta ambos — OK

Resultado: toda conciliação feita via match manual ou parcial fica com `is_reconciled=true` mas `reconciled=false/null`. O KPI ignora essas transações.

## Mudanças

### 1. Migration SQL — corrigir RPCs + dados existentes

**a) Dados existentes**: sincronizar todos os registros onde `is_reconciled=true` mas `reconciled` é falso/null:

```sql
UPDATE financial_transactions 
SET reconciled = true 
WHERE is_reconciled = true 
  AND COALESCE(reconciled, false) = false;
```

**b) `reconcile_transactions`**: adicionar `reconciled = TRUE` no UPDATE (linha 303 da migration original).

**c) `reconcile_transaction_partial` (4 args)**: adicionar `reconciled = (v_new_paid >= v_sys_amount)` no UPDATE.

**d) `reconcile_transaction_partial` (3 args)**: idem.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Nova migration SQL | Fix data + recriar 3 RPCs com `reconciled` sincronizado |

## Resultado

- Dados existentes corrigidos imediatamente
- Todas as futuras conciliações mantêm `reconciled` e `is_reconciled` em sincronia
- KPI "Recebido" passa a refletir corretamente todas as conciliações

