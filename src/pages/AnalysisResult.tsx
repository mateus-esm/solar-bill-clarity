import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  FileText,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Trash2
} from "lucide-react";
import soloLogo from "@/assets/solo-logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/integrations/supabase/clientUntyped";
import { useToast } from "@/hooks/use-toast";
import { AnalysisStepper, type AnalysisStep } from "@/components/AnalysisStepper";
import {
  BillSummaryCard,
  CostCompositionCard,
  SolarEnergyCard,
  SystemStatusCard,
  ActionCard,
} from "@/components/clarifier";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BillAnalysis {
  id: string;
  property_id: string;
  reference_month: number;
  reference_year: number;
  bill_file_url: string | null;
  monitored_generation_kwh: number;
  account_holder: string | null;
  account_number: string | null;
  distributor: string | null;
  billed_consumption_kwh: number | null;
  injected_energy_kwh: number | null;
  compensated_energy_kwh: number | null;
  previous_credits_kwh: number | null;
  current_credits_kwh: number | null;
  total_amount: number | null;
  energy_cost: number | null;
  availability_cost: number | null;
  public_lighting_cost: number | null;
  icms_cost: number | null;
  pis_cofins_cost: number | null;
  tariff_flag: string | null;
  fine_amount: number | null;
  real_consumption_kwh: number | null;
  expected_generation_kwh: number | null;
  generation_efficiency: number | null;
  estimated_savings: number | null;
  ai_analysis: string | null;
  alerts: any[];
  status: string;
  created_at?: string;
}

