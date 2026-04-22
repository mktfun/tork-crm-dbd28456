# Design — Spec 047: Bancos Fix

## Divisão de Responsabilidades

Todos os fixes são **Antigravity direto** — sem Stitch (nenhuma tela nova com >200 linhas de JSX).

---

## Mapa de Componentes Afetados

```
BankDashboardView.tsx
  └── Mapeia transações → BankTransactionsTable (BUG 1: type errado)
  └── Cards de KPI (DESIGN: modernizar)

BankTransactionsTable.tsx
  └── formatDate usa new Date() puro (BUG 2: timezone)

TransactionDetailsSheet.tsx
  └── safeFormatDate(createdAt, ...) usa parseDateOnly (BUG 3: perde hora)
```

---

## Fluxo de Dados Correto (pós-fix)

```
RPC get_bank_transactions
  → tx.amount > 0 (crédito no banco) = Entrada = Verde
  → tx.amount < 0 (débito no banco)  = Saída  = Vermelho

TransactionDetailsSheet (está correto):
  → entries com accountType='expense'  = Saída
  → entries com accountType='revenue'  = Entrada

Pós-fix: as duas fontes usarão o mesmo critério (sinal do amount no banco asset)
```

---

## Referência Visual (Design Alvo)

Os cards de KPI devem seguir o padrão usado na tela de DRE e KPIs do financeiro:
- Fundo com gradiente sutil + borda colorida fraca
- Ícone colorido + label pequena
- Valor grande e bold na cor temática (verde/vermelho)
- Hover com elevação sutil (shadow-md)
