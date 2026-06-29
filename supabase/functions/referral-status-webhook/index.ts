import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const ALLOWED_STATUSES = new Set([
  "lead_captured",
  "proposal_requested",
  "proposal_sent",
  "negotiating",
  "closed_won",
  "closed_lost",
]);

function normalizeCoupon(value: unknown): string | null {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized || null;
}

function cleanPhone(value: unknown): string | null {
  const cleaned = String(value || "").replace(/\D/g, "");
  return cleaned || null;
}

function assertWebhookSecret(req: Request) {
  const expected = Deno.env.get("REFERRAL_STATUS_WEBHOOK_SECRET");
  if (!expected) return;

  const headerSecret = req.headers.get("x-webhook-secret");
  const auth = req.headers.get("authorization") || "";
  const bearerSecret = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";

  if (headerSecret !== expected && bearerSecret !== expected) {
    throw new Error("Unauthorized referral status webhook");
  }
}

async function findReferral(supabaseClient: any, payload: Record<string, unknown>) {
  const referralId = payload.referral_id || payload.referralId;
  const leadId = payload.lead_id || payload.leadId;
  const crmLeadId = payload.id_jestor || payload.crm_lead_id || payload.crmLeadId || payload.jestor_id;

  if (referralId) {
    const { data } = await supabaseClient.from("partner_referrals").select("*").eq("id", referralId).maybeSingle();
    if (data) return data;
  }

  if (leadId) {
    const { data } = await supabaseClient.from("partner_referrals").select("*").eq("lead_id", leadId).maybeSingle();
    if (data) return data;
  }

  if (crmLeadId) {
    const { data } = await supabaseClient.from("partner_referrals").select("*").eq("crm_lead_id", String(crmLeadId)).maybeSingle();
    if (data) return data;
  }

  const couponCode = normalizeCoupon(payload.coupon_code || payload.cupom_indicacao || payload.cupom);
  const email = typeof payload.email === "string" ? payload.email.trim() : null;
  const phone = cleanPhone(payload.phone || payload.telefone || payload.whatsapp || payload.tel);

  if (couponCode && (email || phone)) {
    let query = supabaseClient
      .from("leads")
      .select("id")
      .eq("referral_coupon_code", couponCode)
      .order("created_at", { ascending: false })
      .limit(1);

    if (email) {
      query = query.eq("email", email);
    } else if (phone) {
      query = query.eq("whatsapp", phone);
    }

    const { data: leads } = await query;
    const matchedLead = leads?.[0];
    if (matchedLead?.id) {
      const { data } = await supabaseClient
        .from("partner_referrals")
        .select("*")
        .eq("lead_id", matchedLead.id)
        .maybeSingle();
      if (data) return data;
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    assertWebhookSecret(req);
    const payload = await req.json() as Record<string, unknown>;
    const status = String(payload.status || payload.referral_status || "").trim();

    if (!ALLOWED_STATUSES.has(status)) {
      throw new Error("Invalid referral status");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const referral = await findReferral(supabaseClient, payload);
    if (!referral) {
      throw new Error("Referral not found");
    }

    const crmLeadId = payload.id_jestor || payload.crm_lead_id || payload.crmLeadId || payload.jestor_id || referral.crm_lead_id;

    const { error: referralError } = await supabaseClient
      .from("partner_referrals")
      .update({
        status,
        crm_lead_id: crmLeadId ? String(crmLeadId) : referral.crm_lead_id,
        crm_payload: payload,
      })
      .eq("id", referral.id);

    if (referralError) throw referralError;

    await supabaseClient
      .from("leads")
      .update({ referral_status: status })
      .eq("id", referral.lead_id);

    return new Response(JSON.stringify({ success: true, referral_id: referral.id, status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error updating referral status:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
