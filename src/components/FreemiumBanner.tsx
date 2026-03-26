import { ArrowRight, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface FreemiumBannerProps {
  onSignUp: () => void;
  isLoading?: boolean;
}

export function FreemiumBanner({ onSignUp, isLoading = false }: FreemiumBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-8 overflow-hidden rounded-xl border border-border bg-card/50 shadow-sm"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">
              Acompanhe sua economia todo mês
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Crie uma conta gratuita agora no Solo Energia e guarde o histórico completo das suas faturas, além de receber alertas sobre bandeiras tarifárias.
            </p>
          </div>
        </div>
        
        <div className="shrink-0 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="w-full md:w-auto h-11 border-primary/20 hover:bg-primary/5 hover:text-primary"
            onClick={onSignUp}
            disabled={isLoading}
          >
            {isLoading ? "Aguarde..." : (
              <>
                Criar Conta Grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
