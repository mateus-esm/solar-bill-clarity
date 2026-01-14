import { motion } from "framer-motion";
import { Sun, Zap, Battery, TrendingUp } from "lucide-react";

interface SolarBreakdownProps {
  gerada: number;
  injetada: number;
  creditosUsados: number;
  creditosAcumulados: number;
}

export function SolarBreakdown({
  gerada,
  injetada,
  creditosUsados,
  creditosAcumulados,
}: SolarBreakdownProps) {
  const items = [
    {
      icon: Sun,
      label: "Energia Gerada",
      value: `${gerada} kWh`,
      color: "bg-secondary/20 text-secondary",
    },
    {
      icon: Zap,
      label: "Energia Injetada",
      value: `${injetada} kWh`,
      color: "bg-primary/10 text-primary",
    },
    {
      icon: Battery,
      label: "Créditos Usados",
      value: `${creditosUsados} kWh`,
      color: "bg-emerald-500/10 text-emerald-600",
    },
    {
      icon: TrendingUp,
      label: "Créditos Acumulados",
      value: `${creditosAcumulados} kWh`,
      color: "bg-blue-500/10 text-blue-600",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="stat-card"
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="gradient-bg rounded-lg p-2">
          <Sun className="h-5 w-5 text-primary-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Energia Solar</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {items.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="rounded-lg bg-muted/50 p-4"
          >
            <div className={`inline-flex rounded-lg p-2 ${item.color}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{item.label}</p>
            <p className="text-lg font-bold text-foreground">{item.value}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
