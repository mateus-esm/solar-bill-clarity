import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Lock,
  RotateCcw,
  TicketPercent,
  Trash2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SoloLogo } from "@/components/SoloLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BillUpload } from "@/components/BillUpload";
import { AnalysisStepper, type AnalysisStep } from "@/components/AnalysisStepper";
import {
  BillSummaryCard,
  CostCompositionCard,
  SolarEnergyCard,
  SystemStatusCard,
  ActionCard,
  NonSolarResultCards,
} from "@/components/clarifier";
import { FreemiumBanner } from "@/components/FreemiumBanner";
import { LeadCaptureForm, type LeadFormData } from "@/components/LeadCaptureForm";
import { useSessionStorage } from "@/hooks/useSessionStorage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { pdfToImages, isPdfFile, PdfPasswordRequiredError, PdfPasswordIncorrectError } from "@/lib/pdfToImages";

type ResultType = "solar" | "non-solar";
type SystemStatus = "adequate" | "slightly_below" | "below_needed";
type BillStatus = "pending" | "needs_password" | "converting" | "analyzing" | "done" | "error";

interface ClarifierResult {
  type: ResultType;
  totalPaid: number;
  minimumPossible: number;
  availabilityCost: number;
  publicLightingCost: number;
  uncompensatedCost: number;
  generated?: number;
  injected?: number;
  compensated?: number;
  creditsBalance?: number;
  expectedGeneration?: number;
  actualGeneration?: number;
  generationGap?: number;
  systemStatus?: SystemStatus;
  extraGenerationNeeded?: number;
  expansionKwp?: number;
  expansionModules?: number;
  recommendedKwp?: number;
  recommendedModules?: number;
  potentialSavings?: number;
  billedConsumption?: number;
  requiredGeneration?: number;
  distributor: string;
  diagnosisDetails?: unknown;
}

interface IndividualBillResult extends ClarifierResult {
  id: string;
  fileName: string;
  holder?: string;
  accountNumber?: string;
  referenceMonth?: string;
}

interface PortfolioResult extends ClarifierResult {
  mode: "multi_bill";
  isPortfolio: true;
  billCount: number;
  successfulCount: number;
  failedCount: number;
  warnings: string[];
  bills: IndividualBillResult[];
}

interface BillQueueItem {
  id: string;
  file: File;
  password: string;
  showPassword: boolean;
  status: BillStatus;
  error?: string;
  result?: IndividualBillResult;
}

interface ReferralPartner {
  id: string;
  name: string;
  phone?: string | null;
  coupon_code: string;
  discount_percent: number;
}

const PROCESSING_STEPS: Array<AnalysisStep | "gate"> = ["uploading", "extracting", "calculating", "gate"];
const REFERRAL_DISCOUNT_PERCENT = 5;

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
};

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const getUniqueValues = (values: Array<string | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value && value !== "Nao identificada"))));

