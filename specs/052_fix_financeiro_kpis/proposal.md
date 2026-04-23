# [052] Fix Financial Dashboards & Legacy Data Cleanup

O usuário relatou que os gráficos de seguradora continuam não carregando corretamente os valores, os painéis do topo (KPIs) exibem R$ 0,00 incorretamente, e há um conflito de valores projetados entre 'Tesouraria' e 'Provisões' inflados devido a dados legados (anteriores a janeiro). O objetivo deste Spec é resolver todas as três frentes do problema financeiro.

## User Review Required

Ao longo dessa implementação rodaremos um **Script de Arquivamento (Limpeza de Dados Legados)**. Todos as transações financeiras (e livros caixas relacionados) com datas anteriores a **01 de Janeiro de 2026** importadas do sistema antigo serão ocultadas/arquivadas. O objetivo é reiniciar o financeiro "do zero", limpando totalmente as apólices fantasmas antigas que davam dor de cabeça.

## Proposed Changes

### Banco de Dados (Supabase CLI ou Node Script)

#### Arquivamento de Legados

* Rodar um script de expurgo seguro em `financial_transactions`
* **Busca**: Toda transação de data menor que `'2026-01-01'` (ou da entidade `legacy_transaction`).
* **Ação**: Definir `archived = true` para remover permanentemente a contabilização desses fantasmas falsos que quebram a contagem dos RPCs internos.

### Dashboard e Integrações

#### [MODIFY] src/services/financialService.ts
Para contornar o problema crônico dos RPCs antigos que somavam a coluna ignorada `total_amount` ou não requeriam `p_user_id`:
* Ajustaremos a função `getFinancialSummary` (que popula os 4 cartões de cima) para utilizar fontes de verdade como `get_pending_totals` e consultas diretas aos recebíveis futuros para extrair o valor verdadeiro de `globalPendingIncome` caso o RPC falhe em somar o ledger.

#### [MODIFY] src/hooks/useFinanceiro.ts
* Refinar a busca de `useReceivablesBySeguradora` e assegurar que as Provisões usem o mesmo cálculo da Tesouraria sem gerar falsas expectativas.

## Open Questions

> Confirme: a regra de exclusão (arquivamento) é pra Ocultar TUDO que for antes de **Janeiro de 2026** ou **Janeiro do ano em que vocês importaram?** O sistema acusou transações do legado de até antes de Jan/2026 inflando tudo.

## Verification Plan

### Manual Verification
1. Ao navegar na aba **Provisões**, o "Total A Receber" não deve diferir do total a receber da **Tesouraria**.
2. Os fantasmas que acumulavam dezenas de milhares de reais que não existiam desaparecerão após a limpeza do legado.
