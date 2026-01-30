

# Plano de Correção dos Erros de Build

## Diagnóstico

Após análise completa do código, identifiquei **1 erro de build** ativo que precisa ser corrigido:

### Erro Principal
```
src/components/financeiro/ReceitasTab.tsx(417,27): error TS2322:
Type 'CashFlowDataPoint[]' is not assignable to type '{ date: string; income: number; expense: number; }[]'.
Property 'date' is missing in type 'CashFlowDataPoint' but required in type '{ date: string; income: number; expense: number; }'.
```

**Causa Raiz:** Incompatibilidade de interface entre:
- `CashFlowDataPoint` (definido em `src/types/financeiro.ts`) usa a propriedade `period`
- `FaturamentoChart` espera uma prop `data` com propriedade `date`

---

## Solução Proposta

Atualizar o componente `FaturamentoChart` para aceitar o tipo correto `CashFlowDataPoint[]` e mapear internamente o campo `period` para exibição.

### Arquivo a Modificar
**`src/components/financeiro/faturamento/FaturamentoChart.tsx`**

### Alterações

1. **Importar o tipo correto:**
```typescript
import { CashFlowDataPoint } from '@/types/financeiro';
```

2. **Atualizar a interface de Props:**
```typescript
interface FaturamentoChartProps {
  data: CashFlowDataPoint[];  // Usa o tipo real do hook
  isLoading?: boolean;
}
```

3. **Ajustar o processamento de dados para usar `period`:**
```typescript
const chartData = useMemo(() => {
  return data
    .filter(item => item.period && !isNaN(new Date(item.period).getTime()))
    .map(item => ({
      date: format(new Date(item.period), "dd/MM", { locale: ptBR }),
      faturamento: item.income,
    }));
}, [data]);
```

4. **Ajustar o cálculo de totais:**
```typescript
const totalFaturamento = useMemo(() => {
  return data.reduce((sum, item) => sum + (item.income || 0), 0);
}, [data]);
```

---

## Código Final do Componente

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CashFlowDataPoint } from '@/types/financeiro';

interface FaturamentoChartProps {
  data: CashFlowDataPoint[];
  isLoading?: boolean;
}

export function FaturamentoChart({ data, isLoading }: FaturamentoChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const chartData = useMemo(() => {
    return data
      .filter(item => item.period && !isNaN(new Date(item.period).getTime()))
      .map(item => ({
        date: format(new Date(item.period), "dd/MM", { locale: ptBR }),
        faturamento: item.income,
      }));
  }, [data]);

  const totalFaturamento = useMemo(() => {
    return data.reduce((sum, item) => sum + (item.income || 0), 0);
  }, [data]);

  // ... resto do componente permanece igual
}
```

---

## Impacto

| Arquivo | Tipo de Alteração |
|---------|------------------|
| `src/components/financeiro/faturamento/FaturamentoChart.tsx` | Corrigir tipagem de props para usar `CashFlowDataPoint` |

---

## Verificação

Após a correção:
- O erro de TypeScript será resolvido
- O componente continuará funcionando normalmente pois `income` já existe em `CashFlowDataPoint`
- A compatibilidade com `useCashFlowData` será mantida

