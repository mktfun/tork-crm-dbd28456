

# Auditoria Completa do Modulo Financeiro - Bugs e Brechas

## Achados Criticos

### BUG 1: Cache Key Mismatch - Saldo Bancario Nunca Atualiza Apos Conciliacao (CRITICO)

**Diagnostico**: O hook `useBankAccounts()` registra dados com a queryKey `['bank-accounts-summary']`. Porem, TODOS os hooks de conciliacao (`useReconcileManual`, `useReconcileTransactionDirectly`, `useUnreconcileTransaction`, `useBulkReconcile`, `useReconcileAggregate`) invalidam apenas `['bank-accounts']` - que e uma key DIFERENTE.

**Impacto**: Apos qualquer conciliacao, estorno ou operacao FIFO, os cards de saldo bancario na tela de Bancos nao atualizam. O usuario precisa recarregar a pagina manualmente.

**Arquivos afetados**:
- `src/features/finance/api/useReconciliation.ts` (linhas 488, 526, 829)
- `src/features/finance/api/useReconcileAggregate.ts` (linha 40)

**Correcao**: Adicionar `queryClient.invalidateQueries({ queryKey: ['bank-accounts-summary'] })` em todos os `onSuccess` dos hooks de conciliacao. Sao 5 hooks afetados.

---

### BUG 2: NovaReceitaModal Bypassa Invalidacao de Cache

**Diagnostico**: O `NovaReceitaModal` chama `registerRevenue()` diretamente do service (linha 100) em vez de usar o hook `useRegisterRevenue()` do React Query. Como consequencia, NENHUM cache e invalidado apos criar uma receita avulsa - nem transacoes, nem saldos, nem fluxo de caixa.

**Comparacao**: O `NovaDespesaModal` usa corretamente `useCreateFinancialMovement()` (que invalida 5 caches).

**Arquivo afetado**: `src/components/financeiro/NovaReceitaModal.tsx` (linha 100)

**Correcao**: Substituir a chamada direta por `useCreateFinancialMovement()` (igual ao NovaDespesaModal), ou envolver a chamada com invalidacao manual de caches.

---

### BUG 3: Teto de 1000 Linhas no Dashboard Bancario

**Diagnostico**: O `BankDashboardView` usa `pageSize = 1000` (linha 41) para buscar todas as transacoes e fazer calculos client-side. Porem o Supabase tem um limite padrao de 1000 linhas por query. Se um banco tiver mais de 1000 transacoes conciliadas, os totais de receita/despesa serao incorretos (truncados silenciosamente).

**Arquivo afetado**: `src/components/financeiro/bancos/BankDashboardView.tsx` (linha 41)

**Correcao**: Usar os totais (`totalIncome`, `totalExpense`) retornados pela RPC `get_bank_transactions` em vez de calcular client-side. A RPC ja calcula corretamente no SQL sem limitacao de linhas.

---

### BUG 4: Estorno Nao Atualiza Saldo Bancario

**Diagnostico**: Os hooks `useVoidTransaction()` e `useReverseTransaction()` (em `useFinanceiro.ts`) invalidam `['financial-transactions']`, `['cash-flow']`, `['financial-summary']` e `['revenue-transactions']` mas NAO invalidam `['bank-accounts-summary']` nem `['bank-accounts']`. Apos estornar uma transacao, o saldo do banco fica desatualizado na UI.

**Arquivo afetado**: `src/hooks/useFinanceiro.ts` (linhas 134-161)

**Correcao**: Adicionar invalidacao de `['bank-accounts-summary']` e `['bank-transactions']` no `onSuccess` de ambos os hooks.

---

### BUG 5: Erros Silenciosos na Desvinculacao de Banco

**Diagnostico**: No hook `useMigrateAndDeleteBank` (useBancos.ts linhas 316-331), quando o usuario escolhe "Desvincular" (set null), as chamadas de update usam `await` sem verificar os erros retornados. Se qualquer uma falhar, o fluxo continua e deleta o banco mesmo assim, deixando dados orfaos.

