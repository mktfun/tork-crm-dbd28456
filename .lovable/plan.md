
# Redesign do Modulo de Conciliacao Bancaria

## Resumo

Refatorar a UX/UI da tela de Conciliacao com 3 melhorias cirurgicas: (1) botoes semanticos distintos no Workbench, (2) modal unica de categoria para criacao em lote, e (3) auditoria com nome do usuario nas mutations de conciliacao.

---

## Tarefa 1: Botoes Semanticos e Distintos no Workbench

**Problema:** Os botoes "Conciliar" e "Criar Lancamento" na Floating Action Bar do Workbench nao tem diferenciacao visual clara o suficiente.

**Solucao:** No `ReconciliationWorkbench.tsx`, ajustar os botoes da barra flutuante:

- **Conciliar (match perfeito):** Manter `bg-emerald-600` com icone `CheckCircle2` -- ja esta correto.
- **Baixa Parcial:** Manter `bg-amber-600` com `AlertTriangle` -- ja esta correto.
- **Criar Lancamento:** Mudar para `variant="outline"` com estilo mais sutil, adicionando um label descritivo "Criar Despesa/Receita" para nao confundir com a acao de conciliar.
- **Conciliar FIFO:** Manter `bg-amber-600` com `AlertTriangle`.

Nenhuma mudanca estrutural grande aqui -- apenas refinamento de labels e estilos ja existentes.

---

## Tarefa 2: Modal Unica de Categoria para Criacao em Lote (Bulk Create)

**Problema atual:** O modal `showCreateModal` no Workbench ja aceita multiplos IDs de extrato (`selectedStatementIds`) e faz loop chamando `createFromStatement.mutateAsync` para cada um com a mesma `createCategoryId`. Porem, o botao "Criar Lancamento" so aparece quando `isMissingTransaction` (selecionou extrato, nao selecionou sistema). Precisa garantir que:

1. O preview na modal mostre TODAS as entradas selecionadas (ja faz isso).
2. A categoria seja perguntada UMA UNICA VEZ (ja faz isso).
3. O loop execute para todas (ja faz isso).

**Verificacao:** O codigo atual (linhas 430-443 do Workbench e 810-878) ja implementa a logica correta! O modal mostra todas as entradas selecionadas e pede a categoria uma vez. O loop `for (const stmtId of selectedStatementIds)` ja existe.

**Ajuste necessario:** Apenas melhorar o feedback visual:
- Adicionar um contador de progresso durante o loop (ex: "Criando 3 de 15...")
- Adicionar um toast com contagem final ("15 lancamentos criados com sucesso!")
- No modal, exibir o total somado das entradas selecionadas para contexto

---

## Tarefa 3: Auditoria -- Nome do Usuario nas Conciliacoes

**Problema:** As mutations de conciliacao (`reconcile_transactions`, `reconcile_transaction_partial`, `manual_reconcile_transaction`) nao enviam o nome do auditor. Apenas o `StatementImporter` grava `auditor_name` no `bank_import_history`.

**Contexto do banco:** A coluna `matched_by` em `bank_statement_entries` ja existe e armazena o UUID do usuario. A RPC `get_bank_statement_paginated` ja retorna `reconciled_by_name` via join com `profiles`. Logo, o backend ja resolve a auditoria pelo `matched_by` UUID -- nao precisamos enviar nome textual nas mutations de conciliacao, pois as RPCs ja setam `matched_by = auth.uid()` internamente.

**Verificacao necessaria:** Confirmar que as RPCs de conciliacao realmente preenchem `matched_by`. Se sim, nenhuma mudanca de backend e necessaria. Se nao, precisaremos de uma migracao SQL.

**Ajuste no frontend:**
- Garantir que o tooltip "Conciliado por: X" apareca tambem no Workbench (alem da Lista), mostrando quem fez a conciliacao em cada card apos reconciliado.
- No historico de importacoes, o `auditor_name` ja e exibido corretamente.

---

## Detalhes Tecnicos

### Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/financeiro/reconciliation/ReconciliationWorkbench.tsx` | Refinar labels dos botoes, adicionar progresso no bulk create, melhorar feedback |
| `src/components/financeiro/reconciliation/ReconciliationPage.tsx` | Nenhuma mudanca estrutural -- a lista ja tem auditoria visual |

### O que NAO sera alterado
- Layout split-screen do Workbench (ja usa `ResizablePanelGroup` 50:50 com scroll independente)
- Backend/RPCs existentes
- KPIs e dashboards
- Painel esquerdo do extrato
- InsuranceAggregateCard e logica FIFO

### Validacoes de seguranca
- Null-safe checks em arrays (`statementItems || []`, `accounts || []`)
- Fallback states para listas vazias
- Desabilitar botoes durante `isPending`
