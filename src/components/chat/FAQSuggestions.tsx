import { Button } from "@/components/ui/button";
import { HelpCircle, Zap, Battery, TrendingDown, AlertCircle, Settings } from "lucide-react";

interface FAQSuggestionsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

const suggestions = [
  {
    icon: HelpCircle,
    question: "Por que minha conta não zerou?",
    short: "Conta não zerou",
  },
  {
    icon: Zap,
    question: "O que é custo de disponibilidade?",
    short: "Disponibilidade",
  },
  {
    icon: Battery,
    question: "Como funcionam os créditos de energia?",
    short: "Créditos",
  },
  {
    icon: AlertCircle,
    question: "O que significa a bandeira tarifária?",
    short: "Bandeira",
  },
  {
    icon: Settings,
    question: "Meu sistema está funcionando bem?",
    short: "Sistema OK?",
  },
  {
    icon: TrendingDown,
    question: "Como posso economizar mais?",
    short: "Economizar",
  },
];

export function FAQSuggestions({ onSelect, disabled }: FAQSuggestionsProps) {
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3">
      {suggestions.map(({ icon: Icon, question, short }) => (
        <Button
          key={question}
          variant="outline"
          size="sm"
          onClick={() => onSelect(question)}
          disabled={disabled}
          className="h-8 text-xs gap-1.5 rounded-full bg-muted/50 hover:bg-muted"
        >
          <Icon className="h-3.5 w-3.5" />
          {short}
        </Button>
      ))}
    </div>
  );
}
