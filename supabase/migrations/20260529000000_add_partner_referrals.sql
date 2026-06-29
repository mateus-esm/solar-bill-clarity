-- Partner referral program
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  coupon_code TEXT NOT NULL UNIQUE CHECK (coupon_code = upper(trim(coupon_code))),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  coupon_code TEXT NOT NULL,
  discount_percent NUMERIC NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'lead_captured' CHECK (
    status IN (
      'lead_captured',
      'proposal_requested',
      'proposal_sent',
      'negotiating',
      'closed_won',
      'closed_lost'
    )
  ),
  crm_lead_id TEXT,
  crm_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lead_id)
);

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS referral_discount_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS referral_status TEXT;

CREATE INDEX idx_partners_coupon_code ON public.partners (coupon_code);
CREATE INDEX idx_partners_status ON public.partners (status);
CREATE INDEX idx_partner_referrals_partner_id ON public.partner_referrals (partner_id);
CREATE INDEX idx_partner_referrals_lead_id ON public.partner_referrals (lead_id);
CREATE INDEX idx_partner_referrals_status ON public.partner_referrals (status);
CREATE INDEX idx_partner_referrals_crm_lead_id ON public.partner_referrals (crm_lead_id);
CREATE INDEX idx_leads_partner_id ON public.leads (partner_id);
CREATE INDEX idx_leads_referral_coupon_code ON public.leads (referral_coupon_code);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can read partners"
  ON public.partners FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage partners"
  ON public.partners FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can read partner referrals"
  ON public.partner_referrals FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage partner referrals"
  ON public.partner_referrals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_referrals_updated_at
  BEFORE UPDATE ON public.partner_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
