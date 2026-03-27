
# Plano: Dados do DRE e Transações não refletem conciliações

## Diagnóstico

O sistema tem **duas tabelas financeiras separadas** que nunca se conversam:

1. **`financial_transactions`** (sistema novo/ERP) — é onde a conciliação acontece, onde `reconciled`, `paid_amount`, `bank_account_id` são atualizados. O KPI "Recebido" lê daqui via `get_financial_summary`.

2. **`transactions`** (sistema legado/faturamento) — é de onde o DRE e a tela de transações do Reports lêem. A conciliação **nunca toca esta tabela**.

### O que cada componente lê:

| Componente | Tabela fonte | Funciona? |
|---|---|---|
| KPI "Recebido" (`FinanceiroERP`) | `financial_transactions` via `get_financial_summary` | ✅ Sim |
| Tela Transações (`TransacoesTab`) | `financial_transactions` via `get_revenue_transactions` | ✅ Sim (usa `reconciled`) |
| DRE Compacto (Reports) | `transactions` via `useSupabaseReports` | ❌ Nunca atualiza |
| KPIs do Reports (totalGanhos) | `transactions` filtrado por `status=PAGO` | ❌ Nunca atualiza |

O `DreCompactoBar` recebe `totalGanhos` e `totalPerdas` do hook `useSupabaseReports`, que faz:
```typescript
totalGanhos = transactions.filter(t => t.nature === 'RECEITA' && (t.status === 'PAGO' || t.status === 'REALIZADO'))
```

A tabela `transactions` nunca é atualizada pela conciliação — ela é o sistema antigo de comissões.

## Solução

Trocar a fonte de dados do DRE e KPIs financeiros do Reports para usar `financial_transactions` via `get_financial_summary` (a mesma RPC que já funciona nos KPIs do FinanceiroERP).

### Mudanças

**1. `src/hooks/useSupabaseReports.ts`** — Adicionar chamada ao `get_financial_summary` e expor os totais corretos:

- Importar `useFinancialSummary` do `useFinanceiro`
- Substituir o cálculo manual de `totalGanhos`/`totalPerdas` (que lê de `transactions`) pelos valores do summary (`current.totalIncome`, `current.totalExpense`)
- Manter os dados de `transactions` para listagem/detalhes, mas KPIs financeiros vêm do summary

**2. `src/hooks/useFilteredDataForReports.ts`** — Propagar os novos totais:

- Usar `totalGanhos` e `totalPerdas` do summary em vez do cálculo local sobre `transacoesRaw`

**3. `src/components/reports/DreCompactoBar.tsx`** — Sem mudanças (já recebe props, basta que os valores corretos cheguem)

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/hooks/useSupabaseReports.ts` | Chamar `get_financial_summary` para KPIs em vez de somar `transactions` |
| `src/hooks/useFilteredDataForReports.ts` | Usar totais do summary |

## Resultado

- DRE Compacto mostra valores reais baseados em conciliações
- KPIs do Reports (totalGanhos/totalPerdas) alinham com os KPIs do FinanceiroERP
- Tudo lê da mesma fonte de verdade (`financial_transactions`)
