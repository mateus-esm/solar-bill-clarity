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

// Convert Gemini streaming SSE to OpenAI-compatible SSE format
function createGeminiToOpenAITransform(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const jsonStr = trimmed.slice(6).trim();
        try {
          const parsed = JSON.parse(jsonStr);
          // Gemini streaming returns an array or object
          const candidates = Array.isArray(parsed) ? parsed[0]?.candidates : parsed?.candidates;
          if (!candidates?.[0]) continue;

          const text = candidates[0].content?.parts?.[0]?.text || "";
          const finishReason = candidates[0].finishReason;

          if (text) {
            const openaiChunk = {
              choices: [{ delta: { content: text }, index: 0 }],
              object: "chat.completion.chunk",
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
          }

          if (finishReason) {
            const doneChunk = {
              choices: [{ delta: {}, finish_reason: "stop", index: 0 }],
              object: "chat.completion.chunk",
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneChunk)}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          }
        } catch {
          // skip malformed JSON lines (e.g. incomplete chunks)
        }
      }
    },
    flush(controller) {
      // Process remaining buffer
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.slice(6).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            const candidates = Array.isArray(parsed) ? parsed[0]?.candidates : parsed?.candidates;
            if (candidates?.[0]) {
              const text = candidates[0].content?.parts?.[0]?.text || "";
              if (text) {
                const openaiChunk = {
                  choices: [{ delta: { content: text }, index: 0 }],
                  object: "chat.completion.chunk",
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
              }
              if (candidates[0].finishReason) {
                const doneChunk = {
                  choices: [{ delta: {}, finish_reason: "stop", index: 0 }],
                  object: "chat.completion.chunk",
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneChunk)}\n\n`));
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          }
        } else {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        }
      }
    },
  });
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");

    if (!googleApiKey) {
      console.error("GOOGLE_API_KEY not configured");
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

    console.log("🤖 Calling Google AI (Gemini) for chat...");

    // Build Gemini contents: system instruction goes in system_instruction,
    // messages are converted to Gemini's "user"/"model" roles
    const geminiMessages = messages.map((m) => ({
      parts: [{ text: m.content }],
      role: m.role === "assistant" ? "model" : "user",
    }));

    // Call Google AI Gemini with streaming
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse&key=${googleApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiMessages,
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.7,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 403) {
        return new Response(JSON.stringify({ error: "Serviço de IA indisponível. Entre em contato com o suporte." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Erro ao processar sua pergunta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the response through the Gemini-to-OpenAI transform
    console.log("✅ Streaming Gemini response through format transform...");
    const transformedStream = response.body!.pipeThrough(createGeminiToOpenAITransform());

    return new Response(transformedStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("bill-chat error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erro interno",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
