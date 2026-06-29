import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeCoupon(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { coupon } = await req.json();
    const couponCode = normalizeCoupon(coupon);

    if (!couponCode) {
      return new Response(JSON.stringify({ valid: false, error: "Coupon code is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: partner, error } = await supabaseClient
      .from("partners")
      .select("id,name,coupon_code,status")
      .eq("coupon_code", couponCode)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw error;

    if (!partner) {
      return new Response(JSON.stringify({ valid: false, coupon_code: couponCode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(
      JSON.stringify({
        valid: true,
        partner: {
          id: partner.id,
          name: partner.name,
          coupon_code: partner.coupon_code,
          discount_percent: 5,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error validating referral coupon:", error);
    return new Response(JSON.stringify({ valid: false, error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
