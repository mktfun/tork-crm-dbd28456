-- Adicionar campos para geração automática de comissões parceladas
ALTER TABLE public.apolices 
ADD COLUMN installments integer DEFAULT 1,
ADD COLUMN start_date date;

-- Comentários para documentar os novos campos
COMMENT ON COLUMN public.apolices.installments IS 'Número de parcelas da comissão (default 1 para pagamento único)';
COMMENT ON COLUMN public.apolices.start_date IS 'Data de início da vigência da apólice para cálculo das parcelas de comissão';