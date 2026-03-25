-- Add connection_type and extra_charges to bill_analyses
ALTER TABLE public.bill_analyses
  ADD COLUMN IF NOT EXISTS connection_type text,
  ADD COLUMN IF NOT EXISTS extra_charges jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.bill_analyses.connection_type IS 'Tipo de ligação elétrica: monofasico, bifasico ou trifasico';
COMMENT ON COLUMN public.bill_analyses.extra_charges IS 'Serviços contratados e parcelamentos em aberto extraídos da fatura';