const normalizeClarifierResult = (
  billId: string,
  fileName: string,
  apiResult: any,
  rawData: any,
  hasSolar: boolean,
  generated: number,
): IndividualBillResult => {
  const result = apiResult || {};
  const raw = rawData || result;
  const availabilityCost = toNumber(result.availability_cost || raw.availability_cost, 0);
  const publicLightingCost = toNumber(result.public_lighting_cost || raw.public_lighting_cost, 0);
  const minimumPossible = availabilityCost + publicLightingCost;
  const totalPaid = toNumber(result.total_amount || raw.total_amount, 0);
  const uncompensatedCost = Math.max(0, totalPaid - minimumPossible);
  const billedConsumption = toNumber(
    result.billed_consumption_kwh || raw.billed_consumption_kwh || raw.measured_consumption_kwh,
    0,
  );
  const distributor = result.distributor || raw.distributor || "Nao identificada";

  const base = {
    id: billId,
    fileName,
    totalPaid,
    minimumPossible,
    availabilityCost,
    publicLightingCost,
    uncompensatedCost,
    billedConsumption,
    distributor,
    holder: result.customer_name || raw.customer_name || result.consumer_name || raw.consumer_name || raw.holder,
    accountNumber: result.account_number || raw.account_number || result.installation_number || raw.installation_number,
    referenceMonth: result.reference_month || raw.reference_month || result.billing_month || raw.billing_month,
    diagnosisDetails: result.diagnosis_details,
  };

  if (hasSolar) {
    const injected = toNumber(result.injected_energy_kwh || raw.injected_energy_kwh, 0);
    const compensated = toNumber(result.compensated_energy_kwh || raw.compensated_energy_kwh, 0);
    const creditsBalance = toNumber(result.current_credits_kwh || raw.current_credits_kwh, 0);
    const expectedGeneration = toNumber(result.expected_generation_kwh, 0) || generated;
    const requiredGeneration = Math.max(0, billedConsumption - compensated);

    let systemStatus: SystemStatus = "adequate";
    if (generated >= requiredGeneration) {
      systemStatus = "adequate";
    } else if (generated >= requiredGeneration * 0.8) {
      systemStatus = "slightly_below";
    } else {
      systemStatus = "below_needed";
    }

    const extraGenerationNeeded = Math.max(0, requiredGeneration - generated);
    const expansionKwp = extraGenerationNeeded > 0 ? extraGenerationNeeded / 150 : undefined;
    const expansionModules = expansionKwp ? Math.ceil(expansionKwp / 0.62) : undefined;

    return {
      ...base,
      type: "solar",
      generated,
      injected,
      compensated,
      creditsBalance,
      expectedGeneration,
      actualGeneration: generated,
      generationGap: Math.max(0, expectedGeneration - generated),
      systemStatus,
      requiredGeneration,
      extraGenerationNeeded,
      expansionKwp,
      expansionModules,
    };
  }

  return {
    ...base,
    type: "non-solar",
    recommendedKwp: toNumber(result.recommended_potency_kwp, 0),
    recommendedModules: Math.ceil(toNumber(result.recommended_modules, 0)),
    potentialSavings: toNumber(result.potential_monthly_savings, 0),
  };
};

const aggregateBillResults = (
  bills: IndividualBillResult[],
  allBillCount: number,
  failedCount: number,
  hasSolar: boolean,
  totalGeneration: number,
): PortfolioResult => {
  const sum = (selector: (bill: IndividualBillResult) => number | undefined) =>
    bills.reduce((total, bill) => total + (selector(bill) || 0), 0);

  const distributors = getUniqueValues(bills.map((bill) => bill.distributor));
  const holders = getUniqueValues(bills.map((bill) => bill.holder));
  const warnings: string[] = [];

  if (distributors.length > 1) {
    warnings.push("Foram detectadas contas de distribuidoras diferentes. A soma foi mantida para visao de portfolio.");
  }
  if (holders.length > 1) {
    warnings.push("Foram detectados titulares diferentes. Confirme se as contas pertencem ao mesmo cliente ou grupo.");
  }
  if (failedCount > 0) {
    warnings.push(`${failedCount} conta(s) nao puderam ser analisadas e ficaram fora do total.`);
  }

  const totalPaid = sum((bill) => bill.totalPaid);
  const minimumPossible = sum((bill) => bill.minimumPossible);
  const availabilityCost = sum((bill) => bill.availabilityCost);
  const publicLightingCost = sum((bill) => bill.publicLightingCost);
  const uncompensatedCost = sum((bill) => bill.uncompensatedCost);
  const billedConsumption = sum((bill) => bill.billedConsumption);
  const distributor = distributors.length === 1 ? distributors[0] : `${distributors.length || 0} distribuidoras`;

  if (hasSolar) {
    const injected = sum((bill) => bill.injected);
    const compensated = sum((bill) => bill.compensated);
    const creditsBalance = sum((bill) => bill.creditsBalance);
    const expectedGeneration = sum((bill) => bill.expectedGeneration) || totalGeneration;
    const requiredGeneration = sum((bill) => bill.requiredGeneration);
    const extraGenerationNeeded = Math.max(0, requiredGeneration - totalGeneration);
    const expansionKwp = extraGenerationNeeded > 0 ? extraGenerationNeeded / 150 : undefined;
    const expansionModules = expansionKwp ? Math.ceil(expansionKwp / 0.62) : undefined;

    let systemStatus: SystemStatus = "adequate";
    if (totalGeneration >= requiredGeneration) {
      systemStatus = "adequate";
    } else if (totalGeneration >= requiredGeneration * 0.8) {
      systemStatus = "slightly_below";
    } else {
      systemStatus = "below_needed";
    }

    return {
      mode: "multi_bill",
      isPortfolio: true,
      type: "solar",
      billCount: allBillCount,
      successfulCount: bills.length,
      failedCount,
      warnings,
      bills,
      totalPaid,
      minimumPossible,
      availabilityCost,
      publicLightingCost,
      uncompensatedCost,
      generated: totalGeneration,
      injected,
      compensated,
      creditsBalance,
      expectedGeneration,
      actualGeneration: totalGeneration,
      generationGap: Math.max(0, expectedGeneration - totalGeneration),
      systemStatus,
      requiredGeneration,
      extraGenerationNeeded,
      expansionKwp,
      expansionModules,
      billedConsumption,
      distributor,
    };
  }

  return {
    mode: "multi_bill",
    isPortfolio: true,
    type: "non-solar",
    billCount: allBillCount,
    successfulCount: bills.length,
    failedCount,
    warnings,
    bills,
    totalPaid,
    minimumPossible,
    availabilityCost,
    publicLightingCost,
    uncompensatedCost,
    recommendedKwp: sum((bill) => bill.recommendedKwp),
    recommendedModules: Math.ceil(sum((bill) => bill.recommendedModules)),
    potentialSavings: sum((bill) => bill.potentialSavings),
    billedConsumption,
    distributor,
  };
};

