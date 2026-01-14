import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface ResultCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  delay?: number;
  variant?: "default" | "highlight";
}

export function ResultCard({
  title,
  value,
  subtitle,
  icon: Icon,
  delay = 0,
  variant = "default",
}: ResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`stat-card relative overflow-hidden ${
        variant === "highlight" ? "card-glow gradient-border" : ""
      }`}
    >
      {variant === "highlight" && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
      )}
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={`mt-1 text-2xl font-bold ${variant === "highlight" ? "gradient-text" : "text-foreground"}`}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={`rounded-lg p-2 ${variant === "highlight" ? "gradient-bg" : "bg-primary/10"}`}>
          <Icon className={`h-5 w-5 ${variant === "highlight" ? "text-primary-foreground" : "text-primary"}`} />
        </div>
      </div>
    </motion.div>
  );
}
