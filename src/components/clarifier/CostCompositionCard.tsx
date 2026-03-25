import { motion } from "framer-motion";
import { Info, Package, CreditCard } from "lucide-react";

interface ExtraCharge {
  description: string;
  value: number;
  type: "service" | "installment";
  remaining_installments?: number;
}

interface CostCompositionCardProps {
  availabilityCost: number;
  publicLightingCost: number;
  uncompensatedCost: number;
  extraCharges?: ExtraCharge[];
  connectionType?: string | null;
}

const connectionTypeLabel: Record<string, string> = {
  monofasico: "Monofásico · mín. 30 kWh",
  bifasico:   "Bifásico · mín. 50 kWh",
  trifasico:  "Trifásico · mín. 100 kWh",
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CostCompositionCard({
  availabilityCost,
  publicLightingCost,
  uncompensatedCost,
  extraCharges = [],
  connectionType,
}: CostCompositionCardProps) {
  const totalFixedFees = availabilityCost + publicLightingCost;
  const hasUncompensated = uncompensatedCost > 1;
  const services     = extraCharges.filter((c) => c.type === "service");
  const installments = extraCharges.filter((c) => c.type === "installment");
  const hasExtras    = extraCharges.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="border border-border bg-card p-5 space-y-4"
      style={{ borderRadius: "var(--radius)" }}
    >
      <p className="solo-label">Composição da conta</p>

      {/* Fixed fees */}
      <div className="space-y-1">
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-foreground font-medium">Taxas fixas obrigatórias</span>
          <span className="text-sm font-semibold text-foreground tabular-nums">{fmt(totalFixedFees)}</span>
        </div>

        <div className="solo-accent-line-gradient space-y-2.5 pb-1">
          {availabilityCost > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                Custo de disponibilidade
                {connectionType && connectionTypeLabel[connectionType] && (
                  <span className="ml-1.5 text-xs text-primary/80">
                    ({connectionTypeLabel[connectionType]})
                  </span>
                )}
              </span>
              <span className="text-foreground tabular-nums">{fmt(availabilityCost)}</span>
            </div>
          )}
          {publicLightingCost > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Iluminação pública (CIP/COSIP)</span>
              <span className="text-foreground tabular-nums">{fmt(publicLightingCost)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Services */}
      {services.length > 0 && (
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Package className="h-3.5 w-3.5 text-primary" />
            Serviços contratados
          </div>
          <div className="solo-accent-line space-y-2" style={{ borderLeftColor: "#FF481E50" }}>
            {services.map((s, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{s.description}</span>
                <span className="text-primary tabular-nums">{fmt(s.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Installments */}
      {installments.length > 0 && (
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CreditCard className="h-3.5 w-3.5 text-amber-400" />
            Parcelamentos em aberto
          </div>
          <div className="solo-accent-line space-y-2" style={{ borderLeftColor: "#f59e0b50" }}>
            {installments.map((s, i) => (
              <div key={i} className="flex justify-between items-start text-sm">
                <span className="text-muted-foreground">
                  {s.description}
                  {s.remaining_installments && (
                    <span className="block text-xs text-amber-500/70 mt-0.5">
                      {s.remaining_installments} parcelas restantes
                    </span>
                  )}
                </span>
                <span className="text-amber-400 whitespace-nowrap ml-2 tabular-nums">{fmt(s.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uncompensated */}
      {hasUncompensated && (
        <div className="flex justify-between items-center pt-3 border-t border-border">
          <span className="text-sm text-muted-foreground">Consumo não compensado</span>
          <span className="text-sm font-semibold text-amber-400 tabular-nums">{fmt(uncompensatedCost)}</span>
        </div>
      )}

      {/* Footer note */}
      <div className="flex items-start gap-2 p-3 bg-muted/40 border border-border/60"
        style={{ borderRadius: "var(--radius)" }}>
        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Taxas fixas são cobradas mesmo com energia solar. Para ligação trifásica, o mínimo
          obrigatório é 100 kWh — independente do consumo.
          {hasExtras && " Serviços e parcelamentos também compõem o valor final."}
        </p>
      </div>
    </motion.div>
  );
}
