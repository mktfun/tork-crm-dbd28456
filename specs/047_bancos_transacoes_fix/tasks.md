# Tasks — Spec 047: Bancos Fix

## CATEGORIAS — Accordion com Expand/Collapse por Grupo (US2)

- [ ] **[ConfiguracoesTab.tsx — CategoriesSection]** Substituir a lista flat flattenedAccounts por grupos:
  - Separar contas pai (parentId === null) de filhas
  - Agrupa filhas sob cada pai
  - Renderizar accordion: cada grupo pai tem boto expand/collapse (ChevronDown/ChevronRight)
  - Badge de tipo colorido: Despesa = vermelho/rosa, Receita = verde
  - Subcategorias recuadas com linha de conexão visual (border-l-2 + ml-4)
  - Mostrar contador de subcategorias no header do grupo (ex: "3 subcategorias")

## MODAL — Melhorar AccountFormModal (US3)

- [ ] **[AccountFormModal.tsx]** Melhorias visuais e de UX:
  - Adicionar badge colorido no header do modal indicando o tipo (Despesa = vermelho, Receita = verde, Banco = azul)
  - No select de "Categoria Mãe": mostrar badge do tipo ao lado de cada opção
  - Quando parentId está selecionado: mostrar preview "Será criada como subcategoria de: [nome]"
  - Adicionar descrição contextual no topo ("Criar Subcategoria de X" vs "Criar Categoria Principal")



- [ ] **[BankDashboardView.tsx L268]** Corrigir o mapeamento de `type`:
  - Usar `tx.amount > 0 ? 'entrada' : 'saida'` (amount positivo no banco = crédito = entrada)
  - ⚠️ Validar com RPC: confirmar que `amount` positivo no banco = dinheiro entrando

## BUG 2 — Timezone nas Datas da Tabela

- [ ] **[BankTransactionsTable.tsx L46]** Substituir `new Date(dateString)` por `parseDateOnly(dateString)` do `@/lib/utils`
  - Importar `parseDateOnly` no topo do arquivo

## BUG 3 — "Criado em: 00:00" no TransactionDetailsSheet

- [ ] **[TransactionDetailsSheet.tsx L563]** Para `createdAt`, usar `parseISO` em vez de `parseDateOnly`:
  ```ts
  format(parseISO(transaction.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })
  ```
  - Garantir que `safeFormatDate` diferencie `DATE` puro de `TIMESTAMP`

## DESIGN — Modernizar Cards de KPI no BankDashboardView

- [ ] **[BankDashboardView.tsx L190-226]** Atualizar os 3 cards (Receitas/Despesas/Transações):
  - Adicionar `shadow-sm hover:shadow-md transition-shadow`
  - Adicionar ícone maior (w-8 h-8) com fundo circular em cor temática
  - Adicionar subtexto "do período" abaixo do valor principal
  - Alinhar estilo com cards do DRE/Financeiro

## VALIDAÇÃO

- [ ] Testar: abrir transação "TARIFA BANCARIA" → tabela mostra Saída → painel mostra Saída ✓
- [ ] Testar: data `2026-01-12` → tabela mostra `12/01/2026` (não `11/01/2026`) ✓
- [ ] Testar: "Criado em: 16/04/2026 X:XX" (não `00:00`) ✓
- [ ] Deploy: `supabase functions deploy` não necessário (mudanças só em frontend)
