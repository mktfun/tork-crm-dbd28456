# Tarefas de Implementação: Spec 051 - Tesouraria Redesign

## 1. Correção de Dados e Query de Seguradoras
- [x] Atualizar o hook `useReceivablesBySeguradora` em `src/hooks/useFinanceiro.ts` para usar a filtragem correta (sem `.in('type', ['revenue'...])` fixo que está quebrando a busca, verificar pelo valor ser receita ou atualizar para uma OR clause mais inteligente com `Receita`, `entrada`, `income`, `revenue`).
- [x] Confirmar que o Gráfico de Pizza em `ReceivablesBySeguradora` não fica mais vazio se houver pendências ativas.

## 2. Reorganização do Layout Principal (TesourariaTab)
- [x] Incorporar as métricas de totais baseados no retorno da RPC (`get_pending_totals`) no topo da página.
- [x] Ajustar o grid para mostrar `UpcomingTransactionsList` e `AgingReportCard` lado a lado na segunda linha.
- [x] Ajustar `ReceivablesBySeguradora` logo abaixo (linha 3), ocupando o espaço total e exibindo o gráfico na esquerda com a lista na direita.
- [x] Passar o seletor de data (`dateRange`) dos filtros principais para os componentes para atualizar as queries ativamente.

## 3. Tabela de Contas (AccountsPayableReceivableTable) e Details
- [x] Remover a necessidade de "duplo tab" (abas A Pagar e A Receber) se elas estiverem conflitantes, ou apenas aprimorar a tabela existente.
- [x] Adicionar na própria tabela ou nas listas uma forma de clicar (onRowClick) para abrir o componente `<TransactionDetailsSheet transactionId={id} />`
- [x] Nas colunas da tabela de receber, tentar recuperar `policy_number` ou informações do cliente quando a origem for uma entidade `policy`.
- [x] Atualizar o visual do component para manter a estética Glassmorphism do sistema.

## 4. Teste e Homologação
- [ ] Validar a tela inteira sem erros.
- [ ] Testar a deleção/edição pelo Sheet lateral atualizando os totais em tempo real.
