

# Plano: KPIs e gráficos não contabilizam conciliações de outros períodos

## Problema

Todas as RPCs financeiras filtram por `transaction_date` (data original da transação). Quando uma transação de outubro é conciliada em janeiro, ela **não aparece** no período jan-mar porque o `transaction_date` é outubro.

A coluna `reconciled_at` já existe na tabela `financial_transactions` mas nunca é usada para filtrar.

### Lógica correta (regime de caixa)

Para itens **efetivados** (reconciled=true ou paid_amount>0), o filtro de data deveria usar `reconciled_at` (quando o dinheiro entrou), não `transaction_date` (quando a transação foi criada).

Para itens **pendentes**, continua usando `due_date` ou `transaction_date`.

## RPCs afetadas (3 mudanças)

### 1. `get_financial_summary` — KPIs principais

**Linha 34 atual:**
```sql
AND t.transaction_date BETWEEN p_start_date AND p_end_date
```

**Corrigir para:**
```sql
AND COALESCE(t.reconciled_at::date, t.transaction_date) BETWEEN p_start_date AND p_end_date
```

Isso faz: se tem `reconciled_at`, usa essa data; senão, fallback para `transaction_date`.

Aplicar nas queries de current income/expense (linha 34) e previous income/expense (linha 67).

### 2. `get_cash_flow_data` — Gráfico "Evolução do Faturamento"

**Linha 183-185 atual:**
```sql
TO_CHAR(ft.transaction_date, ...) AS period_key
...
AND ft.transaction_date BETWEEN p_start_date AND p_end_date
```

**Corrigir para:**
```sql
TO_CHAR(COALESCE(ft.reconciled_at::date, ft.transaction_date), ...) AS period_key
...
AND COALESCE(ft.reconciled_at::date, ft.transaction_date) BETWEEN p_start_date AND p_end_date
```

### 3. `get_revenue_transactions` — Lista de receitas na aba Transações

**Linhas 85-86 atual:**
```sql
AND (p_start_date IS NULL OR ft.transaction_date >= p_start_date)
AND (p_end_date IS NULL OR ft.transaction_date <= p_end_date)
```

**Corrigir para:**
```sql
AND (p_start_date IS NULL OR COALESCE(ft.reconciled_at::date, ft.transaction_date) >= p_start_date)
AND (p_end_date IS NULL OR COALESCE(ft.reconciled_at::date, ft.transaction_date) <= p_end_date)
```

## Verificação prévia

Antes de aplicar, confirmar que `reconciled_at` está sendo populado nas conciliações. Query de validação:
```sql
SELECT COUNT(*) as total, COUNT(reconciled_at) as with_date 
FROM financial_transactions WHERE reconciled = true
```

Se `reconciled_at` estiver NULL em transações reconciliadas, será necessário um fix de dados adicional para popular o campo retroativamente (usando `created_at` ou `updated_at` como fallback).

## Arquivo

| Arquivo | Ação |
|---|---|
| Nova migration SQL | Recriar as 3 RPCs com filtro por `COALESCE(reconciled_at::date, transaction_date)` |

## Resultado

- Transações conciliadas aparecem no período em que foram efetivadas, não no período original
- KPIs, gráfico e lista de transações todos alinhados
- Pendentes continuam filtrados por data de vencimento (sem mudança)

