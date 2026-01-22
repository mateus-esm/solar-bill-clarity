import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Home,
  Sun,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Receipt,
  Loader2,
  RefreshCw,
  FileText,
  DollarSign,
  Battery,
  Lightbulb
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import soloLogo from "@/assets/solo-logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/integrations/supabase/clientUntyped";
import { useToast } from "@/hooks/use-toast";

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
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function AnalysisResult() {
  const [analysis, setAnalysis] = useState<BillAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id, analysisId } = useParams<{ id: string; analysisId: string }>();

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

  // Build cost breakdown chart data
  const getCostBreakdown = () => {
    if (!analysis) return [];
    
    const data = [];
    if (analysis.energy_cost) data.push({ name: "Energia", value: analysis.energy_cost, color: "hsl(24, 95%, 53%)" });
    if (analysis.icms_cost) data.push({ name: "ICMS", value: analysis.icms_cost, color: "hsl(45, 100%, 51%)" });
    if (analysis.pis_cofins_cost) data.push({ name: "PIS/COFINS", value: analysis.pis_cofins_cost, color: "hsl(210, 40%, 50%)" });
    if (analysis.public_lighting_cost) data.push({ name: "CIP", value: analysis.public_lighting_cost, color: "hsl(150, 60%, 40%)" });
    if (analysis.availability_cost) data.push({ name: "Disponibilidade", value: analysis.availability_cost, color: "hsl(280, 60%, 50%)" });
    if (analysis.fine_amount && analysis.fine_amount > 0) data.push({ name: "Multa/Juros", value: analysis.fine_amount, color: "hsl(0, 70%, 50%)" });
    
    return data;
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

  const costBreakdown = getCostBreakdown();
  const total = costBreakdown.reduce((sum, item) => sum + item.value, 0);

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
          {analysis.status === "processing" && (
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          )}
        </div>
      </header>

      <main className="container py-8 max-w-4xl">
        {/* Processing State */}
        {analysis.status === "processing" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Analisando sua conta...
            </h2>
            <p className="text-muted-foreground">
              Nossa IA está extraindo os dados da sua fatura. Isso pode levar alguns segundos.
            </p>
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
            <p className="text-muted-foreground mb-6">
              Não foi possível processar sua conta. Tente novamente ou envie uma imagem mais clara.
            </p>
            <Button variant="gradient" onClick={() => navigate(`/property/${id}/analyze`)}>
              Tentar novamente
            </Button>
          </motion.div>
        )}

        {/* Completed Analysis */}
        {(analysis.status === "completed" || analysis.status === "pending") && (
          <div className="space-y-6">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl font-bold text-foreground">
                Análise de {monthNames[analysis.reference_month - 1]} {analysis.reference_year}
              </h1>
              {analysis.distributor && (
                <p className="text-muted-foreground mt-1">
                  {analysis.distributor} • UC: {analysis.account_number || "N/A"}
                </p>
              )}
            </motion.div>

            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="stat-card border-l-4 border-l-primary"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Home className="h-4 w-4" />
                  <span className="text-sm">Consumo Real</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {analysis.real_consumption_kwh?.toFixed(0) || analysis.monitored_generation_kwh} kWh
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Quanto você realmente usou
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="stat-card"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Receipt className="h-4 w-4" />
                  <span className="text-sm">Faturado</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {analysis.billed_consumption_kwh?.toFixed(0) || "—"} kWh
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cobrado pela distribuidora
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="stat-card"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Sun className="h-4 w-4" />
                  <span className="text-sm">Geração Solar</span>
                </div>
                <p className="text-2xl font-bold gradient-text">
                  {analysis.monitored_generation_kwh} kWh
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Registrado no monitoramento
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="stat-card"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Valor Total</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  R$ {analysis.total_amount?.toFixed(2) || "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pago neste mês
                </p>
              </motion.div>
            </div>

            {/* Solar Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="stat-card"
            >
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Sun className="h-5 w-5 text-primary" />
                Desempenho Solar
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Geração Monitorada</p>
                  <p className="text-xl font-bold text-foreground">
                    {analysis.monitored_generation_kwh} kWh
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Energia Injetada</p>
                  <p className="text-xl font-bold text-foreground">
                    {analysis.injected_energy_kwh?.toFixed(0) || "—"} kWh
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Créditos Usados</p>
                  <p className="text-xl font-bold text-foreground">
                    {analysis.compensated_energy_kwh?.toFixed(0) || "—"} kWh
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Saldo de Créditos</p>
                  <p className="text-xl font-bold text-emerald-500">
                    {analysis.current_credits_kwh?.toFixed(0) || "—"} kWh
                  </p>
                </div>
              </div>

              {/* Efficiency Indicator */}
              {analysis.generation_efficiency !== null && (
                <div className="mt-4 p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Eficiência do Sistema</span>
                    <span className={`text-lg font-bold ${
                      analysis.generation_efficiency >= 90 
                        ? 'text-emerald-500' 
                        : analysis.generation_efficiency >= 70 
                          ? 'text-yellow-500' 
                          : 'text-destructive'
                    }`}>
                      {analysis.generation_efficiency.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        analysis.generation_efficiency >= 90 
                          ? 'bg-emerald-500' 
                          : analysis.generation_efficiency >= 70 
                            ? 'bg-yellow-500' 
                            : 'bg-destructive'
                      }`}
                      style={{ width: `${Math.min(analysis.generation_efficiency, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {analysis.generation_efficiency >= 90 
                      ? "✅ Seu sistema está gerando dentro do esperado!"
                      : analysis.generation_efficiency >= 70
                        ? "⚠️ Geração um pouco abaixo do esperado. Verifique sujeira nos módulos."
                        : "🚨 Geração muito abaixo do esperado. Recomendamos uma inspeção."}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Cost Breakdown */}
            {costBreakdown.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="stat-card"
              >
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Para onde foi seu dinheiro
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={costBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {costBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                        />
                        <Legend
                          formatter={(value, entry: any) => {
                            const percent = ((entry.payload.value / total) * 100).toFixed(0);
                            return `${value} (${percent}%)`;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {costBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm text-foreground">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          R$ {item.value.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <span className="font-medium text-foreground">Total</span>
                      <span className="font-bold text-foreground">
                        R$ {analysis.total_amount?.toFixed(2) || total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Alerts */}
            {analysis.alerts && analysis.alerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="stat-card border-l-4 border-l-yellow-500"
              >
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Alertas
                </h3>
                <div className="space-y-3">
                  {analysis.alerts.map((alert: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground">{alert.message || alert}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* AI Analysis */}
            {analysis.ai_analysis && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="stat-card"
              >
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Análise da IA
                </h3>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <p className="whitespace-pre-wrap">{analysis.ai_analysis}</p>
                </div>
              </motion.div>
            )}

            {/* Savings Summary */}
            {analysis.estimated_savings !== null && analysis.estimated_savings > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="p-6 rounded-xl gradient-bg text-white"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Battery className="h-6 w-6" />
                  <span className="text-lg font-medium">Economia Estimada</span>
                </div>
                <p className="text-4xl font-bold mb-2">
                  R$ {analysis.estimated_savings.toFixed(2)}
                </p>
                <p className="text-white/80 text-sm">
                  Valor aproximado que você deixou de pagar graças à energia solar neste mês.
                </p>
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="flex gap-4"
            >
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/property/${id}`)}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao histórico
              </Button>
              {analysis.bill_file_url && (
                <Button
                  variant="secondary"
                  onClick={() => window.open(analysis.bill_file_url!, "_blank")}
                >
                  <FileText className="h-4 w-4" />
                  Ver fatura original
                </Button>
              )}
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
