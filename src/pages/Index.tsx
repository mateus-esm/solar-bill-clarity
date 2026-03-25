import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Loader2, RotateCcw, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SoloLogo } from "@/components/SoloLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { BillUpload } from "@/components/BillUpload";
import { SolarInput } from "@/components/SolarInput";
import { AnalysisStepper, type AnalysisStep } from "@/components/AnalysisStepper";
import {
  BillSummaryCard,
  CostCompositionCard,
  SolarEnergyCard,
  SystemStatusCard,
  ActionCard,
} from "@/components/clarifier";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { pdfToImages, isPdfFile, PdfPasswordRequiredError, PdfPasswordIncorrectError } from "@/lib/pdfToImages";

// Interface simplificada para o Bill Clarifier v1.0
interface ClarifierResult {
  // Card 1: Resumo
  totalPaid: number;
  minimumPossible: number;

  // Card 2: Composição
  availabilityCost: number;
  publicLightingCost: number;
  uncompensatedCost: number;

  // Card 3: Solar
  generated: number;
  injected: number;
  compensated: number;
  creditsBalance: number;

  // Card 4: Status
  expectedGeneration: number;
  actualGeneration: number;
  generationGap: number;
  systemStatus: "adequate" | "slightly_below" | "below_needed";

  // Card 5: Ação
  extraGenerationNeeded: number;
  expansionKwp?: number;
  expansionModules?: number;

  // Extras
  distributor: string;
}

