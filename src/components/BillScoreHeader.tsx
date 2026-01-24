import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BillScoreHeaderProps {
  score: number;
  label: string;
  factors: string[];
  totalAmount: number;
  savings?: number;
}

export function BillScoreHeader({ score, label, factors, totalAmount, savings = 0 }: BillScoreHeaderProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "from-green-500/20 to-green-600/10";
    if (score >= 60) return "from-yellow-500/20 to-yellow-600/10";
    if (score >= 40) return "from-orange-500/20 to-orange-600/10";
    return "from-red-500/20 to-red-600/10";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 70) return <TrendingUp className="h-5 w-5" />;
    if (score >= 40) return <Minus className="h-5 w-5" />;
    return <TrendingDown className="h-5 w-5" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-gradient-to-br ${getScoreBgColor(score)} border border-border p-6`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Score Circle */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted/30"
              />
              <motion.circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={getScoreColor(score)}
                initial={{ strokeDasharray: "0 251.2" }}
                animate={{ strokeDasharray: `${(score / 100) * 251.2} 251.2` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                {score}
              </span>
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <span className={getScoreColor(score)}>{getScoreIcon(score)}</span>
              <h2 className={`text-xl font-semibold ${getScoreColor(score)}`}>
                {label}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Score da sua conta de energia
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="flex gap-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-bold text-foreground">
              R$ {totalAmount.toFixed(2)}
            </p>
          </div>
          
          {savings > 0 && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Economia Solar</p>
              <p className="text-2xl font-bold text-green-500">
                R$ {savings.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Factors */}
      {factors.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Fatores considerados:</p>
          <div className="flex flex-wrap gap-2">
            {factors.slice(0, 4).map((factor, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 bg-background/50 rounded-full text-muted-foreground"
              >
                {factor}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