const getStatusLabel = (status: BillStatus) => {
  switch (status) {
    case "needs_password":
      return "Senha";
    case "converting":
      return "Convertendo";
    case "analyzing":
      return "Analisando";
    case "done":
      return "Pronta";
    case "error":
      return "Erro";
    default:
      return "Pendente";
  }
};

const normalizeCoupon = (value: string) => value.trim().toUpperCase();

export default function Index() {
  const [bills, setBills] = useState<BillQueueItem[]>([]);

  const [hasSolar, setHasSolar] = useSessionStorage<boolean>("solo_has_solar", true);
  const [solarGeneration, setSolarGeneration] = useSessionStorage<string>("solo_solar_generation", "");
  const [installedPotency, setInstalledPotency] = useSessionStorage<string>("solo_installed_potency", "");
  const [step, setStep] = useSessionStorage<AnalysisStep | "gate">("solo_analysis_step", "idle");
  const [analysisResult, setAnalysisResult] = useSessionStorage<ClarifierResult | PortfolioResult | any | null>(
    "solo_analysis_result",
    null,
  );
  const [showResults, setShowResults] = useSessionStorage<boolean>("solo_show_results", false);
  const [leadId, setLeadId] = useSessionStorage<string | null>("solo_lead_id", null);
  const [referralCoupon, setReferralCoupon] = useSessionStorage<string>("solo_referral_coupon", "");
  const [referralPartner, setReferralPartner] = useSessionStorage<ReferralPartner | null>("solo_referral_partner", null);

  const [stepError, setStepError] = useState<string | undefined>();
  const [activeBillIndex, setActiveBillIndex] = useState<number | null>(null);
  const [isCrmLoading, setIsCrmLoading] = useState(false);
  const [referralError, setReferralError] = useState<string | undefined>();
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [didApplyUrlReferral, setDidApplyUrlReferral] = useState(false);

  const { toast } = useToast();

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

  const updateBill = (id: string, patch: Partial<BillQueueItem>) => {
    setBills((current) => current.map((bill) => (bill.id === id ? { ...bill, ...patch } : bill)));
  };

  const validateReferralCoupon = useCallback(
    async (coupon: string, showToast = false) => {
      const couponCode = normalizeCoupon(coupon);
      setReferralCoupon(couponCode);

      if (!couponCode) {
        setReferralPartner(null);
        setReferralError(undefined);
        return null;
      }

      setIsValidatingReferral(true);
      setReferralError(undefined);

      try {
        const { data, error } = await supabase.functions.invoke("validate-referral-coupon", {
          body: { coupon: couponCode },
        });

        if (error) throw error;

        if (data?.valid && data.partner) {
          const partner: ReferralPartner = {
            id: data.partner.id,
            name: data.partner.name,
            phone: data.partner.phone,
            coupon_code: data.partner.coupon_code,
            discount_percent: data.partner.discount_percent || REFERRAL_DISCOUNT_PERCENT,
          };
          setReferralPartner(partner);
          setReferralCoupon(partner.coupon_code);
          setReferralError(undefined);
          if (showToast) {
            toast({
              title: "Cupom aplicado",
              description: `${partner.name} liberou 5% de desconto na proposta.`,
            });
          }
          return partner;
        }

        setReferralPartner(null);
        setReferralError("Cupom de parceiro invalido ou inativo. Voce pode continuar sem desconto.");
        return null;
      } catch (error) {
        console.error("Referral validation error:", error);
        setReferralPartner(null);
        setReferralError("Nao foi possivel validar o cupom agora. Voce pode continuar sem desconto.");
        return null;
      } finally {
        setIsValidatingReferral(false);
      }
    },
    [setReferralCoupon, setReferralPartner, toast],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (didApplyUrlReferral) return;
    const urlCoupon = new URLSearchParams(window.location.search).get("ref");
    if (urlCoupon && normalizeCoupon(urlCoupon) !== referralPartner?.coupon_code) {
      setDidApplyUrlReferral(true);
      void validateReferralCoupon(urlCoupon, false);
    }
  }, [didApplyUrlReferral, referralPartner?.coupon_code, validateReferralCoupon]);

  const handleFilesSelect = async (selectedFiles: File[]) => {
    const nextBills = selectedFiles.map((selectedFile) => ({
      id: crypto.randomUUID(),
      file: selectedFile,
      password: "",
      showPassword: false,
      status: "pending" as BillStatus,
    }));

    setBills((current) => [...current, ...nextBills]);

    await Promise.all(
      nextBills.map(async (bill) => {
        if (!isPdfFile(bill.file)) return;
        try {
          await pdfToImages(bill.file, { maxPages: 1, scale: 0.5 });
        } catch (err) {
          if (err instanceof PdfPasswordRequiredError) {
            updateBill(bill.id, { status: "needs_password" });
          } else {
            updateBill(bill.id, {
              status: "error",
              error: err instanceof Error ? err.message : "Nao foi possivel ler o PDF",
            });
          }
        }
      }),
    );
  };

  const handleValidatePassword = async (billId: string) => {
    const bill = bills.find((item) => item.id === billId);
    if (!bill || !bill.password) return;

    updateBill(billId, { status: "converting", error: undefined });
    try {
      await pdfToImages(bill.file, { maxPages: 1, scale: 0.5, password: bill.password });
      updateBill(billId, { status: "pending" });
      toast({ title: "PDF desbloqueado!", description: "Senha aceita com sucesso." });
    } catch (err) {
      if (err instanceof PdfPasswordIncorrectError || err instanceof PdfPasswordRequiredError) {
        updateBill(billId, { status: "needs_password", error: "Senha incorreta" });
        toast({ title: "Senha incorreta", description: "Tente novamente.", variant: "destructive" });
      } else {
        updateBill(billId, {
          status: "error",
          error: err instanceof Error ? err.message : "Nao foi possivel validar a senha",
        });
      }
    }
  };

  const handleClearBills = () => {
    setBills([]);
    setActiveBillIndex(null);
  };

  const handleRemoveBill = (billId: string) => {
    if (PROCESSING_STEPS.includes(step)) return;
    setBills((current) => current.filter((bill) => bill.id !== billId));
  };

  const analyzeSingleBill = async (
    bill: BillQueueItem,
    index: number,
    totalBills: number,
    generatedForBill: number,
    potencyKwp?: number,
  ): Promise<IndividualBillResult> => {
    updateBill(bill.id, { status: "converting", error: undefined });
    setStep("uploading");
    setActiveBillIndex(index);

    let imageBase64: string;
    let imageMimeType = bill.file.type;

    if (isPdfFile(bill.file)) {
      const images = await pdfToImages(bill.file, {
        maxPages: 1,
        scale: 3,
        password: bill.password || undefined,
      });
      if (!images.length) throw new Error("Nao foi possivel ler o PDF");
      imageBase64 = images[0].base64.split(",")[1];
      imageMimeType = "image/png";
    } else {
      imageBase64 = await fileToBase64(bill.file);
    }

    updateBill(bill.id, { status: "analyzing" });
    setStep("extracting");

    const { data, error } = await supabase.functions.invoke("analyze-bill", {
      body: {
        fileBase64: imageBase64,
        fileType: imageMimeType,
        monitoredGeneration: generatedForBill,
        quickAnalysis: true,
        has_solar: hasSolar,
        installed_potency_kwp: potencyKwp,
        portfolio_position: index + 1,
        portfolio_total: totalBills,
      },
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || "Erro na analise");

    setStep("calculating");
    const normalized = normalizeClarifierResult(
      bill.id,
      bill.file.name,
      data.data,
      data.rawData || data.data,
      hasSolar,
      generatedForBill,
    );

    updateBill(bill.id, { status: "done", result: normalized });
    return normalized;
  };

  const handleAnalyze = async () => {
    const analyzableBills = bills.filter((bill) => bill.status !== "error");
    if (!analyzableBills.length) return;

    if (bills.some((bill) => bill.status === "needs_password")) {
      toast({ title: "PDF protegido", description: "Desbloqueie os PDFs antes da analise.", variant: "destructive" });
      return;
    }

    if (hasSolar && !solarGeneration && !installedPotency) {
      toast({
        title: "Informacao necessaria",
        description: "Informe a geracao total do periodo ou a potencia instalada.",
        variant: "destructive",
      });
      return;
    }

    setStepError(undefined);
    setAnalysisResult(null);
    setShowResults(false);

    const monitoredGeneration = hasSolar && solarGeneration ? parseFloat(solarGeneration) : 0;
    const potencyKwp = hasSolar && installedPotency ? parseFloat(installedPotency) : undefined;
    const generatedPerBill = hasSolar && analyzableBills.length > 0 ? monitoredGeneration / analyzableBills.length : 0;
    const successful: IndividualBillResult[] = [];
    let failedCount = bills.length - analyzableBills.length;

    try {
      for (const [index, bill] of analyzableBills.entries()) {
        try {
          const result = await analyzeSingleBill(bill, index, analyzableBills.length, generatedPerBill, potencyKwp);
          successful.push(result);
        } catch (err) {
          failedCount += 1;
          const msg = err instanceof Error ? err.message : "Nao foi possivel analisar a conta";
          updateBill(bill.id, { status: "error", error: msg });
        }
      }

      if (!successful.length) {
        throw new Error("Nenhuma conta foi analisada com sucesso.");
      }

      const finalResult =
        successful.length === 1 && failedCount === 0
          ? successful[0]
          : aggregateBillResults(successful, bills.length, failedCount, hasSolar, monitoredGeneration);

      setAnalysisResult(finalResult);
      setActiveBillIndex(null);

      if (!leadId) {
        setStep("gate");
      } else {
        setStep("completed");
        setShowResults(true);
      }

      toast({
        title: "Analise concluida!",
        description:
          successful.length === 1
            ? "Veja o resultado da sua conta."
            : `${successful.length} conta(s) analisadas no portfolio.`,
      });
    } catch (err) {
      console.error("Analysis error:", err);
      const msg = err instanceof Error ? err.message : "Nao foi possivel analisar as contas";
      setStep("error");
      setActiveBillIndex(null);
      setStepError(msg);
      toast({ title: "Erro na analise", description: msg, variant: "destructive" });
    }
  };

  const handleReset = () => {
    setBills([]);
    setSolarGeneration("");
    setInstalledPotency("");
    setHasSolar(true);
    setShowResults(false);
    setAnalysisResult(null);
    setStep("idle");
    setStepError(undefined);
    setActiveBillIndex(null);
  };

  const handleClearReferral = () => {
    setReferralCoupon("");
    setReferralPartner(null);
    setReferralError(undefined);
  };

  const handleLeadSuccess = (id: string, data: LeadFormData) => {
    setLeadId(id);
    setStep("completed");
    setShowResults(true);
  };

  const handleExpansionClick = () => {
    const message = encodeURIComponent(
      `Ola! Gostaria de avaliar uma expansao do meu sistema solar. ` +
        `Minha geracao atual e ${analysisResult?.generated || 0} kWh e preciso de mais ` +
        `${analysisResult?.extraGenerationNeeded || 0} kWh para pagar apenas o valor minimo.`,
    );
    window.open(`https://wa.me/558581813110?text=${message}`, "_blank");
  };

  const handleReceiveProposal = async () => {
    setIsCrmLoading(true);
    try {
      if (leadId) {
        const { error } = await supabase.functions.invoke("trigger-crm", {
          body: { leadId, action: "proposal", omitJestorId: true },
        });

        if (error) throw error;
      }

      const message = encodeURIComponent(
        `Ola! Tenho interesse em uma proposta para sistema de energia solar. ` +
          `Meu sistema sugerido e de ${analysisResult?.recommendedKwp?.toFixed(1) || 0} kWp ` +
          `com ${analysisResult?.recommendedModules || 0} modulos. ` +
          `Minha analise somou ${formatCurrency(analysisResult?.totalPaid)} em contas ` +
          `e a economia estimada e de ${formatCurrency(analysisResult?.potentialSavings)} por mes.` +
          (referralPartner ? ` Cupom parceiro aplicado: ${referralPartner.coupon_code} com 5% de desconto.` : ""),
      );
      window.open(`https://wa.me/558581813110?text=${message}`, "_blank");
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Ocorreu um problema.", variant: "destructive" });
    } finally {
      setIsCrmLoading(false);
    }
  };

  const isProcessing = PROCESSING_STEPS.includes(step) && step !== "gate";
  const hasPasswordBlocks = bills.some((bill) => bill.status === "needs_password");
  const canAnalyze = bills.length > 0 && !hasPasswordBlocks && !isProcessing;
  const isPortfolio = analysisResult?.mode === "multi_bill";

  return (
    <div className="min-h-screen bg-background">
      <header className="solo-header-bar sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
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
            step === "gate" ? (
              <LeadCaptureForm
                onSuccess={handleLeadSuccess}
                hasSolar={hasSolar}
                analysisSummary={analysisResult}
                referralPartner={referralPartner}
              />
            ) : (
              <motion.div
                key="upload-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="mx-auto max-w-2xl space-y-6"
              >
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                    Entenda suas <span className="gradient-text">contas de energia</span>
                  </h1>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Analise uma ou varias contas e veja o custo total do seu portfolio
                  </p>
                </motion.div>

                <AnalysisStepper currentStep={step as AnalysisStep} errorMessage={stepError} />

                {isProcessing && activeBillIndex !== null && (
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-center">
                    <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
                    <p className="font-medium text-foreground">
                      Analisando conta {activeBillIndex + 1}/{bills.filter((bill) => bill.status !== "error").length}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">Processamento sequencial para manter a analise estavel.</p>
                  </div>
                )}

                {!isProcessing && (
                  <BillUpload
                    multiple
                    files={bills.map((bill) => bill.file)}
                    onFilesSelect={handleFilesSelect}
                    onClear={bills.length ? handleClearBills : undefined}
                  />
                )}

                {!isProcessing && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="mb-3 flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <TicketPercent className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Codigo do Parceiro Solo</h3>
                        <p className="text-xs text-muted-foreground">Desbloqueie condicoes especiais na proposta.</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={referralCoupon}
                        onChange={(event) => {
                          setReferralCoupon(event.target.value.toUpperCase());
                          setReferralPartner(null);
                          setReferralError(undefined);
                        }}
                        onBlur={() => referralCoupon && !referralPartner && validateReferralCoupon(referralCoupon)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void validateReferralCoupon(referralCoupon, true);
                          }
                        }}
                        placeholder="Ex: SOLO-MARIA"
                        disabled={isValidatingReferral}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => validateReferralCoupon(referralCoupon, true)}
                        disabled={!referralCoupon || isValidatingReferral}
                      >
                        {isValidatingReferral ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                      </Button>
                    </div>
                    {referralPartner && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm">
                        <span className="text-emerald-700 dark:text-emerald-400">
                          Cupom aplicado: {referralPartner.name} - 5% de desconto na proposta.
                        </span>
                        <button className="text-xs font-medium text-muted-foreground hover:text-foreground" onClick={handleClearReferral}>
                          Remover
                        </button>
                      </div>
                    )}
                    {referralError && (
                      <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <span>{referralError}</span>
                      </div>
                    )}
                  </div>
                )}

                {bills.length > 0 && (
                  <div className="space-y-3">
                    {bills.map((bill) => (
                      <motion.div
                        key={bill.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border border-border bg-card p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            {bill.status === "done" ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium text-foreground">{bill.file.name}</p>
                              <Badge variant={bill.status === "error" ? "destructive" : bill.status === "done" ? "default" : "secondary"}>
                                {getStatusLabel(bill.status)}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{(bill.file.size / 1024 / 1024).toFixed(2)} MB</p>
                            {bill.error && <p className="mt-2 text-xs text-destructive">{bill.error}</p>}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isProcessing}
                            onClick={() => handleRemoveBill(bill.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {bill.status === "needs_password" && (
                          <div className="mt-3 space-y-2 border-t border-border pt-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <Lock className="h-4 w-4 text-primary" />
                              PDF protegido por senha
                            </div>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Input
                                  type={bill.showPassword ? "text" : "password"}
                                  placeholder="Senha do PDF"
                                  value={bill.password}
                                  onChange={(e) => updateBill(bill.id, { password: e.target.value })}
                                  onKeyDown={(e) => e.key === "Enter" && handleValidatePassword(bill.id)}
                                />
                                <button
                                  type="button"
                                  onClick={() => updateBill(bill.id, { showPassword: !bill.showPassword })}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  {bill.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                              <Button onClick={() => handleValidatePassword(bill.id)} disabled={!bill.password}>
                                Desbloquear
                              </Button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}

                {bills.length > 0 && !isProcessing && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">Voce ja possui energia solar?</h3>
                        <p className="text-xs text-muted-foreground">A geracao informada sera tratada como total do portfolio</p>
                      </div>
                      <div className="flex cursor-pointer items-center rounded-full bg-muted p-1">
                        <div
                          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                            !hasSolar ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                          }`}
                          onClick={() => setHasSolar(false)}
                        >
                          Nao
                        </div>
                        <div
                          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                            hasSolar ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                          }`}
                          onClick={() => setHasSolar(true)}
                        >
                          Sim
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {hasSolar && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 overflow-hidden border-t border-border pt-2"
                        >
                          <div>
                            <label className="mb-1 block text-xs font-medium text-foreground">Geracao total no periodo (kWh) *</label>
                            <Input
                              value={solarGeneration}
                              onChange={(e) => setSolarGeneration(e.target.value)}
                              placeholder="Ex: 2500"
                              type="number"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-foreground">Potencia instalada total (kWp) - Opcional</label>
                            <Input
                              value={installedPotency}
                              onChange={(e) => setInstalledPotency(e.target.value)}
                              placeholder="Ex: 18.6"
                              type="number"
                              step="0.01"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {!isProcessing && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                    <Button variant="gradient" size="xl" className="w-full" onClick={handleAnalyze} disabled={!canAnalyze}>
                      <Zap className="mr-2 h-5 w-5" />
                      {bills.length > 1 ? `Analisar ${bills.length} contas` : "Analisar Conta"}
                    </Button>
                  </motion.div>
                )}

                {step === "error" && (
                  <Button variant="outline" className="w-full" onClick={handleReset}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Tentar novamente
                  </Button>
                )}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground"
                >
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 bg-emerald-500" /> Analise segura
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 bg-primary" /> Respostas claras
                  </span>
                </motion.div>
              </motion.div>
            )
          ) : (
            analysisResult && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto max-w-2xl space-y-4"
              >
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {isPortfolio ? "Resultado do Portfolio" : "Resultado da Analise"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {isPortfolio
                        ? `${analysisResult.successfulCount}/${analysisResult.billCount} contas analisadas - ${analysisResult.distributor}`
                        : analysisResult.distributor}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Nova analise
                  </Button>
                </div>

                {isPortfolio && analysisResult.warnings?.length > 0 && (
                  <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
                    {analysisResult.warnings.map((warning: string) => (
                      <div key={warning} className="flex gap-2 text-sm text-foreground">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                )}

                {analysisResult.type === "solar" ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-center"
                    >
                      <p className="text-sm italic text-muted-foreground">
                        Energia solar nao zera a conta; ela reduz o consumo. Aqui esta como isso apareceu nesta analise.
                      </p>
                    </motion.div>

                    <BillSummaryCard totalPaid={analysisResult.totalPaid} minimumPossible={analysisResult.minimumPossible} />

                    <CostCompositionCard
                      availabilityCost={analysisResult.availabilityCost}
                      publicLightingCost={analysisResult.publicLightingCost}
                      uncompensatedCost={analysisResult.uncompensatedCost}
                    />

                    <SolarEnergyCard
                      generated={analysisResult.generated || 0}
                      injected={analysisResult.injected || 0}
                      compensated={analysisResult.compensated || 0}
                      creditsBalance={analysisResult.creditsBalance || 0}
                    />

                    <SystemStatusCard
                      expectedGeneration={analysisResult.expectedGeneration || 0}
                      actualGeneration={analysisResult.actualGeneration || 0}
                      status={analysisResult.systemStatus || "adequate"}
                    />

                    <ActionCard
                      extraGenerationNeeded={analysisResult.extraGenerationNeeded || 0}
                      expansionKwp={analysisResult.expansionKwp}
                      expansionModules={analysisResult.expansionModules}
                      onExpansionClick={handleExpansionClick}
                    />
                  </>
                ) : (
                  <NonSolarResultCards
                    totalPaid={analysisResult.totalPaid}
                    uncompensatedCost={analysisResult.uncompensatedCost}
                    recommendedKwp={analysisResult.recommendedKwp}
                    recommendedModules={analysisResult.recommendedModules}
                    potentialSavings={analysisResult.potentialSavings}
                    onReceiveProposal={handleReceiveProposal}
                    isLoading={isCrmLoading}
                  />
                )}

                {isPortfolio && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Contas individuais</h3>
                    {analysisResult.bills.map((bill: IndividualBillResult) => (
                      <div key={bill.id} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{bill.fileName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {[bill.referenceMonth, bill.distributor, bill.holder].filter(Boolean).join(" - ")}
                            </p>
                          </div>
                          <Badge variant="secondary">{formatCurrency(bill.totalPaid)}</Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Consumo</p>
                            <p className="font-medium text-foreground">{bill.billedConsumption || 0} kWh</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {analysisResult.type === "solar" ? "Geracao faltante" : "Sistema sugerido"}
                            </p>
                            <p className="font-medium text-foreground">
                              {analysisResult.type === "solar"
                                ? `${bill.extraGenerationNeeded || 0} kWh`
                                : `${bill.recommendedKwp?.toFixed(2) || "0.00"} kWp`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <FreemiumBanner onSignUp={() => (window.location.href = `/auth?returnTo=dashboard`)} />
              </motion.div>
            )
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-border bg-card py-6">
        <div className="container text-center">
          <SoloLogo className="mx-auto h-6 w-auto opacity-60" />
          <p className="mt-2 text-xs text-muted-foreground">© 2025 Solo Energia. Voce no controle da sua energia.</p>
        </div>
      </footer>
    </div>
  );
}
