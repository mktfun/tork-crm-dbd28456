

# Plano: Corrigir KPI "Recebido" — valor errado e título estático

## Problemas

### 1. Título "Recebido no Mês" fixo
Quando o período selecionado é de 3 meses (ex: 01 dez – 31 mar), o KPI continua dizendo "no Mês". Deveria dizer "no Período".

### 2. Valor R$71k vs R$111k no banco — contagem errada de parciais
A RPC `get_financial_summary` soma `total_amount` apenas de transações com `reconciled=true`. Mas após uma conciliação parcial (FIFO), a transação fica com `reconciled=false` e `paid_amount=400` de `total_amount=800`. Resultado: **nenhum centavo da parcial é contado no "Recebido"**, mesmo que R$400 já tenham sido efetivamente recebidos.

A RPC do banco (`get_bank_transactions`) não filtra por `reconciled` — por isso mostra R$111k (tudo que tem banco atribuído).

## Mudanças

### 1. Título dinâmico — `FinanceiroERP.tsx`

Passar `startDate` e `endDate` para `KpiSection`, detectar se o período é maior que 1 mês e usar "no Período" / "do Período" nos títulos dos KPIs.

### 2. RPC `get_financial_summary` — incluir parciais

Trocar a lógica de soma de receita/despesa de:

```sql
-- ANTES: só conta totalmente reconciliado
SUM(CASE WHEN type IN ('revenue',...) THEN total_amount END)
WHERE reconciled=true
```

Para:

```sql
-- DEPOIS: conta paid_amount de parciais + total_amount de reconciliados
SUM(CASE WHEN type IN ('revenue',...) 
    THEN CASE 
      WHEN reconciled=true THEN total_amount
      WHEN COALESCE(paid_amount,0) > 0 THEN paid_amount
      ELSE 0 
    END
END)
WHERE (reconciled=true OR COALESCE(paid_amount,0) > 0)
```

Isso garante que baixas parciais de R$200 contra um recebível de R$800 sejam contabilizadas como R$200 no "Recebido", sem esperar a baixa total.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/pages/FinanceiroERP.tsx` | Títulos dinâmicos "no Mês" vs "no Período" |
| Nova migration SQL | Recriar `get_financial_summary` com soma de `paid_amount` para parciais |

## Resultado

- KPIs dizem "no Período" quando range > 1 mês
- "Recebido" reflete o dinheiro efetivamente baixado, incluindo parciais
- Valor alinha com o que aparece no dashboard do banco

