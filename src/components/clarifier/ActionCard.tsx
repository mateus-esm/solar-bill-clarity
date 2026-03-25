import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Plus, TrendingUp } from "lucide-react";

interface ActionCardProps {
  extraGenerationNeeded: number;
  expansionKwp?: number;
  expansionModules?: number;
  onExpansionClick?: () => void;
}

export function ActionCard({
  extraGenerationNeeded,
  expansionKwp,
  expansionModules,
  onExpansionClick,
}: ActionCardProps) {
  const needsExpansion = extraGenerationNeeded > 0 && expansionModules && expansionModules > 0;

  if (!needsExpansion) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="border border-emerald-500/20 bg-emerald-500/5 p-5"
        style={{ borderRadius: "var(--radius)" }}
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 flex items-center justify-center bg-emerald-500/15"
            style={{ borderRadius: "var(--radius)" }}>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Você está no caminho certo</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Seu sistema está gerando o suficiente. Continue monitorando mensalmente.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="border border-primary/25 p-5 space-y-4"
      style={{
        borderRadius: "var(--radius)",
        background: "linear-gradient(135deg, rgb(255 72 30 / 0.07) 0%, rgb(255 194 0 / 0.04) 100%)",
      }}
    >
      <p className="solo-label">Para pagar só o mínimo</p>

      {/* Metrics */}
      <div className="space-y-0 border border-border/60" style={{ borderRadius: "var(--radius)" }}>
        <div className="flex justify-between items-center px-4 py-3 border-b border-border/60">
          <span className="text-sm text-muted-foreground">Falta gerar</span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {extraGenerationNeeded.toLocaleString("pt-BR")} kWh
          </span>
        </div>
        {expansionKwp && (
          <div className="flex justify-between items-center px-4 py-3 border-b border-border/60">
            <span className="text-sm text-muted-foreground">Isso equivale a</span>
            <span className="text-sm font-semibold text-primary tabular-nums">
              +{expansionKwp.toFixed(1)} kWp
            </span>
          </div>
        )}
        {expansionModules && (
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-sm text-muted-foreground">Aproximadamente</span>
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {expansionModules} módulos
            </span>
          </div>
        )}
      </div>

      <Button variant="gradient" className="w-full" onClick={onExpansionClick}>
        <Plus className="h-4 w-4" />
        Quero avaliar expansão
        <ArrowRight className="h-4 w-4" />
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Solicite um orçamento sem compromisso
      </p>
    </motion.div>
  );
}
