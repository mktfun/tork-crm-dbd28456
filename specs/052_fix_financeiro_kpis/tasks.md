# Tasks - [052] Fix Financial Dashboards & Legacy Data Cleanup

## 1. Limpeza de Dados
- [ ] Criar e executar um script Node.js na pasta protegida com credenciais que busque por todas transações do `user_id` onde `transaction_date < '2026-01-01'` e faça um `update { archived: true }`.

## 2. Refatoração Frontend (get_financial_summary zeroed fix)
- [ ] Editar `src/services/financialService.ts` em `getFinancialSummary()` para não apenas depender do RPC, mas, dentro do Service, disparar consultas suplementares (`supabase.rpc('get_pending_totals', { p_user_id: user_id })`) para repopular os campos `globalPendingIncome` e os 4 KPIs que ficam zerados na interface. E extrair o `user.id` atual.
- [ ] Ajustar `src/components/financeiro/ProvisoesTab.tsx` ou o Hook `useFinancialSummary` para utilizar os totais reconciliados pelo backend modificado e parar de exibir R$ 0,00 nos cartões Superiores (Recebido, Vencendo, etc).

## 3. Validação Cruzada (Tesouraria = Provisões)
- [ ] Garantir que o valor "Receita Projetada" calcule apenas meses futuros ou integre corretamente com o `usePendingTotals()` para que as duas abas do ERP tenham coesão total de números, evitando discrepâncias que confundam o caixa do cliente.
