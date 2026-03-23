

# Plano: Mover "Excluir Extrato" do Workbench para o Histórico de Importações

## O que

Remover o modo de exclusão do `ReconciliationWorkbench` e adicionar um botão "Excluir" em cada card de importação no Histórico (`ReconciliationPage.tsx`). Ao clicar, abre um `AlertDialog` de confirmação e deleta todas as `bank_statement_entries` daquele `import_batch_id`, além do registro em `bank_import_history`.

## Mudanças

### 1. `ReconciliationWorkbench.tsx` — Remover modo exclusão

- Remover estados: `deleteMode`, `deleteSelectedIds`, `showDeleteConfirm`, `isDeleting`
- Remover funções: `toggleDeleteItem`, `toggleDeleteAll`, `exitDeleteMode`, `handleDeleteConfirm`
- Remover o botão `Trash2` do header do painel esquerdo
- Remover checkboxes condicionais dos `EntryCard`
- Remover o `AlertDialog` de confirmação de exclusão
- Remover floating bar de exclusão
- Limpar imports não utilizados (`Trash2`, `Checkbox`, `AlertDialog*` se não usados em outro lugar)

### 2. `ReconciliationPage.tsx` — Adicionar exclusão por lote no Histórico

- Adicionar estado: `deletingBatchId` (string | null) e `isDeleting` (boolean)
- Em cada card de importação (linha 627-687), adicionar um botão `Trash2` ao lado do "Ver Detalhes"
- `AlertDialog` de confirmação com resumo: "Excluir X transações importadas em DD/MM/YYYY?"
- Ao confirmar:
  1. `DELETE FROM bank_statement_entries WHERE import_batch_id = $batchId`
  2. `DELETE FROM bank_import_history WHERE id = $batchId`
  3. Invalidar queries: `bank-statement-entries`, `pending-reconciliation`, `reconciliation-kpis`, `import-history`
  4. Toast de sucesso
- Importar `Trash2` e componentes do `AlertDialog`

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `ReconciliationWorkbench.tsx` | Remover todo o código de delete mode (~100 linhas) |
| `ReconciliationPage.tsx` | Adicionar botão excluir por lote no histórico + AlertDialog de confirmação |

Sem migration. Sem deploy.

