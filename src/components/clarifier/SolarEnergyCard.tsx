import { motion } from "framer-motion";
import { Sun, ArrowRight, Home, Zap, Share2 } from "lucide-react";

interface SolarEnergyCardProps {
  generated: number;
  injected: number;
  compensated: number;
  creditsBalance: number;
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function SolarEnergyCard({ generated, injected, compensated, creditsBalance }: SolarEnergyCardProps) {
  const selfConsumed = Math.max(0, generated - injected);
  const creditedElsewhere = Math.max(0, injected - compensated);
  const selfPct = generated > 0 ? Math.round((selfConsumed / generated) * 100) : 0;
  const injectedPct = generated > 0 ? Math.round((injected / generated) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-card p-5 space-y-5"
    >
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <Sun className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Sua energia solar este mês</p>
          <p className="text-xs text-muted-foreground">Como o sistema usou cada kWh gerado</p>
        </div>
      </div>

      {/* Big number */}
      <div className="text-center py-2">
        <p className="text-4xl font-bold gradient-text">{fmt(generated)}</p>
        <p className="text-sm text-muted-foreground mt-1">kWh gerados pelo sistema</p>
      </div>

      {/* Flow breakdown */}
      <div className="space-y-3">
        {/* Self consumption */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Home className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-sm font-medium text-foreground">Autoconsumo</span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                {fmt(selfConsumed)} kWh
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Usado direto em casa sem passar pela rede · {selfPct}% do gerado
            </p>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center gap-2 px-3">
          <div className="flex-1 h-px bg-border" />
          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">injetado na rede</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Compensated */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/8 border border-blue-500/15">
          <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-sm font-medium text-foreground">Compensado nesta UC</span>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                {fmt(compensated)} kWh
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Abatido desta fatura · {injected > 0 ? Math.round((compensated / injected) * 100) : 0}% do injetado
            </p>
          </div>
        </div>

        {/* Credits to other accounts */}
        {creditedElsewhere > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/8 border border-purple-500/15">
            <div className="h-8 w-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
              <Share2 className="h-4 w-4 text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-sm font-medium text-foreground">Créditos para outras UCs</span>
                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                  {fmt(creditedElsewhere)} kWh
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Excedente transferido para unidades vinculadas via SCEE
              </p>
            </div>
          </div>
        )}

        {/* Credits balance */}
        {creditsBalance > 0 && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground">Saldo de créditos acumulados</span>
            <span className="text-xs font-semibold text-foreground">{fmt(creditsBalance)} kWh</span>
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Distribuição do gerado</span>
          <span>{fmt(generated)} kWh total</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-muted flex gap-0.5">
          {selfConsumed > 0 && (
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${selfPct}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          )}
          {injected > 0 && (
            <motion.div
              className="h-full rounded-full bg-blue-500 ml-0.5"
              initial={{ width: 0 }}
              animate={{ width: `${injectedPct}%` }}
              transition={{ duration: 0.8, delay: 0.5 }}
            />
          )}
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Autoconsumo {selfPct}%
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            Injetado {injectedPct}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
