import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BillAnalysisRequest {
  analysisId?: string;
  fileUrl?: string;
  fileBase64?: string;
  fileType?: string;
  expectedGeneration?: number;
  monitoredGeneration: number;
  quickAnalysis?: boolean;
}

interface ExtractedBillData {
  account_holder?: string;
  account_number?: string;
  distributor?: string;
  reference_month?: number;
  reference_year?: number;
  billed_consumption_kwh?: number;
  injected_energy_kwh?: number;
  compensated_energy_kwh?: number;
  previous_credits_kwh?: number;
  current_credits_kwh?: number;
  total_amount?: number;
  energy_cost?: number;
  availability_cost?: number;
  public_lighting_cost?: number;
  icms_cost?: number;
  pis_cofins_cost?: number;
  fine_amount?: number;
  tariff_flag?: string;
}

async function downloadAndConvertToBase64(url: string, supabaseServiceKey?: string): Promise<{ base64: string; mimeType: string }> {
  console.log("Downloading file from:", url);
  
  // Add authorization header for Supabase storage URLs
  const headers: Record<string, string> = {};
  if (url.includes("supabase.co") && supabaseServiceKey) {
    headers["Authorization"] = `Bearer ${supabaseServiceKey}`;
  }
  
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }
  
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = base64Encode(arrayBuffer);
  
  console.log("File downloaded, size:", arrayBuffer.byteLength, "bytes, type:", contentType);
  
  return { base64, mimeType: contentType };
}

