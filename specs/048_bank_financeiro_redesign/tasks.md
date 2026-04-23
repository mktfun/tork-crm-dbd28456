# Checklist: Master Spec 048

## Fase 1: Padronização do Dashboard e Tabela de Bancos (Antigravity)
- [x] Em `BankDashboardView.tsx`, importar `GlassKpiCard` e substituir os cards de Receitas e Despesas e Transações por ele (preservando o layout do card principal em destaque).
- [x] Em `BankDashboardView.tsx`, modificar o mapping da lista de transações para calcular o `type` (Entrada/Saída) com base correta: avaliando primeiramente se a categoria é de despesa, depois o operador do amount.
- [x] Em `BankTransactionsTable.tsx`, inspecionar o layout de `TransactionsTable` e replicar as estilizações (opacidade para confirmados, espaçamentos). O componente será editado para ter estética visual idêntica (inclusive a fonte mono pros valores), enquanto preserva as especificidades atuais (status, nome do banco consolidado).

## Fase 2: Hierarquia Clara de Plano de Contas (Antigravity)
- [x] Em `ConfiguracoesTab.tsx`, modificar a UI de `CategoriesSection`. Para cada child, utilizar ícone `CornerDownRight` (ou similar) no lado esquerdo com aumento de margin-left.
- [x] Modificar também as cores de hover do pai vs subcategorias para contrastar intensamente e mostrar que o dropdown (accordion) engloba os "itens dentro".

## Fase 3: Clareza ao Criar Subcategoria (Antigravity)
- [x] Em `AccountFormModal.tsx`, criar um badge ou componente visual na dialog de criação. Quando o usuário clica ou tem selecionado `parentId !== 'none'`, mostrar uma breadcrumb estilo: `Plano de Contas > Categoria "Tal" > [Sua Nova Subcategoria]`.
- [x] Adaptar a `DialogTitle` no modal dinamicamente para ler "Nova Subcategoria de [Nome do Pai]" se houver um pai mapeado.

## Fase 4: Bateria Final
- [x] Rodar validações de LINT no terminal local.
- [x] Validar UI abrindo o app localmente e acessando a aba configurações de plano de contas e bancário.
