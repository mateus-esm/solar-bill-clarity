import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, TrendingDown } from "lucide-react";

type SystemStatus = "adequate" | "slightly_below" | "below_needed";

interface SystemStatusCardProps {
  expectedGeneration: number;
  actualGeneration: number;
  status: SystemStatus;
}

const statusConfig = {
  adequate: {
    color: "#22c55e",
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/20",
    icon: CheckCircle2,
    label: "Sistema operando bem",
    tip: "Continue monitorando mensalmente para garantir o desempenho.",
  },
  slightly_below: {
    color: "#f59e0b",
    bg: "bg-amber-500/8",
    border: "border-amber-500/20",
    icon: AlertTriangle,
    label: "Geração ligeiramente abaixo",
    tip: "Pequenas variações são normais. Verifique se há sujeira nos painéis.",
  },
  below_needed: {
    color: "#ef4444",
    bg: "bg-red-500/8",
    border: "border-red-500/20",
    icon: XCircle,
    label: "Geração abaixo do esperado",
    tip: "Considere verificar: sujeira nos painéis, sombreamento, ou falha no inversor.",
  },
};

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function SystemStatusCard({ expectedGeneration, actualGeneration, status }: SystemStatusCardProps) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  const pct = expectedGeneration > 0 ? Math.round((actualGeneration / expectedGeneration) * 100) : 0;
  const gap = Math.max(0, expectedGeneration - actualGeneration);
  const clampedPct = Math.min(100, Math.max(0, pct));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`rounded-2xl border p-5 space-y-4 ${cfg.bg} ${cfg.border}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" style={{ color: cfg.color }} />
          <p className="text-sm font-semibold text-foreground">Desempenho do sistema</p>
        </div>
        <span
          className="text-xs font-semibold px-2 py-1 rounded-full"
          style={{ color: cfg.color, backgroundColor: `${cfg.color}18` }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Big efficiency number */}
      <div className="flex items-end gap-3">
        <span className="text-5xl font-bold leading-none" style={{ color: cfg.color }}>
          {pct}%
        </span>
        <div className="pb-1">
          <p className="text-xs text-muted-foreground">da meta atingida</p>
          {gap > 0 && (
            <p className="text-xs font-medium flex items-center gap-1 mt-0.5" style={{ color: cfg.color }}>
              <TrendingDown className="h-3 w-3" />
              {fmt(gap)} kWh abaixo
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-3 rounded-full bg-muted overflow-hidden relative">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: cfg.color }}
            initial={{ width: 0 }}
            animate={{ width: `${clampedPct}%` }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          />
          {/* Target line */}
          <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-foreground/30 rounded-full" />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Gerou: <span className="font-medium text-foreground">{fmt(actualGeneration)} kWh</span></span>
          <span>Meta: <span className="font-medium text-foreground">{fmt(expectedGeneration)} kWh</span></span>
        </div>
      </div>

      {/* Tip */}
      <p className="text-xs text-muted-foreground border-t border-border/50 pt-3">
        💡 {cfg.tip}
      </p>
    </motion.div>
  );
}
