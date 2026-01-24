import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, AlertCircle, CheckCircle } from "lucide-react";

interface TaxItem {
  id: string;
  name: string;
  value: number;
  rate?: number;
  whatIs: string;
  yourValue: string;
  tip?: string;
  status?: "normal" | "high" | "low";
}

interface TaxExplainerProps {
  taxes: TaxItem[];
}

export function TaxExplainer({ taxes }: TaxExplainerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "high":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "low":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "high":
        return (
          <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded-full">
            Acima do normal
          </span>
        );
      case "low":
        return (
          <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full">
            Dentro do esperado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <HelpCircle className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Entenda Cada Cobrança</h3>
          <p className="text-xs text-muted-foreground">Clique para ver a explicação</p>
        </div>
      </div>

      <div className="space-y-2">
        {taxes.map((tax) => (
          <div
            key={tax.id}
            className="bg-card rounded-xl border border-border overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(expandedId === tax.id ? null : tax.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(tax.status)}
                <div className="text-left">
                  <p className="font-medium text-foreground">{tax.name}</p>
                  {tax.rate !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      Alíquota: {tax.rate}%
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {getStatusBadge(tax.status)}
                <p className="font-semibold text-foreground">
                  R$ {tax.value.toFixed(2)}
                </p>
                <motion.div
                  animate={{ rotate: expandedId === tax.id ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </div>
            </button>

            <AnimatePresence>
              {expandedId === tax.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border">
                    <div className="pt-3">
                      <p className="text-sm font-medium text-primary mb-1">O que é?</p>
                      <p className="text-sm text-muted-foreground">{tax.whatIs}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-primary mb-1">Na sua conta</p>
                      <p className="text-sm text-muted-foreground">{tax.yourValue}</p>
                    </div>
                    
                    {tax.tip && (
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <p className="text-sm text-primary">
                          💡 <span className="font-medium">Dica:</span> {tax.tip}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
