-- 1. Nova tabela para dados brutos do OCR
CREATE TABLE public.bill_raw_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_analysis_id uuid REFERENCES public.bill_analyses(id) ON DELETE CASCADE NOT NULL,
  raw_json jsonb NOT NULL,
  ocr_confidence numeric,
  extraction_model text DEFAULT 'gpt-4o',
  extraction_version text DEFAULT 'v2.0',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. RLS para bill_raw_data
ALTER TABLE public.bill_raw_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view raw data" ON public.bill_raw_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bill_analyses ba
      WHERE ba.id = bill_raw_data.bill_analysis_id
      AND has_property_access(auth.uid(), ba.property_id)
    )
  );

CREATE POLICY "Users can insert raw data" ON public.bill_raw_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bill_analyses ba
      WHERE ba.id = bill_raw_data.bill_analysis_id
      AND has_property_access(auth.uid(), ba.property_id)
    )
  );

-- 3. Novos campos em bill_analyses para dados estruturados
ALTER TABLE public.bill_analyses 
  ADD COLUMN IF NOT EXISTS tariff_te_value numeric,
  ADD COLUMN IF NOT EXISTS tariff_tusd_value numeric,
  ADD COLUMN IF NOT EXISTS tariff_flag_cost numeric,
  ADD COLUMN IF NOT EXISTS billing_days integer,
  ADD COLUMN IF NOT EXISTS meter_reading_current numeric,
  ADD COLUMN IF NOT EXISTS meter_reading_previous numeric,
  ADD COLUMN IF NOT EXISTS consumer_class text,
  ADD COLUMN IF NOT EXISTS tariff_modality text,
  ADD COLUMN IF NOT EXISTS demand_contracted_kw numeric,
  ADD COLUMN IF NOT EXISTS demand_measured_kw numeric,
  ADD COLUMN IF NOT EXISTS sectoral_charges numeric,
  ADD COLUMN IF NOT EXISTS credit_expiry_date date,
  ADD COLUMN IF NOT EXISTS ai_explanations jsonb,
  ADD COLUMN IF NOT EXISTS ai_recommendations jsonb,
  ADD COLUMN IF NOT EXISTS bill_score numeric,
  ADD COLUMN IF NOT EXISTS pis_cost numeric,
  ADD COLUMN IF NOT EXISTS cofins_cost numeric,
  ADD COLUMN IF NOT EXISTS interest_amount numeric;