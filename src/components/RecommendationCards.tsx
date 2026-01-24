import { motion } from "framer-motion";
import { Lightbulb, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Recommendation {
  priority: "alta" | "media" | "baixa";
  title: string;
  description: string;
  estimated_savings?: string;
}

interface RecommendationCardsProps {
  recommendations: Recommendation[];
}

export function RecommendationCards({ recommendations }: RecommendationCardsProps) {
  if (recommendations.length === 0) {
    return null;
  }

  const getPriorityStyles = (priority: Recommendation["priority"]) => {
    switch (priority) {
      case "alta":
        return {
          badge: "bg-red-500/10 text-red-500 border-red-500/20",
          label: "Alta prioridade",
        };
      case "media":
        return {
          badge: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
          label: "Média prioridade",
        };
      default:
        return {
          badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
          label: "Sugestão",
        };
    }
  };

  // Sort by priority
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priority = { alta: 0, media: 1, baixa: 2 };
    return priority[a.priority] - priority[b.priority];
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Recomendações</h3>
          <p className="text-xs text-muted-foreground">
            Ações sugeridas para otimizar sua conta
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {sortedRecommendations.map((rec, index) => {
          const styles = getPriorityStyles(rec.priority);
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles.badge}`}>
                      {styles.label}
                    </span>
                    {rec.estimated_savings && (
                      <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-600 rounded-full flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {rec.estimated_savings}
                      </span>
                    )}
                  </div>
                  
                  <h4 className="font-medium text-foreground mb-1">
                    {rec.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {rec.description}
                  </p>
                </div>

                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
