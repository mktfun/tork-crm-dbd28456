# Spec 047 — Bancos: Fix de Tipo, Data e Design do Histórico de Movimentações

## Visão Geral

A tela de detalhes de banco (`BankDashboardView`) e o painel lateral de transação (`TransactionDetailsSheet`) apresentam **inconsistências críticas de dados e design** que comprometem a confiabilidade para o usuário final.

Foram identificados **3 bugs ativos** e **1 problema de design** para corrigir e padronizar.

---

## User Stories

- **US1:** Como corretor, ao abrir uma transação da lista, quero que o tipo e o valor batam exatamente: se é **Saída**, aparecer vermelho e valor negativo em ambos (tabela e painel); se é **Entrada**, aparecer verde e positivo em ambos — sem discrepância.
- **US2:** Como corretor, quero ver as categorias do Plano de Contas agrupadas por **Categoria (pai) → Subcategoria (filha)** com botão expand/collapse por grupo (tipo accordion), diferenciando visualmente Despesa vs Receita, para entender de uma vez a hierarquia.
- **US3:** Como corretor, quero que o modal de criar/editar categoria seja mais claro, indicando se estou criando uma categoria principal ou subcategoria, com badge de tipo (Despesa/Receita) visível no próprio modal.
- **US4:** Como corretor, quero ver a data correta da transação (ex: 16/04/2026), não meia-noite (00:00), sem distorções de fuso horário.
- **US5:** Como corretor, quero que os cards de KPI (Receitas, Despesas, Total) na tela de banco sigam o mesmo design premium das outras telas financeiras.

---

## Diagnóstico Completo dos Bugs

### 🐛 Bug 1 — Tipo Invertido na Tabela vs. Painel Lateral

**Causa Raiz Identificada (`BankDashboardView.tsx`, linha 268):**

```ts
// CÓDIGO BUGADO:
type: (tx.accountType === 'revenue' || tx.accountType === 'receita' || tx.amount >= 0) ? 'entrada' : 'saida',
```

O `accountType` vindo do RPC `get_bank_transactions` para a conta de **ativo (banco)** é `'asset'` — nem `'revenue'` nem `'receita'`. Como resultado, a condição cai sempre em `tx.amount >= 0`.

O RPC retorna os lançamentos da perspectiva do **Plano de Contas**: uma TARIFA BANCÁRIA de R$9,80 debita o ativo, então `amount` é **positivo** no ledger (débito) mas a natureza da transação é **Saída**. Já o `TransactionDetailsSheet` usa a lógica correta via `ledgerEntries` buscando `accountType === 'expense'`.

A tabela na visão do banco lê `amount >= 0` → "Entrada". O painel lateral lê os entries do ledger → "Saída". **Divergência comprovada.**

**Fix:** derivar `type` a partir do `accountType` corretamente:
- `accountType === 'revenue'` → Entrada
- `accountType === 'expense'` → Saída
- `accountType === 'asset'` com amount > 0 → Entrada (dinheiro entrando no banco)
- `accountType === 'asset'` com amount < 0 → Saída (dinheiro saindo do banco)

Mas o correto é pegar do campo `account_type` do RPC que representa a conta de CATEGORIA (não de ativo). O RPC precisa retornar o `category_account_type` para que o frontend saiba se é receita ou despesa sem ambiguidade.

**Solução Simples (sem alterar RPC):** O hook `useBankTransactions` já não mapeia `accountType` da categoria. Verificar se o RPC retorna algum campo de natureza da transação. Se não, adicionar lógica: se `amount < 0` no banco = Saída; vindo de account `revenue` = Entrada.

### 🐛 Bug 2 — Datas Aparecem como Midnight (00:00)

**Causa Raiz:** A `transaction_date` chega do banco como `DATE` (ex: `2026-01-12`). Ao fazer `new Date("2026-01-12")` no JavaScript, ele interpreta como UTC midnight, e em timezone -03:00 vira **11/01/2026 às 21:00** — mostrando dia anterior.

O `TransactionDetailsSheet` já tem `parseDateOnly` corrigido. Mas o `BankTransactionsTable.formatDate` usa `new Date(dateString)` direto (linha 46 de `BankTransactionsTable.tsx`).

**Fix:** Usar `parseDateOnly` do `@/lib/utils` também no `BankTransactionsTable`.

### 🐛 Bug 3 — "Criado em: 16/04/2026 00:00" no painel lateral

O `createdAt` é um timestamp com timezone. O `safeFormatDate` no `TransactionDetailsSheet` (linha 563) usa `parseDateOnly` que ignora o horário. Para `createdAt`, deve-se usar `parseISO` e formatar com hora, não `parseDateOnly`.

**Fix:** No `TransactionDetailsSheet`, linha 563 — usar `parseISO` para `createdAt` em vez de `parseDateOnly`.

### 🎨 Problema de Design — Cards e Tabela Desatualizados

A tela `BankDashboardView` usa cards simples sem glassmorphism, tipografia fraca e sem micro-interações. As outras telas do módulo financeiro (DRE, Extrato, etc.) usam um design premium com gradientes, ícones e paletas bem definidas.

A `BankTransactionsTable` também não está alinhada visualmente com a `shared/TransactionsTable.tsx` (que tem visual mais elaborado com badges por status e hover states).

---

## O que JÁ EXISTE e será REUTILIZADO

| Item | Localização |
|------|-------------|
| `TransactionDetailsSheet` | `src/components/financeiro/TransactionDetailsSheet.tsx` |
| `BankTransactionsTable` | `src/components/financeiro/bancos/BankTransactionsTable.tsx` |
| `BankDashboardView` | `src/components/financeiro/bancos/BankDashboardView.tsx` |
| `useBankTransactions` | `src/hooks/useBancos.ts` |
| `parseDateOnly` | `src/lib/utils.ts` |
| Design ref financeiro | `src/components/financeiro/shared/TransactionsTable.tsx` |

## O que precisa ser CRIADO

- Nada novo. Apenas correções e refinamentos nos arquivos existentes.

---

## Critérios de Aceite

- [ ] Tabela mostra "Entrada" somente quando o painel lateral também mostra "Entrada"
- [ ] Tabela mostra "Saída" somente quando o painel lateral também mostra "Saída"
- [ ] Valores +/- na tabela batem com os do painel lateral
- [ ] Datas na tabela exibem o dia correto (sem shift de timezone)
- [ ] "Criado em" no painel lateral exibe hora correta (não 00:00)
- [ ] Cards de KPI (Receitas/Despesas/Total) estão visualmente alinhados com o restante do módulo financeiro
- [ ] Nenhum componente novo criado — só edições cirúrgicas nos existentes
