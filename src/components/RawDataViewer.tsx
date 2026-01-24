import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Code, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RawDataViewerProps {
  data: Record<string, unknown>;
  title?: string;
}

export function RawDataViewer({ data, title = "Dados Brutos Extraídos" }: RawDataViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Formatar valores para exibição
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "number") {
      return value.toLocaleString("pt-BR", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : "—";
    }
    return String(value);
  };

  // Agrupar campos por categoria
  const categories = {
    "Identificação": ["account_holder", "account_number", "cpf_cnpj", "distributor", "consumer_class", "subclass", "tariff_modality"],
    "Período": ["reference_month", "reference_year", "reading_date_current", "reading_date_previous", "due_date", "billing_days"],
    "Medição": ["meter_number", "meter_reading_previous", "meter_reading_current", "measured_consumption_kwh"],
    "Energia Solar": ["injected_energy_kwh", "compensated_energy_kwh", "previous_credits_kwh", "current_credits_kwh", "credit_expiry_date"],
    "Tarifas": ["tariff_te_kwh", "tariff_tusd_kwh", "tariff_flag", "tariff_flag_value_kwh"],
    "Custos": ["energy_cost", "energy_cost_te", "energy_cost_tusd", "availability_cost", "public_lighting_cost"],
    "Impostos": ["icms_cost", "icms_rate", "pis_cost", "pis_rate", "cofins_cost", "cofins_rate"],
    "Outros": ["sectoral_charges", "fines_amount", "interest_amount", "other_charges", "other_credits"],
    "Totais": ["subtotal_before_taxes", "credit_discount", "total_amount"],
  };

  const fieldLabels: Record<string, string> = {
    account_holder: "Titular",
    account_number: "Nº da Conta",
    cpf_cnpj: "CPF/CNPJ",
    distributor: "Distribuidora",
    consumer_class: "Classe",
    subclass: "Subgrupo",
    tariff_modality: "Modalidade",
    reference_month: "Mês Ref.",
    reference_year: "Ano Ref.",
    reading_date_current: "Leitura Atual",
    reading_date_previous: "Leitura Anterior",
    due_date: "Vencimento",
    billing_days: "Dias Faturados",
    meter_number: "Nº Medidor",
    meter_reading_previous: "Leitura Ant. (kWh)",
    meter_reading_current: "Leitura Atual (kWh)",
    measured_consumption_kwh: "Consumo Medido (kWh)",
    injected_energy_kwh: "Energia Injetada (kWh)",
    compensated_energy_kwh: "Energia Compensada (kWh)",
    previous_credits_kwh: "Créditos Anteriores (kWh)",
    current_credits_kwh: "Créditos Atuais (kWh)",
    credit_expiry_date: "Expiração Créditos",
    tariff_te_kwh: "Tarifa TE (R$/kWh)",
    tariff_tusd_kwh: "Tarifa TUSD (R$/kWh)",
    tariff_flag: "Bandeira",
    tariff_flag_value_kwh: "Adicional Bandeira (R$/kWh)",
    energy_cost: "Custo Energia (R$)",
    energy_cost_te: "Custo TE (R$)",
    energy_cost_tusd: "Custo TUSD (R$)",
    availability_cost: "Disponibilidade (R$)",
    public_lighting_cost: "Ilum. Pública (R$)",
    icms_cost: "ICMS (R$)",
    icms_rate: "Alíquota ICMS (%)",
    pis_cost: "PIS (R$)",
    pis_rate: "Alíquota PIS (%)",
    cofins_cost: "COFINS (R$)",
    cofins_rate: "Alíquota COFINS (%)",
    sectoral_charges: "Encargos Setoriais (R$)",
    fines_amount: "Multas (R$)",
    interest_amount: "Juros (R$)",
    other_charges: "Outras Cobranças (R$)",
    other_credits: "Outros Créditos (R$)",
    subtotal_before_taxes: "Subtotal (R$)",
    credit_discount: "Desconto Créditos (R$)",
    total_amount: "Total (R$)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
            <Code className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-left">
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">
              {Object.keys(data).filter(k => data[k] !== null && data[k] !== undefined).length} campos extraídos
            </p>
          </div>
        </div>
        
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border">
              {/* Copy Button */}
              <div className="flex justify-end pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar JSON
                    </>
                  )}
                </Button>
              </div>

              {/* Categorized Data */}
              {Object.entries(categories).map(([category, fields]) => {
                const relevantFields = fields.filter(f => 
                  data[f] !== null && data[f] !== undefined
                );
                
                if (relevantFields.length === 0) return null;

                return (
                  <div key={category}>
                    <p className="text-xs font-medium text-primary mb-2">{category}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {relevantFields.map((field) => (
                        <div
                          key={field}
                          className="p-2 bg-muted/30 rounded-lg"
                        >
                          <p className="text-xs text-muted-foreground truncate">
                            {fieldLabels[field] || field}
                          </p>
                          <p className="text-sm font-medium text-foreground truncate">
                            {formatValue(data[field])}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Raw JSON (hidden by default) */}
              <details className="mt-4">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Ver JSON completo
                </summary>
                <pre className="mt-2 p-3 bg-muted/50 rounded-lg text-xs overflow-x-auto max-h-60">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </details>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
