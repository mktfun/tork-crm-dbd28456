# Spec 051 — Redesign Tela de Tesouraria

## Problema

A tela de Tesouraria (`/dashboard/financeiro?tab=tesouraria`) está confusa e os dados apresentados dão "dor de cabeça" para o Marcos. Os problemas identificados:

1. **Dados inconsistentes** — O componente `ReceivablesBySeguradora` busca dados diretamente da `financial_transactions` com filtros manuais complexos (`.in('type', ['revenue', 'income', 'Entrada'])`, `.or('reconciled.is.false,...')`) que podem gerar contagens erradas vs. as RPCs oficiais.
2. **Layout desorganizado** — 4 componentes empilhados sem hierarquia visual clara: `UpcomingTransactionsList`, `AgingReportCard`, `ReceivablesBySeguradora`, `AccountsPayableReceivableTable`.
3. **Comissões de apólice incompreensíveis** — Os dados de comissões pendentes por seguradora não mostram informação suficiente (número da apólice, nome do cliente, status de pagamento) para o usuário entender o que está acontecendo.
4. **Falta de ações** — Não há como dar baixa, filtrar por período, ou entender de onde vem cada valor.

## O que JÁ EXISTE e será reutilizado

| Recurso | Localização | Status |
|---------|------------|--------|
| `TesourariaTab` | `src/components/financeiro/TesourariaTab.tsx` | 🔄 Refatorar layout |
| `AccountsPayableReceivableTable` | `tesouraria/AccountsPayableReceivableTable.tsx` | 🔄 Melhorar dados |
| `AgingReportCard` | `tesouraria/AgingReportCard.tsx` | ✅ Manter |
| `UpcomingTransactionsList` | `tesouraria/UpcomingTransactionsList.tsx` | ✅ Manter |
| `ReceivablesBySeguradora` | `tesouraria/ReceivablesBySeguradora.tsx` | 🔄 Refatorar query + UI |
| `usePayableReceivableTransactions` | `hooks/useFinanceiro.ts:641` | ✅ Usa RPC (ok) |
| `useReceivablesBySeguradora` | `hooks/useFinanceiro.ts:907` | ⚠️ Query direta, pode ter inconsistências |
| `useAgingReport` | `hooks/useFinanceiro.ts:543` | ✅ Usa RPC (ok) |
| `useUpcomingReceivables` | `hooks/useFinanceiro.ts:573` | ✅ Usa RPC (ok) |
| `TransactionDetailsSheet` | `components/financeiro/TransactionDetailsSheet.tsx` | ✅ Reutilizar para drilldown |
| RPCs: `get_aging_report`, `get_upcoming_receivables`, `get_pending_totals` | Supabase | ✅ Existem |

## Requisitos do Redesign

### 1. Layout Reorganizado
- **Linha 1 (KPIs)**: 3 glass cards → Total A Receber | Total A Pagar | Saldo Líquido Projetado
  - Usar `usePendingTotals` que já existe
- **Linha 2 (Grid 2 colunas)**:
  - Esquerda: `UpcomingTransactionsList` (manter como está)
  - Direita: `AgingReportCard` (manter como está)
- **Linha 3**: `ReceivablesBySeguradora` refatorado (ver abaixo)
- **Linha 4**: `AccountsPayableReceivableTable` (manter estrutura, melhorar UX de clique → abre `TransactionDetailsSheet`)

### 2. Fix do `ReceivablesBySeguradora`
- Trocar a query direta na `financial_transactions` por uma RPC dedicada (ou pelo menos usar a RPC `get_pending_by_insurer` se existir)
- Na lista lateral, ao lado de cada seguradora, mostrar:
  - Quantidade de apólices pendentes
  - Próximo vencimento
  - Botão "Ver detalhes" que filtra a tabela abaixo

### 3. Comissões de Apólice Compreensíveis
- Cada linha da tabela A Receber que for de origem `policy` deve exibir:
  - Nome do cliente (já existe no `entityName`)
  - Número da apólice (precisa buscar do `related_entity_id`)
  - Dias em atraso (já existe no `daysOverdue`)
- Ao clicar → abre `TransactionDetailsSheet` (já funciona na aba de Receitas)

### 4. Filtro de Período no Topo
- Reutilizar o `dateRange` que já é passado como prop (`TesourariaTabProps`)
- Conectar ao `AccountsPayableReceivableTable` e `ReceivablesBySeguradora`

## Critérios de Aceite

1. ✅ KPIs de A Receber e A Pagar no topo com dados reais da RPC.
2. ✅ Comissões de apólice mostram nome do cliente e número da apólice (se houver na transação).
3. ✅ Clique em qualquer linha abrirá o `TransactionDetailsSheet`.
4. ✅ Dados consistentes: refatorar `useReceivablesBySeguradora` para não omitir tipos válidos de receita e povoar corretamente o gráfico de pizza e a lista.
5. ✅ Layout limpo mantendo o Gráfico de Pizza + Lista ao lado para a visão de Seguradoras.
