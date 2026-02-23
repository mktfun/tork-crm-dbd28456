
# Plano: Corrigir 2 Build Errors

## Bug 1: `toast` nao importado no ReconciliationWorkbench

**Arquivo:** `src/components/financeiro/reconciliation/ReconciliationWorkbench.tsx`

O `toast.error(...)` e chamado na linha 357, mas `toast` de `sonner` nao foi importado. Adicionar `import { toast } from 'sonner';` no topo do arquivo.

## Bug 2: `NewDealModal` nao aceita props do Portal

**Arquivo:** `src/components/crm/NewDealModal.tsx`

O `RequestDetailsSheet` passa `defaultClientId`, `defaultTitle` e `defaultNotes` para o `NewDealModal`, mas a interface `NewDealModalProps` so aceita `open`, `onOpenChange` e `defaultStageId`.

Correcao:
1. Adicionar `defaultClientId?: string`, `defaultTitle?: string`, `defaultNotes?: string` a interface `NewDealModalProps`
2. Desestruturar essas props no componente
3. No `useEffect` de reset (linha 53-65), usar os valores default quando disponveis:
   - `title: defaultTitle || ''`
   - `client_id: defaultClientId || ''`
   - `notes: defaultNotes || ''`

Nenhuma outra alteracao necessaria -- o hook `useReconciliation.ts` e o workbench ja tem `related_entity_type` e `hasManualSystemItems` implementados corretamente.
