import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BillScoreGaugeProps {
  score: number; // 0-100
  label?: string;
}

export function BillScoreGauge({ score, label }: BillScoreGaugeProps) {
  // Clamp score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, score));
  
  // Determine color based on score
  const getColor = (s: number) => {
    if (s >= 80) return { color: "hsl(var(--chart-2))", label: "Excelente", bg: "bg-green-500/10" };
    if (s >= 50) return { color: "hsl(var(--chart-4))", label: "Regular", bg: "bg-yellow-500/10" };
    return { color: "hsl(var(--destructive))", label: "Atenção", bg: "bg-red-500/10" };
  };

  const { color, label: statusLabel, bg } = getColor(clampedScore);
  
  // Calculate arc path for gauge
  const radius = 45;
  const strokeWidth = 10;
  const circumference = Math.PI * radius; // Half circle
  const progress = (clampedScore / 100) * circumference;

  return (
    <Card className={cn("overflow-hidden", bg)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          Score da Conta
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pb-6">
        <div className="relative w-32 h-20">
          <svg
            width="128"
            height="80"
            viewBox="0 0 100 60"
            className="overflow-visible"
          >
            {/* Background arc */}
            <path
              d="M 5 55 A 45 45 0 0 1 95 55"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Progress arc */}
            <motion.path
              d="M 5 55 A 45 45 0 0 1 95 55"
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - progress }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            />
          </svg>
          
          {/* Score number in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="text-3xl font-bold"
              style={{ color }}
            >
              {Math.round(clampedScore)}
            </motion.span>
          </div>
        </div>
        
        <p className="text-sm font-medium" style={{ color }}>
          {label || statusLabel}
        </p>
      </CardContent>
    </Card>
  );
}
