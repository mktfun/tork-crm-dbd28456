# Spec 048 — Ajuste de Design e Hierarquia de Categorias e Bancos

## Visão Geral

Foi identificado que o design da tela de bancos (`BankDashboardView`) não está alinhado com o padrão estético do módulo financeiro (ex: DRE, Transações). Além disso, a tabela de transações bancárias (`BankTransactionsTable`) está classificando incorretamente (quase) todas as transações como "Entrada", divergindo dos detalhes internos ("Saída").

Por fim, a organização do Plano de Contas sofreu uma atualização que unificou de forma visual as Despesas e Receitas com badges (o que foi aprovado), mas a hierarquia real (o que é categoria principal vs subcategoria) ficou confusa. O modal de cadastro (`AccountFormModal`) também não deixa claro para o usuário o que está acontecendo (criação de pai vs filho). 

---

## User Stories

- **US1:** Como corretor, quero que os cards de KPIs (Saldo, Receitas, Despesas) na visão de Bancos utilizem o padrão "GlassKpiCard" em vez dos cards básicos, para manter um design premium em todo o módulo.
- **US2:** Como corretor, quero que a `BankTransactionsTable` no dashboard de bancos pareça visualmente igual à `TransactionsTable` geral (linhas, estilo, opacidade em conciliados), enquanto mantém a coluna de exibir o nome do banco.
- **US3:** Como corretor, ao olhar a tabela de um banco, quero ver as saídas corretamente tipadas como "Saída" e não todas como "Entrada" (fix na condição que avalia `tx.amount > 0` vs o status contábil real do RPC).
- **US4:** Como corretor, ao abrir as Configurações de Plano de Contas, quero conseguir bater o olho e ver claramente a hierarquia "Categoria Mãe" -> "Subcategorias", com indentação e ícones conectores, de modo que não pareçam itens irmãos "misturados".
- **US5:** Como corretor, quando eu for adicionar uma subcategoria, o modal precisa mudar seu texto e layout para me dar total clareza de que NÃO estou criando uma categoria principal, mas sim vinculando a uma mãe.

---

## O que JÁ EXISTE e será REUTILIZADO

| Item | Localização | Ação |
|------|-------------|------|
| `GlassKpiCard` | `src/components/financeiro/shared/GlassKpiCard.tsx` | Reutilizar na `BankDashboardView` |
| `BankDashboardView` | `src/components/financeiro/bancos/BankDashboardView.tsx` | Modificar cards de KPI e lógica de mapping de transações |
| `BankTransactionsTable` | `src/components/financeiro/bancos/BankTransactionsTable.tsx` | Modificar CSS/Layout para copiar exatamente o visual da `TransactionsTable.tsx` |
| `ConfiguracoesTab` | `src/components/financeiro/ConfiguracoesTab.tsx` | Ajustar a renderização da tree no `CategoriesSection` para ficar super explícita |
| `AccountFormModal` | `src/components/financeiro/AccountFormModal.tsx` | Melhorar clareza dos labels, títulos e descrições ao selecionar um `parentId` |

## O que precisa ser CRIADO

- Nenhuma tela ou componente inteiramente novo. Apenas modificações e refinamentos estéticos e lógicos nos componentes já existentes.

---

## Critérios de Aceite

- [ ] KPI Cards no `BankDashboardView` utilizam o componente `GlassKpiCard` com os respectivos ícones e estilos unificados.
- [ ] `BankTransactionsTable` atualizada para ter a mesma tipografia, espaçamento, badges e hover state da `TransactionsTable` principal.
- [ ] A lógica em `BankDashboardView`: `type: tx.accountType === 'expense' \|\| tx.amount < 0 ? 'saida' : 'entrada'` corrigida para parar de exibir falsas "Entradas".
- [ ] `ConfiguracoesTab`: Subcategorias visualmente recuadas (nested) e com ícones conectores claros indicando hierarquia em relação à categoria pai.
- [ ] `AccountFormModal`: Se o usuário escolher uma Categoria Mãe, o título do modal reflete claramente "Nova Subcategoria", escondendo campos desnecessários se possível e exibindo um alerta ou resumo visual "Mãe -> Filha" para zero ambiguidade.
