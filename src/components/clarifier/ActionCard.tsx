import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Plus } from "lucide-react";

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
    // User is already at minimum or generating enough
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-emerald-500/20 bg-gradient-to-br from-card to-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              ✅ Você Está no Caminho Certo!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Seu sistema está gerando energia suficiente para suas necessidades. 
              Continue monitorando mensalmente para garantir o melhor desempenho.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            💡 Para Pagar Só o Mínimo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Falta gerar</span>
              <span className="font-semibold text-foreground">
                {extraGenerationNeeded.toLocaleString("pt-BR")} kWh
              </span>
            </div>
            
            {expansionKwp && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Isso equivale a</span>
                <span className="font-semibold text-primary">
                  +{expansionKwp.toFixed(1)} kWp
                </span>
              </div>
            )}
            
            {expansionModules && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Aproximadamente</span>
                <span className="font-semibold text-foreground">
                  {expansionModules} módulos
                </span>
              </div>
            )}
          </div>

          <Button
            variant="gradient"
            className="w-full"
            onClick={onExpansionClick}
          >
            <Plus className="h-4 w-4 mr-2" />
            Quero avaliar expansão
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Solicite um orçamento sem compromisso
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
