import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Sun, Zap, ArrowDownUp, Battery } from "lucide-react";

interface SolarEnergyCardProps {
  generated: number;
  injected: number;
  compensated: number;
  creditsBalance: number;
}

export function SolarEnergyCard({
  generated,
  injected,
  compensated,
  creditsBalance,
}: SolarEnergyCardProps) {
  // Calculate self-consumption (what was used directly without going to the grid)
  const selfConsumed = Math.max(0, generated - injected);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="border-amber-500/20 bg-gradient-to-br from-card to-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            ☀️ Sua Energia Solar Este Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Generated */}
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Sun className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gerado</p>
                <p className="text-lg font-semibold text-foreground">
                  {generated.toLocaleString("pt-BR")} kWh
                </p>
              </div>
            </div>

            {/* Injected to grid */}
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <ArrowDownUp className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Injetado na rede</p>
                <p className="text-lg font-semibold text-foreground">
                  {injected.toLocaleString("pt-BR")} kWh
                </p>
              </div>
            </div>

            {/* Compensated */}
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Zap className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Compensado</p>
                <p className="text-lg font-semibold text-foreground">
                  {compensated.toLocaleString("pt-BR")} kWh
                </p>
              </div>
            </div>

            {/* Credits balance */}
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2">
                <Battery className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Créditos acumulados</p>
                <p className="text-lg font-semibold text-foreground">
                  {creditsBalance.toLocaleString("pt-BR")} kWh
                </p>
              </div>
            </div>
          </div>

          {/* Self-consumption info */}
          {selfConsumed > 0 && (
            <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                ⚡ <span className="font-medium">{selfConsumed.toLocaleString("pt-BR")} kWh</span> foram 
                consumidos diretamente (autoconsumo)
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
