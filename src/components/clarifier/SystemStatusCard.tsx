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
    borderColor: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
    icon: CheckCircle2,
    label: "Sistema operando bem",
    tip: "Continue monitorando mensalmente para garantir o desempenho.",
  },
  slightly_below: {
    color: "#FF481E",
    borderColor: "border-primary/20",
    bg: "bg-primary/5",
    icon: AlertTriangle,
    label: "Geração ligeiramente abaixo",
    tip: "Pequenas variações são normais. Verifique se há sujeira nos painéis.",
  },
  below_needed: {
    color: "#ef4444",
    borderColor: "border-red-500/20",
    bg: "bg-red-500/5",
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
      className={`border p-5 space-y-4 ${cfg.bg} ${cfg.borderColor}`}
      style={{ borderRadius: "var(--radius)" }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" style={{ color: cfg.color }} />
          <p className="text-sm font-semibold text-foreground tracking-tight">Desempenho do sistema</p>
        </div>
        <span
          className="text-xs font-medium px-2 py-1"
          style={{
            color: cfg.color,
            backgroundColor: `${cfg.color}15`,
            borderRadius: "var(--radius)",
            border: `1px solid ${cfg.color}30`,
          }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Big efficiency % */}
      <div className="flex items-end gap-3">
        <motion.span
          className="text-5xl font-bold leading-none"
          style={{ color: cfg.color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {pct}%
        </motion.span>
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

      {/* Progress bar — engineering style, no rounded */}
      <div className="space-y-2">
        <div className="h-1.5 overflow-hidden relative" style={{ background: "hsl(var(--border))" }}>
          <motion.div
            className="h-full"
            style={{ backgroundColor: cfg.color }}
            initial={{ width: 0 }}
            animate={{ width: `${clampedPct}%` }}
            transition={{ duration: 1.1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* Target marker */}
          <div className="absolute right-0 top-0 bottom-0 w-px bg-foreground/30" />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">
            Gerou: <span className="font-medium text-foreground">{fmt(actualGeneration)} kWh</span>
          </span>
          <span className="tabular-nums">
            Meta: <span className="font-medium text-foreground">{fmt(expectedGeneration)} kWh</span>
          </span>
        </div>
      </div>

      {/* Tip */}
      <p className="text-xs text-muted-foreground border-t border-border/50 pt-3">
        {cfg.tip}
      </p>
    </motion.div>
  );
}