```typescript
// Linhas 318-331 - erros ignorados
await supabase.from('financial_transactions').update({ bank_account_id: null })...
await supabase.from('bank_statement_entries').update({ bank_account_id: null })...
await supabase.from('bank_import_history').update({ bank_account_id: null })...
```

**Arquivo afetado**: `src/hooks/useBancos.ts` (linhas 316-331)

**Correcao**: Capturar e verificar o `error` de cada operacao, lancar excecao se falhar (igual ao bloco de migracao acima, linhas 297-315).

---

### BUG 6: Invalidacao Incompleta no useCreateFinancialMovement

**Diagnostico**: O hook `useCreateFinancialMovement` invalida `['bank-accounts']` mas nao `['bank-accounts-summary']`. Quando o usuario cria uma despesa com banco atribuido, o saldo no card do banco nao atualiza.

**Arquivo afetado**: `src/hooks/useFinanceiro.ts` (linhas 114-122)

**Correcao**: Adicionar `['bank-accounts-summary']` e `['bank-transactions']` nas invalidacoes.

---

## Achados de Severidade Media

### BRECHA 7: financial_ledger Nao Migrado na Exclusao de Banco

**Diagnostico**: O `useMigrateAndDeleteBank` migra `financial_transactions`, `bank_statement_entries` e `bank_import_history`, mas nao migra entradas do `financial_ledger` que possam referenciar contas contabeis vinculadas. Isso nao causa erro direto (ledger referencia accounts, nao bancos), mas e um ponto de atencao para integridade.

**Status**: Baixo risco - o ledger nao tem coluna `bank_account_id`. Apenas documentar.

### BRECHA 8: useRegisterExpense e useRegisterRevenue Nao Invalidam bank-accounts-summary

**Diagnostico**: Os hooks individuais de receita/despesa (`useRegisterExpense`, `useRegisterRevenue`) invalidam `['bank-accounts']` mas nao `['bank-accounts-summary']` - mesma inconsistencia do Bug 6.

**Arquivo afetado**: `src/hooks/useFinanceiro.ts` (linhas 59-90)

---

## Resumo da Correcao

| # | Bug | Severidade | Arquivo | Tipo |
|---|-----|-----------|---------|------|
| 1 | Cache key mismatch conciliacao | CRITICO | useReconciliation.ts, useReconcileAggregate.ts | Frontend |
| 2 | NovaReceitaModal sem invalidacao | ALTO | NovaReceitaModal.tsx | Frontend |
| 3 | Teto 1000 linhas dashboard | ALTO | BankDashboardView.tsx | Frontend |
| 4 | Estorno sem atualizar banco | MEDIO | useFinanceiro.ts | Frontend |
| 5 | Erros silenciosos desvinculacao | MEDIO | useBancos.ts | Frontend |
| 6 | CreateMovement invalidacao parcial | MEDIO | useFinanceiro.ts | Frontend |

## Plano de Execucao

### Passo 1: Corrigir cache keys de conciliacao (Bug 1)
Adicionar `bank-accounts-summary` em 5 hooks dentro de `useReconciliation.ts` e 1 em `useReconcileAggregate.ts`.

### Passo 2: Corrigir NovaReceitaModal (Bug 2)
Substituir chamada direta a `registerRevenue()` por `useCreateFinancialMovement()` com parametros mapeados, garantindo invalidacao automatica.

### Passo 3: Usar totais da RPC no dashboard (Bug 3)
No `BankDashboardView.tsx`, usar `transactionsData.totalIncome` e `transactionsData.totalExpense` da RPC em vez de calcular client-side com array potencialmente truncado.

### Passo 4: Adicionar invalidacoes no estorno (Bug 4)
Em `useVoidTransaction` e `useReverseTransaction`, adicionar `bank-accounts-summary` e `bank-transactions`.

### Passo 5: Tratar erros na desvinculacao (Bug 5)
Capturar `error` nos 3 updates de desvinculacao e lancar excecao se falhar.

### Passo 6: Completar invalidacoes do useCreateFinancialMovement (Bug 6)
Adicionar `bank-accounts-summary` e `bank-transactions` nas invalidacoes de `useCreateFinancialMovement`, `useRegisterExpense` e `useRegisterRevenue`.

