

# Plano: Sheet lateral com Timeline + NewDealModal em grid

## Etapa 1 — Migration SQL

Criar tabela `crm_deal_notes` com RLS baseada na visibilidade do deal:

```sql
CREATE TABLE public.crm_deal_notes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_deal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see notes of their deals" 
ON public.crm_deal_notes FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.crm_deals WHERE id = crm_deal_notes.deal_id AND user_id = auth.uid()));

CREATE POLICY "Users insert notes on their deals" 
ON public.crm_deal_notes FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.crm_deals WHERE id = crm_deal_notes.deal_id AND user_id = auth.uid()));
```

## Etapa 2 — DealDetailsModal.tsx: Dialog → Sheet + Tabs

Replace `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` with `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle`.

Configure: `<SheetContent side="right" className="sm:max-w-[600px] w-[90vw] flex flex-col">`.

Wrap internal content in `Tabs` with two tabs:
- **"Detalhes"** (`value="details"`): existing view/edit form, unchanged logic.
- **"Histórico"** (`value="history"`): new timeline panel.

### Timeline tab implementation:
- State: `notes[]`, `newNote`, `loadingNotes`, `addingNote`
- On tab switch / deal change: fetch `crm_deal_notes` where `deal_id` ordered by `created_at desc`, join with `profiles(full_name)` via `created_by`
- Add note form: `Textarea` + Button → insert into `crm_deal_notes` with `deal_id`, `content`, `created_by: user.id`
- Render notes in `ScrollArea` with left border timeline style (`border-l-2 border-primary/30` + dots)
- Each note shows: content, author name, relative date (`formatDistanceToNow`)

## Etapa 3 — NewDealModal.tsx: layout em grid

Reorganize form fields into 2-column grid:
- Row 1: Titulo (full width, `col-span-2`)
- Row 2: Cliente (full width, `col-span-2`) 
- Row 3: Pipeline | Etapa (side by side)
- Row 4: Valor | Data (already side by side, keep)
- Row 5: Observacoes (full width, `col-span-2`)

Wrap in `<div className="grid grid-cols-2 gap-4">` and use `col-span-2` for full-width fields.

## Etapa 4 — KanbanBoard.tsx

Update the `DealDetailsModal` usage — no prop changes needed since the component signature stays the same (`deal`, `open`, `onOpenChange`). The Sheet replaces Dialog transparently.

## Arquivos afetados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar `crm_deal_notes` com RLS |
| `src/components/crm/DealDetailsModal.tsx` | Dialog → Sheet + Tabs + Timeline |
| `src/components/crm/NewDealModal.tsx` | Grid layout 2 colunas |

