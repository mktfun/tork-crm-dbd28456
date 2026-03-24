

# Plano: Drill-down de auditoria no DRE

## Problema
O DRE mostra valores agregados por categoria/mês (ex: R$ 21,2 mil em Abril) sem forma de verificar quais transações compõem aquele valor. Isso impede auditoria e gera desconfiança nos números.

## Solução
Tornar cada célula de valor do DRE clicável. Ao clicar, abre um modal/sheet lateral listando todas as transações que compõem aquele valor, permitindo auditoria direta.

## Mudanças

### 1. Criar componente `DreAuditSheet.tsx`
- Sheet lateral que recebe: `category` (nome da conta), `month` (1-12), `year`, `accountType` (revenue/expense)
- Consulta `financial_ledger` + `financial_transactions` filtrando por:
  - Conta da categoria (pelo nome ou ID)
  - Mês/ano via `transaction_date`
  - Apenas transações confirmadas e não anuladas
- Exibe tabela com: Data, Descrição, Valor, Status de conciliação, Origem (manual/extrato/apólice)
- Mostra total no rodapé para conferência com o valor do DRE

### 2. Modificar `DreTable.tsx`
- Envolver cada célula de valor (receita e despesa) com `onClick` que abre o `DreAuditSheet`
- Adicionar cursor pointer e hover visual nas células com valor > 0
- Passar `category`, `month index`, `year` e `accountType` para o sheet
- Estado local: `auditTarget: { category, monthIndex, accountType } | null`

### 3. Query de auditoria
- Nova função no `financialService.ts`: `getDreAuditTransactions(category, month, year)`
- Consulta: `financial_ledger` JOIN `financial_transactions` JOIN `financial_accounts`
  - Filtra por `account.name = category`, `transaction_date` no mês/ano
  - Retorna descrição, valor, data, reconciled, related_entity_type

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/components/financeiro/DreAuditSheet.tsx` | Novo - sheet de auditoria |
| `src/components/financeiro/DreTable.tsx` | Células clicáveis com drill-down |
| `src/services/financialService.ts` | Nova query `getDreAuditTransactions` |
| `src/hooks/useFinanceiro.ts` | Novo hook `useDreAudit` |

