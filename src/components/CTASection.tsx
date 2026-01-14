import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MessageCircle, Settings, ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="space-y-4"
    >
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">
          Quer otimizar ainda mais?
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Nossos especialistas podem ajudar você
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="gradient" size="lg" className="w-full gap-2">
          <MessageCircle className="h-5 w-5" />
          Falar com Especialista
          <ArrowRight className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="lg" className="w-full gap-2">
          <Settings className="h-5 w-5" />
          Simular Ampliação
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Atendimento rápido via WhatsApp
      </p>
    </motion.div>
  );
}
