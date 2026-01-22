import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Home, Receipt, Sun, Loader2 } from "lucide-react";
import soloLogo from "@/assets/solo-logo.png";
import { Button } from "@/components/ui/button";
import { BillUpload } from "@/components/BillUpload";
import { SolarInput } from "@/components/SolarInput";
import { ResultCard } from "@/components/ResultCard";
import { SolarBreakdown } from "@/components/SolarBreakdown";
import { CostChart } from "@/components/CostChart";
import { EducationalBlock } from "@/components/EducationalBlock";
import { CTASection } from "@/components/CTASection";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResult {
  consumoReal: number;
  consumoFaturado: number;
  valorTotal: number;
  energiaGerada: number;
  energiaInjetada: number;
  creditosUsados: number;
  creditosAcumulados: number;
  economia: number;
  detalhamento: Array<{ name: string; value: number; color: string }>;
  alerts: string[];
  distribuidora: string;
  bandeira: string;
}

export default function Index() {
  const [file, setFile] = useState<File | null>(null);
  const [solarGeneration, setSolarGeneration] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  // Edge functions/DB can return numeric fields as strings (e.g. Postgres numeric)
  // Ensure we always store numbers in state so UI formatting (toFixed) never crashes.
  const toNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:mime;base64, prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const handleAnalyze = async () => {
    if (!file || !solarGeneration) return;

    setIsAnalyzing(true);
    
    try {
      const fileBase64 = await fileToBase64(file);
      const monitoredGeneration = parseFloat(solarGeneration);

      const { data, error } = await supabase.functions.invoke("analyze-bill", {
        body: {
          fileBase64,
          fileType: file.type,
          monitoredGeneration,
          quickAnalysis: true,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Erro na análise");
      }

      const result = data.data;
      
      // Build the cost breakdown
      const detalhamento = [];
      const energyCost = toNumber(result.energy_cost, 0);
      const icmsCost = toNumber(result.icms_cost, 0);
      const pisCofinsCost = toNumber(result.pis_cofins_cost, 0);
      const publicLightingCost = toNumber(result.public_lighting_cost, 0);
      const availabilityCost = toNumber(result.availability_cost, 0);

      if (energyCost > 0) {
        detalhamento.push({ name: "Energia", value: energyCost, color: "hsl(24, 95%, 53%)" });
      }
      if (icmsCost > 0) {
        detalhamento.push({ name: "ICMS", value: icmsCost, color: "hsl(45, 100%, 51%)" });
      }
      if (pisCofinsCost > 0) {
        detalhamento.push({ name: "PIS/COFINS", value: pisCofinsCost, color: "hsl(210, 40%, 50%)" });
      }
      if (publicLightingCost > 0) {
        detalhamento.push({ name: "CIP", value: publicLightingCost, color: "hsl(280, 60%, 50%)" });
      }
      if (availabilityCost > 0) {
        detalhamento.push({ name: "Disponibilidade", value: availabilityCost, color: "hsl(160, 60%, 45%)" });
      }

      setAnalysisResult({
        consumoReal: toNumber(result.real_consumption_kwh, 0),
        consumoFaturado: toNumber(result.billed_consumption_kwh, 0),
        valorTotal: toNumber(result.total_amount, 0),
        energiaGerada: monitoredGeneration,
        energiaInjetada: toNumber(result.injected_energy_kwh, 0),
        creditosUsados: toNumber(result.compensated_energy_kwh, 0),
        creditosAcumulados: toNumber(result.current_credits_kwh, 0),
        economia: toNumber(result.estimated_savings, 0),
        detalhamento,
        alerts: result.alerts || [],
        distribuidora: result.distributor || "Não identificada",
        bandeira: result.tariff_flag || "Não identificada",
      });

      setShowResults(true);
      
      toast({
        title: "Análise concluída!",
        description: "Sua conta foi analisada com sucesso.",
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Erro na análise",
        description: error instanceof Error ? error.message : "Não foi possível analisar a conta",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSolarGeneration("");
    setShowResults(false);
    setAnalysisResult(null);
  };

  const canAnalyze = file && solarGeneration && !isAnalyzing;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <img src={soloLogo} alt="Solo Energia" className="h-8 w-auto" />
          <Button variant="gradient" size="sm" onClick={() => window.location.href = '/auth'}>
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
              className="mx-auto max-w-lg"
            >
              {/* Hero Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 text-center"
              >
                <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Análise Inteligente
                  </span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Raio-X da sua{" "}
                  <span className="gradient-text">Conta de Energia</span>
                </h1>
                <p className="mt-3 text-muted-foreground">
                  Entenda cada centavo da sua fatura em menos de 1 minuto
                </p>
              </motion.div>

              {/* Upload Section */}
              <div className="space-y-4">
                <BillUpload
                  file={file}
                  onFileSelect={setFile}
                  onClear={() => setFile(null)}
                />

                <SolarInput
                  value={solarGeneration}
                  onChange={setSolarGeneration}
                />

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    variant="gradient"
                    size="xl"
                    className="w-full"
                    onClick={handleAnalyze}
                    disabled={!canAnalyze}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Analisando sua conta...
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        Analisar Conta
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground"
              >
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Análise segura
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Resultado instantâneo
                </span>
              </motion.div>
            </motion.div>
          ) : analysisResult && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-2xl space-y-6"
            >
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Análise da sua Conta
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Distribuidora: {analysisResult.distribuidora} | Bandeira: {analysisResult.bandeira}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Nova análise
                </Button>
              </div>

              {/* Alerts */}
              {analysisResult.alerts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4"
                >
                  <h3 className="font-semibold text-yellow-600 mb-2">⚠️ Alertas</h3>
                  <ul className="space-y-1 text-sm text-yellow-700">
                    {analysisResult.alerts.map((alert, i) => (
                      <li key={i}>• {alert}</li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                <ResultCard
                  title="Consumo Real"
                  value={`${analysisResult.consumoReal.toFixed(0)} kWh`}
                  subtitle="Quanto você realmente usou"
                  icon={Home}
                  delay={0}
                  variant="highlight"
                />
                <ResultCard
                  title="Faturado pela Distribuidora"
                  value={`${analysisResult.consumoFaturado.toFixed(0)} kWh`}
                  subtitle="Quanto foi cobrado"
                  icon={Receipt}
                  delay={0.1}
                />
                <ResultCard
                  title="Geração Solar"
                  value={`${analysisResult.energiaGerada.toFixed(0)} kWh`}
                  subtitle="Sua energia limpa"
                  icon={Sun}
                  delay={0.2}
                />
                <ResultCard
                  title="Valor Total"
                  value={`R$ ${analysisResult.valorTotal.toFixed(2)}`}
                  subtitle="Total pago neste mês"
                  icon={Zap}
                  delay={0.3}
                />
              </div>

              {/* Solar Breakdown */}
              <SolarBreakdown
                gerada={analysisResult.energiaGerada}
                injetada={analysisResult.energiaInjetada}
                creditosUsados={analysisResult.creditosUsados}
                creditosAcumulados={analysisResult.creditosAcumulados}
              />

              {/* Cost Distribution */}
              {analysisResult.detalhamento.length > 0 && (
                <CostChart data={analysisResult.detalhamento} />
              )}

              {/* Educational Block */}
              <EducationalBlock economia={analysisResult.economia} />

              {/* CTA Section */}
              <CTASection />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6">
        <div className="container text-center">
          <img src={soloLogo} alt="Solo Energia" className="mx-auto h-6 w-auto opacity-60" />
          <p className="mt-2 text-xs text-muted-foreground">
            © 2025 Solo Energia. Você no controle da sua energia.
          </p>
        </div>
      </footer>
    </div>
  );
}
