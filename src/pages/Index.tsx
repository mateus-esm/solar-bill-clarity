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

// Mock analysis result - this would come from backend
const mockAnalysisResult = {
  consumoReal: 520,
  consumoFaturado: 85,
  valorTotal: 127.45,
  energiaGerada: 450,
  energiaInjetada: 380,
  creditosUsados: 365,
  creditosAcumulados: 245,
  economia: 412.50,
  detalhamento: [
    { name: "Energia", value: 40.78, color: "hsl(24, 95%, 53%)" },
    { name: "Impostos", value: 52.26, color: "hsl(45, 100%, 51%)" },
    { name: "CIP", value: 11.47, color: "hsl(210, 40%, 50%)" },
    { name: "Outros", value: 22.94, color: "hsl(0, 0%, 60%)" },
  ],
};

export default function Index() {
  const [file, setFile] = useState<File | null>(null);
  const [solarGeneration, setSolarGeneration] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleAnalyze = async () => {
    if (!file || !solarGeneration) return;

    setIsAnalyzing(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setIsAnalyzing(false);
    setShowResults(true);
  };

  const handleReset = () => {
    setFile(null);
    setSolarGeneration("");
    setShowResults(false);
  };

  const canAnalyze = file && solarGeneration && !isAnalyzing;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-center">
          <img src={soloLogo} alt="Solo Energia" className="h-8 w-auto" />
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
          ) : (
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
                    Referência: Janeiro 2025
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Nova análise
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                <ResultCard
                  title="Consumo Real"
                  value={`${mockAnalysisResult.consumoReal} kWh`}
                  subtitle="Quanto você realmente usou"
                  icon={Home}
                  delay={0}
                  variant="highlight"
                />
                <ResultCard
                  title="Faturado pela Enel"
                  value={`${mockAnalysisResult.consumoFaturado} kWh`}
                  subtitle="Quanto foi cobrado"
                  icon={Receipt}
                  delay={0.1}
                />
                <ResultCard
                  title="Geração Solar"
                  value={`${mockAnalysisResult.energiaGerada} kWh`}
                  subtitle="Sua energia limpa"
                  icon={Sun}
                  delay={0.2}
                />
                <ResultCard
                  title="Valor Total"
                  value={`R$ ${mockAnalysisResult.valorTotal.toFixed(2)}`}
                  subtitle="Total pago neste mês"
                  icon={Zap}
                  delay={0.3}
                />
              </div>

              {/* Solar Breakdown */}
              <SolarBreakdown
                gerada={mockAnalysisResult.energiaGerada}
                injetada={mockAnalysisResult.energiaInjetada}
                creditosUsados={mockAnalysisResult.creditosUsados}
                creditosAcumulados={mockAnalysisResult.creditosAcumulados}
              />

              {/* Cost Distribution */}
              <CostChart data={mockAnalysisResult.detalhamento} />

              {/* Educational Block */}
              <EducationalBlock economia={mockAnalysisResult.economia} />

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
