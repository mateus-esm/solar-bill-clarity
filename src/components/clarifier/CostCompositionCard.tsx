import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  monofasico: "Monofásico (mín. 30 kWh)",
  bifasico: "Bifásico (mín. 50 kWh)",
  trifasico: "Trifásico (mín. 100 kWh)",
};

export function CostCompositionCard({
  availabilityCost,
  publicLightingCost,
  uncompensatedCost,
  extraCharges = [],
  connectionType,
}: CostCompositionCardProps) {
  const totalFixedFees = availabilityCost + publicLightingCost;
  const hasUncompensated = uncompensatedCost > 0;
  const services = extraCharges.filter((c) => c.type === "service");
  const installments = extraCharges.filter((c) => c.type === "installment");
  const hasExtras = extraCharges.length > 0;

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            📊 Composição da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fixed fees breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Taxas fixas obrigatórias</span>
              <span className="font-semibold text-foreground">{fmt(totalFixedFees)}</span>
            </div>

            <div className="pl-4 space-y-2 border-l-2 border-muted">
              {availabilityCost > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    Custo de disponibilidade
                    {connectionType && connectionTypeLabel[connectionType] && (
                      <span className="ml-1 text-xs text-primary/70">
                        ({connectionTypeLabel[connectionType]})
                      </span>
                    )}
                  </span>
                  <span className="text-foreground">{fmt(availabilityCost)}</span>
                </div>
              )}
              {publicLightingCost > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Iluminação pública (CIP)</span>
                  <span className="text-foreground">{fmt(publicLightingCost)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Extra charges: services */}
          {services.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Package className="h-4 w-4 text-blue-500" />
                Serviços contratados
              </div>
              <div className="pl-4 space-y-2 border-l-2 border-blue-500/30">
                {services.map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{s.description}</span>
                    <span className="text-blue-600 dark:text-blue-400">{fmt(s.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extra charges: installments */}
          {installments.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CreditCard className="h-4 w-4 text-orange-500" />
                Parcelamentos em aberto
              </div>
              <div className="pl-4 space-y-2 border-l-2 border-orange-500/30">
                {installments.map((s, i) => (
                  <div key={i} className="flex justify-between items-start text-sm">
                    <span className="text-muted-foreground">
                      {s.description}
                      {s.remaining_installments && (
                        <span className="block text-xs text-orange-500/80">
                          {s.remaining_installments} parcelas restantes
                        </span>
                      )}
                    </span>
                    <span className="text-orange-600 dark:text-orange-400 whitespace-nowrap ml-2">
                      {fmt(s.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uncompensated consumption */}
          {hasUncompensated && (
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Consumo não compensado</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {fmt(uncompensatedCost)}
              </span>
            </div>
          )}

          {/* Explainer */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 mt-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Taxas fixas são cobradas mesmo com energia solar. Para ligação trifásica, o mínimo
              obrigatório é 100 kWh — independente do quanto você consome.
              {hasExtras && " Serviços e parcelamentos também aumentam o valor final da conta."}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
