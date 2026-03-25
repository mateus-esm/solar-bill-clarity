-- Add detailed billing columns to bill_analyses
ALTER TABLE public.bill_analyses
  ADD COLUMN IF NOT EXISTS other_charges numeric,
  ADD COLUMN IF NOT EXISTS billing_items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS credit_summary jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tariff_period text,
  ADD COLUMN IF NOT EXISTS reading_period_from date,
  ADD COLUMN IF NOT EXISTS reading_period_to date;

COMMENT ON COLUMN public.bill_analyses.other_charges IS 'Soma de cobranças extras não detalhadas (fallback quando extra_charges está vazio)';
COMMENT ON COLUMN public.bill_analyses.billing_items IS 'Tabela de faturamento linha a linha extraída do OCR';
COMMENT ON COLUMN public.bill_analyses.credit_summary IS 'Resumo SCEE: injetado, utilizado, saldo, a expirar';
COMMENT ON COLUMN public.bill_analyses.tariff_period IS 'Período da bandeira tarifária (ex: Verde: 07/01 - 04/02)';
COMMENT ON COLUMN public.bill_analyses.reading_period_from IS 'Data início da leitura do medidor';
COMMENT ON COLUMN public.bill_analyses.reading_period_to IS 'Data fim da leitura do medidor';
