import { motion } from "framer-motion";
import { Sun, Zap, Battery, TrendingUp } from "lucide-react";

interface SolarHealthGaugeProps {
  efficiency: number;
  monitoredGeneration: number;
  expectedGeneration: number;
  injectedEnergy: number;
  selfConsumptionRate: number;
  efficiencyAssessment?: string;
}

export function SolarHealthGauge({
  efficiency,
  monitoredGeneration,
  expectedGeneration,
  injectedEnergy,
  selfConsumptionRate,
  efficiencyAssessment = "Bom",
}: SolarHealthGaugeProps) {
  const getEfficiencyColor = (eff: number) => {
    if (eff >= 90) return "text-green-500";
    if (eff >= 75) return "text-yellow-500";
    if (eff >= 50) return "text-orange-500";
    return "text-red-500";
  };

  const getEfficiencyBg = (eff: number) => {
    if (eff >= 90) return "from-green-500/20 to-green-600/10";
    if (eff >= 75) return "from-yellow-500/20 to-yellow-600/10";
    if (eff >= 50) return "from-orange-500/20 to-orange-600/10";
    return "from-red-500/20 to-red-600/10";
  };

  const clampedEfficiency = Math.min(100, Math.max(0, efficiency));
  const selfConsumed = monitoredGeneration - injectedEnergy;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
          <Sun className="h-4 w-4 text-yellow-500" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Saúde do Sistema Solar</h3>
          <p className="text-xs text-muted-foreground">Análise de desempenho da usina</p>
        </div>
      </div>

      {/* Main Gauge */}
      <div className={`p-6 rounded-2xl bg-gradient-to-br ${getEfficiencyBg(efficiency)}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Eficiência do Sistema</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${getEfficiencyColor(efficiency)}`}>
                {clampedEfficiency.toFixed(0)}%
              </span>
              <span className={`text-sm ${getEfficiencyColor(efficiency)}`}>
                {efficiencyAssessment}
              </span>
            </div>
          </div>
          
          {/* Mini gauge */}
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="35"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-muted/30"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="35"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                className={getEfficiencyColor(efficiency)}
                initial={{ strokeDasharray: "0 220" }}
                animate={{ strokeDasharray: `${(clampedEfficiency / 100) * 220} 220` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <TrendingUp className={`h-6 w-6 ${getEfficiencyColor(efficiency)}`} />
            </div>
          </div>
        </div>

        {/* Comparison Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Geração</span>
            <span>{monitoredGeneration.toFixed(0)} / {expectedGeneration.toFixed(0)} kWh</span>
          </div>
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (monitoredGeneration / expectedGeneration) * 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${
                efficiency >= 90 ? "bg-green-500" : 
                efficiency >= 75 ? "bg-yellow-500" : 
                efficiency >= 50 ? "bg-orange-500" : "bg-red-500"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-card border border-border rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-xs text-muted-foreground">Geração Total</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {monitoredGeneration.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">kWh</span>
          </p>
        </div>

        <div className="p-4 bg-card border border-border rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Injetada na Rede</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {injectedEnergy.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">kWh</span>
          </p>
        </div>

        <div className="p-4 bg-card border border-border rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Battery className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Autoconsumo</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {selfConsumed.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">kWh</span>
          </p>
        </div>

        <div className="p-4 bg-card border border-border rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Taxa Autoconsumo</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {selfConsumptionRate.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">%</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
