
# Plano de Correcao Sequenciado com Validacao SQL (4 Issues)

## Evidencias Coletadas da Auditoria

### Issue 1: Saldo -64k mas 246k receita e 0 despesa

**Prova SQL executada:**
```text
-- financial_transactions.type (usado pelo trigger de saldo - CORRETO)
type=expense: 134 transacoes, total=R$155.395,96
type=revenue: 187 transacoes, total=R$ 90.786,83
Saldo = 90.786 - 155.395 = -64.609 (BATE com current_balance)

-- get_bank_transactions RPC (usado pela UI - ERRADO)
account_type retornado: SEMPRE "revenue" para todas 321 transacoes
```

**Causa raiz**: A RPC `get_bank_transactions` usa `CROSS JOIN LATERAL` com `LIMIT 1` no `financial_ledger` + `financial_accounts`, priorizando contas do tipo `revenue` ou `expense`. Como TODAS as transacoes possuem uma conta `revenue` no ledger (Receita de Comissoes, Outras Receitas), o `LIMIT 1` sempre pega a conta revenue. A RPC ignora completamente o campo `financial_transactions.type` que e a fonte verdadeira.

**Correcao**: Alterar a RPC `get_bank_transactions` (versao de 4 params usada pelo dashboard) para usar `ft.type` como classificador em vez do LATERAL join. O campo `ft.type` ja esta correto e e o mesmo usado pelo trigger de saldo.

### Issue 2: KPIs divergentes (Conciliacao vs Dashboard de banco)

**Prova SQL:**
```text
-- bank_statement_entries para Bradesco (datas 2026-01-02 a 2026-02-25):
194 entradas de extrato

-- financial_transactions para Bradesco reconciliadas:
321 transacoes (134 expense + 187 revenue)
```

**Causa raiz**: Sao DUAS fontes de dados completamente diferentes:
- KPIs de Conciliacao = `bank_statement_entries` (194 linhas, classificadas por sinal do `amount`)
- Dashboard do Banco = `financial_transactions` via RPC (321 linhas, classificadas erroneamente como tudo revenue)

A divergencia e esperada pois os universos sao diferentes. O problema REAL e que o dashboard de banco esta classificando errado (Issue 1). Corrigindo o Issue 1, os numeros do dashboard ficarao coerentes com o saldo.

**Correcao**: Apos corrigir Issue 1, adicionar labels explicativos nos KPIs para distinguir "Movimentacao Bancaria" vs "Extrato Importado".

### Issue 3: Exclusao de banco sem aviso adequado

**Auditoria do codigo atual**: O `DeleteBankAccountDialog.tsx` JA implementa:
- Contagem de dados vinculados (transactions + statements)
- Opcao de mover para outro banco via Select
- Aviso quando e o unico banco
- Migracao antes da exclusao

**Status**: Este item JA ESTA IMPLEMENTADO CORRETAMENTE no codigo. O dialog mostra contagem, oferece migracao e avisa sobre dados. Nenhuma mudanca necessaria.

### Issue 4: Erro FIFO - ambiguidade de overload

**Prova SQL:**
```text
-- Duas versoes da RPC no banco:
1. reconcile_insurance_aggregate_fifo(p_statement_entry_id uuid, p_insurance_company_id uuid)
2. reconcile_insurance_aggregate_fifo(p_statement_entry_id uuid, p_insurance_company_id uuid, p_target_bank_id uuid DEFAULT NULL)
```

**Codigo atual do `useReconcileAggregate.ts`** ja envia `p_target_bank_id: null` (verificado no arquivo). PostgREST ainda nao consegue desambiguar porque existem 2 funcoes com nomes identicos e a versao de 2 params aceita os mesmos 2 args.

**Correcao**: Dropar a versao de 2 parametros via migracao SQL, mantendo apenas a de 3 parametros (que tem DEFAULT NULL, entao funciona igual).

---

## Sequencia de Execucao

### Passo 1: Migracao SQL - Dropar overload FIFO (Issue 4)

```sql
DROP FUNCTION IF EXISTS reconcile_insurance_aggregate_fifo(uuid, uuid);
```

**Validacao antes**: `SELECT count(*) FROM pg_proc WHERE proname='reconcile_insurance_aggregate_fifo'` = 2
**Validacao depois**: mesma query = 1

### Passo 2: Migracao SQL - Corrigir RPC get_bank_transactions (Issue 1)

Alterar a classificacao de `account_type` no retorno da RPC para usar `ft.type` diretamente em vez do LATERAL join no financial_accounts. A mudanca e cirurgica: trocar `COALESCE(fa.type::TEXT, 'expense') as type` por `COALESCE(ft.type, 'expense') as type` nos dois blocos (totais e paginacao).

**Validacao antes**: Chamar a RPC para Bradesco e verificar que account_type = 'revenue' para todas
**Validacao depois**: Chamar a RPC e verificar que 134 retornam 'expense' e 187 retornam 'revenue'

### Passo 3: Frontend - Simplificar classifyTransaction (Issue 1)

No `BankDashboardView.tsx`, o `classifyTransaction` pode ser simplificado agora que a RPC retorna o tipo correto. Manter a logica atual (que ja faz fallback pelo sinal do amount) e suficiente -- nao precisa de mudanca se a RPC for corrigida.

### Passo 4: Issue 2 - Labels descritivos

Adicionar subtitulos nos KPIs do `BankDashboardView.tsx`:
- Card Receitas: subtitulo "(base: transacoes conciliadas)"  
- Card Despesas: subtitulo "(base: transacoes conciliadas)"

### Passo 5: Nenhuma acao para Issue 3

Ja implementado. Confirmar visualmente que o dialog funciona.

---

## Resumo de Arquivos Alterados

| Arquivo | Mudanca |
|---------|---------|
| Migracao SQL | DROP overload FIFO 2-params |
| Migracao SQL | ALTER RPC `get_bank_transactions` para usar `ft.type` |
| `src/components/financeiro/bancos/BankDashboardView.tsx` | Adicionar labels descritivos nos KPIs |

## O que NAO muda
- `useReconcileAggregate.ts` (ja envia 3 params corretamente)
- `DeleteBankAccountDialog.tsx` (ja funciona)
- `useBancos.ts` (hooks de migracao ja existem)
- Triggers de saldo (ja usam `ft.type` corretamente)
