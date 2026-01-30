
# Relatório Completo de Erros e Inconsistências - Módulo Financeiro

## PROBLEMA 1: Erro de Enum - `financial_account_type: "income"`

### Diagnóstico
A função SQL `get_revenue_by_dimension` contém um erro crítico. Ela usa o valor `'income'` para filtrar contas de receita, mas o enum `financial_account_type` do banco de dados NÃO POSSUI esse valor.

### Valores Válidos do Enum
```
asset | liability | equity | revenue | expense
```

### Código SQL com Erro (linha dentro da função)
```sql
WHERE ft.user_id = p_user_id
  AND fa.type = 'income'   -- ERRO: deveria ser 'revenue'
```

### Correção Necessária
Alterar a função RPC `get_revenue_by_dimension` no Supabase, substituindo:
```sql
AND fa.type = 'income'
```
Por:
```sql
AND fa.type = 'revenue'
```

---

## PROBLEMA 2: Metas Financeiras com Dados Mock

### Diagnóstico
Os hooks de metas financeiras retornam **valores fixos hardcoded** que não correspondem aos dados reais do sistema:

| Campo | Valor Mock | Valor Real (Janeiro 2026) |
|-------|-----------|---------------------------|
| Meta Mensal | R$ 50.000 | Não existe (tabela `financial_goals` não existe) |
| Faturamento | R$ 42.500 | ~R$ 20.322 (soma das receitas do período) |
| Percentual | 85% | N/A |

### Código Problemático
**Arquivo:** `src/hooks/useFinanceiro.ts` (linhas 701-721)
```typescript
export function useGoalVsActual(...) {
  return useQuery({
    queryFn: async (): Promise<GoalVsActual | null> => {
      // Mock data - VALORES HARDCODED
      const goalAmount = 50000;        // Não reflete realidade
      const actualAmount = 42500;       // Não reflete realidade
      // ...
    },
  });
}
```

### Causa Raiz
A tabela `financial_goals` **não existe** no banco de dados. Os hooks foram implementados com dados mock temporários, mas nunca foram atualizados para usar dados reais.

---

## PROBLEMA 3: Outros Potenciais Erros no Schema

### 3.1 Convenção de Nomenclatura Inconsistente
O código mistura termos em inglês:
- `income` (usado erroneamente para receita)
- `revenue` (valor correto no enum)

Isso pode causar confusão e erros futuros.

### 3.2 Hooks que Dependem de Tabelas/RPCs Inexistentes
| Hook | Tabela/RPC Esperada | Status |
|------|---------------------|--------|
| `useCurrentMonthGoal` | `financial_goals` | Não existe |
| `useGoalsByPeriod` | `financial_goals` | Não existe |
| `useGoalVsActual` | `financial_goals` | Não existe |
| `useUpsertGoal` | `financial_goals` | Não existe |
| `useDeleteGoal` | `financial_goals` | Não existe |

---

## Resumo das Correções Necessárias

### Correção Imediata (Backend/SQL)
1. **Corrigir a função `get_revenue_by_dimension`**:
```sql
CREATE OR REPLACE FUNCTION get_revenue_by_dimension(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_dimension TEXT
)
RETURNS TABLE (...) AS $$
BEGIN
  RETURN QUERY
  WITH revenue_transactions AS (
    SELECT ...
    FROM financial_transactions ft
    JOIN financial_ledger fl ON fl.transaction_id = ft.id
    JOIN financial_accounts fa ON fa.id = fl.account_id
    ...
    WHERE ft.user_id = p_user_id
      AND fa.type = 'revenue'  -- Corrigido de 'income' para 'revenue'
      AND ft.transaction_date BETWEEN p_start_date AND p_end_date
      AND NOT ft.is_void
      AND fl.amount < 0  -- Receitas são créditos (negativos no ledger)
  ),
  ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Correção Imediata (Frontend)
2. **Atualizar hooks de metas para usar dados reais** ou mostrar mensagem clara de que a funcionalidade não está implementada.

### Correção Futura
3. **Criar tabela `financial_goals`** para persistir metas:
```sql
CREATE TABLE financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  goal_type TEXT DEFAULT 'revenue',
  goal_amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, month, goal_type)
);
```

---

## Dados Reais do Sistema (Janeiro 2026)

| Métrica | Valor Real |
|---------|-----------|
| Receitas do mês | R$ 20.322,47 |
| Despesas do mês | R$ 1.000,00 |
| Total de transações | 60 |
| Contas ativas | 20+ |

**Nota:** Os valores de "meta mensal" mostrados na UI (R$ 50.000 / R$ 42.500) são completamente fictícios e não refletem nenhum dado do banco de dados.
