import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Loader2, RotateCcw } from "lucide-react";
import soloLogo from "@/assets/solo-logo.png";
import { Button } from "@/components/ui/button";
import { BillUpload } from "@/components/BillUpload";
import { SolarInput } from "@/components/SolarInput";
import { CostChart } from "@/components/CostChart";
import { EducationalBlock } from "@/components/EducationalBlock";
import { CTASection } from "@/components/CTASection";
import { AnalysisStepper, type AnalysisStep } from "@/components/AnalysisStepper";
import { BillScoreHeader } from "@/components/BillScoreHeader";
import { TaxExplainer } from "@/components/TaxExplainer";
import { AlertsList } from "@/components/AlertsList";
import { RawDataViewer } from "@/components/RawDataViewer";
import { RecommendationCards } from "@/components/RecommendationCards";
import { SolarHealthGauge } from "@/components/SolarHealthGauge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { pdfToImages, isPdfFile } from "@/lib/pdfToImages";

// Interface expandida para dados completos da análise v2.0
interface AnalysisResult {
  // Métricas principais
  consumoReal: number;
  consumoFaturado: number;
  valorTotal: number;
  energiaGerada: number;
  energiaInjetada: number;
  creditosUsados: number;
  creditosAcumulados: number;
  economia: number;
  
  // Detalhamento de custos
  detalhamento: Array<{ name: string; value: number; color: string }>;
  
  // Informações da conta
  distribuidora: string;
  bandeira: string;
  
  // Dados brutos do OCR
  rawData: Record<string, unknown>;
  
  // Análise especialista
  billScore: {
    value: number;
    label: string;
    factors: string[];
  };
  
  alerts: Array<{
    type: "error" | "warning" | "info" | "success";
    icon: string;
    title: string;
    description: string;
    action?: string;
  }>;
  
  taxes: Array<{
    id: string;
    name: string;
    value: number;
    rate?: number;
    whatIs: string;
    yourValue: string;
    tip?: string;
    status?: "normal" | "high" | "low";
  }>;
  
  recommendations: Array<{
    priority: "alta" | "media" | "baixa";
    title: string;
    description: string;
    estimated_savings?: string;
  }>;
  
  // Métricas solares
  solarEfficiency: number;
  selfConsumptionRate: number;
  efficiencyAssessment: string;
}

