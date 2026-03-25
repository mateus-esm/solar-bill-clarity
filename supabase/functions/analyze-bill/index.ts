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
  connection_type?: string; // "monofasico" | "bifasico" | "trifasico"
  
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
  
  // Cobranças extras (serviços contratados, parcelamentos)
  service_items?: Array<{ description: string; value: number }>;
  installment_items?: Array<{ description: string; value: number; remaining_installments?: number }>;

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

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  return items.length ? items : [];
}

function normalizeRawBillData(input: unknown): RawBillData {
  const raw = (input ?? {}) as Record<string, unknown>;
  const out: RawBillData = {};

  // Identificação
  out.account_holder = toStringOrUndefined(raw.account_holder);
  out.account_number = toStringOrUndefined(raw.account_number);
  out.cpf_cnpj = toStringOrUndefined(raw.cpf_cnpj);
  out.distributor = toStringOrUndefined(raw.distributor);
  out.consumer_class = toStringOrUndefined(raw.consumer_class);
  out.subclass = toStringOrUndefined(raw.subclass);
  out.tariff_modality = toStringOrUndefined(raw.tariff_modality);
  out.connection_type = toStringOrUndefined(raw.connection_type);

  // Período
  out.reference_month = toInt(raw.reference_month);
  out.reference_year = toInt(raw.reference_year);
  out.reading_date_current = toStringOrUndefined(raw.reading_date_current);
  out.reading_date_previous = toStringOrUndefined(raw.reading_date_previous);
  out.due_date = toStringOrUndefined(raw.due_date);
  out.billing_days = toInt(raw.billing_days);

  // Medições
  out.meter_number = toStringOrUndefined(raw.meter_number);
  out.meter_reading_previous = toNumber(raw.meter_reading_previous);
  out.meter_reading_current = toNumber(raw.meter_reading_current);
  out.measured_consumption_kwh = toNumber(raw.measured_consumption_kwh);

  // Energia Solar
  out.injected_energy_kwh = toNumber(raw.injected_energy_kwh);
  out.compensated_energy_kwh = toNumber(raw.compensated_energy_kwh);
  out.previous_credits_kwh = toNumber(raw.previous_credits_kwh);
  out.current_credits_kwh = toNumber(raw.current_credits_kwh);
  out.credit_expiry_date = toStringOrUndefined(raw.credit_expiry_date);

  // Tarifas
  out.tariff_te_kwh = toNumber(raw.tariff_te_kwh);
  out.tariff_tusd_kwh = toNumber(raw.tariff_tusd_kwh);
  out.tariff_flag = toStringOrUndefined(raw.tariff_flag);
  out.tariff_flag_value_kwh = toNumber(raw.tariff_flag_value_kwh);

  // Custos
  out.energy_cost_te = toNumber(raw.energy_cost_te);
  out.energy_cost_tusd = toNumber(raw.energy_cost_tusd);
  out.energy_cost = toNumber(raw.energy_cost);
  out.availability_cost = toNumber(raw.availability_cost);
  out.public_lighting_cost = toNumber(raw.public_lighting_cost);
  out.icms_base = toNumber(raw.icms_base);
  out.icms_rate = toNumber(raw.icms_rate);
  out.icms_cost = toNumber(raw.icms_cost);
  out.pis_base = toNumber(raw.pis_base);
  out.pis_rate = toNumber(raw.pis_rate);
  out.pis_cost = toNumber(raw.pis_cost);
  out.cofins_base = toNumber(raw.cofins_base);
  out.cofins_rate = toNumber(raw.cofins_rate);
  out.cofins_cost = toNumber(raw.cofins_cost);
  out.sectoral_charges = toNumber(raw.sectoral_charges);
  out.fines_amount = toNumber(raw.fines_amount);
  out.interest_amount = toNumber(raw.interest_amount);
  out.other_charges = toNumber(raw.other_charges);
  out.other_credits = toNumber(raw.other_credits);

  // Demanda (Grupo A)
  out.demand_contracted_kw = toNumber(raw.demand_contracted_kw);
  out.demand_measured_kw = toNumber(raw.demand_measured_kw);
  out.demand_billed_kw = toNumber(raw.demand_billed_kw);
  out.demand_excess_cost = toNumber(raw.demand_excess_cost);

  // Totais
  out.subtotal_before_taxes = toNumber(raw.subtotal_before_taxes);
  out.credit_discount = toNumber(raw.credit_discount);
  out.total_amount = toNumber(raw.total_amount);

  // Cobranças extras
  if (Array.isArray(raw.service_items)) {
    out.service_items = raw.service_items
      .filter((i: any) => i && typeof i === "object")
      .map((i: any) => ({ description: String(i.description || ""), value: Number(i.value) || 0 }));
  }
  if (Array.isArray(raw.installment_items)) {
    out.installment_items = raw.installment_items
      .filter((i: any) => i && typeof i === "object")
      .map((i: any) => ({
        description: String(i.description || ""),
        value: Number(i.value) || 0,
        remaining_installments: i.remaining_installments != null ? Number(i.remaining_installments) : undefined,
      }));
  }

  // Textos importantes
  out.legal_notices = normalizeStringArray(raw.legal_notices);
  out.tariff_notes = normalizeStringArray(raw.tariff_notes);

  // Metadados
  out.extraction_confidence = toNumber(raw.extraction_confidence);
  out.fields_not_found = normalizeStringArray(raw.fields_not_found);

  return out;
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
// ETAPA 1: OCR DE ALTA PRECISÃO COM FALLBACK
// ============================================================

interface OCRResult {
  data: RawBillData;
  providerUsed: "gemini" | "openai";
}

const OCR_PROMPT = `Você é um OCR especializado em contas de energia elétrica brasileiras. 
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
  "connection_type": "OBRIGATÓRIO — tipo de ligação elétrica. Valores aceitos: monofasico, bifasico, trifasico. Procure em TODA a conta: dados técnicos, informações da instalação, tipo de ramal, número de fases, seção de identificação, rodapé. Pistas: 'trifásico'/'3 fases'/'3F' = trifasico; 'bifásico'/'2 fases'/'2F' = bifasico; 'monofásico'/'1 fase'/'1F' = monofasico. TAMBÉM infira pelo custo de disponibilidade: se availability_cost ÷ (tariff_te_kwh + tariff_tusd_kwh) ≈ 100 então trifasico, ≈ 50 então bifasico, ≈ 30 então monofasico.",
  
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
  "availability_cost": "CRÍTICO - Custo de Disponibilidade (taxa mínima obrigatória do GRUPO B/Baixa Tensão). Este valor VARIA pelo tipo de ligação: Monofásico = 30 kWh × tarifa, Bifásico = 50 kWh × tarifa, Trifásico = 100 kWh × tarifa. Procure na tabela de faturamento por itens como 'Custo de Disponibilidade', 'Disponibilidade', 'Mínimo Faturável' ou 'Demanda'. Extraia o valor TOTAL em R$ (com impostos). Para trifásico com tarifa ~R$0,65/kWh, o valor esperado é ~R$65-120. NÃO confunda com CIP/Iluminação Pública.",
  "public_lighting_cost": "contribuição de iluminação pública (CIP/COSIP) em R$. É a contribuição municipal — valor fixo cobrado pela prefeitura.",
  
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
  "other_charges": "SOMA de cobranças que NÃO são: energia, disponibilidade, CIP, ICMS, PIS, COFINS, multa ou juros. Inclui parcelamentos, serviços contratados, seguros, etc. Se identificar itens individuais, coloque-os em service_items ou installment_items E some aqui.",
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
  
  "service_items": [
    {
      "description": "nome do serviço contratado ou produto adicional (ex: Proteção Elétrica, Seguro Residencial, TV por Assinatura via fatura, etc)",
      "value": valor_em_R$
    }
  ],

  "installment_items": [
    {
      "description": "descrição do parcelamento em aberto (ex: Parcelamento de débito anterior, Parcelamento equipamentos, etc)",
      "value": valor_mensal_em_R$,
      "remaining_installments": numero_de_parcelas_restantes_ou_null
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

// Helper para parsear resposta OCR
function parseOCRResponse(content: string): RawBillData {
  const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  
  try {
    return JSON.parse(cleanedContent);
  } catch (parseError) {
    console.error("Failed to parse OCR response:", parseError);
    console.log("Raw content (first 1000 chars):", cleanedContent.substring(0, 1000));
    console.log("Raw content (last 500 chars):", cleanedContent.substring(cleanedContent.length - 500));
    
    // Tentar extrair JSON parcial
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        console.error("Partial JSON extraction also failed");
      }
    }
    
    throw new Error("Failed to parse OCR response");
  }
}

// Chamada OCR com Lovable AI Gateway (Gemini) - Provider primário
async function callOCRWithGemini(imageDataUrl: string, lovableApiKey: string): Promise<RawBillData> {
  console.log("🚀 Calling Lovable AI Gateway (Gemini) for OCR...");
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: OCR_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extraia TODOS os dados desta conta de energia:" },
            { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
          ],
        },
      ],
      max_tokens: 8000,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini OCR error:", response.status, errorText);
    
    // Specific error handling for rate limits and quota
    if (response.status === 429) {
      throw new Error("GEMINI_RATE_LIMIT: Rate limit exceeded");
    }
    if (response.status === 402) {
      throw new Error("GEMINI_QUOTA: Credits exhausted");
    }
    
    throw new Error(`Gemini OCR error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  const finishReason = data.choices?.[0]?.finish_reason;
  
  console.log("📄 Gemini OCR response length:", content.length, "finish_reason:", finishReason);

  if (finishReason === "length") {
    console.warn("⚠️ Gemini response was truncated");
    throw new Error("GEMINI_TRUNCATED: Response truncated");
  }

  return parseOCRResponse(content);
}

