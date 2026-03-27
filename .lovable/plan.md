

# Plano: KPI "Recebido" não atualiza após conciliação

## Problema

O KPI "Recebido no Mês" usa a query key `['financial-summary', startDate, endDate]`, mas todos os hooks de conciliação (`useReconcileManual`, `useReconcileAggregate`, etc.) invalidam `['dashboard-financial-kpis']` — **nunca invalidam `['financial-summary']`**. Resultado: o cache fica stale e o KPI não reflete as conciliações recentes.

Os dados no banco estão corretos (32 transações reconciliadas em março = R$12.612,05). É puramente um bug de cache.

## Mudança

### `src/features/finance/api/useReconciliation.ts` e `src/features/finance/api/useReconcileAggregate.ts`

Adicionar `queryClient.invalidateQueries({ queryKey: ['financial-summary'] })` em todos os blocos `onSuccess` dos mutations de conciliação (há ~4 locais em `useReconciliation.ts` e 1 em `useReconcileAggregate.ts`).

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/features/finance/api/useReconciliation.ts` | Adicionar invalidação de `financial-summary` nos onSuccess |
| `src/features/finance/api/useReconcileAggregate.ts` | Adicionar invalidação de `financial-summary` no onSuccess |

## Resultado

Após qualquer conciliação, o KPI "Recebido no Mês" (e todos os outros KPIs do resumo financeiro) serão automaticamente re-buscados do servidor com dados atualizados.

