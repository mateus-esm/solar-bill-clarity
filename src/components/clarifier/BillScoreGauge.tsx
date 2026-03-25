import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BillScoreGaugeProps {
  score: number;
  label?: string;
  size?: "sm" | "lg";
}

const getScoreConfig = (s: number) => {
  if (s >= 80) return { color: "#22c55e", trackColor: "#22c55e33", label: "Excelente", description: "Conta otimizada" };
  if (s >= 65) return { color: "#f59e0b", trackColor: "#f59e0b33", label: "Bom", description: "Pequenas melhorias possíveis" };
  if (s >= 45) return { color: "#f97316", trackColor: "#f9731633", label: "Regular", description: "Atenção recomendada" };
  return { color: "#ef4444", trackColor: "#ef444433", label: "Crítico", description: "Requer ação imediata" };
};

export function BillScoreGauge({ score, label, size = "sm" }: BillScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const cfg = getScoreConfig(clamped);

  const radius = 54;
  const strokeWidth = size === "lg" ? 10 : 8;
  const circumference = Math.PI * radius;
  const progress = (clamped / 100) * circumference;

  if (size === "lg") {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="relative" style={{ width: 160, height: 96 }}>
          <svg width="160" height="96" viewBox="0 0 120 70" className="overflow-visible">
            <path
              d="M 6 66 A 54 54 0 0 1 114 66"
              fill="none"
              stroke={cfg.trackColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <motion.path
              d="M 6 66 A 54 54 0 0 1 114 66"
              fill="none"
              stroke={cfg.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - progress }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="text-5xl font-bold leading-none"
              style={{ color: cfg.color }}
            >
              {Math.round(clamped)}
            </motion.span>
          </div>
        </div>
        <span className="text-sm font-semibold" style={{ color: cfg.color }}>
          {label || cfg.label}
        </span>
        <span className="text-xs text-muted-foreground">{cfg.description}</span>
      </div>
    );
  }

  // Small size — inline use
  const rSm = 40;
  const circSm = Math.PI * rSm;
  const progSm = (clamped / 100) * circSm;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 96, height: 56 }}>
        <svg width="96" height="56" viewBox="0 0 88 52" className="overflow-visible">
          <path
            d="M 4 48 A 40 40 0 0 1 84 48"
            fill="none"
            stroke={cfg.trackColor}
            strokeWidth={7}
            strokeLinecap="round"
          />
          <motion.path
            d="M 4 48 A 40 40 0 0 1 84 48"
            fill="none"
            stroke={cfg.color}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={circSm}
            initial={{ strokeDashoffset: circSm }}
            animate={{ strokeDashoffset: circSm - progSm }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-2xl font-bold leading-none"
            style={{ color: cfg.color }}
          >
            {Math.round(clamped)}
          </motion.span>
        </div>
      </div>
      <span className="text-xs font-medium" style={{ color: cfg.color }}>
        {label || cfg.label}
      </span>
    </div>
  );
}