function getMimeTypeFromBase64OrUrl(fileType?: string, url?: string): string {
  if (fileType) {
    if (fileType.includes("pdf")) return "application/pdf";
    if (fileType.includes("png")) return "image/png";
    if (fileType.includes("jpg") || fileType.includes("jpeg")) return "image/jpeg";
    if (fileType.includes("webp")) return "image/webp";
    return fileType;
  }
  if (url) {
    if (url.endsWith(".pdf")) return "application/pdf";
    if (url.endsWith(".png")) return "image/png";
    if (url.endsWith(".jpg") || url.endsWith(".jpeg")) return "image/jpeg";
    if (url.endsWith(".webp")) return "image/webp";
  }
  return "image/jpeg";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: BillAnalysisRequest = await req.json();
    const { 
      analysisId, 
      fileUrl, 
      fileBase64, 
      fileType,
      expectedGeneration = 0, 
      monitoredGeneration,
      quickAnalysis = false 
    } = requestData;
    
    console.log("Starting bill analysis:", { 
      analysisId, 
      fileUrl: fileUrl?.substring(0, 50), 
      hasBase64: !!fileBase64,
      expectedGeneration, 
      monitoredGeneration,
      quickAnalysis 
    });

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get the image data
    let imageBase64: string;
    let imageMimeType: string;

    if (fileBase64) {
      // Direct base64 from client (for quick analysis)
      imageBase64 = fileBase64;
      imageMimeType = getMimeTypeFromBase64OrUrl(fileType);
    } else if (fileUrl) {
      // Download from URL and convert to base64 (use service key for private buckets)
      const downloaded = await downloadAndConvertToBase64(fileUrl, supabaseServiceKey);
      imageBase64 = downloaded.base64;
      imageMimeType = downloaded.mimeType;
    } else {
      throw new Error("Either fileUrl or fileBase64 must be provided");
    }

    // Check if the file is a PDF - OpenAI Vision doesn't support PDFs
    if (imageMimeType.includes("pdf")) {
      throw new Error("PDFs não são suportados. Por favor, envie uma imagem (JPG, PNG) ou tire uma foto da sua conta de energia.");
    }

    const imageDataUrl = `data:${imageMimeType};base64,${imageBase64}`;

    // Call OpenAI Vision API to analyze the bill
    const systemPrompt = `Você é um especialista em análise de contas de energia elétrica brasileiras. 
Analise a imagem da conta de energia e extraia TODOS os dados disponíveis de forma estruturada.

Retorne um JSON válido com os seguintes campos (use null para campos não encontrados):
{
  "account_holder": "nome do titular",
  "account_number": "número da conta/instalação",
  "distributor": "nome da distribuidora (CEMIG, CPFL, ENEL, etc)",
  "reference_month": número do mês (1-12),
  "reference_year": ano (ex: 2024),
  "billed_consumption_kwh": consumo faturado em kWh,
  "injected_energy_kwh": energia injetada/gerada em kWh,
  "compensated_energy_kwh": energia compensada em kWh,
  "previous_credits_kwh": saldo anterior de créditos em kWh,
  "current_credits_kwh": saldo atual de créditos em kWh,
  "total_amount": valor total da fatura em R$,
  "energy_cost": custo da energia em R$,
  "availability_cost": custo de disponibilidade em R$,
  "public_lighting_cost": contribuição de iluminação pública (CIP) em R$,
  "icms_cost": valor do ICMS em R$,
  "pis_cofins_cost": valor do PIS/COFINS em R$,
  "fine_amount": multas ou juros em R$,
  "tariff_flag": bandeira tarifária (verde, amarela, vermelha 1, vermelha 2)
}

IMPORTANTE:
- Retorne APENAS o JSON, sem markdown ou explicações
- Use números decimais com ponto (ex: 123.45)
- Para valores monetários, extraia apenas o número sem R$
- Para kWh, extraia apenas o número sem a unidade`;

    console.log("Calling OpenAI Vision API...");

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise esta conta de energia e extraia todos os dados estruturados:",
              },
              {
                type: "image_url",
                image_url: { url: imageDataUrl, detail: "high" },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content || "{}";
    
    console.log("OpenAI response:", content);

    // Parse the extracted data
    let extractedData: ExtractedBillData = {};
    try {
      // Clean up potential markdown formatting
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extractedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError);
      extractedData = {};
    }

    // Calculate derived metrics
    const realConsumption = (extractedData.billed_consumption_kwh || 0) + (extractedData.compensated_energy_kwh || 0);
    const generationEfficiency = expectedGeneration > 0 
      ? (monitoredGeneration / expectedGeneration) * 100 
      : 0;

    // Generate alerts
    const alerts: string[] = [];
    
    if (expectedGeneration > 0 && generationEfficiency < 80) {
      alerts.push(`Geração abaixo do esperado: ${generationEfficiency.toFixed(1)}% da expectativa`);
    }
    
    if (extractedData.fine_amount && extractedData.fine_amount > 0) {
      alerts.push(`Multa/juros detectados: R$ ${extractedData.fine_amount.toFixed(2)}`);
    }

    const injected = extractedData.injected_energy_kwh || 0;
    if (monitoredGeneration > 0 && injected > 0) {
      const selfConsumptionRatio = ((monitoredGeneration - injected) / monitoredGeneration) * 100;
      if (selfConsumptionRatio > 50) {
        alerts.push(`Alto autoconsumo: ${selfConsumptionRatio.toFixed(1)}% da geração consumida localmente`);
      }
    }

    if (extractedData.tariff_flag === "vermelha 2") {
      alerts.push("Bandeira vermelha patamar 2 - custo extra elevado");
    } else if (extractedData.tariff_flag === "vermelha 1") {
      alerts.push("Bandeira vermelha patamar 1 - custo extra moderado");
    }

    // Calculate estimated savings (simplified)
    const estimatedSavings = (extractedData.compensated_energy_kwh || 0) * 0.75;

    // For quick analysis, skip database and AI analysis generation
    if (quickAnalysis) {
      console.log("Quick analysis completed");
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            ...extractedData,
            real_consumption_kwh: realConsumption,
            generation_efficiency: generationEfficiency,
            estimated_savings: estimatedSavings,
            alerts,
            monitored_generation_kwh: monitoredGeneration,
          },
          message: "Análise rápida concluída" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // Full analysis with database update
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate AI analysis text
    const analysisPrompt = `Com base nos dados extraídos desta conta de energia solar, gere uma análise resumida (máximo 3 parágrafos) em português:

Dados:
- Geração monitorada: ${monitoredGeneration} kWh
- Geração esperada: ${expectedGeneration} kWh
- Eficiência: ${generationEfficiency.toFixed(1)}%
- Energia injetada: ${extractedData.injected_energy_kwh || 0} kWh
- Energia compensada: ${extractedData.compensated_energy_kwh || 0} kWh
- Consumo faturado: ${extractedData.billed_consumption_kwh || 0} kWh
- Créditos anteriores: ${extractedData.previous_credits_kwh || 0} kWh
- Créditos atuais: ${extractedData.current_credits_kwh || 0} kWh
- Valor total: R$ ${extractedData.total_amount || 0}
- Bandeira: ${extractedData.tariff_flag || "não identificada"}
- Alertas: ${alerts.join(", ") || "nenhum"}

Foque em:
1. Desempenho do sistema solar vs expectativa
2. Economia gerada e uso de créditos
3. Recomendações práticas`;

    const analysisResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é um consultor de energia solar. Seja claro, objetivo e prático." },
          { role: "user", content: analysisPrompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    let aiAnalysis = "";
    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json();
      aiAnalysis = analysisData.choices[0]?.message?.content || "";
    }

    // Update the analysis record in the database
    const updateData = {
      status: "completed",
      account_holder: extractedData.account_holder,
      account_number: extractedData.account_number,
      distributor: extractedData.distributor,
      billed_consumption_kwh: extractedData.billed_consumption_kwh,
      injected_energy_kwh: extractedData.injected_energy_kwh,
      compensated_energy_kwh: extractedData.compensated_energy_kwh,
      previous_credits_kwh: extractedData.previous_credits_kwh,
      current_credits_kwh: extractedData.current_credits_kwh,
      total_amount: extractedData.total_amount,
      energy_cost: extractedData.energy_cost,
      availability_cost: extractedData.availability_cost,
      public_lighting_cost: extractedData.public_lighting_cost,
      icms_cost: extractedData.icms_cost,
      pis_cofins_cost: extractedData.pis_cofins_cost,
      fine_amount: extractedData.fine_amount,
      tariff_flag: extractedData.tariff_flag,
      real_consumption_kwh: realConsumption,
      generation_efficiency: generationEfficiency,
      estimated_savings: estimatedSavings,
      alerts: alerts,
      ai_analysis: aiAnalysis,
    };

    console.log("Updating analysis with:", updateData);

    const { error: updateError } = await supabase
      .from("bill_analyses")
      .update(updateData)
      .eq("id", analysisId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw new Error(`Failed to update analysis: ${updateError.message}`);
    }

    console.log("Analysis completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: updateData,
        message: "Análise concluída com sucesso" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Error in analyze-bill function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
