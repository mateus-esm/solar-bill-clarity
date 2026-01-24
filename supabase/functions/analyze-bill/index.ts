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

// Schema expandido para OCR de alta precisão
interface RawBillData {
  // Identificação
  account_holder?: string;
  account_number?: string;
  cpf_cnpj?: string;
  distributor?: string;
  consumer_class?: string;
  subclass?: string;
  tariff_modality?: string;
  
  // Período
  reference_month?: number;
  reference_year?: number;
  reading_date_current?: string;
  reading_date_previous?: string;
  due_date?: string;
  billing_days?: number;
  
  // Medições
  meter_number?: string;
  meter_reading_previous?: number;
  meter_reading_current?: number;
  measured_consumption_kwh?: number;
  
  // Energia Solar
  injected_energy_kwh?: number;
  compensated_energy_kwh?: number;
  previous_credits_kwh?: number;
  current_credits_kwh?: number;
  credit_expiry_date?: string;
  
  // Tarifas
  tariff_te_kwh?: number;
  tariff_tusd_kwh?: number;
  tariff_flag?: string;
  tariff_flag_value_kwh?: number;
  
  // Custos Detalhados
  energy_cost_te?: number;
  energy_cost_tusd?: number;
  energy_cost?: number;
  availability_cost?: number;
  public_lighting_cost?: number;
  icms_base?: number;
  icms_rate?: number;
  icms_cost?: number;
  pis_base?: number;
  pis_rate?: number;
  pis_cost?: number;
  cofins_base?: number;
  cofins_rate?: number;
  cofins_cost?: number;
  sectoral_charges?: number;
  fines_amount?: number;
  interest_amount?: number;
  other_charges?: number;
  other_credits?: number;
  
  // Demanda (Grupo A)
  demand_contracted_kw?: number;
  demand_measured_kw?: number;
  demand_billed_kw?: number;
  demand_excess_cost?: number;
  
  // Totais
  subtotal_before_taxes?: number;
  credit_discount?: number;
  total_amount?: number;
  
  // Textos importantes
  legal_notices?: string[];
  tariff_notes?: string[];
  
  // Metadados
  extraction_confidence?: number;
  fields_not_found?: string[];
}

// Estrutura da análise especialista
interface SpecialistAnalysis {
  executive_summary: string;
  explanations: {
    consumption?: { title: string; description: string; comparison?: string };
    solar_performance?: { title: string; description: string; efficiency_assessment?: string };
    taxes?: {
      icms?: { what_is: string; your_value: string; tip?: string };
      pis_cofins?: { what_is: string; your_value: string; tip?: string };
      cip?: { what_is: string; your_value: string };
    };
    tariff_flag?: { current: string; what_means: string; impact: string };
    credits?: { status: string; expiry_warning?: string; optimization_tip?: string };
    availability?: { what_is: string; your_value: string };
  };
  alerts: Array<{
    type: "error" | "warning" | "info" | "success";
    icon: string;
    title: string;
    description: string;
    action?: string;
  }>;
  metrics: {
    cost_per_kwh_real?: number;
    cost_per_kwh_without_solar?: number;
    savings_this_month?: number;
    savings_percentage?: number;
    solar_efficiency?: number;
    self_consumption_rate?: number;
  };
  recommendations: Array<{
    priority: "alta" | "media" | "baixa";
    title: string;
    description: string;
    estimated_savings?: string;
  }>;
  bill_score: {
    value: number;
    label: string;
    factors: string[];
  };
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return undefined;

    const hasDot = raw.includes(".");
    const hasComma = raw.includes(",");

    let normalized = raw;
    if (hasDot && hasComma) {
      normalized = raw.replace(/\./g, "").replace(/,/g, ".");
    } else if (hasComma && !hasDot) {
      normalized = raw.replace(/,/g, ".");
    }

    const cleaned = normalized.replace(/[^0-9.\-]/g, "");
    if (!cleaned || cleaned === "-" || cleaned === ".") return undefined;

    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toInt(value: unknown): number | undefined {
  const n = toNumber(value);
  if (n === undefined) return undefined;
  const i = Math.trunc(n);
  return Number.isFinite(i) ? i : undefined;
}

function toStringOrUndefined(value: unknown): string | undefined {
  if (typeof value === "string") {
    const s = value.trim();
    return s ? s : undefined;
  }
  return undefined;
}

async function downloadAndConvertToBase64(url: string, supabaseServiceKey?: string): Promise<{ base64: string; mimeType: string }> {
  console.log("Downloading file from:", url);

  if (supabaseServiceKey && url.includes("/storage/v1/object/")) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL not configured");
    }

    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const objectIndex = parts.findIndex((p) => p === "object");
      if (objectIndex === -1) {
        throw new Error("Invalid Supabase Storage URL (missing /object)");
      }

