import { motion } from "framer-motion";
import { Info, TrendingDown } from "lucide-react";

interface EducationalBlockProps {
  economia: number;
}

export function EducationalBlock({ economia }: EducationalBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="stat-card relative overflow-hidden"
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5" />
      <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-secondary/5" />
      
      <div className="relative">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Entenda sua conta</h3>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Mesmo com energia solar, você continua pagando taxas obrigatórias da distribuidora, 
          como a contribuição de iluminação pública (CIP) e o custo de disponibilidade. 
          Esses valores são cobrados de todos os consumidores conectados à rede.
        </p>

        <div className="mt-4 rounded-lg bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              Sua economia neste mês
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            R$ {economia.toFixed(2)}
          </p>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Os valores apresentados são uma análise estimada baseada na fatura enviada. 
          Pequenas variações podem ocorrer conforme regras da distribuidora.
        </p>
      </div>
    </motion.div>
  );
}
