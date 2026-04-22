# Checklist: Master Spec 048

## Fase 1: Padronização do Dashboard e Tabela de Bancos (Antigravity)
- [ ] Em `BankDashboardView.tsx`, importar `GlassKpiCard` e substituir os cards de Receitas e Despesas e Transações por ele (preservando o layout do card principal em destaque).
- [ ] Em `BankDashboardView.tsx`, modificar o mapping da lista de transações para calcular o `type` (Entrada/Saída) com base correta: avaliando primeiramente se a categoria é de despesa, depois o operador do amount.
- [ ] Em `BankTransactionsTable.tsx`, inspecionar o layout de `TransactionsTable` e replicar as estilizações (opacidade para confirmados, espaçamentos). O componente será editado para ter estética visual idêntica (inclusive a fonte mono pros valores), enquanto preserva as especificidades atuais (status, nome do banco consolidado).

## Fase 2: Hierarquia Clara de Plano de Contas (Antigravity)
- [ ] Em `ConfiguracoesTab.tsx`, modificar a UI de `CategoriesSection`. Para cada child, utilizar ícone `CornerDownRight` (ou similar) no lado esquerdo com aumento de margin-left.
- [ ] Modificar também as cores de hover do pai vs subcategorias para contrastar intensamente e mostrar que o dropdown (accordion) engloba os "itens dentro".

## Fase 3: Clareza ao Criar Subcategoria (Antigravity)
- [ ] Em `AccountFormModal.tsx`, criar um badge ou componente visual na dialog de criação. Quando o usuário clica ou tem selecionado `parentId !== 'none'`, mostrar uma breadcrumb estilo: `Plano de Contas > Categoria "Tal" > [Sua Nova Subcategoria]`.
- [ ] Adaptar a `DialogTitle` no modal dinamicamente para ler "Nova Subcategoria de [Nome do Pai]" se houver um pai mapeado.

## Fase 4: Bateria Final
- [ ] Rodar validações de LINT no terminal local.
- [ ] Validar UI abrindo o app localmente e acessando a aba configurações de plano de contas e bancário.
