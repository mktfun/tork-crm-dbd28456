
Objetivo: eliminar a divergência entre KPIs, gráfico e análise por dimensão no Financeiro (receitas e despesas), deixando todos os blocos com a mesma regra de cálculo e evitando novos lançamentos inconsistentes.

Diagnóstico confirmado (com evidência real do seu usuário):
- KPI principal (get_financial_summary): receita 96.596,89 / despesa 157.857,82
- Gráfico (get_cash_flow_data): receita 251.992,85 / despesa 0
- Análise por dimensão (get_revenue_by_dimension): 120.180,32
- Transações (aba): recebido no período ~35k / pago no período 22.781,72
- Isso comprova que hoje cada card usa fonte/regra diferente e alguns blocos estão limitados por paginação (50/100) ou por critério distinto (is_confirmed vs reconciled), além de haver lançamentos de despesa contabilizados em conta de receita no ledger.

Causas-raiz (prioridade):
1) Critério inconsistente entre blocos
- KPI principal usa financial_transactions.total_amount + reconciled=true.
- Gráfico usa financial_ledger + tipo da conta contábil (fa.type), não o ft.type.
- Dimensão usa is_confirmed=true e não reconciled=true.
- Resultado: números naturalmente divergentes.

2) “Despesa zerada no gráfico” por classificação contábil incorreta em parte dos lançamentos
- Há despesas reconciliadas sem linha de ledger em conta expense (foram para revenue/asset).
- Como o gráfico lê fa.type no ledger, despesa vira receita no chart.

3) KPIs da aba Transações usando listas truncadas/limitadas
- Receitas usam get_revenue_transactions com LIMIT 100.
- Despesas usam get_recent_financial_transactions default LIMIT 50.
- “Pago/Recebido no período” acaba calculado sobre subconjunto, não sobre o universo do período.

4) Falha de guarda no fluxo “Criar do extrato”
- Modal permite escolher qualquer categoria (inclusive tipo incompatível com sinal da entrada), abrindo brecha para lançar despesa com conta de receita.

Plano de correção (sequência segura):
Fase 1 — Unificar regra de negócio (fonte única)
1. Definir e aplicar regra única para “realizado” no módulo:
- Realizado = reconciled = true
- Período = transaction_date no intervalo selecionado
- Pendente = reconciled = false com due_date (fallback transaction_date) no intervalo
2. Aplicar essa regra em:
- get_financial_summary (já está próximo, manter como referência principal)
- get_cash_flow_data (migrar cálculo para financial_transactions.type + total_amount; parar de depender de fa.type para classificar receita/despesa)
- get_revenue_by_dimension (trocar is_confirmed=true por reconciled=true para ficar alinhado ao dashboard de caixa realizado)

Fase 2 — Corrigir UI para não usar subconjunto paginado em KPI
3. Em TransacoesTab:
- “Recebido no Período” = summary.current.totalIncome
- “Pago no Período” = summary.current.totalExpense
- “Previsão a Receber” = summary.current.pendingIncome
- “Previsão a Pagar” = summary.current.pendingExpense
- Manter tabela com paginação para listagem, mas não para KPI.
4. Manter gráfico de receitas/despesas com useCashFlowData após ajuste da RPC (Fase 1), garantindo coerência com KPI principal.

Fase 3 — Fechar brecha de criação inconsistente
5. No Workbench (Criar Despesa/Receita a partir do extrato):
- Filtrar categorias por sinal da entrada selecionada:
  - valor > 0 -> apenas contas revenue
  - valor < 0 -> apenas contas expense
- Se seleção em massa tiver sinais mistos: bloquear criação em lote e orientar separar seleção.
6. No backend (RPC create_transaction_from_statement):
- Validar tipo da conta de categoria escolhida vs sinal da entrada.
- Rejeitar operação incompatível com erro claro.
- Isso impede regressão mesmo que frontend falhe.

Fase 4 — Tratamento de legado inconsistente já gravado
7. Entregar SQL de diagnóstico (auditoria) para medir anomalias por usuário:
- despesas sem ledger expense
- receitas sem ledger revenue
8. Aplicar correção de apresentação imediata via RPCs da Fase 1 (sem mutação arriscada no ledger).
9. Opcional controlado: preparar script de reparo contábil legado (somente após snapshot/backup), com execução por lote e validação transação a transação.

Arquivos e áreas a alterar:
- supabase/migrations/*
  - redefine get_cash_flow_data
  - redefine get_revenue_by_dimension
  - reforça validação em create_transaction_from_statement
- src/components/financeiro/TransacoesTab.tsx
  - KPIs passam a usar useFinancialSummary
- src/features/finance/components/reconciliation/ReconciliationWorkbench.tsx
  - filtro de categorias por sinal + bloqueio de lote misto
- (se necessário) src/hooks/useFinanceiro.ts
  - ajuste de hooks/chaves para refletir semântica reconciled no breakdown

Validação objetiva pós-correção (obrigatória):
Validador SQL 1 (coerência KPI x gráfico)
- Para o mesmo usuário e período:
  - summary.totalIncome == soma(chart.income)
  - summary.totalExpense == soma(chart.expense)
- Tolerância máxima: diferença <= R$ 0,01

Validador SQL 2 (coerência dimensão)
- Soma dos itens de get_revenue_by_dimension == summary.totalIncome (mesmo período/regra reconciled)

Validador SQL 3 (sanidade de lançamentos)
- Contagem de “expense sem ledger expense” deve parar de crescer após bloqueio.
- Novos lançamentos criados do extrato não podem violar tipo vs sinal.

Teste funcional ponta a ponta (UI):
1) Receitas:
- comparar KPI principal, card “Recebido no Período”, total do gráfico e topo da dimensão no mesmo intervalo.
2) Despesas:
- comparar KPI principal, “Pago no Período”, total do gráfico.
3) Criar do extrato:
- tentar selecionar categoria incompatível (deve bloquear).
4) Repetir com período Jan-Fev e com filtro diferente para confirmar estabilidade.

Riscos e mitigação:
- Risco: mudança em RPC afetar telas antigas.
- Mitigação: manter assinatura das funções, só ajustar lógica interna; validar com queries comparativas antes/depois.
- Risco: legado contábil distorcer DRE histórico.
- Mitigação: corrigir primeiro a camada de leitura para coerência operacional; reparo histórico fica em fase controlada.

Critério de aceite final:
- Todos os blocos principais do Financeiro exibem o mesmo universo de dados no período (sem “95k aqui, 35k ali, 120k acolá”).
- Despesas deixam de aparecer zeradas no gráfico quando houver despesa reconciliada.
- Não é mais possível criar lançamento do extrato com categoria incompatível ao sinal.

Após aprovação, executo exatamente nessa ordem (DB first -> UI -> validadores SQL -> teste E2E guiado).
