import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Upload,
  Calendar,
  Sun,
  Zap,
  Loader2,
  FileText,
  X,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SoloLogo } from "@/components/SoloLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { db, storage, functions } from "@/integrations/supabase/clientUntyped";
import { useToast } from "@/hooks/use-toast";
import { AnalysisStepper, type AnalysisStep } from "@/components/AnalysisStepper";
import { isPdfFile, pdfToImages, PdfPasswordRequiredError, PdfPasswordIncorrectError } from "@/lib/pdfToImages";

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function BillAnalyze() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [monitoredGeneration, setMonitoredGeneration] = useState("");
  const [referenceMonth, setReferenceMonth] = useState(new Date().getMonth() + 1);
  const [referenceYear, setReferenceYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [solarSystemId, setSolarSystemId] = useState<string | null>(null);
  const [expectedGeneration, setExpectedGeneration] = useState<number>(0);
  const [step, setStep] = useState<AnalysisStep>("idle");
  const [stepError, setStepError] = useState<string | undefined>();
  const [pdfNeedsPassword, setPdfNeedsPassword] = useState(false);
  const [pdfPassword, setPdfPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checkingPdf, setCheckingPdf] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    if (month) setReferenceMonth(parseInt(month));
    if (year) setReferenceYear(parseInt(year));
  }, [searchParams]);

  useEffect(() => {
    if (user && id) {
      fetchSolarSystem();
    }
  }, [user, id]);

  const fetchSolarSystem = async () => {
    try {
      const { data, error } = await db("solar_systems")
        .select("id, expected_monthly_generation")
        .eq("property_id", id)
        .single();

      if (!error && data) {
        setSolarSystemId(data.id);
        setExpectedGeneration(data.expected_monthly_generation || 0);
      }
    } catch (error) {
      console.error("Error fetching solar system:", error);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      if (isValidFileType(droppedFile)) {
        handleFileSelected(droppedFile);
      } else {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, envie uma imagem ou PDF",
          variant: "destructive",
        });
      }
    }
  };

  const isValidFileType = (file: File) => {
    return file.type.match(/^image\/(jpeg|png|webp)$/) || file.type === "application/pdf";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (isValidFileType(files[0])) {
        await handleFileSelected(files[0]);
      } else {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, envie uma imagem ou PDF",
          variant: "destructive",
        });
      }
    }
  };

  const handleFileSelected = async (selectedFile: File) => {
    setPdfNeedsPassword(false);
    setPdfPassword("");
    setFile(selectedFile);

    if (isPdfFile(selectedFile)) {
      setCheckingPdf(true);
      try {
        await pdfToImages(selectedFile, { maxPages: 1, scale: 0.5 });
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
        toast({ title: "Senha incorreta", description: "Tente novamente com a senha correta.", variant: "destructive" });
      }
    } finally {
      setCheckingPdf(false);
    }
  };

  const handleSubmit = async () => {
    if (!file || !monitoredGeneration || !user || !id) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, envie a conta e informe a geração",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setStep("uploading");
    setStepError(undefined);

    let analysisId: string | null = null;

    try {
      // Convert PDF to image before uploading (edge function only accepts images)
      let fileToUpload: File = file;
      let fileExt = file.name.split(".").pop();

      if (isPdfFile(file)) {
        const images = await pdfToImages(file, {
          maxPages: 1,
          scale: 2,
          password: pdfPassword || undefined,
        });
        if (images.length === 0) throw new Error("Não foi possível converter o PDF em imagem.");

        const base64Data = images[0].base64.split(",")[1];
        const byteString = atob(base64Data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: "image/png" });
        fileToUpload = new File([blob], file.name.replace(/\.pdf$/i, ".png"), { type: "image/png" });
        fileExt = "png";
      }

      // Upload file to storage
      const fileName = `${user.id}/${id}/${referenceYear}-${referenceMonth}.${fileExt}`;

      const { error: uploadError } = await storage
        .from("bills")
        .upload(fileName, fileToUpload, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = storage
        .from("bills")
        .getPublicUrl(fileName);

      // Create analysis record
      setStep("extracting");

      const { data: analysis, error: analysisError } = await db("bill_analyses")
        .insert({
          property_id: id,
          solar_system_id: solarSystemId,
          reference_month: referenceMonth,
          reference_year: referenceYear,
          bill_file_url: urlData.publicUrl,
          monitored_generation_kwh: parseFloat(monitoredGeneration),
          expected_generation_kwh: expectedGeneration,
          status: "processing",
        })
        .select()
        .single();

      if (analysisError) throw analysisError;
      if (!analysis) throw new Error("Failed to create analysis");

      analysisId = analysis.id;

      // Call edge function and WAIT for result (with timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

      try {
        const { data: result, error: fnError } = await functions.invoke(
          "analyze-bill",
          {
            body: {
              analysisId: analysis.id,
              fileUrl: urlData.publicUrl,
              expectedGeneration,
              monitoredGeneration: parseFloat(monitoredGeneration),
            },
          }
        );

        clearTimeout(timeoutId);

        if (fnError) {
          console.error("Edge function error:", fnError);
          throw new Error(fnError.message || "Erro ao processar a conta");
        }

        // Check if the function returned an error in the payload
        if (result && result.success === false) {
          throw new Error(result.error || "Erro ao processar a conta");
        }

        setStep("completed");

        toast({
          title: "Análise concluída!",
          description: "Sua conta foi processada com sucesso",
        });

        // Navigate to results page
        navigate(`/property/${id}/analysis/${analysis.id}`);

      } catch (invokeError: any) {
        clearTimeout(timeoutId);
        
        // If it's an abort, the function timed out
        if (invokeError.name === "AbortError") {
          console.log("Function call timed out, redirecting anyway...");
          toast({
            title: "Processamento em andamento",
            description: "A análise está demorando. Você será redirecionado para acompanhar.",
          });
          navigate(`/property/${id}/analysis/${analysis.id}`);
          return;
        }
        
        throw invokeError;
      }

    } catch (error: any) {
      console.error("Error creating analysis:", error);
      setStep("error");
      setStepError(error.message || "Não foi possível iniciar a análise");
      
      // If we created the analysis, update its status to error
      if (analysisId) {
        try {
          await db("bill_analyses")
            .update({ status: "error", ai_analysis: error.message })
            .eq("id", analysisId);
        } catch (updateErr) {
          console.error("Failed to update analysis status:", updateErr);
        }
      }

      toast({
        title: "Erro",
        description: error.message || "Não foi possível iniciar a análise",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isProcessing = step !== "idle" && step !== "error";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="solo-header-bar border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/property/${id}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <SoloLogo className="h-8 w-auto" />
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container py-8 max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-6">
            <div className="h-12 w-12 rounded gradient-bg flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Analisar Conta de Energia
            </h1>
            <p className="text-muted-foreground mt-1">
              Envie sua fatura para análise automática com IA
            </p>
          </div>

          {/* Stepper */}
          {step !== "idle" && (
            <div className="mb-6">
              <AnalysisStepper currentStep={step} errorMessage={stepError} />
            </div>
          )}

          <div className="space-y-6">
            {/* Month/Year Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mês de referência</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    value={referenceMonth}
                    onChange={(e) => setReferenceMonth(parseInt(e.target.value))}
                    className="w-full h-10 pl-10 pr-4 bg-card border border-input rounded-lg text-foreground"
                    disabled={isProcessing}
                  >
                    {monthNames.map((month, index) => (
                      <option key={index} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <select
                  value={referenceYear}
                  onChange={(e) => setReferenceYear(parseInt(e.target.value))}
                  className="w-full h-10 px-4 bg-card border border-input rounded-lg text-foreground"
                  disabled={isProcessing}
                >
                  {[2026, 2025, 2024, 2023].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Conta de energia (foto ou PDF)</Label>
              {!file ? (
                <label
                  className={`upload-zone flex flex-col items-center justify-center ${
                    isDragging ? "dragging" : ""
                  } ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
                  onDragEnter={handleDragIn}
                  onDragLeave={handleDragOut}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    disabled={isProcessing}
                  />
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    Arraste sua conta aqui
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ou clique para selecionar
                  </p>
                </label>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-4 p-4 bg-card rounded border border-border"
                >
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {!isProcessing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFile(null);
                        setPdfNeedsPassword(false);
                        setPdfPassword("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </motion.div>
              )}

              {/* PDF Password Field */}
              <AnimatePresence>
                {pdfNeedsPassword && file && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 rounded bg-accent/50 border border-accent space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Lock className="h-4 w-4 text-primary" />
                        PDF protegido por senha
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Este PDF requer uma senha para ser lido. Digite a senha abaixo.
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
                        <Button
                          onClick={handleValidatePassword}
                          disabled={!pdfPassword || checkingPdf}
                          size="default"
                        >
                          {checkingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : "Desbloquear"}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Monitored Generation */}
            <div className="space-y-2">
              <Label htmlFor="monitoredGeneration">
                Geração do monitoramento (kWh)
              </Label>
              <p className="text-xs text-muted-foreground">
                Valor total gerado no mês, conforme app do inversor
              </p>
              <div className="relative">
                <Sun className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="monitoredGeneration"
                  type="number"
                  placeholder="Ex: 450"
                  value={monitoredGeneration}
                  onChange={(e) => setMonitoredGeneration(e.target.value)}
                  className="pl-10"
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Expected Generation Info */}
            {expectedGeneration > 0 && (
              <div className="p-4 rounded bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Geração esperada do sistema
                  </span>
                </div>
                <p className="text-2xl font-bold gradient-text">
                  {expectedGeneration.toFixed(0)} kWh/mês
                </p>
              </div>
            )}

            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={!file || !monitoredGeneration || isLoading || pdfNeedsPassword}
            >
              {isLoading ? (
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

            {step === "error" && (
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  setStep("idle");
                  setStepError(undefined);
                }}
              >
                Tentar novamente
              </Button>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
