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
import { Button } from "@/components/ui/button";
import { SoloLogo } from "@/components/SoloLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  BillScoreGauge,
  CostPieChart,
  ContextualFAQ,
} from "@/components/clarifier";
import { BillChatDrawer } from "@/components/chat";
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

interface ExtraCharge {
  description: string;
  value: number;
  type: "service" | "installment";
  remaining_installments?: number;
}

interface BillingItem {
  description: string;
  quantity_kwh?: number;
  unit_price?: number;
  total_value: number;
  icms_base?: number;
  icms_rate?: number;
  icms_value?: number;
  is_credit?: boolean;
}

interface CreditSummary {
  injected_kwh?: number | null;
  used_kwh?: number | null;
  balance_kwh?: number | null;
  expiring_kwh?: number | null;
}

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
  bill_score?: number | null;
  connection_type?: string | null;
  extra_charges?: ExtraCharge[] | null;
  other_charges?: number | null;
  billing_items?: BillingItem[] | null;
  credit_summary?: CreditSummary | null;
  tariff_period?: string | null;
  reading_period_from?: string | null;
  reading_period_to?: string | null;
}

interface ClarifierResult {
  totalPaid: number;
  minimumPossible: number;
  availabilityCost: number;
  publicLightingCost: number;
  uncompensatedCost: number;
  extraChargesTotal: number;
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
    const extraChargesFromItems = (analysis.extra_charges || []).reduce((sum, c) => sum + (c.value || 0), 0);
    // Use other_charges as fallback when extra_charges aren't individually itemized
    const extraChargesTotal = extraChargesFromItems > 0 ? extraChargesFromItems : toNumber(analysis.other_charges, 0);
    // Minimum = availability (min kWh by connection type) + CIP + extra charges (services/installments)
    const minimumPossible = availabilityCost + publicLightingCost + extraChargesTotal;
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
      extraChargesTotal,
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
      <header className="solo-header-bar border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/property/${id}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <SoloLogo className="h-8 w-auto" />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
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

        {/* Completed Analysis */}
        {(analysis.status === "completed" || analysis.status === "pending") && (
          <div className="space-y-5 pb-28">

            {/* ── HERO CARD ─────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-border bg-gradient-to-br from-card via-card to-primary/5 p-5 space-y-5"
            >
              {/* Title row */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {analysis.distributor || "Distribuidora"} · UC {analysis.account_number || "—"}
                </p>
                <h1 className="text-xl font-bold text-foreground mt-0.5">
                  Análise de {monthNames[analysis.reference_month - 1]} {analysis.reference_year}
                </h1>
              </div>

              {/* Score + key numbers */}
              <div className="flex items-center gap-5">
                {analysis.bill_score && (
                  <BillScoreGauge score={analysis.bill_score} size="lg" />
                )}
                <div className="flex-1 space-y-3">
                  <div className="p-3 rounded bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground">Você pagou</p>
                    <p className="text-2xl font-bold text-foreground">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(clarifier.totalPaid)}
                    </p>
                  </div>
                  <div className="p-3 rounded bg-primary/8 border border-primary/20">
                    <p className="text-xs text-muted-foreground">Mínimo obrigatório
                      {analysis.connection_type && (
                        <span className="ml-1 capitalize">({analysis.connection_type})</span>
                      )}
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(clarifier.minimumPossible)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Solar savings highlight */}
              {clarifier.totalPaid > clarifier.minimumPossible && (
                <div className="rounded bg-amber-500/10 border border-amber-500/20 p-3 flex items-center gap-3">
                  <span className="text-2xl">☀️</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Solar compensou tudo que podia
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      O que resta acima do mínimo (
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(clarifier.totalPaid - clarifier.minimumPossible)}
                      ) é consumo real e/ou cobranças extras — não há mais o que o solar possa compensar.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* ── COST BREAKDOWN CHART ───────────────────── */}
            {clarifier.totalPaid > 0 && (
              <CostPieChart
                availabilityCost={clarifier.availabilityCost}
                publicLightingCost={clarifier.publicLightingCost}
                uncompensatedCost={clarifier.uncompensatedCost}
                icmsCost={toNumber(analysis.icms_cost, 0)}
                pisCofins={toNumber(analysis.pis_cofins_cost, 0)}
                extraChargesTotal={clarifier.extraChargesTotal}
                totalPaid={clarifier.totalPaid}
              />
            )}

            {/* ── COST COMPOSITION DETAIL ───────────────── */}
            <CostCompositionCard
              availabilityCost={clarifier.availabilityCost}
              publicLightingCost={clarifier.publicLightingCost}
              uncompensatedCost={clarifier.uncompensatedCost}
              extraCharges={analysis.extra_charges || []}
              connectionType={analysis.connection_type}
            />

            {/* ── SOLAR FLOW ─────────────────────────────── */}
            <SolarEnergyCard
              generated={clarifier.generated}
              injected={clarifier.injected}
              compensated={clarifier.compensated}
              creditsBalance={clarifier.creditsBalance}
            />

            {/* ── SYSTEM PERFORMANCE ────────────────────── */}
            <SystemStatusCard
              expectedGeneration={clarifier.expectedGeneration}
              actualGeneration={clarifier.actualGeneration}
              status={clarifier.systemStatus}
            />

            {/* ── AI ANALYSIS ───────────────────────────── */}
            {analysis.ai_analysis && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-lg border border-primary/20 overflow-hidden"
              >
                <div className="gradient-bg px-5 py-3 flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <p className="text-sm font-semibold text-white">Análise da IA</p>
                </div>
                <div className="p-5 bg-card">
                  <p className="text-sm text-foreground leading-relaxed">{analysis.ai_analysis}</p>
                </div>
              </motion.div>
            )}

