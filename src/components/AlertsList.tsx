import { motion } from "framer-motion";
import { AlertTriangle, AlertCircle, Info, CheckCircle, ChevronRight } from "lucide-react";

interface Alert {
  type: "error" | "warning" | "info" | "success";
  icon?: string;
  title: string;
  description: string;
  action?: string;
}

interface AlertsListProps {
  alerts: Alert[];
  title?: string;
}

export function AlertsList({ alerts, title = "Alertas e Observações" }: AlertsListProps) {
  if (alerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl"
      >
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-medium text-green-600">Tudo certo!</p>
            <p className="text-sm text-green-600/80">
              Não encontramos problemas na sua conta de energia.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const getAlertStyles = (type: Alert["type"]) => {
    switch (type) {
      case "error":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/20",
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          titleColor: "text-red-600",
          descColor: "text-red-600/80",
        };
      case "warning":
        return {
          bg: "bg-orange-500/10",
          border: "border-orange-500/20",
          icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
          titleColor: "text-orange-600",
          descColor: "text-orange-600/80",
        };
      case "success":
        return {
          bg: "bg-green-500/10",
          border: "border-green-500/20",
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          titleColor: "text-green-600",
          descColor: "text-green-600/80",
        };
      default:
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          icon: <Info className="h-5 w-5 text-blue-500" />,
          titleColor: "text-blue-600",
          descColor: "text-blue-600/80",
        };
    }
  };

  // Sort alerts by type priority: error > warning > info > success
  const sortedAlerts = [...alerts].sort((a, b) => {
    const priority = { error: 0, warning: 1, info: 2, success: 3 };
    return priority[a.type] - priority[b.type];
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {alerts.length} {alerts.length === 1 ? "item" : "itens"} para sua atenção
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {sortedAlerts.map((alert, index) => {
          const styles = getAlertStyles(alert.type);
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 ${styles.bg} border ${styles.border} rounded-xl`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {alert.icon ? (
                    <span className="text-xl">{alert.icon}</span>
                  ) : (
                    styles.icon
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${styles.titleColor}`}>
                    {alert.title}
                  </p>
                  <p className={`text-sm mt-1 ${styles.descColor}`}>
                    {alert.description}
                  </p>
                  {alert.action && (
                    <button className={`text-sm font-medium mt-2 flex items-center gap-1 ${styles.titleColor} hover:underline`}>
                      {alert.action}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
