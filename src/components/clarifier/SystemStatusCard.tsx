import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

type SystemStatus = "adequate" | "slightly_below" | "below_needed";

interface SystemStatusCardProps {
  expectedGeneration: number;
  actualGeneration: number;
  status: SystemStatus;
}

export function SystemStatusCard({
  expectedGeneration,
  actualGeneration,
  status,
}: SystemStatusCardProps) {
  const gap = expectedGeneration - actualGeneration;
  const hasGap = gap > 0;

  const statusConfig = {
    adequate: {
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      label: "Sistema adequado",
      emoji: "🟢",
    },
    slightly_below: {
      icon: AlertTriangle,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      label: "Sistema ligeiramente abaixo",
      emoji: "🟡",
    },
    below_needed: {
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      label: "Sistema abaixo do necessário",
      emoji: "🔴",
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <Card className={`${config.borderColor} ${config.bgColor}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            🔍 Análise do Seu Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Generation comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Deveria gerar</p>
              <p className="text-xl font-semibold text-foreground">
                {expectedGeneration.toLocaleString("pt-BR")} kWh
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gerou</p>
              <p className="text-xl font-semibold text-foreground">
                {actualGeneration.toLocaleString("pt-BR")} kWh
              </p>
            </div>
          </div>

          {/* Gap indicator */}
          {hasGap && (
            <div className={`rounded-lg p-3 ${config.bgColor} border ${config.borderColor}`}>
              <p className={`text-sm ${config.color} flex items-center gap-2`}>
                {config.emoji} Faltaram{" "}
                <span className="font-semibold">
                  {gap.toLocaleString("pt-BR")} kWh
                </span>
              </p>
            </div>
          )}

          {/* Status badge */}
          <div className="flex items-center gap-2 pt-2">
            <StatusIcon className={`h-5 w-5 ${config.color}`} />
            <span className={`font-medium ${config.color}`}>
              Status: {config.label}
            </span>
          </div>

          {/* Tips based on status */}
          {status === "below_needed" && (
            <p className="text-xs text-muted-foreground">
              💡 Considere verificar se há sujeira nos painéis ou problemas no inversor.
            </p>
          )}
          {status === "slightly_below" && (
            <p className="text-xs text-muted-foreground">
              💡 Pequena variação pode ser por clima. Continue monitorando.
            </p>
          )}
          {status === "adequate" && (
            <p className="text-xs text-muted-foreground">
              ✅ Seu sistema está funcionando dentro do esperado!
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
