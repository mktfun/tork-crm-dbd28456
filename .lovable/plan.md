
# Plano de Correção Completa - Erros de Build

## Diagnóstico Completo

Identifiquei **13 erros de build** distribuídos em **5 arquivos**. Vou corrigir todos eles de uma só vez.

---

## Erros por Arquivo

### 1. `src/components/financeiro/CaixaTab.tsx` (2 erros)

**Erro 1:** `activeAccounts` não existe em `ConsolidatedBalanceCardProps` (deveria ser `accountCount`)
```
Linha 89: activeAccounts={activeAccountsCount}
```

**Erro 2:** O tipo `BankAccountType` de `useBancos` inclui `"giro"`, mas o mock `BankAccount` só aceita `"corrente" | "digital" | "investimento" | "poupanca"`

**Correção:**
- Renomear `activeAccounts` para `accountCount`
- Criar uma função de mapeamento para converter o tipo de conta

---

### 2. `src/hooks/useBancos.ts` (7 erros)

**Causa:** O hook tenta acessar uma tabela (`bank_accounts`) e uma RPC (`get_bank_accounts_summary`) que **não existem no banco de dados**.

**Correção:**
- Converter o hook para usar dados mock temporariamente (mesmo padrão que outros componentes usam)
- Manter a interface para futura integração com backend

---

### 3. `src/hooks/useFinanceiro.ts` (1 erro)

**Erro:** Importação de módulo inexistente
```typescript
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
```

**Correção:**
- Usar `supabase` diretamente do cliente já configurado
- Obter session via `supabase.auth.getSession()`

---

### 4. `src/pages/Tesouraria.tsx` (3 erros)

**Erro:** Passando props para componentes que não as aceitam:
- `ReceivablesList` espera apenas `daysAhead`, não `receivables` e `totalAmount`
- `AgingReportCard` não aceita props (usa hook interno)
- `AccountsPayableReceivableTable` não aceita props (usa hook interno)

**Correção:**
- Remover as props desnecessárias dos componentes (eles já usam hooks internamente)

---

## Arquivos a Modificar

| Arquivo | Correção |
|---------|----------|
| `src/components/financeiro/CaixaTab.tsx` | Corrigir nome da prop e mapeamento de tipo |
| `src/hooks/useBancos.ts` | Usar dados mock até backend estar pronto |
| `src/hooks/useFinanceiro.ts` | Corrigir import do Supabase |
| `src/pages/Tesouraria.tsx` | Remover props que componentes não aceitam |

---

## Detalhes Técnicos

### CaixaTab.tsx - Correções

```tsx
// Linha 88-90: Corrigir prop name
<ConsolidatedBalanceCard
  totalBalance={totalBalance}
  accountCount={activeAccountsCount}  // ← Era 'activeAccounts'
/>

// Linhas 117-127: Mapear tipos corretamente
const mapAccountType = (type: string): 'corrente' | 'digital' | 'investimento' | 'poupanca' => {
  if (type === 'giro') return 'corrente';
  if (type === 'digital' || type === 'poupanca' || type === 'investimento' || type === 'corrente') {
    return type;
  }
  return 'corrente';
};
```

### useBancos.ts - Usar Mock Data

O banco de dados não possui a tabela `bank_accounts` nem a função `get_bank_accounts_summary`. Vou converter para retornar dados mock:

```typescript
export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts-summary'],
    queryFn: async (): Promise<BankAccountsSummary> => {
      // Retorna mock data até backend estar implementado
      const mockAccounts: BankAccount[] = [
        {
          id: '1',
          bankName: 'Itaú',
          accountNumber: '12345-6',
          agency: '0001',
          accountType: 'corrente',
          currentBalance: 187432.50,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          color: '#FF6B00',
          icon: '🏦',
        },
        // ... mais contas
      ];
      
      return {
        accounts: mockAccounts,
        totalBalance: mockAccounts.reduce((sum, a) => sum + a.currentBalance, 0),
        activeAccounts: mockAccounts.filter(a => a.isActive).length,
      };
    },
  });
}
```

### useFinanceiro.ts - Corrigir Import

```typescript
// ANTES (linha 400)
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

// DEPOIS
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

// E nos hooks que usam isso:
const [userId, setUserId] = useState<string | null>(null);

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setUserId(data.session?.user?.id || null);
  });
}, []);
```

### Tesouraria.tsx - Remover Props

```tsx
// ANTES
<ReceivablesList receivables={receivables} totalAmount={totalReceivables} />
<AgingReportCard buckets={agingBuckets} totalAmount={totalAging} />
<AccountsPayableReceivableTable transactions={transactions} />

// DEPOIS
<ReceivablesList daysAhead={30} />
<AgingReportCard />
<AccountsPayableReceivableTable />
```

---

## Ordem de Execução

1. **useFinanceiro.ts** - Corrigir import quebrado
2. **useBancos.ts** - Converter para mock data
3. **CaixaTab.tsx** - Corrigir props e tipos
4. **Tesouraria.tsx** - Remover props inválidas

---

## Resultado Esperado

Após as correções:
- Build passará sem erros
- Funcionalidades mantidas com dados mock
- Pronto para futura integração com backend real
