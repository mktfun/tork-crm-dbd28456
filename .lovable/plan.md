

# Plano: Botão "Excluir Extrato" no Workbench de Conciliação

## O que

Adicionar um botão "Excluir" no header do painel esquerdo (Extrato) do `ReconciliationWorkbench`. Ao clicar, o workbench entra em "modo de exclusão": checkboxes aparecem ao lado de cada entry do extrato. O usuário seleciona as que quer deletar e confirma com um botão na floating action bar.

## Como

### `ReconciliationWorkbench.tsx`

1. **Novo estado**: `deleteMode` (boolean) e `deleteSelectedIds` (string[])
2. **Botão no header** do painel esquerdo (linha 632): ícone `Trash2`, ao clicar ativa `deleteMode`
3. **Modo exclusão ativo**:
   - Cada `EntryCard` ganha um `Checkbox` à esquerda (renderizado condicionalmente)
   - Checkbox "selecionar todos" no header
   - A floating action bar muda para exibir: contagem de selecionados + botão "Excluir X entradas" (vermelho) + botão cancelar
4. **Confirmação**: Dialog de confirmação antes de deletar ("Tem certeza? Esta ação é irreversível")
5. **Mutation**: `DELETE FROM bank_statement_entries WHERE id IN (...)` via supabase client direto (RLS já permite `Users can delete own statement entries`)
6. **Pós-delete**: Invalidar queries (`bank-statement-entries`, `pending-reconciliation`, `reconciliation-kpis`, `import-history`), sair do modo exclusão, toast de sucesso
7. **Importar** `Trash2` e `Checkbox` nos imports do componente

### Detalhes de UX

- Botão pequeno `ghost` com ícone `Trash2` no header, tooltip "Excluir entradas"
- Em modo exclusão, desabilitar a seleção normal (conciliação) para evitar conflito
- Badge vermelha mostrando quantos estão selecionados
- Dialog com resumo: "X entradas | Total: R$ Y"

| Arquivo | Ação |
|---|---|
| `src/features/finance/components/reconciliation/ReconciliationWorkbench.tsx` | Adicionar modo exclusão com checkboxes, floating bar adaptada, dialog de confirmação e mutation de delete |

Sem migration. Sem deploy.

