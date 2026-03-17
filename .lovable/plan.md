

# Plano: Won/Lost Actions + Filtros + Optimistic DnD

## Etapa 1 — DealDetailsModal: Botoes Ganho/Perdido + Select de Etapa (view mode)

**`src/components/crm/DealDetailsModal.tsx`**

No header (abaixo do titulo, linhas 232-242), adicionar uma barra de quick-actions:
- Botao "Ganho" (`bg-green-600 hover:bg-green-700 text-white`) e "Perdido" (`variant="destructive"`)
- Cada botao chama `updateDeal.mutateAsync({ id: deal.id, stage_id: wonStageId/lostStageId })` onde won = stage com `chatwoot_label` contendo "ganho" e lost = "perdido". Fallback: nao mostrar se nao existir a etapa.
- Apos sucesso: toast + `onOpenChange(false)`

No modo de visualizacao (nao editing, linhas 368-378), trocar o badge estático da etapa por um `Select` inline que permite mudar a etapa diretamente (sem entrar em modo edicao). O `onValueChange` dispara `updateDeal.mutateAsync({ id: deal.id, stage_id: newStageId })`.

## Etapa 2 — KanbanBoard: Barra de Filtros

**`src/components/crm/KanbanBoard.tsx`**

Adicionar estado de filtros: `statusFilter` ('all' | 'open' | 'won' | 'lost') e `dateFilter` (start/end dates).

Acima do `DndContext`, renderizar uma barra de filtros com:
- `Select` para status (Todos / Abertos / Ganhos / Perdidos)
- Dois inputs `type="date"` para intervalo de datas

Logica de filtro: mapear status para stage labels — "won" = stages cujo `chatwoot_label` contem "ganho", "lost" = "perdido", "open" = demais. Filtrar `deals` antes de agrupar em `dealsByStage`.

Para datas, filtrar por `expected_close_date` ou `created_at` dentro do intervalo.

## Etapa 3 — Optimistic Update no DnD

**`src/components/crm/KanbanBoard.tsx`** — refatorar `handleDragEnd`:

Em vez de chamar `moveDeal.mutate()` e esperar a query invalidar, usar `queryClient.setQueryData` para atualizar o cache local imediatamente:

1. Snapshot do estado atual: `const previousDeals = queryClient.getQueryData(['crm-deals', ...])`
2. Atualizar cache otimisticamente: modificar o `stage_id` e `position` do deal no array cacheado
3. Disparar `moveDeal.mutateAsync(...)` em try/catch
4. No catch: reverter com `queryClient.setQueryData(..., previousDeals)` + toast de erro

Isso precisa do `queryClient` — importar `useQueryClient` no componente.

## Etapa 4 — Hook useCRMDeals: expor queryClient key

Para o optimistic update funcionar no KanbanBoard, o `moveDeal` mutation precisa **nao** invalidar queries no `onSuccess` (ja foi atualizado otimisticamente). Alternativa: manter a invalidacao mas aceitar que o UI ja esta correto — a invalidacao apenas confirma.

Nenhuma mudanca necessaria no hook — a invalidacao via realtime subscription ja existe.

## Arquivos afetados

| Arquivo | Acao |
|---------|------|
| `src/components/crm/DealDetailsModal.tsx` | Botoes Ganho/Perdido + Select de etapa inline |
| `src/components/crm/KanbanBoard.tsx` | Barra de filtros + optimistic update no DnD |

