import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  analysisId: string;
  messages: ChatMessage[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { analysisId, messages } = (await req.json()) as ChatRequest;

    if (!analysisId) {
      return new Response(JSON.stringify({ error: "analysisId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role for data access
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Load bill analysis data
    console.log("📊 Loading analysis:", analysisId);
    const { data: analysis, error: analysisError } = await supabase
      .from("bill_analyses")
      .select("*")
      .eq("id", analysisId)
      .single();

    if (analysisError || !analysis) {
      console.error("Analysis not found:", analysisError);
      return new Response(JSON.stringify({ error: "Análise não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load raw data if available
    const { data: rawData } = await supabase
      .from("bill_raw_data")
      .select("raw_json")
      .eq("bill_analysis_id", analysisId)
      .single();

    // Build context from analysis data
    const billContext = {
      // Identification
      distributor: analysis.distributor,
      account_number: analysis.account_number,
      account_holder: analysis.account_holder,
      reference_month: analysis.reference_month,
      reference_year: analysis.reference_year,

      // Values
      total_amount: analysis.total_amount,
      availability_cost: analysis.availability_cost,
      public_lighting_cost: analysis.public_lighting_cost,
      energy_cost: analysis.energy_cost,
      icms_cost: analysis.icms_cost,
      pis_cofins_cost: analysis.pis_cofins_cost,
      tariff_flag: analysis.tariff_flag,

      // Solar
      monitored_generation_kwh: analysis.monitored_generation_kwh,
      injected_energy_kwh: analysis.injected_energy_kwh,
      compensated_energy_kwh: analysis.compensated_energy_kwh,
      billed_consumption_kwh: analysis.billed_consumption_kwh,
      current_credits_kwh: analysis.current_credits_kwh,
      previous_credits_kwh: analysis.previous_credits_kwh,

      // Raw data for more details
      raw_extraction: rawData?.raw_json || null,
    };

    // Calculate derived values
    const minimumPossible = (analysis.availability_cost || 0) + (analysis.public_lighting_cost || 0);
    const uncompensatedCost = Math.max(0, (analysis.total_amount || 0) - minimumPossible);

    const systemPrompt = `Você é um consultor de energia solar especializado em contas de luz brasileiras.
O cliente enviou uma conta de energia e você tem acesso a todos os dados extraídos dela.

DADOS DA CONTA DO CLIENTE:
- Distribuidora: ${billContext.distributor || "Não identificada"}
- Mês de referência: ${billContext.reference_month}/${billContext.reference_year}
- Titular: ${billContext.account_holder || "Não identificado"}
- Número UC: ${billContext.account_number || "—"}

VALORES DA CONTA:
- Valor Total Pago: R$ ${(billContext.total_amount || 0).toFixed(2)}
- Valor Mínimo Possível: R$ ${minimumPossible.toFixed(2)} (Disponibilidade + CIP)
- Custo de Disponibilidade: R$ ${(billContext.availability_cost || 0).toFixed(2)}
- Iluminação Pública (CIP): R$ ${(billContext.public_lighting_cost || 0).toFixed(2)}
- Custo de Energia: R$ ${(billContext.energy_cost || 0).toFixed(2)}
- ICMS: R$ ${(billContext.icms_cost || 0).toFixed(2)}
- PIS/COFINS: R$ ${(billContext.pis_cofins_cost || 0).toFixed(2)}
- Bandeira Tarifária: ${billContext.tariff_flag || "Não identificada"}

DADOS SOLARES:
- Geração Monitorada: ${billContext.monitored_generation_kwh || 0} kWh
- Energia Injetada na Rede: ${billContext.injected_energy_kwh || 0} kWh
- Energia Compensada: ${billContext.compensated_energy_kwh || 0} kWh
- Consumo Faturado: ${billContext.billed_consumption_kwh || 0} kWh
- Saldo de Créditos: ${billContext.current_credits_kwh || 0} kWh

${billContext.raw_extraction ? `DADOS BRUTOS EXTRAÍDOS:
${JSON.stringify(billContext.raw_extraction, null, 2)}` : ""}

REGRAS IMPORTANTES:
1. Seja didático e use linguagem simples, acessível para leigos
2. SEMPRE relacione suas respostas aos dados reais da conta do cliente (cite valores específicos)
3. Se não souber algo ou não encontrar na conta, diga claramente
4. Sugira ações práticas quando apropriado
5. Use emojis ocasionalmente para tornar a conversa mais amigável
6. Mantenha respostas concisas (máximo 3 parágrafos) a menos que o cliente peça detalhes
7. Quando falar de valores, sempre use R$ e formate corretamente
8. Lembre-se: energia solar NÃO zera a conta, ela reduz o consumo cobrado

CONCEITOS IMPORTANTES QUE VOCÊ DEVE EXPLICAR CORRETAMENTE:
- Custo de Disponibilidade: Taxa mínima que a distribuidora cobra para manter a conexão ativa
- CIP/COSIP: Contribuição de Iluminação Pública, cobrada pelo município
- Energia Injetada: Energia que o sistema solar enviou para a rede
- Energia Compensada: Energia da rede que foi "descontada" graças aos créditos solares
- Créditos de Energia: Saldo de energia injetada que pode ser usado nos próximos 60 meses
- Bandeira Tarifária: Adicional cobrado quando há escassez de energia (verde=sem adicional, amarela/vermelha=adicional)`;

    console.log("🤖 Sending to AI gateway...");

    // Call Lovable AI Gateway with streaming
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de AI esgotados. Entre em contato com o suporte." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Erro ao processar sua pergunta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return the stream directly
    console.log("✅ Streaming response back to client");
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("bill-chat error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro interno" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