      let i = objectIndex + 1;
      if (parts[i] === "public" || parts[i] === "sign") i += 1;

      const bucket = parts[i];
      const objectPath = parts.slice(i + 1).join("/");

      if (!bucket || !objectPath) {
        throw new Error("Invalid Supabase Storage URL (missing bucket/path)");
      }

      console.log("Resolved storage download:", { bucket, objectPath });

      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      });

      const { data, error } = await supabase.storage.from(bucket).download(objectPath);
      if (error) {
        console.error("Storage download error:", error);
        throw new Error(`Storage download failed: ${error.message}`);
      }
      if (!data) {
        throw new Error("Storage download failed: empty response");
      }

      const contentType = data.type || "application/octet-stream";
      const arrayBuffer = await data.arrayBuffer();
      const base64 = base64Encode(arrayBuffer);

      console.log("File downloaded via storage API, size:", arrayBuffer.byteLength, "bytes");

      return { base64, mimeType: contentType };
    } catch (e) {
      console.warn("Storage URL parse/download failed, falling back to fetch:", e instanceof Error ? e.message : e);
    }
  }

  const headers: Record<string, string> = {};
  if (supabaseServiceKey) {
    headers["Authorization"] = `Bearer ${supabaseServiceKey}`;
    headers["apikey"] = supabaseServiceKey;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Download failed:", response.status, errorText);
    throw new Error(`Failed to download file: ${response.status} - ${errorText}`);
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

// ============================================================
// ETAPA 1: OCR DE ALTA PRECISÃO
// ============================================================
async function performOCRExtraction(imageDataUrl: string, openaiApiKey: string): Promise<RawBillData> {
  const ocrPrompt = `Você é um OCR especializado em contas de energia elétrica brasileiras. 
Sua única tarefa é EXTRAIR dados da imagem com máxima precisão. NÃO faça análises ou recomendações.

ATENÇÃO ESPECIAL: Procure pela tabela "DESCRIÇÃO DO FATURAMENTO" ou similar que contém os itens cobrados.
Esta tabela geralmente tem colunas como: Item, Unid., Quant., Preço unit., Valor, PIS/COFINS, Base Calc., Alíquota, ICMS, Tarifa, etc.
SOME TODOS os valores da coluna ICMS para obter o icms_cost_gross.
SOME TODOS os valores da coluna de VALOR/Total para obter a energia bruta antes de créditos.

Extraia TODOS os campos disponíveis e retorne um JSON válido:

{
  "account_holder": "nome completo do titular",
  "account_number": "número da conta/unidade consumidora/instalação",
  "cpf_cnpj": "CPF ou CNPJ do titular",
  "distributor": "nome da distribuidora (CEMIG, CPFL, ENEL, LIGHT, COELBA, ENERGISA, etc)",
  "consumer_class": "classe de consumo (Residencial, Comercial, Industrial, Rural)",
  "subclass": "subgrupo tarifário (B1, B2, B3, A4, etc)",
  "tariff_modality": "modalidade (Convencional, Branca, Horosazonal Verde, Horosazonal Azul)",
  
  "reference_month": número do mês de referência (1-12),
  "reference_year": ano de referência (ex: 2024),
  "reading_date_current": "data da leitura atual (DD/MM/AAAA)",
  "reading_date_previous": "data da leitura anterior (DD/MM/AAAA)",
  "due_date": "data de vencimento (DD/MM/AAAA)",
  "billing_days": número de dias do período de faturamento,
  
  "meter_number": "número do medidor",
  "meter_reading_previous": leitura anterior em kWh,
  "meter_reading_current": leitura atual em kWh,
  "measured_consumption_kwh": consumo medido total em kWh (da tabela de medição),
  
  "injected_energy_kwh": energia injetada na rede em kWh (geração solar),
  "compensated_energy_kwh": energia compensada em kWh,
  "previous_credits_kwh": saldo anterior de créditos em kWh,
  "current_credits_kwh": saldo atual/final de créditos em kWh,
  "credit_expiry_date": "data de expiração dos créditos mais antigos",
  
  "tariff_te_kwh": tarifa de energia TE em R$/kWh,
  "tariff_tusd_kwh": tarifa de uso do sistema TUSD em R$/kWh,
  "tariff_flag": "bandeira tarifária (verde, amarela, vermelha 1, vermelha 2)",
  "tariff_flag_value_kwh": valor adicional da bandeira por kWh,
  
  "energy_cost_te": custo da energia TE em R$,
  "energy_cost_tusd": custo do TUSD em R$,
  "energy_cost": custo total de energia cobrado (TE + TUSD) após compensações em R$,
  "energy_cost_gross": valor BRUTO de energia ANTES de créditos/compensações (soma positiva da tabela de faturamento) em R$,
  "availability_cost": custo de disponibilidade/demanda mínima em R$,
  "public_lighting_cost": contribuição de iluminação pública (CIP/COSIP) em R$,
  
  "icms_base": base de cálculo do ICMS em R$,
  "icms_rate": alíquota do ICMS em % (ex: 25 para 25%),
  "icms_cost": valor FINAL do ICMS cobrado (pode ser 0 se compensado) em R$,
  "icms_cost_gross": valor BRUTO de ICMS da tabela de faturamento (soma da coluna ICMS) em R$,
  
  "pis_base": base de cálculo do PIS em R$,
  "pis_rate": alíquota do PIS em % (ex: 0.65),
  "pis_cost": valor do PIS cobrado em R$,
  "pis_cost_gross": valor bruto do PIS antes de compensações em R$,
  
  "cofins_base": base de cálculo do COFINS em R$,
  "cofins_rate": alíquota do COFINS em % (ex: 3),
  "cofins_cost": valor do COFINS cobrado em R$,
  "cofins_cost_gross": valor bruto do COFINS antes de compensações em R$,
  
  "sectoral_charges": encargos setoriais (CDE, PROINFA, etc) em R$,
  "fines_amount": multas por atraso em R$,
  "interest_amount": juros por atraso em R$,
  "other_charges": outras cobranças em R$,
  "other_credits": outros créditos/descontos em R$,
  
  "demand_contracted_kw": demanda contratada em kW (Grupo A),
  "demand_measured_kw": demanda medida em kW,
  "demand_billed_kw": demanda faturada em kW,
  "demand_excess_cost": custo de ultrapassagem de demanda em R$,
  
  "subtotal_before_taxes": subtotal antes de impostos em R$,
  "subtotal_gross": subtotal BRUTO da tabela de faturamento (antes de créditos negativos) em R$,
  "credit_discount": desconto de créditos de energia solar em R$ (geralmente valor negativo na fatura),
  "total_amount": valor total final da fatura a pagar em R$,
  
  "consumption_by_type": [
    {
      "item": "nome do item (ex: Energia Ativa Fornecida TE, Energia Ativa TUSD, etc)",
      "quantity_kwh": quantidade em kWh,
      "unit_price": preço unitário,
      "total_value": valor total deste item,
      "icms": valor de ICMS deste item
    }
  ],
  
  "legal_notices": ["lista de avisos legais importantes encontrados"],
  "tariff_notes": ["notas sobre tarifas ou reajustes mencionados"],
  
  "extraction_confidence": confiança geral da extração (0-100),
  "fields_not_found": ["lista de campos que não foram encontrados na conta"]
}

REGRAS CRÍTICAS:
1. Retorne APENAS o JSON, sem markdown, sem explicações, sem \`\`\`
2. Use números decimais com PONTO (ex: 123.45, não 123,45)
3. Para valores monetários, extraia APENAS o número sem R$
4. Para kWh, extraia APENAS o número sem unidade
5. Se um campo não existe na conta, use null
6. Para campos de lista, retorne array vazio [] se não encontrar
7. Seja PRECISO - prefira null a inventar valores
8. Procure em TODAS as áreas da conta, incluindo letras pequenas
9. IMPORTANTE: Capture valores BRUTOS (gross) da tabela de descrição do faturamento mesmo se o total for zero
10. Valores negativos na tabela (créditos) devem ser somados no credit_discount`;

  console.log("🔍 ETAPA 1: Iniciando OCR de alta precisão...");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: ocrPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extraia TODOS os dados desta conta de energia:" },
            { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0, // Determinístico para máxima consistência
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI OCR error:", errorText);
    throw new Error(`OpenAI OCR error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "{}";
  
  console.log("📄 OCR raw response length:", content.length);

  // Parse e normalize
  let rawData: RawBillData = {};
  try {
    const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    rawData = JSON.parse(cleanedContent);
  } catch (parseError) {
    console.error("Failed to parse OCR response:", parseError);
    console.log("Raw content:", content.substring(0, 500));
    rawData = {};
  }

  // Normalizar todos os campos numéricos
  const normalized: RawBillData = {
    account_holder: toStringOrUndefined(rawData.account_holder),
    account_number: toStringOrUndefined(rawData.account_number),
    cpf_cnpj: toStringOrUndefined(rawData.cpf_cnpj),
    distributor: toStringOrUndefined(rawData.distributor),
    consumer_class: toStringOrUndefined(rawData.consumer_class),
    subclass: toStringOrUndefined(rawData.subclass),
    tariff_modality: toStringOrUndefined(rawData.tariff_modality),
    
    reference_month: toInt(rawData.reference_month),
    reference_year: toInt(rawData.reference_year),
    reading_date_current: toStringOrUndefined(rawData.reading_date_current),
    reading_date_previous: toStringOrUndefined(rawData.reading_date_previous),
    due_date: toStringOrUndefined(rawData.due_date),
    billing_days: toInt(rawData.billing_days),
    
    meter_number: toStringOrUndefined(rawData.meter_number),
    meter_reading_previous: toNumber(rawData.meter_reading_previous),
    meter_reading_current: toNumber(rawData.meter_reading_current),
    measured_consumption_kwh: toNumber(rawData.measured_consumption_kwh),
    
    injected_energy_kwh: toNumber(rawData.injected_energy_kwh),
    compensated_energy_kwh: toNumber(rawData.compensated_energy_kwh),
    previous_credits_kwh: toNumber(rawData.previous_credits_kwh),
    current_credits_kwh: toNumber(rawData.current_credits_kwh),
    credit_expiry_date: toStringOrUndefined(rawData.credit_expiry_date),
    
    tariff_te_kwh: toNumber(rawData.tariff_te_kwh),
    tariff_tusd_kwh: toNumber(rawData.tariff_tusd_kwh),
    tariff_flag: toStringOrUndefined(rawData.tariff_flag),
    tariff_flag_value_kwh: toNumber(rawData.tariff_flag_value_kwh),
    
    energy_cost_te: toNumber(rawData.energy_cost_te),
    energy_cost_tusd: toNumber(rawData.energy_cost_tusd),
    energy_cost: toNumber(rawData.energy_cost),
    availability_cost: toNumber(rawData.availability_cost),
    public_lighting_cost: toNumber(rawData.public_lighting_cost),
    
    icms_base: toNumber(rawData.icms_base),
    icms_rate: toNumber(rawData.icms_rate),
    icms_cost: toNumber(rawData.icms_cost),
    
    pis_base: toNumber(rawData.pis_base),
    pis_rate: toNumber(rawData.pis_rate),
    pis_cost: toNumber(rawData.pis_cost),
    
    cofins_base: toNumber(rawData.cofins_base),
    cofins_rate: toNumber(rawData.cofins_rate),
    cofins_cost: toNumber(rawData.cofins_cost),
    
    sectoral_charges: toNumber(rawData.sectoral_charges),
    fines_amount: toNumber(rawData.fines_amount),
    interest_amount: toNumber(rawData.interest_amount),
    other_charges: toNumber(rawData.other_charges),
    other_credits: toNumber(rawData.other_credits),
    
    demand_contracted_kw: toNumber(rawData.demand_contracted_kw),
    demand_measured_kw: toNumber(rawData.demand_measured_kw),
    demand_billed_kw: toNumber(rawData.demand_billed_kw),
    demand_excess_cost: toNumber(rawData.demand_excess_cost),
    
    subtotal_before_taxes: toNumber(rawData.subtotal_before_taxes),
    credit_discount: toNumber(rawData.credit_discount),
    total_amount: toNumber(rawData.total_amount),
    
    legal_notices: Array.isArray(rawData.legal_notices) ? rawData.legal_notices : [],
    tariff_notes: Array.isArray(rawData.tariff_notes) ? rawData.tariff_notes : [],
    
    extraction_confidence: toNumber(rawData.extraction_confidence),
    fields_not_found: Array.isArray(rawData.fields_not_found) ? rawData.fields_not_found : [],
  };

  console.log("✅ OCR concluído. Campos extraídos:", Object.keys(normalized).filter(k => normalized[k as keyof RawBillData] !== undefined && normalized[k as keyof RawBillData] !== null).length);

  return normalized;
}

// ============================================================
// ETAPA 2: ANÁLISE ESPECIALISTA
// ============================================================
async function performSpecialistAnalysis(
  rawData: RawBillData,
  monitoredGeneration: number,
  expectedGeneration: number,
  openaiApiKey: string
): Promise<SpecialistAnalysis> {
  
  const realConsumption = (rawData.measured_consumption_kwh || 0) + (rawData.compensated_energy_kwh || 0);
  const solarEfficiency = expectedGeneration > 0 ? (monitoredGeneration / expectedGeneration) * 100 : 0;
  const selfConsumption = monitoredGeneration > 0 && rawData.injected_energy_kwh 
    ? ((monitoredGeneration - rawData.injected_energy_kwh) / monitoredGeneration) * 100 
    : 0;
  
  const analystPrompt = `Você é um consultor de energia com 20 anos de experiência em contas de luz brasileiras e sistemas solares fotovoltaicos.
Seu papel é analisar os dados extraídos e explicar TUDO para o cliente de forma clara e acessível.

DADOS EXTRAÍDOS DA CONTA:
${JSON.stringify(rawData, null, 2)}

DADOS DO MONITORAMENTO SOLAR:
- Geração monitorada no período: ${monitoredGeneration} kWh
- Geração esperada (projeto): ${expectedGeneration} kWh
- Eficiência calculada: ${solarEfficiency.toFixed(1)}%
- Taxa de autoconsumo: ${selfConsumption.toFixed(1)}%
- Consumo real estimado: ${realConsumption.toFixed(1)} kWh

Retorne um JSON com análise completa:

{
  "executive_summary": "Resumo executivo de 2-3 frases sobre a situação geral da conta",
  
  "explanations": {
    "consumption": {
      "title": "Seu Consumo de Energia",
      "description": "Explicação clara do consumo, comparando com a geração solar",
      "comparison": "Comparativo com o mês anterior se disponível"
    },
    "solar_performance": {
      "title": "Desempenho do Sistema Solar",
      "description": "Análise da geração vs expectativa, eficiência, possíveis causas de variação",
      "efficiency_assessment": "Avaliação: Excelente/Bom/Regular/Abaixo do esperado"
    },
    "taxes": {
      "icms": {
        "what_is": "O que é ICMS em linguagem simples",
        "your_value": "Você pagou R$ X, que representa Y% da conta",
        "tip": "Dica sobre ICMS se aplicável"
      },
      "pis_cofins": {
        "what_is": "O que são PIS e COFINS",
        "your_value": "Valores pagos e proporção",
        "tip": "Dica relevante"
      },
      "cip": {
        "what_is": "O que é a Contribuição de Iluminação Pública",
        "your_value": "Valor pago - esta taxa é fixa e vai para a prefeitura"
      }
    },
    "tariff_flag": {
      "current": "Nome da bandeira atual",
      "what_means": "Explicação do que significa essa bandeira",
      "impact": "Quanto custou a mais por causa da bandeira"
    },
    "credits": {
      "status": "Situação atual dos créditos de energia solar",
      "expiry_warning": "Aviso sobre créditos próximos de expirar (se houver)",
      "optimization_tip": "Dica para otimizar uso dos créditos"
    },
    "availability": {
      "what_is": "O que é o custo de disponibilidade (taxa mínima)",
      "your_value": "Quanto você paga de taxa mínima"
    }
  },
  
  "alerts": [
    {
      "type": "error|warning|info|success",
      "icon": "emoji apropriado",
      "title": "Título curto do alerta",
      "description": "Descrição detalhada",
      "action": "Ação recomendada (opcional)"
    }
  ],
  
  "metrics": {
    "cost_per_kwh_real": custo efetivo por kWh consumido,
    "cost_per_kwh_without_solar": quanto seria sem solar,
    "savings_this_month": economia em R$ neste mês,
    "savings_percentage": % de economia vs conta sem solar,
    "solar_efficiency": % de eficiência do sistema,
    "self_consumption_rate": % de autoconsumo
  },
  
  "recommendations": [
    {
      "priority": "alta|media|baixa",
      "title": "Título da recomendação",
      "description": "Descrição detalhada do que fazer",
      "estimated_savings": "Economia estimada se aplicável"
    }
  ],
  
  "bill_score": {
    "value": nota de 0 a 100,
    "label": "Excelente|Muito Bom|Bom|Regular|Atenção|Crítico",
    "factors": ["fatores que influenciaram a nota"]
  }
}

REGRAS:
1. Seja DIDÁTICO - explique como se estivesse conversando com alguém que não entende de energia
2. Use linguagem ACESSÍVEL, evite jargões técnicos
3. Destaque PROBLEMAS encontrados (multas, eficiência baixa, cobranças irregulares)
4. Calcule ECONOMIA real proporcionada pelo sistema solar
5. Gere alertas para qualquer anomalia
6. Retorne APENAS o JSON válido, sem markdown`;

  console.log("🧠 ETAPA 2: Iniciando análise especialista...");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: analystPrompt },
        { role: "user", content: "Analise estes dados e gere o relatório completo:" },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI analysis error:", errorText);
    throw new Error(`OpenAI analysis error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "{}";

  console.log("📊 Análise especialista response length:", content.length);

  let analysis: SpecialistAnalysis;
  try {
    const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    analysis = JSON.parse(cleanedContent);
  } catch (parseError) {
    console.error("Failed to parse analysis response:", parseError);
    // Fallback com estrutura mínima
    analysis = {
      executive_summary: "Não foi possível gerar a análise completa. Por favor, tente novamente.",
      explanations: {},
      alerts: [],
      metrics: {
        solar_efficiency: solarEfficiency,
        self_consumption_rate: selfConsumption,
        savings_this_month: (rawData.compensated_energy_kwh || 0) * 0.75,
      },
      recommendations: [],
      bill_score: {
        value: 50,
        label: "Indisponível",
        factors: ["Análise não pôde ser concluída"],
      },
    };
  }

  console.log("✅ Análise especialista concluída. Score:", analysis.bill_score?.value);

  return analysis;
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================
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
    
    console.log("🚀 Starting bill analysis v2.0:", { 
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
      imageBase64 = fileBase64;
      imageMimeType = getMimeTypeFromBase64OrUrl(fileType);
    } else if (fileUrl) {
      const downloaded = await downloadAndConvertToBase64(fileUrl, supabaseServiceKey);
      imageBase64 = downloaded.base64;
      imageMimeType = downloaded.mimeType;
    } else {
      throw new Error("Either fileUrl or fileBase64 must be provided");
    }

    if (imageMimeType.includes("pdf")) {
      throw new Error("PDFs não são suportados diretamente. Por favor, converta para imagem ou tire uma foto da sua conta.");
    }

    const imageDataUrl = `data:${imageMimeType};base64,${imageBase64}`;

    // ============================================================
    // ETAPA 1: OCR DE ALTA PRECISÃO
    // ============================================================
    const rawData = await performOCRExtraction(imageDataUrl, OPENAI_API_KEY);

    // Calculate derived metrics from raw data
    const realConsumption = (rawData.measured_consumption_kwh || rawData.compensated_energy_kwh || 0) + (rawData.compensated_energy_kwh || 0);
    const generationEfficiency = expectedGeneration > 0 ? (monitoredGeneration / expectedGeneration) * 100 : 0;

    // Quick analysis: return raw data without specialist analysis
    if (quickAnalysis) {
      console.log("📋 Quick analysis mode - skipping specialist analysis");
      
      // Generate basic alerts
      const alerts: string[] = [];
      if (generationEfficiency < 80 && expectedGeneration > 0) {
        alerts.push(`Geração abaixo do esperado: ${generationEfficiency.toFixed(1)}%`);
      }
      if ((rawData.fines_amount || 0) > 0) {
        alerts.push(`Multa detectada: R$ ${(rawData.fines_amount || 0).toFixed(2)}`);
      }
      if (rawData.tariff_flag?.toLowerCase().includes("vermelha")) {
        alerts.push(`Bandeira ${rawData.tariff_flag} - custo extra aplicado`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            // Dados básicos normalizados para compatibilidade
            ...rawData,
            billed_consumption_kwh: rawData.measured_consumption_kwh,
            pis_cofins_cost: (rawData.pis_cost || 0) + (rawData.cofins_cost || 0),
            fine_amount: rawData.fines_amount,
            real_consumption_kwh: realConsumption,
            generation_efficiency: generationEfficiency,
            estimated_savings: (rawData.compensated_energy_kwh || 0) * 0.75,
            alerts,
            monitored_generation_kwh: monitoredGeneration,
          },
          rawData, // Dados brutos completos
          message: "Análise rápida concluída" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // ============================================================
    // ETAPA 2: ANÁLISE ESPECIALISTA
    // ============================================================
    const specialistAnalysis = await performSpecialistAnalysis(rawData, monitoredGeneration, expectedGeneration, OPENAI_API_KEY);

    // ============================================================
    // SALVAR NO BANCO DE DADOS
    // ============================================================
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Salvar dados brutos na tabela bill_raw_data
    console.log("💾 Salvando dados brutos...");
    const { error: rawDataError } = await supabase
      .from("bill_raw_data")
      .insert({
        bill_analysis_id: analysisId,
        raw_json: rawData,
        ocr_confidence: rawData.extraction_confidence,
        extraction_model: "gpt-4o",
        extraction_version: "v2.0",
      });

    if (rawDataError) {
      console.error("Error saving raw data:", rawDataError);
      // Não falhar - continuar mesmo se não salvar raw data
    }

    // 2. Atualizar bill_analyses com dados estruturados
    console.log("💾 Atualizando análise...");
    
    // Converter alerts para formato string[]
    const alertStrings = specialistAnalysis.alerts.map(a => `${a.icon} ${a.title}: ${a.description}`);

    const updateData = {
      status: "completed",
      account_holder: rawData.account_holder,
      account_number: rawData.account_number,
      distributor: rawData.distributor,
      consumer_class: rawData.consumer_class,
      tariff_modality: rawData.tariff_modality,
      billing_days: rawData.billing_days,
      meter_reading_current: rawData.meter_reading_current,
      meter_reading_previous: rawData.meter_reading_previous,
      
      billed_consumption_kwh: rawData.measured_consumption_kwh,
      injected_energy_kwh: rawData.injected_energy_kwh,
      compensated_energy_kwh: rawData.compensated_energy_kwh,
      previous_credits_kwh: rawData.previous_credits_kwh,
      current_credits_kwh: rawData.current_credits_kwh,
      
      total_amount: rawData.total_amount,
      energy_cost: rawData.energy_cost,
      availability_cost: rawData.availability_cost,
      public_lighting_cost: rawData.public_lighting_cost,
      icms_cost: rawData.icms_cost,
      pis_cost: rawData.pis_cost,
      cofins_cost: rawData.cofins_cost,
      pis_cofins_cost: (rawData.pis_cost || 0) + (rawData.cofins_cost || 0),
      sectoral_charges: rawData.sectoral_charges,
      fine_amount: rawData.fines_amount,
      interest_amount: rawData.interest_amount,
      tariff_flag: rawData.tariff_flag,
      tariff_flag_cost: rawData.tariff_flag_value_kwh ? (rawData.tariff_flag_value_kwh * (rawData.measured_consumption_kwh || 0)) : null,
      tariff_te_value: rawData.tariff_te_kwh,
      tariff_tusd_value: rawData.tariff_tusd_kwh,
      
      demand_contracted_kw: rawData.demand_contracted_kw,
      demand_measured_kw: rawData.demand_measured_kw,
      
      real_consumption_kwh: realConsumption,
      generation_efficiency: generationEfficiency,
      estimated_savings: specialistAnalysis.metrics.savings_this_month,
      bill_score: specialistAnalysis.bill_score.value,
      
      alerts: alertStrings,
      ai_analysis: specialistAnalysis.executive_summary,
      ai_explanations: specialistAnalysis.explanations,
      ai_recommendations: specialistAnalysis.recommendations,
    };

    const { error: updateError } = await supabase
      .from("bill_analyses")
      .update(updateData)
      .eq("id", analysisId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw new Error(`Failed to update analysis: ${updateError.message}`);
    }

    console.log("✅ Análise v2.0 concluída com sucesso!");

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          ...updateData,
          specialistAnalysis,
        },
        rawData,
        message: "Análise completa concluída com sucesso" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("❌ Error in analyze-bill function:", error);
    
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
