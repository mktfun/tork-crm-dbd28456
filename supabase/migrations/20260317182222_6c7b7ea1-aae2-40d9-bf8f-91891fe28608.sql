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

CREATE INDEX idx_crm_deal_events_deal_id ON public.crm_deal_events(deal_id);
CREATE INDEX idx_crm_deal_events_created_at ON public.crm_deal_events(created_at DESC);