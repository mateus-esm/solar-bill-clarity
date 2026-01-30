import { HelpCircle, AlertTriangle, Battery, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FAQItem {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  question: string;
  condition: boolean;
  variant: "info" | "warning" | "success";
}

interface ContextualFAQProps {
  totalPaid: number;
  minimumPossible: number;
  tariffFlag?: string | null;
  creditsBalance: number;
  generationEfficiency?: number;
  onQuestionClick: (question: string) => void;
}

export function ContextualFAQ({
  totalPaid,
  minimumPossible,
  tariffFlag,
  creditsBalance,
  generationEfficiency,
  onQuestionClick,
}: ContextualFAQProps) {
  const faqItems: FAQItem[] = [
    {
      id: "minimum",
      icon: HelpCircle,
      title: "Por que não paguei só o mínimo?",
      description: `Você pagou R$ ${totalPaid.toFixed(2)}, mas o mínimo seria R$ ${minimumPossible.toFixed(2)}. Saiba por quê.`,
      question: "Por que minha conta não zerou? Qual a diferença entre o que paguei e o valor mínimo?",
      condition: totalPaid > minimumPossible + 5, // At least R$5 difference
      variant: "info",
    },
    {
      id: "flag",
      icon: AlertTriangle,
      title: "Bandeira tarifária ativa",
      description: `Sua conta está com bandeira ${tariffFlag}. Isso impacta no valor final.`,
      question: `O que significa bandeira tarifária ${tariffFlag} e quanto ela está custando na minha conta?`,
      condition: !!tariffFlag && tariffFlag.toLowerCase().includes("vermelha"),
      variant: "warning",
    },
    {
      id: "credits",
      icon: Battery,
      title: "Você tem créditos acumulados",
      description: `Seu saldo é de ${creditsBalance.toFixed(0)} kWh. Entenda como usar.`,
      question: "O que são os créditos de energia e como posso usá-los melhor?",
      condition: creditsBalance > 100,
      variant: "success",
    },
    {
      id: "efficiency",
      icon: TrendingDown,
      title: "Geração abaixo do esperado",
      description: `Seu sistema está gerando ${generationEfficiency?.toFixed(0)}% do esperado. Veja possíveis causas.`,
      question: "Por que minha geração solar está abaixo do esperado? O que pode estar acontecendo?",
      condition: (generationEfficiency || 100) < 80,
      variant: "warning",
    },
  ];

  const visibleItems = faqItems.filter((item) => item.condition);

  if (visibleItems.length === 0) {
    return null;
  }

  const variantStyles = {
    info: "border-blue-500/20 bg-blue-500/5",
    warning: "border-amber-500/20 bg-amber-500/5",
    success: "border-green-500/20 bg-green-500/5",
  };

  const iconStyles = {
    info: "text-blue-500",
    warning: "text-amber-500",
    success: "text-green-500",
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground px-1">
        Entenda sua conta
      </h3>
      <div className="space-y-2">
        {visibleItems.map((item) => (
          <Card
            key={item.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              variantStyles[item.variant]
            )}
            onClick={() => onQuestionClick(item.question)}
          >
            <CardContent className="p-3 flex items-start gap-3">
              <item.icon
                className={cn("h-5 w-5 flex-shrink-0 mt-0.5", iconStyles[item.variant])}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {item.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
