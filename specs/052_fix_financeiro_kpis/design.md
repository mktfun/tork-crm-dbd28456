# Design - [052] Fix Financial Dashboards & Legacy Data Cleanup

## Backend Modeling (Supabase)
O banco de dados será mantido com a mesma estrutura. A correção focará na higienização de dados:
- Atributo `archived` na tabela `financial_transactions` será chaveado para `true` em qualquer transação onde `transaction_date < '2026-01-01'`. Isso expurgará transações de Jan/2024 a Dez/2025 que não possuem `insurance_company_id` ou ledger balanceado real, inflando todos os indicadores de "Provisões".

## Component & Service Architecture
As seguintes integrações serão modificadas:
1. `src/services/financialService.ts`: A requisição HTTP `getFinancialSummary` não confia mais no cálculo primitivo de `.globalPendingIncome` advindo da RPC do backend se ele não suportar dados que possuem dinheiro alocado puramente em ledger e não na transação. Como contingência, invocaremos `usePendingTotals` nas camadas do Frontend ou no serviço e realizaremos um merge na resposta.
2. `src/hooks/useFinanceiro.ts`: Garantir que os paineis da página de `Provisões` bebam exatamente dos mesmos totais caculados na página de Tesouraria.

## Mapas de Dependências
- `src/components/financeiro/ProvisoesTab.tsx` depende de `useFinancialSummary`. Modificar a saída desse Hook estabilizará toda essa tela.
