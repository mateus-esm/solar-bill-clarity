import { motion } from "framer-motion";
import { Sun, ArrowDown, Home, Zap, Share2 } from "lucide-react";

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
      className="border border-border bg-card p-5 space-y-5"
      style={{ borderRadius: "var(--radius)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #FF481E22, #FFC20015)", borderRadius: "var(--radius)", border: "1px solid #FF481E30" }}
          >
            <Sun className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground tracking-tight">Energia solar este mês</p>
            <p className="text-xs text-muted-foreground">Destino de cada kWh gerado</p>
          </div>
        </div>
        {/* Big number inline */}
        <div className="text-right">
          <p className="text-2xl font-bold gradient-text leading-none">{fmt(generated)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">kWh gerados</p>
        </div>
      </div>

      {/* Precision separator */}
      <div className="solo-divider" />

      {/* Flow rows */}
      <div className="space-y-2">

        {/* Self-consumed */}
        <div className="flex items-center gap-3 p-3 border border-emerald-500/20 bg-emerald-500/5"
          style={{ borderRadius: "var(--radius)" }}>
          <div className="h-7 w-7 shrink-0 flex items-center justify-center bg-emerald-500/15"
            style={{ borderRadius: "var(--radius)" }}>
            <Home className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-sm font-medium text-foreground">Autoconsumo</span>
              <span className="text-sm font-semibold text-emerald-400 whitespace-nowrap tabular-nums">
                {fmt(selfConsumed)} kWh
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Usado direto em casa · {selfPct}% do gerado</p>
          </div>
        </div>

        {/* Connector */}
        <div className="flex items-center gap-2 px-3 py-1">
          <div className="flex-1 h-px bg-border" />
          <ArrowDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <span className="text-xs text-muted-foreground/60 whitespace-nowrap">injetado na rede</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Compensated this UC */}
        <div className="flex items-center gap-3 p-3 border border-primary/20 bg-primary/5"
          style={{ borderRadius: "var(--radius)" }}>
          <div className="h-7 w-7 shrink-0 flex items-center justify-center bg-primary/15"
            style={{ borderRadius: "var(--radius)" }}>
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-sm font-medium text-foreground">Compensado nesta UC</span>
              <span className="text-sm font-semibold text-primary whitespace-nowrap tabular-nums">
                {fmt(compensated)} kWh
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Abatido desta fatura · {injected > 0 ? Math.round((compensated / injected) * 100) : 0}% do injetado
            </p>
          </div>
        </div>

        {/* Credits to other UCs */}
        {creditedElsewhere > 0 && (
          <div className="flex items-center gap-3 p-3 border border-border bg-muted/30"
            style={{ borderRadius: "var(--radius)" }}>
            <div className="h-7 w-7 shrink-0 flex items-center justify-center bg-muted"
              style={{ borderRadius: "var(--radius)" }}>
              <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-sm font-medium text-foreground">Créditos para outras UCs</span>
                <span className="text-sm font-semibold text-foreground whitespace-nowrap tabular-nums">
                  {fmt(creditedElsewhere)} kWh
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Excedente transferido via SCEE</p>
            </div>
          </div>
        )}

        {/* Credits balance */}
        {creditsBalance > 0 && (
          <div className="flex items-center justify-between px-3 py-2 bg-muted/40"
            style={{ borderRadius: "var(--radius)" }}>
            <span className="text-xs text-muted-foreground">Saldo acumulado de créditos</span>
            <span className="text-xs font-semibold text-foreground tabular-nums">{fmt(creditsBalance)} kWh</span>
          </div>
        )}
      </div>

      {/* Distribution bar */}
      <div className="space-y-2">
        <div className="solo-divider" />
        <div className="flex justify-between text-xs text-muted-foreground pt-1">
          <span className="solo-label">Distribuição do gerado</span>
          <span className="tabular-nums">{fmt(generated)} kWh total</span>
        </div>
        <div className="h-1.5 overflow-hidden flex gap-px" style={{ borderRadius: "var(--radius)", background: "hsl(var(--muted))" }}>
          {selfConsumed > 0 && (
            <motion.div
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${selfPct}%` }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
          {injected > 0 && (
            <motion.div
              className="h-full"
              style={{ background: "#FF481E" }}
              initial={{ width: 0 }}
              animate={{ width: `${injectedPct}%` }}
              transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 bg-emerald-500 inline-block" style={{ borderRadius: "1px" }} />
            Autoconsumo {selfPct}%
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 inline-block" style={{ background: "#FF481E", borderRadius: "1px" }} />
            Injetado {injectedPct}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