// Chamada OCR com OpenAI - Fallback
async function callOCRWithOpenAI(imageDataUrl: string, openaiApiKey: string): Promise<RawBillData> {
  console.log("🔄 Calling OpenAI (GPT-4o) for OCR (fallback)...");
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: OCR_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extraia TODOS os dados desta conta de energia:" },
            { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
          ],
        },
      ],
      max_tokens: 8000,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI OCR error:", response.status, errorText);
    
    // Check for quota errors
    if (errorText.includes("insufficient_quota")) {
      throw new Error("OPENAI_QUOTA: Quota exceeded - " + errorText);
    }
    
    throw new Error(`OpenAI OCR error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  const finishReason = data.choices?.[0]?.finish_reason;
  
  console.log("📄 OpenAI OCR response length:", content.length, "finish_reason:", finishReason);

  if (finishReason === "length") {
    console.warn("⚠️ OpenAI response was truncated");
    throw new Error("OPENAI_TRUNCATED: Response truncated");
  }

  return parseOCRResponse(content);
}

// Função principal de OCR com fallback
async function performOCRExtraction(
  imageDataUrl: string,
  lovableApiKey: string,
  openaiApiKey: string
): Promise<OCRResult> {
  console.log("🔍 ETAPA 1: Iniciando OCR de alta precisão com fallback...");

  let rawData: RawBillData = {};
  let providerUsed: "gemini" | "openai" = "gemini";

  // Tentar Gemini primeiro (até 2 tentativas)
  let geminiAttempts = 0;
  let geminiSuccess = false;
  
  while (geminiAttempts < 2 && !geminiSuccess) {
    geminiAttempts++;
    try {
      console.log(`📤 Gemini OCR attempt ${geminiAttempts}...`);
      rawData = await callOCRWithGemini(imageDataUrl, lovableApiKey);
      geminiSuccess = true;
      providerUsed = "gemini";
      console.log("✅ Gemini OCR succeeded");
    } catch (geminiError) {
      const errorMsg = geminiError instanceof Error ? geminiError.message : String(geminiError);
      console.warn(`⚠️ Gemini attempt ${geminiAttempts} failed:`, errorMsg);
      
      // Se for erro fatal (quota/rate limit), pular para fallback imediatamente
      if (errorMsg.includes("GEMINI_RATE_LIMIT") || errorMsg.includes("GEMINI_QUOTA")) {
        console.log("🔄 Gemini quota/rate limit - switching to OpenAI fallback");
        break;
      }
      
      // Se for segunda tentativa, também pular para fallback
      if (geminiAttempts >= 2) {
        console.log("🔄 Gemini failed after 2 attempts - switching to OpenAI fallback");
      }
    }
  }

  // Fallback para OpenAI se Gemini falhou
  if (!geminiSuccess) {
    let openaiAttempts = 0;
    let openaiSuccess = false;
    
    while (openaiAttempts < 2 && !openaiSuccess) {
      openaiAttempts++;
      try {
        console.log(`📤 OpenAI OCR attempt ${openaiAttempts} (fallback)...`);
        rawData = await callOCRWithOpenAI(imageDataUrl, openaiApiKey);
        openaiSuccess = true;
        providerUsed = "openai";
        console.log("✅ OpenAI OCR (fallback) succeeded");
      } catch (openaiError) {
        const errorMsg = openaiError instanceof Error ? openaiError.message : String(openaiError);
        console.error(`❌ OpenAI attempt ${openaiAttempts} failed:`, errorMsg);
        
        // Se ambos providers falharam completamente
        if (openaiAttempts >= 2) {
          console.error("❌ Both OCR providers failed after all attempts");
          
          // Verificar se foi erro de quota em ambos
          if (errorMsg.includes("OPENAI_QUOTA")) {
            throw new Error("Serviço de OCR indisponível. Entre em contato com o suporte.");
          }
          
          throw new Error("Não foi possível processar a imagem. Tente novamente em alguns instantes.");
        }
      }
    }
    
    if (!openaiSuccess) {
      throw new Error("Não foi possível processar a imagem. Tente novamente.");
    }
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

  console.log(`✅ OCR concluído usando ${providerUsed.toUpperCase()}. Campos extraídos:`, 
    Object.keys(normalized).filter(k => normalized[k as keyof RawBillData] !== undefined && normalized[k as keyof RawBillData] !== null).length);

  return { data: normalized, providerUsed };
}

// ============================================================
// ETAPA 2: ANÁLISE ESPECIALISTA
// ============================================================
async function performSpecialistAnalysis(
  rawData: RawBillData,
  monitoredGeneration: number,
  expectedGeneration: number,
  lovableApiKey: string,
  openaiApiKey?: string
): Promise<SpecialistAnalysis> {
  
  const realConsumption = (rawData.measured_consumption_kwh || 0) + (rawData.compensated_energy_kwh || 0);
  const solarEfficiency = expectedGeneration > 0 ? (monitoredGeneration / expectedGeneration) * 100 : 0;
  const selfConsumption = monitoredGeneration > 0 && rawData.injected_energy_kwh 
    ? ((monitoredGeneration - rawData.injected_energy_kwh) / monitoredGeneration) * 100 
    : 0;
  
  // Pre-compute key analytical flags for the prompt
  const minKwhByType: Record<string, number> = { monofasico: 30, bifasico: 50, trifasico: 100 };
  const minKwh = rawData.connection_type ? (minKwhByType[rawData.connection_type] ?? null) : null;
  const billedKwh = rawData.measured_consumption_kwh ?? 0;
  const compensatedKwh = rawData.compensated_energy_kwh ?? 0;
  const injectedKwh = rawData.injected_energy_kwh ?? 0;
  const netBilled = Math.max(0, billedKwh - compensatedKwh);
  const solarCoveredMinimum = minKwh !== null && netBilled <= minKwh * 1.1; // within 10% of minimum
  const creditsToOtherAccounts = injectedKwh > compensatedKwh * 2; // injected >> compensated
  const extraChargesTotal = [
    ...(rawData.service_items ?? []),
    ...(rawData.installment_items ?? []),
  ].reduce((s, i) => s + (i.value ?? 0), 0);
  const otherChargesTotal = (rawData.other_charges ?? 0) + extraChargesTotal;

  const analystPrompt = `Você é um professor especialista em contas de energia elétrica brasileira e sistemas solares fotovoltaicos.
Sua missão é explicar CADA LINHA da conta para o cliente como se ele nunca tivesse visto uma fatura de energia — didático, preciso, sem jargões.

═══════════════════════════════════════
DADOS EXTRAÍDOS DA CONTA
═══════════════════════════════════════
${JSON.stringify(rawData, null, 2)}

═══════════════════════════════════════
DADOS DO MONITORAMENTO SOLAR
═══════════════════════════════════════
- Geração monitorada: ${monitoredGeneration} kWh
- Geração esperada (projeto): ${expectedGeneration} kWh
- Eficiência: ${solarEfficiency.toFixed(1)}%
- Autoconsumo: ${selfConsumption.toFixed(1)}%
- Consumo real estimado: ${realConsumption.toFixed(1)} kWh

═══════════════════════════════════════
ANÁLISES PRÉ-CALCULADAS (use estas na análise)
═══════════════════════════════════════
- Tipo de ligação: ${rawData.connection_type ?? "não identificado"}
- Mínimo obrigatório (kWh): ${minKwh ?? "não calculado"}
- Consumo líquido após compensação: ${netBilled.toFixed(0)} kWh
- SOLAR COBRIU O MÍNIMO: ${solarCoveredMinimum ? "SIM — o sistema compensou tudo que era possível, restando apenas o mínimo obrigatório de " + minKwh + " kWh. Isso é excelente — significa que o solar fez seu trabalho máximo nesta conta." : "NÃO — ainda há consumo além do mínimo não coberto pelo solar."}
- CRÉDITOS PARA OUTRAS UCs: ${creditsToOtherAccounts ? "PROVÁVEL — energia injetada (" + injectedKwh + " kWh) muito maior que compensada (" + compensatedKwh + " kWh). O excedente de " + (injectedKwh - compensatedKwh).toFixed(0) + " kWh foi provavelmente transferido como crédito para outras unidades consumidoras vinculadas." : "Não detectado."}
- Cobranças extras (serviços/parcelamentos): R$ ${extraChargesTotal.toFixed(2)}
- Outros encargos (other_charges): R$ ${(rawData.other_charges ?? 0).toFixed(2)}

Retorne um JSON com análise completa:

{
  "executive_summary": "Resumo executivo de 3-4 frases: o que aconteceu nesta conta, como o solar performou, e o ponto mais importante para o cliente saber.",

  "explanations": {
    "consumption": {
      "title": "Como foi calculado seu consumo",
      "description": "Explique passo a passo: consumo medido → compensação solar → consumo faturado. Use os números reais da conta. Se o solar cobriu o mínimo, destaque isso como conquista."
    },
    "solar_performance": {
      "title": "O que seu sistema solar fez neste mês",
      "description": "Explique: gerou X kWh, injetou Y kWh na rede, compensou Z kWh nesta UC. Se há créditos indo para outras UCs, explique que isso é normal em sistemas com múltiplas unidades vinculadas (SCEE/Compensação). Avalie a eficiência vs projeto.",
      "efficiency_assessment": "Excelente (>95%) / Bom (85-95%) / Regular (70-85%) / Abaixo do esperado (<70%)"
    },
    "availability": {
      "title": "Taxa de Disponibilidade — a conta que nunca some",
      "description": "Explique que todo imóvel trifásico (ou bifásico/monofásico) paga um mínimo obrigatório de X kWh por mês pela CONEXÃO à rede, independente de ter solar ou não. É como uma 'mensalidade' para manter a luz disponível. Para trifásico são 100 kWh × tarifa. O valor pago foi R$ X."
    },
    "cip": {
      "title": "CIP — Contribuição de Iluminação Pública",
      "description": "Explique que este valor (R$ X) vai para a prefeitura custear os postes de luz da rua. É fixo, não muda com consumo e não tem relação com o solar."
    },
    "taxes": {
      "icms": {
        "title": "ICMS sobre energia",
        "description": "Imposto estadual cobrado sobre o valor da energia. No Ceará é de X%. Você pagou R$ X de ICMS nesta conta. Ele incide mesmo sobre a energia compensada pelo solar."
      },
      "pis_cofins": {
        "title": "PIS e COFINS",
        "description": "Tributos federais sobre a receita da distribuidora. Você pagou R$ X no total. São proporcionais ao consumo."
      }
    },
    "extra_charges": {
      "title": "Outros serviços e cobranças na conta",
      "description": "Liste e explique cada serviço/parcelamento identificado nos dados (service_items e installment_items). Se other_charges > 0 e não houver itens detalhados, alerte que há R$ X em cobranças extras não detalhadas que o cliente deve verificar na fatura original. Esses valores NÃO têm relação com o consumo de energia — são produtos/serviços contratados separadamente."
    },
    "credits": {
      "title": "Créditos de energia solar",
      "description": "Explique a situação dos créditos: gerados, utilizados, saldo. Se créditos estão indo para outras UCs, explique o mecanismo de compensação. Se saldo é zero mas injeção foi alta, confirme que os créditos foram transferidos ou consumidos."
    },
    "tariff_flag": {
      "title": "Bandeira tarifária",
      "description": "Explique qual bandeira está ativa e o que significa (verde = reservatórios cheios, sem custo extra; amarela/vermelha = escassez hídrica, custo extra por kWh). Impacto em R$ nesta conta."
    }
  },

  "alerts": [
    {
      "type": "success|info|warning|error",
      "icon": "emoji",
      "title": "Título curto",
      "description": "Descrição detalhada e técnica. Para cada alerta seja específico com valores em R$ ou kWh.",
      "action": "Ação recomendada se aplicável"
    }
  ],

  "metrics": {
    "cost_per_kwh_real": custo_efetivo_por_kWh_consumido,
    "cost_per_kwh_without_solar": quanto_seria_sem_solar,
    "savings_this_month": economia_em_R$,
    "savings_percentage": percentual_de_economia,
    "solar_efficiency": eficiência_em_percentual,
    "self_consumption_rate": taxa_de_autoconsumo
  },

  "recommendations": [
    {
      "priority": "alta|media|baixa",
      "title": "Título da recomendação",
      "description": "Descrição técnica e acionável",
      "estimated_savings": "Economia estimada se aplicável"
    }
  ],

  "bill_score": {
    "value": nota_0_a_100,
    "label": "Excelente|Muito Bom|Bom|Regular|Atenção|Crítico",
    "factors": ["fatores que influenciaram a nota — seja específico"]
  }
}

REGRAS ABSOLUTAS:
1. PROFESSOR: explique cada componente como se o cliente nunca tivesse visto uma conta de luz
2. NÚMEROS REAIS: use sempre os valores exatos extraídos da conta, nunca genéricos
3. SOLAR COBRIU O MÍNIMO: se solarCoveredMinimum = true, destaque isso positivamente — "seu sistema compensou tudo que era possível, a conta só tem o mínimo obrigatório"
4. CRÉDITOS OUTRAS UCs: se creditsToOtherAccounts = true, explique o mecanismo de transferência de créditos entre unidades vinculadas (SCEE)
5. COBRANÇAS EXTRAS: liste TODOS os service_items e installment_items com nome e valor. Se other_charges > 0 sem itens detalhados, alerte para verificar a fatura original
6. IMPOSTOS: explique ICMS, PIS, COFINS linha a linha com valores e alíquotas reais
7. Retorne APENAS JSON válido, sem markdown, sem explicações fora do JSON`;

  console.log("🧠 ETAPA 2: Iniciando análise especialista...");

  const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");

  let responseContent = "";
  let providerUsed = "claude";

  // Try Claude first (primary)
  if (CLAUDE_API_KEY) {
    try {
      console.log("🚀 Specialist analysis: trying Claude Sonnet...");
      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 6000,
          temperature: 0.7,
          system: analystPrompt,
          messages: [
            { role: "user", content: "Analise estes dados e gere o relatório completo:" },
          ],
        }),
      });

      if (!claudeResponse.ok) {
        const errorText = await claudeResponse.text();
        console.warn("⚠️ Claude specialist failed:", claudeResponse.status, errorText);
        throw new Error(`Claude error: ${claudeResponse.status}`);
      }

      const claudeData = await claudeResponse.json();
      responseContent = claudeData.content?.[0]?.text || "{}";
      console.log("✅ Specialist analysis completed with Claude Sonnet");
    } catch (claudeError) {
      console.warn("⚠️ Claude specialist failed, trying Gemini fallback...", claudeError);
      providerUsed = "gemini";
    }
  } else {
    console.warn("⚠️ CLAUDE_API_KEY not configured, skipping Claude");
    providerUsed = "gemini";
  }

  // Fallback to Gemini via Lovable AI Gateway
  if (providerUsed === "gemini") {
    try {
      console.log("🔄 Specialist analysis: trying Gemini (fallback)...");
      const geminiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: analystPrompt },
            { role: "user", content: "Analise estes dados e gere o relatório completo:" },
          ],
          max_tokens: 6000,
          temperature: 0.7,
        }),
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error("❌ Gemini specialist also failed:", errorText);
        throw new Error(`Gemini error: ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();
      responseContent = geminiData.choices?.[0]?.message?.content || "{}";
      console.log("✅ Specialist analysis completed with Gemini fallback");
    } catch (geminiError) {
      console.error("❌ All specialist providers failed");
      throw new Error("Análise especialista indisponível. Tente novamente.");
    }
  }

  console.log(`📊 Análise especialista (${providerUsed}) response length:`, responseContent.length);

  let analysis: SpecialistAnalysis;
  try {
    const cleanedContent = responseContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    analysis = JSON.parse(cleanedContent);
  } catch (parseError) {
    console.error("Failed to parse analysis response:", parseError);
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

  let analysisIdForError: string | undefined;

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

    analysisIdForError = analysisId;
    
    console.log("🚀 Starting bill analysis v2.0:", { 
      analysisId, 
      fileUrl: fileUrl?.substring(0, 50), 
      hasBase64: !!fileBase64,
      expectedGeneration, 
      monitoredGeneration,
      quickAnalysis 
    });

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY && !OPENAI_API_KEY) {
      throw new Error("Neither LOVABLE_API_KEY nor OPENAI_API_KEY configured");
    }
    
    // At least one API key must be available for fallback to work
    const lovableKey = LOVABLE_API_KEY || "";
    const openaiKey = OPENAI_API_KEY || "";

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

    // If mime type is still PDF (legacy URL or detection issue), log warning but don't reject
    // The frontend converts PDFs to images, but storage might return old content-type
    if (imageMimeType.includes("pdf")) {
      console.warn("⚠️ File detected as PDF. Attempting to process anyway as image...");
      // Try to detect actual content by checking base64 header
      if (imageBase64.startsWith("iVBOR")) {
        imageMimeType = "image/png";
        console.log("✅ Content is actually PNG, corrected mime type");
      } else if (imageBase64.startsWith("/9j/")) {
        imageMimeType = "image/jpeg";
        console.log("✅ Content is actually JPEG, corrected mime type");
      } else {
        throw new Error("PDFs não são suportados diretamente. Por favor, converta para imagem ou tire uma foto da sua conta.");
      }
    }

    const imageDataUrl = `data:${imageMimeType};base64,${imageBase64}`;

    // ============================================================
    // ETAPA 1: OCR DE ALTA PRECISÃO COM FALLBACK
    // ============================================================
    const ocrResult = await performOCRExtraction(imageDataUrl, lovableKey, openaiKey);
    const extractedRaw = ocrResult.data;
    const ocrProviderUsed = ocrResult.providerUsed;
    const rawData = normalizeRawBillData(extractedRaw);

    const hasMinimumOCRSignals =
      !!rawData.account_number ||
      !!rawData.distributor ||
      rawData.total_amount !== undefined ||
      rawData.measured_consumption_kwh !== undefined ||
      rawData.compensated_energy_kwh !== undefined ||
      rawData.injected_energy_kwh !== undefined;

    if (!hasMinimumOCRSignals) {
      throw new Error(
        "Não consegui ler a tabela de faturamento desta imagem. Envie uma foto/print que mostre claramente a seção 'DESCRIÇÃO DO FATURAMENTO' (com valores e impostos).",
      );
    }

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
    const specialistAnalysis = await performSpecialistAnalysis(rawData, monitoredGeneration, expectedGeneration, lovableKey, openaiKey);

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
        raw_json: extractedRaw,
        ocr_confidence: rawData.extraction_confidence,
        extraction_model: ocrProviderUsed === "gemini" ? "gemini-3-flash-preview" : "gpt-4o",
        extraction_version: "v3.0-fallback",
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
      billing_days: rawData.billing_days ?? null,
      meter_reading_current: rawData.meter_reading_current ?? null,
      meter_reading_previous: rawData.meter_reading_previous ?? null,
      
      billed_consumption_kwh: rawData.measured_consumption_kwh ?? null,
      injected_energy_kwh: rawData.injected_energy_kwh ?? null,
      compensated_energy_kwh: rawData.compensated_energy_kwh ?? null,
      previous_credits_kwh: rawData.previous_credits_kwh ?? null,
      current_credits_kwh: rawData.current_credits_kwh ?? null,
      
      total_amount: rawData.total_amount ?? null,
      energy_cost: rawData.energy_cost ?? null,
      availability_cost: rawData.availability_cost ?? null,
      public_lighting_cost: rawData.public_lighting_cost ?? null,
      icms_cost: rawData.icms_cost ?? null,
      pis_cost: rawData.pis_cost ?? null,
      cofins_cost: rawData.cofins_cost ?? null,
      pis_cofins_cost: (rawData.pis_cost || 0) + (rawData.cofins_cost || 0),
      sectoral_charges: rawData.sectoral_charges ?? null,
      fine_amount: rawData.fines_amount ?? null,
      interest_amount: rawData.interest_amount ?? null,
      tariff_flag: rawData.tariff_flag,
      tariff_flag_cost:
        rawData.tariff_flag_value_kwh !== undefined
          ? (rawData.tariff_flag_value_kwh * (rawData.measured_consumption_kwh || 0))
          : null,
      tariff_te_value: rawData.tariff_te_kwh ?? null,
      tariff_tusd_value: rawData.tariff_tusd_kwh ?? null,
      
      demand_contracted_kw: rawData.demand_contracted_kw ?? null,
      demand_measured_kw: rawData.demand_measured_kw ?? null,

      connection_type: rawData.connection_type ?? null,
      extra_charges: [
        ...(rawData.service_items || []).map(i => ({ ...i, type: "service" })),
        ...(rawData.installment_items || []).map(i => ({ ...i, type: "installment" })),
      ],

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
    
    // Atualizar status para error no banco de dados se temos analysisId
    if (analysisIdForError) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from("bill_analyses")
          .update({ 
            status: "error",
            ai_analysis: `Erro na análise: ${error instanceof Error ? error.message : "Erro desconhecido"}` 
          })
          .eq("id", analysisIdForError);
        
        console.log("📝 Updated analysis status to error");
      } catch (updateError) {
        console.error("Failed to update status to error:", updateError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        // IMPORTANT: Supabase `functions.invoke` treats non-2xx as a transport error.
        // Returning 200 keeps the error payload accessible to the client (success:false).
        status: 200
      }
    );
  }
});