            {/* ── ALERTS ────────────────────────────────── */}
            {analysis.alerts && analysis.alerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
                className="space-y-2"
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  Alertas
                </p>
                {analysis.alerts.map((alert: any, index: number) => {
                  const text = typeof alert === "string" ? alert : alert.message || JSON.stringify(alert);
                  const isSuccess = text.includes("✅") || text.includes("🎉");
                  const isError = text.includes("❌") || text.includes("🔴");
                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded border text-sm ${
                        isSuccess
                          ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : isError
                          ? "bg-red-500/8 border-red-500/20 text-red-700 dark:text-red-300"
                          : "bg-amber-500/8 border-amber-500/20 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {isSuccess ? (
                        <span className="shrink-0 mt-0.5">✅</span>
                      ) : isError ? (
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                      )}
                      <span className="text-foreground">{text}</span>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* ── EXPANSION / ACTION ────────────────────── */}
            <ActionCard
              extraGenerationNeeded={clarifier.extraGenerationNeeded}
              expansionKwp={clarifier.expansionKwp}
              expansionModules={clarifier.expansionModules}
              onExpansionClick={handleExpansionClick}
            />

            {/* ── CHAT CTA ──────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
              className="rounded-lg border border-border bg-card p-5 text-center space-y-3"
            >
              <p className="text-base font-semibold text-foreground">Ficou com dúvida?</p>
              <p className="text-sm text-muted-foreground">
                O assistente Solo pode explicar qualquer linha desta conta em detalhes.
              </p>
              <Button
                variant="gradient"
                className="w-full"
                onClick={() => {
                  // trigger chat FAB click via DOM — BillChatDrawer manages its own state
                  document.getElementById("chat-fab-trigger")?.click();
                }}
              >
                <span className="mr-2">💬</span>
                Perguntar sobre esta conta
              </Button>
            </motion.div>

            {/* ── TECHNICAL DATA ────────────────────────── */}
            <Collapsible open={showTechnicalData} onOpenChange={setShowTechnicalData}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between text-muted-foreground">
                  <span className="text-xs font-medium uppercase tracking-wide">Dados Técnicos da Fatura</span>
                  {showTechnicalData ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-4">

                  {/* Basic grid */}
                  <div className="p-4 rounded bg-muted/30 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Informações gerais</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      {[
                        { label: "Titular", value: analysis.account_holder || "—" },
                        { label: "UC", value: analysis.account_number || "—" },
                        { label: "Tipo de ligação", value: analysis.connection_type ? analysis.connection_type.charAt(0).toUpperCase() + analysis.connection_type.slice(1) : "—" },
                        { label: "Classe", value: "B1 Residencial" },
                        { label: "Bandeira tarifária", value: analysis.tariff_flag || "Verde" },
                        { label: "Multa / Juros", value: `R$ ${analysis.fine_amount?.toFixed(2) || "0,00"}` },
                        ...(analysis.tariff_period ? [{ label: "Período da bandeira", value: analysis.tariff_period }] : []),
                        ...(analysis.reading_period_from && analysis.reading_period_to ? [{
                          label: "Período de leitura",
                          value: `${new Date(analysis.reading_period_from + "T12:00:00").toLocaleDateString("pt-BR")} – ${new Date(analysis.reading_period_to + "T12:00:00").toLocaleDateString("pt-BR")}`
                        }] : []),
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-medium text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* B1 RESIDENCIAL explanation */}
                    <div className="mt-4 pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">O que é B1 Residencial?</span>{" "}
                        É a classificação tarifária da ANEEL para consumidores domésticos (Grupo B, Subgrupo B1).
                        Determina as tarifas de TE e TUSD aplicadas à sua conta, revisadas anualmente pela distribuidora.
                      </p>
                    </div>
                  </div>

                  {/* SCEE Credit Summary */}
                  {analysis.credit_summary && (
                    <div className="p-4 rounded bg-primary/5 border border-primary/20">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">Saldo SCEE — Sistema de Compensação</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        {[
                          { label: "Injetado na rede", value: analysis.credit_summary.injected_kwh != null ? `${analysis.credit_summary.injected_kwh.toLocaleString("pt-BR")} kWh` : "—" },
                          { label: "Utilizado nesta UC", value: analysis.credit_summary.used_kwh != null ? `${analysis.credit_summary.used_kwh.toLocaleString("pt-BR")} kWh` : "—" },
                          { label: "Saldo acumulado", value: analysis.credit_summary.balance_kwh != null ? `${analysis.credit_summary.balance_kwh.toLocaleString("pt-BR")} kWh` : "—" },
                          { label: "A expirar (60 meses)", value: analysis.credit_summary.expiring_kwh != null ? `${analysis.credit_summary.expiring_kwh.toLocaleString("pt-BR")} kWh` : "—" },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="font-medium text-foreground">{value}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                        O SCEE permite que a energia excedente gerada pelo seu sistema solar seja injetada na rede e
                        creditada para abater consumo futuro. Os créditos expiram após 60 meses. Quando injetado {">"} utilizado
                        nesta UC, o excedente fica como saldo ou é distribuído a outras unidades vinculadas.
                      </p>
                    </div>
                  )}

                  {/* Billing Table with Glossary */}
                  {analysis.billing_items && analysis.billing_items.length > 0 && (
                    <div className="p-4 rounded bg-muted/30 border border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tabela de faturamento linha a linha</p>
                      <div className="space-y-2">
                        {analysis.billing_items.map((item, idx) => {
                          const glossary: Record<string, string> = {
                            "TE": "Tarifa de Energia — remunera geração e transmissão da energia elétrica.",
                            "TUSD": "Tarifa de Uso do Sistema de Distribuição — remunera o transporte até sua casa.",
                            "INJ": "Crédito SCEE — energia solar injetada na rede abatida desta fatura.",
                            "INJETAD": "Crédito SCEE — energia solar injetada na rede abatida desta fatura.",
                            "DISPON": "Custo mínimo de disponibilidade — cobrado mesmo sem consumo pelo acesso à rede.",
                            "ILUMINAÇÃO": "CIP/COSIP — contribuição municipal obrigatória para iluminação pública.",
                            "CIP": "CIP/COSIP — contribuição municipal obrigatória para iluminação pública.",
                            "ICMS": "Imposto estadual incluso na base de cálculo das tarifas.",
                            "BANDEIRA": "Adicional tarifário vigente conforme disponibilidade hídrica do sistema.",
                            "MULTA": "Juros e multa por atraso no pagamento.",
                          };
                          const upperDesc = item.description.toUpperCase();
                          const tip = Object.entries(glossary).find(([k]) => upperDesc.includes(k))?.[1];
                          const fmt = (n?: number | null) => n != null ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
                          return (
                            <div key={idx} className={`rounded-lg p-3 border ${item.is_credit ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card border-border"}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${item.is_credit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                                    {item.is_credit ? "↩ " : ""}{item.description}
                                  </p>
                                  {tip && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{tip}</p>}
                                  {(item.quantity_kwh != null || item.unit_price != null) && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {item.quantity_kwh != null ? `${item.quantity_kwh.toLocaleString("pt-BR")} kWh` : ""}
                                      {item.quantity_kwh != null && item.unit_price != null ? " × " : ""}
                                      {item.unit_price != null ? `R$ ${fmt(item.unit_price)}/kWh` : ""}
                                    </p>
                                  )}
                                </div>
                                <p className={`text-sm font-semibold shrink-0 ${item.is_credit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                                  {item.is_credit ? "−" : ""}R$ {fmt(item.total_value)}
                                </p>
                              </div>
                              {item.icms_value != null && item.icms_value > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  ICMS {item.icms_rate != null ? `${item.icms_rate}%` : ""}: R$ {fmt(item.icms_value)}
                                  {item.icms_base != null ? ` (base R$ ${fmt(item.icms_base)})` : ""}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                        💡 O CONFAZ/SINIEF permite que as distribuidoras apresentem a fatura com ICMS já embutido nas
                        tarifas, por isso o imposto aparece detalhado por linha, não como item separado.
                      </p>
                    </div>
                  )}

                  {/* Taxes & efficiency */}
                  <div className="p-4 rounded bg-muted/30 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tributos e eficiência</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      {[
                        { label: "Consumo faturado", value: `${analysis.billed_consumption_kwh?.toFixed(0) || "—"} kWh` },
                        { label: "Eficiência solar", value: `${analysis.generation_efficiency?.toFixed(1) || "—"}%` },
                        { label: "ICMS", value: `R$ ${analysis.icms_cost?.toFixed(2) || "0,00"}` },
                        { label: "PIS/COFINS", value: `R$ ${analysis.pis_cofins_cost?.toFixed(2) || "0,00"}` },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-medium text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* ── BOTTOM ACTIONS ────────────────────────── */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate(`/property/${id}`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Histórico
              </Button>
              {signedBillUrl && (
                <Button variant="secondary" onClick={() => window.open(signedBillUrl, "_blank")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Ver fatura
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" disabled={deleting}>
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
            </div>

            {/* ── CHAT FAB ──────────────────────────────── */}
            <BillChatDrawer
              analysisId={analysisId!}
              distributor={analysis.distributor}
              referenceMonth={analysis.reference_month}
              referenceYear={analysis.reference_year}
              triggerId="chat-fab-trigger"
            />
          </div>
        )}
      </main>
    </div>
  );
}
