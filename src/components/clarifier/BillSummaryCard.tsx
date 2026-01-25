import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

interface BillSummaryCardProps {
  totalPaid: number;
  minimumPossible: number;
}

export function BillSummaryCard({ totalPaid, minimumPossible }: BillSummaryCardProps) {
  const difference = totalPaid - minimumPossible;
  const paidMoreThanMinimum = difference > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            💰 Resumo da Sua Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Valor pago</p>
              <p className="text-2xl font-bold text-foreground">
                R$ {totalPaid.toFixed(2).replace(".", ",")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor mínimo possível</p>
              <p className="text-2xl font-bold text-primary">
                R$ {minimumPossible.toFixed(2).replace(".", ",")}
              </p>
            </div>
          </div>

          {paidMoreThanMinimum ? (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Você pagou{" "}
                <span className="font-semibold">
                  R$ {difference.toFixed(2).replace(".", ",")}
                </span>{" "}
                além do mínimo
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                🎉 Parabéns! Você está pagando apenas o valor mínimo possível!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
