# Tasks 055: Correção do Delay de Data na Importação OFX

## Etapas de Correção (Hotfix)

- [x] Editar `src/features/finance/components/reconciliation/ReconciliationWorkbench.tsx`:
  - Importar a função auxiliar correta (`parseLocalDate` ou `formatDate` do `@/utils/dateUtils`).
  - Buscar por `{format(new Date(item.transaction_date), 'dd/MM/yyyy')}` (e similares).
  - Substituir por um parse que respeita o timezone: `{format(parseLocalDate(item.transaction_date), 'dd/MM/yyyy')}` ou utilizar `formatDate`.
  - Revisar se existem outras chamadas isoladas que passem a data "crua" para formato sem uso da função segura.

- [x] Editar `src/features/finance/components/reconciliation/ReconciliationPage.tsx`:
  - Fazer exatamente o mesmo reparo nas renderizações dos cartões/tabelas da tela de reconciliação.

- [x] (Opcional) Verificar `src/components/financeiro/bancos/BankTransactionsTable.tsx` e garantir que o mesmo fuso horário está aplicado.
  - Vimos no log da pesquisa que ele usa `formatDate(transaction.date)`. Confirmar se é a função segura.

- [x] Realizar lint e notificar conclusão.
