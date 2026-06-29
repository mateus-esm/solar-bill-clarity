import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_LEAD_ROUTER_WEBHOOK_URL =
  "http://72.61.219.156:5678/webhook/8cd82666-6aee-4a0d-9b95-6ede8fd6f904";
const DEFAULT_N8N_WEBHOOK_URL =
  "http://72.61.219.156:5678/webhook/ab14f898-31ed-44dc-b283-dc7add27a3b2";

const DEFAULT_KWP_PRICE = 2428;
const MODULE_POWER_W = 620;
const MODULE_POWER_KWP = MODULE_POWER_W / 1000;
const GENERATION_PER_KWP_MONTH = 120;
const PERFORMANCE_RATIO = 0.8;
const SOLPLANET_INVERTERS_KW = [5, 7, 9.1, 15, 25];
const REFERRAL_DISCOUNT_PERCENT = 5;

type Lead = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  has_solar: boolean;
  analysis_summary?: Record<string, unknown> | null;
  source?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  partner_id?: string | null;
  referral_coupon_code?: string | null;
  referral_discount_percent?: number | null;
  referral_status?: string | null;
};

type WorkflowAction = "lead" | "proposal";

type Partner = {
  id: string;
  name: string;
  phone?: string | null;
  coupon_code: string;
  status: string;
};

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().replace(/\./g, "").replace(",", ".");
    const parsed = Number.parseFloat(normalized.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

function formatKwh(value: number): string {
  return `${Math.round(value).toLocaleString("pt-BR")} kWh`;
}

function chooseInverter(requiredKwp: number): number {
  const target = Math.max(requiredKwp, 0);
  return SOLPLANET_INVERTERS_KW.find((kw) => kw >= target) ?? 25;
}

function getAnalysisNumber(analysis: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = toNumber(analysis[key], Number.NaN);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function extractJestorId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const candidateKeys = ["id_jestor", "id", "object_id", "record_id"];

  for (const key of candidateKeys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (typeof candidate === "number" && Number.isFinite(candidate)) return String(candidate);
  }

  for (const child of Object.values(record)) {
    if (child && typeof child === "object") {
      const found = extractJestorId(child);
      if (found) return found;
    }
  }

  return null;
}

function buildSizing(lead: Lead) {
  const analysis = lead.analysis_summary ?? {};
  const isSolar = Boolean(lead.has_solar);

  const totalPaid = getAnalysisNumber(analysis, ["totalPaid", "total_amount"]);
  const minimumPossible = getAnalysisNumber(analysis, ["minimumPossible", "minimum_possible"]);
  const billedConsumption = getAnalysisNumber(analysis, [
    "billedConsumption",
    "billed_consumption_kwh",
    "measured_consumption_kwh",
  ]);
  const potentialSavings = getAnalysisNumber(analysis, ["potentialSavings", "potential_monthly_savings"]);
  const recommendedKwp = getAnalysisNumber(analysis, ["recommendedKwp", "recommended_potency_kwp"]);
  const expansionKwp = getAnalysisNumber(analysis, ["expansionKwp", "expansion_kwp"]);
  const extraGenerationNeeded = getAnalysisNumber(analysis, ["extraGenerationNeeded", "extra_generation_needed"]);
  const generated = getAnalysisNumber(analysis, ["generated", "actualGeneration", "monitored_generation_kwh"]);
  const compensated = getAnalysisNumber(analysis, ["compensated", "compensated_energy_kwh"]);
  const creditsBalance = getAnalysisNumber(analysis, ["creditsBalance", "current_credits_kwh"]);

  let requiredKwp = 0;
  if (isSolar) {
    requiredKwp =
      expansionKwp > 0
        ? expansionKwp
        : extraGenerationNeeded > 0
          ? extraGenerationNeeded / (GENERATION_PER_KWP_MONTH * PERFORMANCE_RATIO)
          : 0;
  } else {
    requiredKwp =
      recommendedKwp > 0
        ? recommendedKwp
        : billedConsumption > 0
          ? billedConsumption / GENERATION_PER_KWP_MONTH / PERFORMANCE_RATIO
          : totalPaid > 0
            ? Math.max(totalPaid - minimumPossible, 0) / 100
            : 5;
  }

  requiredKwp = Math.max(requiredKwp, MODULE_POWER_KWP);
  const modules = Math.max(1, Math.ceil(requiredKwp / MODULE_POWER_KWP));
  const peakKwp = round(modules * MODULE_POWER_KWP, 2);
  const inverterKw = chooseInverter(peakKwp);
  const priceTotal = round(peakKwp * DEFAULT_KWP_PRICE, 2);
  const hasReferral = Boolean(lead.partner_id && lead.referral_coupon_code);
  const discountPercent = hasReferral ? toNumber(lead.referral_discount_percent, REFERRAL_DISCOUNT_PERCENT) : 0;
  const discountAmount = round(priceTotal * (discountPercent / 100), 2);
  const discountedPriceTotal = round(priceTotal - discountAmount, 2);
  const estimatedMonthlyGeneration = Math.round(peakKwp * GENERATION_PER_KWP_MONTH * PERFORMANCE_RATIO);
  const estimatedSavings = potentialSavings > 0
    ? potentialSavings
    : Math.max(totalPaid - minimumPossible, 0);

  return {
    isSolar,
    totalPaid,
    minimumPossible,
    billedConsumption,
    potentialSavings: estimatedSavings,
    generated,
    compensated,
    creditsBalance,
    extraGenerationNeeded,
    requiredKwp,
    modules,
    peakKwp,
    inverterKw,
    priceTotal,
    discountPercent,
    discountAmount,
    discountedPriceTotal,
    estimatedMonthlyGeneration,
  };
}

function buildReferralLine(lead: Lead, partner: Partner | null): string | null {
  if (!lead.partner_id || !lead.referral_coupon_code || !partner) return null;
  return `Indicacao Solo: cupom ${lead.referral_coupon_code}, parceiro ${partner.name}, telefone ${partner.phone || "Nao informado"}, desconto ${REFERRAL_DISCOUNT_PERCENT}%.`;
}

function buildCommercialObs(lead: Lead, partner: Partner | null): string {
  const analysis = lead.analysis_summary ?? {};
  const sizing = buildSizing(lead);
  const distributor = String(analysis.distributor || "Nao identificada");
  const diagnosis = String(analysis.diagnosisDetails || analysis.diagnosis_details || "Sem diagnostico detalhado.");
  const systemType = sizing.isSolar ? "Cliente com sistema solar" : "Cliente sem sistema solar";
  const referralLine = buildReferralLine(lead, partner);

  const lines = [
    "Solo Proposal Engine - lead gerado pelo Raio-X da Conta de Energia.",
    `${systemType}. Distribuidora: ${distributor}.`,
    `Conta analisada: valor total ${formatMoney(sizing.totalPaid)}; minimo/taxas ${formatMoney(sizing.minimumPossible)}; consumo faturado ${formatKwh(sizing.billedConsumption)}.`,
    `Diagnostico: ${diagnosis}`,
    sizing.isSolar
      ? `Dados solares: geracao informada ${formatKwh(sizing.generated)}; energia compensada ${formatKwh(sizing.compensated)}; saldo de creditos ${formatKwh(sizing.creditsBalance)}; geracao extra necessaria ${formatKwh(sizing.extraGenerationNeeded)}.`
      : `Oportunidade: economia mensal estimada ${formatMoney(sizing.potentialSavings)} com sistema fotovoltaico dimensionado pela fatura.`,
    `Proposta automatica sugerida: ${sizing.peakKwp.toFixed(2)} kWp, ${sizing.modules} modulos Leapton ${MODULE_POWER_W}W, inversor SolPlanet ${sizing.inverterKw} kW, geracao estimada ${formatKwh(sizing.estimatedMonthlyGeneration)}, preco base ${formatMoney(sizing.priceTotal)} (${formatMoney(DEFAULT_KWP_PRICE)}/kWp).`,
  ];

  if (referralLine) lines.push(referralLine);
  return lines.join("\n");
}

function isBillingLeadMagnetLead(lead: Lead): boolean {
  const source = String(lead.source || "");
  return source.startsWith("lead_magnet");
}

function buildLeadRouterPayload(lead: Lead, partner: Partner | null) {
  return {
    nome: lead.name,
    email: lead.email,
    tel: lead.whatsapp,
    obs: buildCommercialObs(lead, partner),
    refferal_name: partner?.name || "",
    referral_phone: partner?.phone || "",
  };
}

function getStoredJestorId(lead: Lead): string | null {
  const analysis = lead.analysis_summary ?? {};
  const crm = analysis.crm;

  if (crm && typeof crm === "object") {
    const record = crm as Record<string, unknown>;
    const stored = record.jestor_id || record.jestorId || record.id_jestor;
    if (typeof stored === "string" && stored.trim()) return stored.trim();
    if (typeof stored === "number" && Number.isFinite(stored)) return String(stored);
  }

  return extractJestorId(analysis);
}

async function persistCrmMetadata(
  supabaseClient: any,
  lead: Lead,
  jestorId: string | null,
  partner: Partner | null,
  action: WorkflowAction,
  crmPayload?: unknown,
) {
  const analysis = lead.analysis_summary ?? {};

  await supabaseClient
    .from("leads")
    .update({
      analysis_summary: {
        ...analysis,
        crm: {
          ...(typeof analysis.crm === "object" && analysis.crm ? analysis.crm : {}),
          jestor_id: jestorId,
          sent_at: new Date().toISOString(),
        },
      },
    })
    .eq("id", lead.id);

  if (partner && lead.partner_id && lead.referral_coupon_code) {
    await upsertPartnerReferral(supabaseClient, lead, partner, action === "proposal" ? "proposal_requested" : "lead_captured", jestorId, {
      action,
      jestor_id: jestorId,
      payload: crmPayload,
    });
  }
}

function buildN8nPayload(
  lead: Lead,
  jestorId: string | null,
  partner: Partner | null,
  options: { omitJestorId?: boolean } = {},
) {
  const analysis = lead.analysis_summary ?? {};
  const sizing = buildSizing(lead);
  const distributor = String(analysis.distributor || "Enel Distribuicao Ceara");

  const payload: Record<string, unknown> = {
    nome_cliente: lead.name,
    cpf_cnpj: String(analysis.cpf_cnpj || analysis.cpfCnpj || "Nao informado"),
    endereco_instalacao: String(analysis.endereco_instalacao || analysis.address || "Nao identificado na fatura"),
    concessionaria: distributor,
    nome_consultor: "Mateus Maia",
    email_consultor: lead.email,
    telefone_consultor: "(85) 99648-7923",
    telefone_cliente: lead.whatsapp,
    fabricante_modulo: "Leapton",
    potencia_modulo_w: String(MODULE_POWER_W),
    numero_modulos: String(sizing.modules),
    fabricante_inversor: "SolPlanet",
    potencia_inversor_kw: String(sizing.inverterKw),
    tipo_estrutura: "Aluminio Anodizado T6 (Telhado Ondulado)",
    tipo_monitoramento: "Wi-Fi + App iOS/Android",
    preco_total_base: String(sizing.priceTotal),
    preco_total: String(sizing.discountedPriceTotal),
    desconto_indicacao_percentual: String(sizing.discountPercent),
    desconto_indicacao_valor: String(sizing.discountAmount),
    consumo_mensal: String(Math.round(sizing.billedConsumption || sizing.estimatedMonthlyGeneration)),
    equipamentos_extras: "Modulos Leapton 620W, inversor SolPlanet, string box, cabeamento CC/CA e protecoes conforme vistoria tecnica.",
    exclusoes_adicionais: "Adequacoes civis, reforco estrutural, troca de padrao, aumento de carga e custos da concessionaria quando aplicaveis.",
  };

  if (!options.omitJestorId) {
    payload.id_jestor = jestorId;
  }

  if (partner && lead.referral_coupon_code) {
    payload.canal_captacao = "Indicação";
    payload.indicador_nome = partner.name;
    payload.indicador_telefone = partner.phone || "";
    payload.cupom_indicacao = lead.referral_coupon_code;
  }

  return payload;
}

async function getLeadPartner(supabaseClient: any, lead: Lead): Promise<Partner | null> {
  if (!lead.partner_id) return null;

  const { data, error } = await supabaseClient
    .from("partners")
    .select("id,name,phone,coupon_code,status")
    .eq("id", lead.partner_id)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data as Partner | null;
}

async function upsertPartnerReferral(
  supabaseClient: any,
  lead: Lead,
  partner: Partner,
  status: string,
  jestorId: string | null,
  crmPayload: unknown,
) {
  const { error } = await supabaseClient
    .from("partner_referrals")
    .upsert(
      {
        partner_id: partner.id,
        lead_id: lead.id,
        coupon_code: lead.referral_coupon_code || partner.coupon_code,
        discount_percent: REFERRAL_DISCOUNT_PERCENT,
        status,
        crm_lead_id: jestorId,
        crm_payload: crmPayload,
      },
      { onConflict: "lead_id" },
    );

  if (error) throw error;

  await supabaseClient
    .from("leads")
    .update({ referral_status: status })
    .eq("id", lead.id);
}

async function postJson(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`Webhook ${url} returned ${response.status}: ${text}`);
  }

  return body;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { leadId, action = "lead", omitJestorId = false } = await req.json() as {
      leadId?: string;
      action?: WorkflowAction;
      omitJestorId?: boolean;
    };

    if (!leadId) {
      throw new Error("A leadId is required");
    }

    if (action !== "lead" && action !== "proposal") {
      throw new Error("Invalid action. Use 'lead' or 'proposal'.");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: lead, error: leadError } = await supabaseClient
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      console.error("Error fetching lead:", leadError);
      throw new Error("Failed to fetch lead data");
    }

    const typedLead = lead as Lead;
    const leadRouterWebhookUrl = Deno.env.get("LEAD_ROUTER_WEBHOOK_URL") || DEFAULT_LEAD_ROUTER_WEBHOOK_URL;
    const n8nWebhookUrl = Deno.env.get("N8N_PROPOSAL_WEBHOOK_URL") || DEFAULT_N8N_WEBHOOK_URL;

    let crmPayload: ReturnType<typeof buildLeadRouterPayload> | null = null;
    let n8nPayload: ReturnType<typeof buildN8nPayload> | null = null;
    let jestorId = getStoredJestorId(typedLead);
    const partner = await getLeadPartner(supabaseClient, typedLead);

    if (action === "lead") {
      crmPayload = buildLeadRouterPayload(typedLead, partner);

      console.log(`Sending lead ${typedLead.id} to lead router webhook...`);
      const crmResult = await postJson(leadRouterWebhookUrl, crmPayload);
      jestorId = extractJestorId(crmResult) || jestorId;
      await persistCrmMetadata(supabaseClient, typedLead, jestorId, partner, action, crmPayload);

      return new Response(
        JSON.stringify({
          success: true,
          action,
          crmPayload,
          jestorId,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const shouldOmitJestorId = omitJestorId || isBillingLeadMagnetLead(typedLead);
    n8nPayload = buildN8nPayload(typedLead, jestorId, partner, { omitJestorId: shouldOmitJestorId });
    console.log(`Triggering Solo Proposal Engine for lead ${typedLead.id}...`);
    await postJson(n8nWebhookUrl, n8nPayload);

    await supabaseClient
      .from("leads")
      .update({ requested_proposal: true })
      .eq("id", typedLead.id);

    if (partner && typedLead.partner_id && typedLead.referral_coupon_code) {
      await upsertPartnerReferral(supabaseClient, typedLead, partner, "proposal_requested", jestorId, n8nPayload);
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        crmPayload,
        n8nPayload,
        jestorId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in trigger-crm:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
