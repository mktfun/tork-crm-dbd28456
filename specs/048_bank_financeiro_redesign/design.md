# Spec 048 — Design Document

## 1. Abordagem de Frontend (Antigravity)

### 1.1 Atualização de `BankDashboardView`
- **KPIs**: Substituiremos os cards de UI direta por `GlassKpiCard`.
  - Saldo Atual: Manter tipografia grande (text-4xl).
  - Receitas e Despesas: Trocar os "Cards customizados" por `GlassKpiCard` utilizando layout unificado.
- **Lógica do Tipo (Bug Fix)**:
  - O código atual mapeia: `type: tx.amount >= 0 ? 'entrada' : 'saida'`.
  - Como as transações vindas do view do ledger/banco parecem estar com valor matemático diferente dependendo da query SQL, a lógica em TypeScript será aprimorada combinando valor e account type: 
    - `type: (tx.accountType === 'expense' || tx.amount < 0) ? 'saida' : 'entrada'` (Ajustaremos de forma que combine 100% com a visão do TransactionDetailsSheet).

### 1.2 Atualização Visual em `BankTransactionsTable`
- **Pilar**: Usaremos as mesmas classes base da `TransactionsTable`: border-border, opacity no status consolidado/confirmado, cores de setas (ArrowUpRight text-emerald-500, ArrowDownRight text-rose-500).
- Vamos uniformizar o tamanho da fonte, ícones de setas nas Entradas (+) e Saídas (-) mantendo o componente separado, uma vez que a coluna "Banco" só existe na visão consolidada e a badge de status é "Status" em vez de só "Categoria".

### 1.3 `ConfiguracoesTab` (Plano de Contas Hierarquia)
- No `CategoriesSection`, cada item "Filho" no loop renderizado atualmente tem apenas um divisor de cor.
- **Melhoria UX/Visual**: Em vez de só uma cor do lado, utilizaremos ícones de conector `CornerDownRight` (lucide-react), recuo (margin/padding) estendido (`ml-12`) e faremos o agrupamento mãe ser mais robusto, tirando a sensação de "tabela flat". O agrupamento já existe na lógica (`groupedAccounts`), apenas o visual carece da visão de "Árvore" estilizada.

### 1.4 `AccountFormModal` (Clareza no Cadastro)
- **Melhoria Dinâmica**: Adição de um feedback visual no modal quando `parentId !== 'none'`.
- Vamos renderizar uma dica estrutural (Ex: Box cinza mostrando algo como `Seu Plano de Contas > Categoria Mãe Selecionada > [A categoria que está sendo criada]`) antes do botão "Criar".
- Mudaremos o Header para destacar a palavra "Subcategoria" caso um grupo pai esteja selecionado.

## 2. Abordagem de Backend / DB
Não há criação de novas tabelas ou migrações neste Spec. A estrutura e funções já retornam dados adequados, apenas a UI estava descalibrada com a complexidade de UI exigida.

## 3. Onde o Código Será Modificado
1. `src/components/financeiro/bancos/BankDashboardView.tsx` (Antigravity)
2. `src/components/financeiro/bancos/BankTransactionsTable.tsx` (Antigravity)
3. `src/components/financeiro/ConfiguracoesTab.tsx` (Antigravity)
4. `src/components/financeiro/AccountFormModal.tsx` (Antigravity)
