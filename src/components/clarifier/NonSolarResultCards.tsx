import { Zap, Sun, Banknote, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface NonSolarResultCardsProps {
  totalPaid: number;
  uncompensatedCost: number; // Consumo que não temos como evitar
  recommendedKwp?: number;
  recommendedModules?: number;
  potentialSavings?: number;
  onReceiveProposal: () => void;
  isLoading?: boolean;
}

export function NonSolarResultCards({
  totalPaid,
  uncompensatedCost,
  recommendedKwp,
  recommendedModules,
  potentialSavings,
  onReceiveProposal,
  isLoading = false
}: NonSolarResultCardsProps) {
  
  // Formatters
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Resumo da Conta (adaptado p/ não solar) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="stat-card"
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
            <Banknote className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-foreground">Sua Conta Atual</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">O que você paga hoje</p>
            <p className="mt-1 flex items-baseline gap-1 text-2xl font-bold text-destructive">
              <span className="text-sm font-medium text-destructive/80">R$</span>
              {totalPaid ? totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "---"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Valor total faturado</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">O que poderia pagar</p>
            <p className="mt-1 flex items-baseline gap-1 text-2xl font-bold text-emerald-500">
              <span className="text-sm font-medium text-emerald-500/80">R$</span>
              {totalPaid && potentialSavings 
                ? (totalPaid - potentialSavings).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                : "---"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Apenas taxa mínima e impostos locais</p>
          </div>
        </div>
      </motion.div>

      {/* Sistema Ideal */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="stat-card overflow-hidden relative"
      >
        {/* Background graphic */}
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
        
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Sun className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-foreground">Sistema Solar Ideal</h3>
        </div>

        <div className="mb-6 rounded-lg bg-accent/50 p-4 border border-accent">
          <p className="text-sm text-foreground/80 leading-relaxed">
            Com base no seu consumo atual, a IA dimensionou o sistema fotovoltaico ideal para zerar sua tarifa de energia.
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-background p-4 border border-border shadow-sm">
            <div className="text-sm text-muted-foreground font-medium mb-1">
              Potência Recomendada
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">
                {recommendedKwp ? recommendedKwp.toFixed(2) : "---"}
              </span>
              <span className="text-sm font-medium text-muted-foreground">kWp</span>
            </div>
          </div>
          
          <div className="rounded-lg bg-background p-4 border border-border shadow-sm">
            <div className="text-sm text-muted-foreground font-medium mb-1">
              Tamanho do Sistema
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">
                {recommendedModules ? recommendedModules : "---"}
              </span>
              <span className="text-sm font-medium text-muted-foreground">módulos</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Placas de alta potência</p>
          </div>
        </div>
      </motion.div>

      {/* Ação / Conversão */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10"
      >
        <div className="p-6 text-center">
          <h3 className="font-bold text-lg text-foreground mb-2">
            Pare de jogar dinheiro fora
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Você poderia economizar cerca de <strong>{potentialSavings ? formatCurrency(potentialSavings) : "---"}</strong> todos os meses. Nosso time técnico preparou uma proposta.
          </p>
          
          <Button 
            className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25" 
            onClick={onReceiveProposal}
            disabled={isLoading}
          >
            {isLoading ? "Processando..." : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Receber Proposta Completa
              </>
            )}
          </Button>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Proposta gratuita e sem compromisso</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