export default function Index() {
  const [file, setFile] = useState<File | null>(null);
  const [solarGeneration, setSolarGeneration] = useState("");
  const [step, setStep] = useState<AnalysisStep>("idle");
  const [stepError, setStepError] = useState<string | undefined>();
  const [showResults, setShowResults] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ClarifierResult | null>(null);
  const [pdfNeedsPassword, setPdfNeedsPassword] = useState(false);
  const [pdfPassword, setPdfPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checkingPdf, setCheckingPdf] = useState(false);
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

  const handleFileSelect = async (f: File) => {
    setPdfNeedsPassword(false);
    setPdfPassword("");
    setFile(f);
    if (isPdfFile(f)) {
      setCheckingPdf(true);
      try {
        await pdfToImages(f, { maxPages: 1, scale: 0.5 });
      } catch (err) {
        if (err instanceof PdfPasswordRequiredError) {
          setPdfNeedsPassword(true);
        }
      } finally {
        setCheckingPdf(false);
      }
    }
  };

  const handleValidatePassword = async () => {
    if (!file || !pdfPassword) return;
    setCheckingPdf(true);
    try {
      await pdfToImages(file, { maxPages: 1, scale: 0.5, password: pdfPassword });
      setPdfNeedsPassword(false);
      toast({ title: "PDF desbloqueado!", description: "Senha aceita com sucesso." });
    } catch (err) {
      if (err instanceof PdfPasswordIncorrectError || err instanceof PdfPasswordRequiredError) {
        toast({ title: "Senha incorreta", description: "Tente novamente.", variant: "destructive" });
      }
    } finally {
      setCheckingPdf(false);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setPdfNeedsPassword(false);
    setPdfPassword("");
  };

  const handleAnalyze = async () => {
    if (!file || !solarGeneration) return;

    setStepError(undefined);
    setStep("uploading");

    try {
      let imageBase64: string;
      let imageMimeType = file.type;

      // 1) Uploading – convert PDF to image if needed
      if (isPdfFile(file)) {
        const images = await pdfToImages(file, { maxPages: 1, scale: 3, password: pdfPassword || undefined });
        if (!images.length) throw new Error("Não foi possível ler o PDF");
        imageBase64 = images[0].base64.split(",")[1];
        imageMimeType = "image/png";
      } else {
        imageBase64 = await fileToBase64(file);
      }

      // 2) Extracting data via OCR
      setStep("extracting");
      const monitoredGeneration = parseFloat(solarGeneration);

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

      // 3) Calculating – build clarifier result
      setStep("calculating");
      const result = data.data;
      const rawData = data.rawData || result;

      // === CÁLCULOS DO CLARIFIER ===

      // Taxas fixas (Valor Mínimo Possível)
      const availabilityCost = toNumber(result.availability_cost || rawData.availability_cost, 0);
      const publicLightingCost = toNumber(result.public_lighting_cost || rawData.public_lighting_cost, 0);
      const minimumPossible = availabilityCost + publicLightingCost;

      // Valor total pago
      const totalPaid = toNumber(result.total_amount || rawData.total_amount, 0);

      // Consumo não compensado (diferença do mínimo)
      const uncompensatedCost = Math.max(0, totalPaid - minimumPossible);

      // Dados solares
      const generated = monitoredGeneration;
      const injected = toNumber(result.injected_energy_kwh || rawData.injected_energy_kwh, 0);
      const compensated = toNumber(result.compensated_energy_kwh || rawData.compensated_energy_kwh, 0);
      const creditsBalance = toNumber(result.current_credits_kwh || rawData.current_credits_kwh, 0);

      // Geração esperada: usa valor do sistema ou estima 150 kWh/kWp
      // Se não temos potência instalada, estimamos baseado no que foi monitorado
      const expectedGeneration = toNumber(result.expected_generation_kwh, 0) || generated;

      // Status do sistema
      const billedConsumption = toNumber(result.billed_consumption_kwh || rawData.measured_consumption_kwh, 0);
      const geracaoNecessaria = Math.max(0, billedConsumption - compensated);

      let systemStatus: ClarifierResult["systemStatus"] = "adequate";
      if (generated >= geracaoNecessaria) {
        systemStatus = "adequate";
      } else if (generated >= geracaoNecessaria * 0.8) {
        systemStatus = "slightly_below";
      } else {
        systemStatus = "below_needed";
      }

      // Expansão necessária
      const extraGenerationNeeded = Math.max(0, geracaoNecessaria - generated);
      const expansionKwp = extraGenerationNeeded > 0 ? extraGenerationNeeded / 150 : undefined;
      const expansionModules = expansionKwp ? Math.ceil(expansionKwp / 0.4) : undefined; // 400W por módulo

      setAnalysisResult({
        totalPaid,
        minimumPossible,
        availabilityCost,
        publicLightingCost,
        uncompensatedCost,
        generated,
        injected,
        compensated,
        creditsBalance,
        expectedGeneration,
        actualGeneration: generated,
        generationGap: Math.max(0, expectedGeneration - generated),
        systemStatus,
        extraGenerationNeeded,
        expansionKwp,
        expansionModules,
        distributor: result.distributor || rawData.distributor || "Não identificada",
      });

      // 4) Completed
      setStep("completed");
      setShowResults(true);

      toast({ title: "Análise concluída!", description: "Veja o resultado da sua conta." });
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
    setPdfNeedsPassword(false);
    setPdfPassword("");
  };

  const handleExpansionClick = () => {
    // Open WhatsApp or contact form
    const message = encodeURIComponent(
      `Olá! Gostaria de avaliar uma expansão do meu sistema solar. ` +
        `Minha geração atual é ${analysisResult?.generated || 0} kWh e preciso de mais ` +
        `${analysisResult?.extraGenerationNeeded || 0} kWh para pagar apenas o valor mínimo.`
    );
    window.open(`https://wa.me/5500000000000?text=${message}`, "_blank");
  };

  const isProcessing = step !== "idle" && step !== "completed" && step !== "error";
  const canAnalyze = file && solarGeneration && !isProcessing && !pdfNeedsPassword;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="solo-header-bar border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <SoloLogo className="h-8 w-auto" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="gradient" size="sm" onClick={() => (window.location.href = "/auth")}>
              Entrar
            </Button>
          </div>
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
                <div
                  className="mx-auto mb-5 inline-flex items-center gap-2 px-3 py-1.5 border"
                  style={{
                    borderRadius: "var(--radius)",
                    borderColor: "rgb(255 72 30 / 0.3)",
                    background: "rgb(255 72 30 / 0.08)",
                  }}
                >
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary tracking-wide uppercase">Bill Clarifier</span>
                </div>
                <h1 className="text-3xl font-bold text-foreground sm:text-4xl leading-tight" style={{ letterSpacing: "-0.025em" }}>
                  Entenda sua <span className="gradient-text">conta de energia</span>
                </h1>
                <p className="mt-3 text-muted-foreground text-sm">
                  Descubra por que você está pagando esse valor e como pagar menos
                </p>
              </motion.div>

              {/* Stepper */}
              <AnalysisStepper currentStep={step} errorMessage={stepError} />

              {/* Upload Section */}
              <div className="space-y-4">
                <BillUpload file={file} onFileSelect={handleFileSelect} onClear={handleClearFile} />

                {/* PDF Password Field */}
                <AnimatePresence>
                  {pdfNeedsPassword && file && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-muted/50 border border-accent space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Lock className="h-4 w-4 text-primary" />
                          PDF protegido por senha
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Este PDF requer uma senha para ser lido.
                        </p>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Senha do PDF"
                              value={pdfPassword}
                              onChange={(e) => setPdfPassword(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleValidatePassword()}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <Button onClick={handleValidatePassword} disabled={!pdfPassword || checkingPdf}>
                            {checkingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : "Desbloquear"}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                  <span className="h-2 w-2 bg-emerald-500" /> Análise segura
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 bg-primary" /> Respostas claras
                </span>
              </motion.div>
            </motion.div>
          ) : (
            analysisResult && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto max-w-2xl space-y-4"
              >
                {/* Header with Reset Button */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Resultado da Análise</h2>
                    <p className="text-sm text-muted-foreground">{analysisResult.distributor}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Nova análise
                  </Button>
                </div>

                {/* Motivational quote */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center px-4 py-3 bg-muted/30 rounded-lg border border-border"
                >
                  <p className="text-sm text-muted-foreground italic">
                    "Energia solar não zera a conta — ela reduz o consumo.
                    <br />
                    Aqui está exatamente como isso aconteceu no seu caso."
                  </p>
                </motion.div>

                {/* Card 1: Resumo */}
                <BillSummaryCard
                  totalPaid={analysisResult.totalPaid}
                  minimumPossible={analysisResult.minimumPossible}
                />

                {/* Card 2: Composição */}
                <CostCompositionCard
                  availabilityCost={analysisResult.availabilityCost}
                  publicLightingCost={analysisResult.publicLightingCost}
                  uncompensatedCost={analysisResult.uncompensatedCost}
                />

                {/* Card 3: Solar */}
                <SolarEnergyCard
                  generated={analysisResult.generated}
                  injected={analysisResult.injected}
                  compensated={analysisResult.compensated}
                  creditsBalance={analysisResult.creditsBalance}
                />

                {/* Card 4: Status do Sistema */}
                <SystemStatusCard
                  expectedGeneration={analysisResult.expectedGeneration}
                  actualGeneration={analysisResult.actualGeneration}
                  status={analysisResult.systemStatus}
                />

                {/* Card 5: Ação */}
                <ActionCard
                  extraGenerationNeeded={analysisResult.extraGenerationNeeded}
                  expansionKwp={analysisResult.expansionKwp}
                  expansionModules={analysisResult.expansionModules}
                  onExpansionClick={handleExpansionClick}
                />
              </motion.div>
            )
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6">
        <div className="container text-center">
          <SoloLogo className="mx-auto h-6 w-auto opacity-60" />
          <p className="mt-2 text-xs text-muted-foreground">© 2025 Solo Energia. Você no controle da sua energia.</p>
        </div>
      </footer>
    </div>
  );
}