export default function Index() {
  const [file, setFile] = useState<File | null>(null);
  const [solarGeneration, setSolarGeneration] = useState("");
  const [step, setStep] = useState<AnalysisStep>("idle");
  const [stepError, setStepError] = useState<string | undefined>();
  const [showResults, setShowResults] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const toNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  };

  const fileToBase64 = useCallback((f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(f);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
    });
  }, []);

  const handleAnalyze = async () => {
    if (!file || !solarGeneration) return;

    setStepError(undefined);
    setStep("uploading");

    try {
      let imageBase64: string;
      let imageMimeType = file.type;

      // 1) Uploading – convert PDF to image if needed
      if (isPdfFile(file)) {
        const images = await pdfToImages(file, { maxPages: 1, scale: 3 });
        if (!images.length) throw new Error("Não foi possível ler o PDF");
        imageBase64 = images[0].base64.split(",")[1];
        imageMimeType = "image/png";
      } else {
        imageBase64 = await fileToBase64(file);
      }

      // 2) Extracting data via OCR
      setStep("extracting");
      const monitoredGeneration = parseFloat(solarGeneration);

      // 3) Validating
      setStep("validating");

      const { data, error } = await supabase.functions.invoke("analyze-bill", {
        body: {
          fileBase64: imageBase64,
          fileType: imageMimeType,
          monitoredGeneration,
          quickAnalysis: true,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro na análise");

      // 4) Analyzing – build result
      setStep("analyzing");
      const result = data.data;
      const rawData = data.rawData || result;

      // Build cost breakdown
      const detalhamento: Array<{ name: string; value: number; color: string }> = [];
      const energyCost = toNumber(result.energy_cost, 0);
      const icmsCost = toNumber(result.icms_cost, 0);
      const pisCost = toNumber(result.pis_cost, 0);
      const cofinsCost = toNumber(result.cofins_cost, 0);
      const pisCofinsCost = toNumber(result.pis_cofins_cost, 0) || (pisCost + cofinsCost);
      const publicLightingCost = toNumber(result.public_lighting_cost, 0);
      const availabilityCost = toNumber(result.availability_cost, 0);
      const sectoralCharges = toNumber(result.sectoral_charges, 0);

      if (energyCost > 0) detalhamento.push({ name: "Energia", value: energyCost, color: "hsl(24, 95%, 53%)" });
      if (icmsCost > 0) detalhamento.push({ name: "ICMS", value: icmsCost, color: "hsl(45, 100%, 51%)" });
      if (pisCofinsCost > 0) detalhamento.push({ name: "PIS/COFINS", value: pisCofinsCost, color: "hsl(210, 40%, 50%)" });
      if (publicLightingCost > 0) detalhamento.push({ name: "Ilum. Pública", value: publicLightingCost, color: "hsl(280, 60%, 50%)" });
      if (availabilityCost > 0) detalhamento.push({ name: "Disponibilidade", value: availabilityCost, color: "hsl(160, 60%, 45%)" });
      if (sectoralCharges > 0) detalhamento.push({ name: "Encargos", value: sectoralCharges, color: "hsl(0, 60%, 50%)" });

      // Build taxes for TaxExplainer
      const taxes: AnalysisResult["taxes"] = [];
      const totalAmount = toNumber(result.total_amount, 0);
      
      if (icmsCost > 0) {
        taxes.push({
          id: "icms",
          name: "ICMS",
          value: icmsCost,
          rate: toNumber(rawData.icms_rate),
          whatIs: "O ICMS (Imposto sobre Circulação de Mercadorias e Serviços) é um imposto estadual que incide sobre a energia elétrica. Cada estado tem sua própria alíquota.",
          yourValue: `Você pagou R$ ${icmsCost.toFixed(2)}, que representa ${totalAmount > 0 ? ((icmsCost / totalAmount) * 100).toFixed(1) : 0}% da sua conta.`,
          tip: "Consumidores de baixa renda podem ter isenção de ICMS. Verifique com sua distribuidora.",
          status: toNumber(rawData.icms_rate) > 25 ? "high" : "normal",
        });
      }

      if (pisCofinsCost > 0) {
        taxes.push({
          id: "pis_cofins",
          name: "PIS/COFINS",
          value: pisCofinsCost,
          whatIs: "PIS (Programa de Integração Social) e COFINS (Contribuição para o Financiamento da Seguridade Social) são tributos federais que incidem sobre a receita da distribuidora.",
          yourValue: `Você pagou R$ ${pisCofinsCost.toFixed(2)} de PIS/COFINS.`,
          status: "normal",
        });
      }

      if (publicLightingCost > 0) {
        taxes.push({
          id: "cip",
          name: "Iluminação Pública (CIP)",
          value: publicLightingCost,
          whatIs: "A Contribuição de Iluminação Pública (CIP ou COSIP) é uma taxa municipal destinada ao custeio da iluminação das vias públicas da sua cidade.",
          yourValue: `Você paga R$ ${publicLightingCost.toFixed(2)} fixos por mês para a prefeitura.`,
          status: "normal",
        });
      }

      if (availabilityCost > 0) {
        taxes.push({
          id: "disponibilidade",
          name: "Custo de Disponibilidade",
          value: availabilityCost,
          whatIs: "O custo de disponibilidade é a taxa mínima cobrada pela distribuidora para manter sua conexão à rede elétrica, mesmo que você não consuma nenhuma energia.",
          yourValue: `Sua taxa mínima é R$ ${availabilityCost.toFixed(2)}. Com energia solar, esse é frequentemente o único custo que resta.`,
          tip: "Esta taxa é obrigatória e não pode ser eliminada, mas com solar você pode chegar perto de pagar apenas isso!",
          status: "normal",
        });
      }

      // Build alerts from string array or structured array
      let alerts: AnalysisResult["alerts"] = [];
      if (Array.isArray(result.alerts)) {
        alerts = result.alerts.map((alert: string | { type: string; title: string; description: string; icon?: string }) => {
          if (typeof alert === "string") {
            // Determine type based on content
            let type: "error" | "warning" | "info" | "success" = "info";
            let icon = "ℹ️";
            if (alert.toLowerCase().includes("multa") || alert.toLowerCase().includes("erro")) {
              type = "error";
              icon = "🚨";
            } else if (alert.toLowerCase().includes("abaixo") || alert.toLowerCase().includes("atenção")) {
              type = "warning";
              icon = "⚠️";
            } else if (alert.toLowerCase().includes("economia") || alert.toLowerCase().includes("excelente")) {
              type = "success";
              icon = "✅";
            }
            return { type, icon, title: alert.split(":")[0] || "Alerta", description: alert };
          }
          return alert as AnalysisResult["alerts"][0];
        });
      }

      // Build recommendations
      const recommendations: AnalysisResult["recommendations"] = [];
      const efficiency = toNumber(result.generation_efficiency, 0);
      
      if (efficiency < 80 && efficiency > 0) {
        recommendations.push({
          priority: "alta",
          title: "Verificar Painéis Solares",
          description: "Sua geração está abaixo do esperado. Considere agendar uma limpeza ou inspeção dos módulos.",
          estimated_savings: "Pode recuperar até 20% de geração",
        });
      }

      const finesAmount = toNumber(result.fine_amount || result.fines_amount, 0);
      if (finesAmount > 0) {
        recommendations.push({
          priority: "alta",
          title: "Evitar Multas Futuras",
          description: "Você pagou multa por atraso. Configure débito automático para evitar cobranças extras.",
          estimated_savings: `Economia de R$ ${finesAmount.toFixed(2)}/mês`,
        });
      }

      const currentCredits = toNumber(result.current_credits_kwh, 0);
      if (currentCredits > 500) {
        recommendations.push({
          priority: "media",
          title: "Otimizar Uso de Créditos",
          description: "Você tem muitos créditos acumulados. Considere aumentar o consumo diurno ou verificar a possibilidade de transferir créditos.",
        });
      }

      // Calculate solar metrics
      const injectedEnergy = toNumber(result.injected_energy_kwh, 0);
      const selfConsumptionRate = monitoredGeneration > 0 
        ? ((monitoredGeneration - injectedEnergy) / monitoredGeneration) * 100 
        : 0;

      // Determine efficiency assessment
      let efficiencyAssessment = "Bom";
      if (efficiency >= 95) efficiencyAssessment = "Excelente";
      else if (efficiency >= 85) efficiencyAssessment = "Muito Bom";
      else if (efficiency >= 75) efficiencyAssessment = "Bom";
      else if (efficiency >= 60) efficiencyAssessment = "Regular";
      else if (efficiency > 0) efficiencyAssessment = "Abaixo do esperado";

      // Build bill score (simplified calculation)
      let scoreValue = 70;
      const scoreFactors: string[] = [];
      
      if (efficiency >= 90) { scoreValue += 15; scoreFactors.push("Alta eficiência solar"); }
      else if (efficiency < 70 && efficiency > 0) { scoreValue -= 15; scoreFactors.push("Eficiência abaixo do esperado"); }
      
      if (finesAmount === 0) { scoreValue += 10; scoreFactors.push("Sem multas"); }
      else { scoreValue -= 20; scoreFactors.push("Multa detectada"); }
      
      if (currentCredits > 0) { scoreValue += 5; scoreFactors.push("Créditos acumulados"); }

      scoreValue = Math.max(0, Math.min(100, scoreValue));
      
      let scoreLabel = "Bom";
      if (scoreValue >= 90) scoreLabel = "Excelente";
      else if (scoreValue >= 75) scoreLabel = "Muito Bom";
      else if (scoreValue >= 60) scoreLabel = "Bom";
      else if (scoreValue >= 40) scoreLabel = "Regular";
      else scoreLabel = "Atenção";

      setAnalysisResult({
        consumoReal: toNumber(result.real_consumption_kwh, 0),
        consumoFaturado: toNumber(result.billed_consumption_kwh || result.measured_consumption_kwh, 0),
        valorTotal: totalAmount,
        energiaGerada: monitoredGeneration,
        energiaInjetada: injectedEnergy,
        creditosUsados: toNumber(result.compensated_energy_kwh, 0),
        creditosAcumulados: currentCredits,
        economia: toNumber(result.estimated_savings, 0),
        detalhamento,
        distribuidora: result.distributor || "Não identificada",
        bandeira: result.tariff_flag || "Não identificada",
        rawData,
        billScore: { value: scoreValue, label: scoreLabel, factors: scoreFactors },
        alerts,
        taxes,
        recommendations,
        solarEfficiency: efficiency,
        selfConsumptionRate,
        efficiencyAssessment,
      });

      // 5) Completed
      setStep("completed");
      setShowResults(true);

      toast({ title: "Análise concluída!", description: "Sua conta foi analisada com sucesso." });
    } catch (err) {
      console.error("Analysis error:", err);
      const msg = err instanceof Error ? err.message : "Não foi possível analisar a conta";
      setStep("error");
      setStepError(msg);
      toast({ title: "Erro na análise", description: msg, variant: "destructive" });
    }
  };

  const handleReset = () => {
    setFile(null);
    setSolarGeneration("");
    setShowResults(false);
    setAnalysisResult(null);
    setStep("idle");
    setStepError(undefined);
  };

  const isProcessing = step !== "idle" && step !== "completed" && step !== "error";
  const canAnalyze = file && solarGeneration && !isProcessing;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <img src={soloLogo} alt="Solo Energia" className="h-8 w-auto" />
          <Button variant="gradient" size="sm" onClick={() => (window.location.href = "/auth")}>
            Entrar
          </Button>
        </div>
      </header>

      <main className="container py-8 pb-16">
        <AnimatePresence mode="wait">
          {!showResults ? (
            <motion.div
              key="upload-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="mx-auto max-w-lg space-y-6"
            >
              {/* Hero */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Análise Inteligente v2.0</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Raio-X da sua <span className="gradient-text">Conta de Energia</span>
                </h1>
                <p className="mt-3 text-muted-foreground">
                  OCR de alta precisão + IA especialista para entender cada centavo
                </p>
              </motion.div>

              {/* Stepper */}
              <AnalysisStepper currentStep={step} errorMessage={stepError} />

              {/* Upload Section */}
              <div className="space-y-4">
                <BillUpload file={file} onFileSelect={setFile} onClear={() => setFile(null)} />
                <SolarInput value={solarGeneration} onChange={setSolarGeneration} />

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  <Button variant="gradient" size="xl" className="w-full" onClick={handleAnalyze} disabled={!canAnalyze}>
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        Analisar Conta
                      </>
                    )}
                  </Button>
                </motion.div>

                {step === "error" && (
                  <Button variant="outline" className="w-full" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Tentar novamente
                  </Button>
                )}
              </div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground"
              >
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Análise segura
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary" /> OCR de alta precisão
                </span>
              </motion.div>
            </motion.div>
          ) : (
            analysisResult && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto max-w-3xl space-y-6"
              >
                {/* Header with Reset Button */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {analysisResult.distribuidora} | Bandeira {analysisResult.bandeira}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Nova análise
                  </Button>
                </div>

                {/* 1. Bill Score Header */}
                <BillScoreHeader
                  score={analysisResult.billScore.value}
                  label={analysisResult.billScore.label}
                  factors={analysisResult.billScore.factors}
                  totalAmount={analysisResult.valorTotal}
                  savings={analysisResult.economia}
                />

                {/* 2. Alerts */}
                {analysisResult.alerts.length > 0 && (
                  <AlertsList alerts={analysisResult.alerts} />
                )}

                {/* 3. Solar Health Gauge */}
                {analysisResult.energiaGerada > 0 && (
                  <SolarHealthGauge
                    efficiency={analysisResult.solarEfficiency}
                    monitoredGeneration={analysisResult.energiaGerada}
                    expectedGeneration={analysisResult.energiaGerada / (analysisResult.solarEfficiency / 100 || 1)}
                    injectedEnergy={analysisResult.energiaInjetada}
                    selfConsumptionRate={analysisResult.selfConsumptionRate}
                    efficiencyAssessment={analysisResult.efficiencyAssessment}
                  />
                )}

                {/* 4. Cost Distribution Chart */}
                {analysisResult.detalhamento.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      💰 Para Onde Foi Seu Dinheiro
                    </h3>
                    <CostChart data={analysisResult.detalhamento} />
                  </div>
                )}

                {/* 5. Tax Explainer */}
                {analysisResult.taxes.length > 0 && (
                  <TaxExplainer taxes={analysisResult.taxes} />
                )}

                {/* 6. Recommendations */}
                {analysisResult.recommendations.length > 0 && (
                  <RecommendationCards recommendations={analysisResult.recommendations} />
                )}

                {/* 7. Educational Block */}
                <EducationalBlock economia={analysisResult.economia} />

                {/* 8. Raw Data Viewer */}
                <RawDataViewer data={analysisResult.rawData} />

                {/* 9. CTA Section */}
                <CTASection />
              </motion.div>
            )
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6">
        <div className="container text-center">
          <img src={soloLogo} alt="Solo Energia" className="mx-auto h-6 w-auto opacity-60" />
          <p className="mt-2 text-xs text-muted-foreground">© 2025 Solo Energia. Você no controle da sua energia.</p>
        </div>
      </footer>
    </div>
  );
}
