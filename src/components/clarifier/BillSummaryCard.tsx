import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

interface BillSummaryCardProps {
  totalPaid: number;
  minimumPossible: number;
  connectionType?: string | null;
  extraChargesTotal?: number;
}

const connectionLabel: Record<string, string> = {
  monofasico: "Monofásico",
  bifasico: "Bifásico",
  trifasico: "Trifásico",
};

const connectionMinKwh: Record<string, number> = {
  monofasico: 30,
  bifasico: 50,
  trifasico: 100,
};

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export function BillSummaryCard({
  totalPaid,
  minimumPossible,
  connectionType,
  extraChargesTotal = 0,
}: BillSummaryCardProps) {
  const difference = totalPaid - minimumPossible;
  const paidMoreThanMinimum = difference > 1;
  const minKwh = connectionType ? connectionMinKwh[connectionType] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            💰 Resumo da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Valor pago</p>
              <p className="text-2xl font-bold text-foreground">{fmt(totalPaid)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Mínimo obrigatório
                {connectionType && connectionLabel[connectionType] && (
                  <span className="ml-1 text-xs text-primary/70">
                    ({connectionLabel[connectionType]})
                  </span>
                )}
              </p>
              <p className="text-2xl font-bold text-primary">{fmt(minimumPossible)}</p>
              {minKwh && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Base: {minKwh} kWh mínimos + CIP
                  {extraChargesTotal > 0 && ` + serviços/parcelas`}
                </p>
              )}
            </div>
          </div>

          {paidMoreThanMinimum ? (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Você pagou{" "}
                <span className="font-semibold">{fmt(difference)}</span>{" "}
                além do mínimo obrigatório
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Você está pagando próximo ao mínimo possível!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
