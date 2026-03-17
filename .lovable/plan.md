

# Plano: Auditoria de Eventos + Analytics Dashboard + Correções

## Etapa 1 — Migration: Tabela `crm_deal_events`

```sql
CREATE TABLE public.crm_deal_events (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    old_value text,
    new_value text,
    source text NOT NULL DEFAULT 'manual',
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_deal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso a eventos do deal" ON public.crm_deal_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.crm_deals WHERE id = crm_deal_events.deal_id AND user_id = auth.uid()));
CREATE POLICY "Inserção de eventos do deal" ON public.crm_deal_events FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.crm_deals WHERE id = crm_deal_events.deal_id AND user_id = auth.uid()));
```

Note: RLS policies reference `crm_deals.user_id = auth.uid()` to prevent data leakage (the original SQL was missing that check).

## Etapa 2 — DealDetailsModal: Emit events on Won/Lost + History from events table

**`src/components/crm/DealDetailsModal.tsx`**

- `handleMarkWon` / `handleMarkLost`: After successful `updateDeal.mutateAsync`, insert into `crm_deal_events`:
  ```ts
  await supabase.from('crm_deal_events').insert({
    deal_id: deal.id,
    event_type: 'status_change',
    old_value: currentStage?.name,
    new_value: wonStage/lostStage name,
    source: 'manual',
    created_by: user.id
  });
  ```

- `handleInlineStageChange`: Same pattern with `event_type: 'stage_change'`.

- **History tab**: Replace `fetchNotes` logic to fetch from BOTH `crm_deal_notes` AND `crm_deal_events`, merge by `created_at`, and render conditionally:
  - Notes: current rendering (text content)
  - Events: "Etapa alterada de [old] para [new]" with a Badge showing source (`manual` = User icon, `ai_automation` = Bot icon with primary color)
  - Date formatted as `DD/MM/YYYY HH:mm`

## Etapa 3 — CRMAnalytics.tsx: New component

**`src/components/crm/CRMAnalytics.tsx`** (new file)

Uses Recharts (already in project) with Glass theme styling from memory context.

KPI Cards row:
- Total em Negociação (sum of values where stage is "open")
- Taxa de Conversão (won / (won + lost) as percentage)
- Ticket Médio (avg value of won deals)

Charts:
- `BarChart`: Won vs Lost deals by month
- `PieChart`: Distribution of deals by current stage (with stage colors)

Data fetched via `useCRMDeals` and `useCRMStages` hooks (reuse existing).

## Etapa 4 — CRM.tsx: Tabs for Pipeline vs Insights

**`src/pages/CRM.tsx`**

Wrap the content area (below header) in shadcn `Tabs` with two tabs:
- "Pipeline" → renders `<KanbanBoard />`
- "Insights" → renders `<CRMAnalytics />`

Pipeline selector and action buttons remain in the header, visible in both tabs.

## Etapa 5 — Dispatcher: Emit audit events on AI tool calls

**`supabase/functions/chatwoot-sync/index.ts`** — in the `update_deal_stage` case block:

After the successful stage update (the `supabase.from('crm_deals').update(...)` call), insert an audit event:
```ts
await supabase.from('crm_deal_events').insert({
  deal_id: deal_id,
  event_type: 'stage_change',
  old_value: oldStageName,
  new_value: newStageName,
  source: 'ai_automation',
  created_by: null
});
```

This is done in `chatwoot-sync` (where the actual DB mutation happens), not in the dispatcher (which only forwards to n8n).

## Files affected

| File | Action |
|------|--------|
| Migration SQL | Create `crm_deal_events` table |
| `src/components/crm/DealDetailsModal.tsx` | Emit events + hybrid history timeline |
| `src/components/crm/CRMAnalytics.tsx` | New: KPIs + BarChart + PieChart |
| `src/pages/CRM.tsx` | Add Tabs (Pipeline / Insights) |
| `supabase/functions/chatwoot-sync/index.ts` | Insert audit event on `update_deal_stage` |