interface ClarifierResult {
  totalPaid: number;
  minimumPossible: number;
  availabilityCost: number;
  publicLightingCost: number;
  uncompensatedCost: number;
  generated: number;
  injected: number;
  compensated: number;
  creditsBalance: number;
  expectedGeneration: number;
  actualGeneration: number;
  systemStatus: "adequate" | "slightly_below" | "below_needed";
  extraGenerationNeeded: number;
  expansionKwp?: number;
  expansionModules?: number;
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function AnalysisResult() {
  const [analysis, setAnalysis] = useState<BillAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signedBillUrl, setSignedBillUrl] = useState<string | null>(null);
  const [showTechnicalData, setShowTechnicalData] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id, analysisId } = useParams<{ id: string; analysisId: string }>();

  // Helper to convert to number
  const toNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  };

  // Generate signed URL for private bucket
  const getSignedBillUrl = useCallback(async (fileUrl: string) => {
    try {
      // Extract path from full URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/bills/user_id/property_id/year-month.ext
      const match = fileUrl.match(/\/bills\/(.+)$/);
      if (!match) {
        console.error("Could not extract path from bill URL:", fileUrl);
        return null;
      }
      
      const filePath = match[1];
      console.log("Getting signed URL for path:", filePath);
      
      const { data, error } = await supabase.storage
        .from("bills")
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (error) {
        console.error("Error creating signed URL:", error);
        return null;
      }
      
      return data.signedUrl;
    } catch (err) {
      console.error("Error in getSignedBillUrl:", err);
      return null;
    }
  }, []);

  // Calculate clarifier result from analysis
  const calculateClarifierResult = useCallback((analysis: BillAnalysis): ClarifierResult => {
    const availabilityCost = toNumber(analysis.availability_cost, 0);
    const publicLightingCost = toNumber(analysis.public_lighting_cost, 0);
    const minimumPossible = availabilityCost + publicLightingCost;
    const totalPaid = toNumber(analysis.total_amount, 0);
    const uncompensatedCost = Math.max(0, totalPaid - minimumPossible);

    const generated = toNumber(analysis.monitored_generation_kwh, 0);
    const injected = toNumber(analysis.injected_energy_kwh, 0);
    const compensated = toNumber(analysis.compensated_energy_kwh, 0);
    const creditsBalance = toNumber(analysis.current_credits_kwh, 0);

    const expectedGeneration = toNumber(analysis.expected_generation_kwh, 0) || generated;
    const billedConsumption = toNumber(analysis.billed_consumption_kwh, 0);
    const geracaoNecessaria = Math.max(0, billedConsumption - compensated);

    let systemStatus: ClarifierResult["systemStatus"] = "adequate";
    if (generated >= geracaoNecessaria) {
      systemStatus = "adequate";
    } else if (generated >= geracaoNecessaria * 0.8) {
      systemStatus = "slightly_below";
    } else {
      systemStatus = "below_needed";
    }

    const extraGenerationNeeded = Math.max(0, geracaoNecessaria - generated);
    const expansionKwp = extraGenerationNeeded > 0 ? extraGenerationNeeded / 150 : undefined;
    const expansionModules = expansionKwp ? Math.ceil(expansionKwp / 0.4) : undefined;

    return {
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
      systemStatus,
      extraGenerationNeeded,
      expansionKwp,
      expansionModules,
    };
  }, []);

  // Get stepper status based on analysis status
  const getStepperStatus = useCallback((status: string): AnalysisStep => {
    switch (status) {
      case "processing":
        return "extracting";
      case "completed":
        return "completed";
      case "error":
        return "error";
      default:
        return "uploading";
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && analysisId) {
      fetchAnalysis();
    }
  }, [user, analysisId]);

  // Auto-refresh while processing with timeout check
  useEffect(() => {
    if (analysis?.status === "processing") {
      // Set start time if not set
      if (!processingStartTime) {
        setProcessingStartTime(Date.now());
      }

      const interval = setInterval(() => {
        // Check for timeout (2 minutes)
        if (processingStartTime && Date.now() - processingStartTime > 120000) {
          toast({
            title: "Processamento lento",
            description: "A análise está demorando mais que o esperado. Você pode tentar novamente.",
            variant: "destructive",
          });
          clearInterval(interval);
          return;
        }
        fetchAnalysis();
      }, 3000);
      
      return () => clearInterval(interval);
    } else {
      setProcessingStartTime(null);
    }
  }, [analysis?.status, analysisId, processingStartTime]);

  // Load signed URL when analysis is loaded
  useEffect(() => {
    if (analysis?.bill_file_url && analysis.status !== "processing") {
      getSignedBillUrl(analysis.bill_file_url).then(setSignedBillUrl);
    }
  }, [analysis?.bill_file_url, analysis?.status, getSignedBillUrl]);

  const fetchAnalysis = async () => {
    try {
      const { data, error } = await db("bill_analyses")
        .select("*")
        .eq("id", analysisId)
        .single();

      if (error) throw error;
      setAnalysis(data);
    } catch (error: any) {
      console.error("Error fetching analysis:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a análise",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalysis();
    setRefreshing(false);
  };

  const handleDelete = async () => {
    if (!analysisId) return;
    
    setDeleting(true);
    try {
      // First delete raw data (child table)
      await db("bill_raw_data")
        .delete()
        .eq("bill_analysis_id", analysisId);

      // Then delete the analysis
      const { error } = await db("bill_analyses")
        .delete()
        .eq("id", analysisId);

      if (error) throw error;

      toast({
        title: "Análise apagada",
        description: "A análise foi removida com sucesso.",
      });

      navigate(`/property/${id}`);
    } catch (error: any) {
      console.error("Error deleting analysis:", error);
      toast({
        title: "Erro",
        description: "Não foi possível apagar a análise",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleExpansionClick = () => {
    if (!analysis) return;
    const clarifier = calculateClarifierResult(analysis);
    const message = encodeURIComponent(
      `Olá! Gostaria de avaliar uma expansão do meu sistema solar. ` +
      `Minha geração atual é ${clarifier.generated} kWh e preciso de mais ` +
      `${clarifier.extraGenerationNeeded} kWh para pagar apenas o valor mínimo.`
    );
    window.open(`https://wa.me/5500000000000?text=${message}`, "_blank");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const clarifier = calculateClarifierResult(analysis);
  const stepperStatus = getStepperStatus(analysis.status);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/property/${id}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={soloLogo} alt="Solo Energia" className="h-8 w-auto" />
          </div>
          <div className="flex items-center gap-2">
            {signedBillUrl && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(signedBillUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Fatura
              </Button>
            )}
            {analysis.status === "processing" && (
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        {/* Processing State with Stepper */}
        {analysis.status === "processing" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Analisando sua conta de {monthNames[analysis.reference_month - 1]}
              </h2>
              <p className="text-muted-foreground">
                {analysis.distributor || "Distribuidora"} • UC: {analysis.account_number || "—"}
              </p>
            </div>

            <AnalysisStepper currentStep={stepperStatus} />

            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Nossa IA está extraindo os dados da sua fatura...
              </p>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {analysis.status === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Erro na análise
            </h2>
            <p className="text-muted-foreground mb-2">
              {analysis.ai_analysis || "Não foi possível processar sua conta."}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Tente novamente ou envie uma imagem mais clara.
            </p>
            <Button variant="gradient" onClick={() => navigate(`/property/${id}/analyze`)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </motion.div>
        )}

        {/* Completed Analysis - Clarifier Cards */}
        {(analysis.status === "completed" || analysis.status === "pending") && (
          <div className="space-y-4">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <h1 className="text-2xl font-bold text-foreground">
                Análise de {monthNames[analysis.reference_month - 1]} {analysis.reference_year}
              </h1>
              <p className="text-muted-foreground mt-1">
                {analysis.distributor || "Distribuidora"} • UC: {analysis.account_number || "—"}
              </p>
            </motion.div>

            {/* Motivational quote */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
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
              totalPaid={clarifier.totalPaid}
              minimumPossible={clarifier.minimumPossible}
            />

            {/* Card 2: Composição */}
            <CostCompositionCard
              availabilityCost={clarifier.availabilityCost}
              publicLightingCost={clarifier.publicLightingCost}
              uncompensatedCost={clarifier.uncompensatedCost}
            />

            {/* Card 3: Solar */}
            <SolarEnergyCard
              generated={clarifier.generated}
              injected={clarifier.injected}
              compensated={clarifier.compensated}
              creditsBalance={clarifier.creditsBalance}
            />

            {/* Card 4: Status do Sistema */}
            <SystemStatusCard
              expectedGeneration={clarifier.expectedGeneration}
              actualGeneration={clarifier.actualGeneration}
              status={clarifier.systemStatus}
            />

            {/* Card 5: Ação */}
            <ActionCard
              extraGenerationNeeded={clarifier.extraGenerationNeeded}
              expansionKwp={clarifier.expansionKwp}
              expansionModules={clarifier.expansionModules}
              onExpansionClick={handleExpansionClick}
            />

            {/* Technical Data (Collapsible) */}
            <Collapsible open={showTechnicalData} onOpenChange={setShowTechnicalData}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="text-sm font-medium">Dados Técnicos</span>
                  {showTechnicalData ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-2 p-4 rounded-lg bg-muted/30 border border-border space-y-3"
                >
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Consumo Faturado</span>
                      <p className="font-medium">{analysis.billed_consumption_kwh?.toFixed(0) || "—"} kWh</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Eficiência</span>
                      <p className="font-medium">{analysis.generation_efficiency?.toFixed(1) || "—"}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ICMS</span>
                      <p className="font-medium">R$ {analysis.icms_cost?.toFixed(2) || "0,00"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PIS/COFINS</span>
                      <p className="font-medium">R$ {analysis.pis_cofins_cost?.toFixed(2) || "0,00"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bandeira</span>
                      <p className="font-medium">{analysis.tariff_flag || "Verde"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Multa/Juros</span>
                      <p className="font-medium">R$ {analysis.fine_amount?.toFixed(2) || "0,00"}</p>
                    </div>
                  </div>
                  
                  {/* AI Analysis */}
                  {analysis.ai_analysis && (
                    <div className="pt-3 border-t border-border">
                      <span className="text-sm text-muted-foreground">Análise da IA</span>
                      <p className="mt-1 text-sm text-foreground">{analysis.ai_analysis}</p>
                    </div>
                  )}

                  {/* Alerts */}
                  {analysis.alerts && analysis.alerts.length > 0 && (
                    <div className="pt-3 border-t border-border">
                      <span className="text-sm text-muted-foreground">Alertas</span>
                      <div className="mt-2 space-y-2">
                        {analysis.alerts.map((alert: any, index: number) => (
                          <div key={index} className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-foreground">{typeof alert === 'string' ? alert : alert.message || alert}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </CollapsibleContent>
            </Collapsible>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="flex flex-wrap gap-4 pt-4"
            >
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/property/${id}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao histórico
              </Button>
              {signedBillUrl && (
                <Button
                  variant="secondary"
                  onClick={() => window.open(signedBillUrl, "_blank")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Ver fatura
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" disabled={deleting}>
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apagar análise?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. A análise de {monthNames[analysis.reference_month - 1]} {analysis.reference_year} será permanentemente removida.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Apagar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
