import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Info } from "lucide-react";

interface CostCompositionCardProps {
  availabilityCost: number;
  publicLightingCost: number;
  uncompensatedCost: number;
}

export function CostCompositionCard({
  availabilityCost,
  publicLightingCost,
  uncompensatedCost,
}: CostCompositionCardProps) {
  const totalFixedFees = availabilityCost + publicLightingCost;
  const hasUncompensated = uncompensatedCost > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            📊 Para Onde Foi o Dinheiro?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fixed fees breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Taxas fixas</span>
              <span className="font-semibold text-foreground">
                R$ {totalFixedFees.toFixed(2).replace(".", ",")}
              </span>
            </div>

            <div className="pl-4 space-y-2 border-l-2 border-muted">
              {availabilityCost > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Custo de disponibilidade</span>
                  <span className="text-foreground">
                    R$ {availabilityCost.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}
              {publicLightingCost > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Iluminação pública (CIP)</span>
                  <span className="text-foreground">
                    R$ {publicLightingCost.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Uncompensated consumption */}
          {hasUncompensated && (
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Consumo não compensado</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                R$ {uncompensatedCost.toFixed(2).replace(".", ",")}
              </span>
            </div>
          )}

          {/* Explainer */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 mt-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Taxas fixas existem sempre, mesmo com energia solar. São valores obrigatórios 
              cobrados pela distribuidora e pela prefeitura.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
