-- Create leads table for capturing visitors before analysis
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  has_solar BOOLEAN NOT NULL DEFAULT false,
  
  -- Solar specific data (if has_solar = true)
  monthly_generation_kwh NUMERIC,
  installed_potency_kwp NUMERIC,
  panel_count INTEGER,
  panel_power_watts NUMERIC,
  
  -- Analysis summary (populated after analysis is complete)
  analysis_summary JSONB,
  
  -- Conversion tracking
  requested_proposal BOOLEAN DEFAULT false,
  converted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Metadata
  source TEXT DEFAULT 'lead_magnet',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anonymous or authenticated) to insert a lead
CREATE POLICY "Anyone can insert leads"
  ON public.leads FOR INSERT
  WITH CHECK (true);

-- Only service role (Edge Functions) can read all leads
CREATE POLICY "Service role can read leads"
  ON public.leads FOR SELECT
  USING (
    auth.role() = 'service_role' OR 
    (auth.uid() IS NOT NULL AND converted_user_id = auth.uid())
  );

-- Only service role can update all leads (e.g., setting analysis_summary)
CREATE POLICY "Service role can update leads"
  ON public.leads FOR UPDATE
  USING (
    auth.role() = 'service_role' OR 
    (auth.uid() IS NOT NULL AND converted_user_id = auth.uid())
  );

-- Create trigger for updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
