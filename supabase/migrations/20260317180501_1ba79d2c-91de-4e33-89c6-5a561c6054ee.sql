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