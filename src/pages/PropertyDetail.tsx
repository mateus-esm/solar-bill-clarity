import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Plus,
  Calendar,
  Sun,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Loader2,
  BarChart3,
  DollarSign
} from "lucide-react";
import soloLogo from "@/assets/solo-logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/integrations/supabase/clientUntyped";
import { useToast } from "@/hooks/use-toast";

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  average_consumption: number;
}

interface SolarSystem {
  id: string;
  number_of_modules: number;
  module_power_watts: number;
  module_brand: string | null;
  inverter_brand: string | null;
  total_power_kw: number;
  expected_monthly_generation: number;
  installation_year: number;
  system_cost: number | null;
  last_maintenance_date: string | null;
}

interface BillAnalysis {
  id: string;
  reference_month: number;
  reference_year: number;
  monitored_generation_kwh: number;
  billed_consumption_kwh: number | null;
  total_amount: number | null;
  generation_efficiency: number | null;
  estimated_savings: number | null;
  status: string;
  alerts: any[];
  created_at: string;
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function PropertyDetail() {
  const [property, setProperty] = useState<Property | null>(null);
  const [solarSystem, setSolarSystem] = useState<SolarSystem | null>(null);
  const [analyses, setAnalyses] = useState<BillAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchPropertyData();
    }
  }, [user, id]);

  const fetchPropertyData = async () => {
    try {
      // Fetch property
      const { data: propertyData, error: propertyError } = await db("properties")
        .select("*")
        .eq("id", id)
        .single();

      if (propertyError) throw propertyError;
      setProperty(propertyData);

      // Fetch solar system
      const { data: systemData, error: systemError } = await db("solar_systems")
        .select("*")
        .eq("property_id", id)
        .single();

      if (!systemError && systemData) {
        setSolarSystem(systemData);
      }

      // Fetch analyses
      const { data: analysesData, error: analysesError } = await db("bill_analyses")
        .select("*")
        .eq("property_id", id)
        .order("reference_year", { ascending: false })
        .order("reference_month", { ascending: false });

      if (!analysesError) {
        setAnalyses(analysesData || []);
      }
    } catch (error: any) {
      console.error("Error fetching property:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da propriedade",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const yearAnalyses = analyses.filter(a => a.reference_year === selectedYear);
  const totalGeneration = yearAnalyses.reduce((sum, a) => sum + (a.monitored_generation_kwh || 0), 0);
  const totalSavings = yearAnalyses.reduce((sum, a) => sum + (a.estimated_savings || 0), 0);
  const avgEfficiency = yearAnalyses.length > 0 
    ? yearAnalyses.reduce((sum, a) => sum + (a.generation_efficiency || 0), 0) / yearAnalyses.length 
    : 0;

  // Calculate payback
  const paybackYears = solarSystem?.system_cost && totalSavings > 0
    ? (solarSystem.system_cost / (totalSavings * 12 / yearAnalyses.length || 1)).toFixed(1)
    : null;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!property) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={soloLogo} alt="Solo Energia" className="h-8 w-auto" />
        </div>
      </header>

      <main className="container py-8">
        {/* Property Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground">{property.name}</h1>
          <p className="text-muted-foreground mt-1">
            {property.address} - {property.city}, {property.state}
          </p>
        </motion.div>

        {/* System Overview Cards */}
        {solarSystem && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="stat-card"
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Sun className="h-4 w-4" />
                <span className="text-sm">Potência do Sistema</span>
              </div>
              <p className="text-2xl font-bold gradient-text">
                {solarSystem.total_power_kw?.toFixed(2)} kWp
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {solarSystem.number_of_modules} módulos de {solarSystem.module_power_watts}W
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="stat-card"
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Zap className="h-4 w-4" />
                <span className="text-sm">Geração Esperada</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {solarSystem.expected_monthly_generation?.toFixed(0)} kWh
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Por mês (estimado)
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="stat-card"
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Economia {selectedYear}</span>
              </div>
              <p className="text-2xl font-bold text-emerald-500">
                R$ {totalSavings.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {yearAnalyses.length} meses analisados
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="stat-card"
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">Eficiência Média</span>
              </div>
              <p className={`text-2xl font-bold ${avgEfficiency >= 90 ? "text-emerald-500" : avgEfficiency >= 70 ? "text-yellow-500" : "text-destructive"}`}>
                {avgEfficiency.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {paybackYears ? `Payback: ${paybackYears} anos` : "Sem dados suficientes"}
              </p>
            </motion.div>
          </div>
        )}

        {/* Year Selector + Add Analysis Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-card border border-border rounded-lg px-3 py-2 text-foreground"
            >
              {[2025, 2024, 2023].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <Button
            variant="gradient"
            onClick={() => navigate(`/property/${id}/analyze`)}
          >
            <Plus className="h-4 w-4" />
            Nova Análise
          </Button>
        </div>

        {/* Monthly Calendar Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4"
        >
          {monthNames.map((month, index) => {
            const monthNum = index + 1;
            const analysis = analyses.find(
              a => a.reference_month === monthNum && a.reference_year === selectedYear
            );

            return (
              <div
                key={month}
                onClick={() => {
                  if (analysis) {
                    navigate(`/property/${id}/analysis/${analysis.id}`);
                  } else {
                    navigate(`/property/${id}/analyze?month=${monthNum}&year=${selectedYear}`);
                  }
                }}
                className={`stat-card cursor-pointer group ${
                  analysis 
                    ? analysis.status === 'completed' 
                      ? 'border-l-4 border-l-emerald-500' 
                      : 'border-l-4 border-l-yellow-500'
                    : ''
                }`}
              >
                <p className="text-sm font-medium text-foreground mb-2">{month}</p>
                
                {analysis ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      {analysis.generation_efficiency && analysis.generation_efficiency >= 90 ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : analysis.generation_efficiency && analysis.generation_efficiency >= 70 ? (
                        <TrendingUp className="h-3 w-3 text-yellow-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {analysis.generation_efficiency?.toFixed(0) || '?'}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analysis.monitored_generation_kwh} kWh
                    </p>
                    {analysis.total_amount && (
                      <p className="text-xs font-medium text-foreground">
                        R$ {analysis.total_amount.toFixed(2)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-12 text-muted-foreground">
                    <Plus className="h-5 w-5 opacity-50 group-hover:opacity-100 group-hover:text-primary transition-all" />
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Analysis History Table */}
        {analyses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8"
          >
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Histórico de Análises
            </h2>
            <div className="stat-card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Mês/Ano</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Geração</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Consumo</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Eficiência</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Valor</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {analyses.map((analysis) => (
                      <tr
                        key={analysis.id}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => navigate(`/property/${id}/analysis/${analysis.id}`)}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {monthNames[analysis.reference_month - 1]} {analysis.reference_year}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {analysis.monitored_generation_kwh} kWh
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {analysis.billed_consumption_kwh || '-'} kWh
                        </td>
                        <td className="px-4 py-3">
                          {analysis.generation_efficiency ? (
                            <span className={`text-sm font-medium ${
                              analysis.generation_efficiency >= 90 
                                ? 'text-emerald-500' 
                                : analysis.generation_efficiency >= 70 
                                  ? 'text-yellow-500' 
                                  : 'text-destructive'
                            }`}>
                              {analysis.generation_efficiency.toFixed(0)}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {analysis.total_amount ? `R$ ${analysis.total_amount.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            analysis.status === 'completed' 
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : analysis.status === 'processing'
                                ? 'bg-yellow-500/10 text-yellow-500'
                                : 'bg-muted text-muted-foreground'
                          }`}>
                            {analysis.status === 'completed' ? 'Completo' : 
                             analysis.status === 'processing' ? 'Processando' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
