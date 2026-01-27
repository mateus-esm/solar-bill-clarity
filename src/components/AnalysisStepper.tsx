import { motion } from "framer-motion";
import { Check, Loader2, AlertCircle } from "lucide-react";

export type AnalysisStep = "idle" | "uploading" | "extracting" | "calculating" | "completed" | "error";

interface StepConfig {
  key: AnalysisStep;
  label: string;
}

const steps: StepConfig[] = [
  { key: "uploading", label: "Enviando" },
  { key: "extracting", label: "Lendo conta" },
  { key: "calculating", label: "Calculando" },
  { key: "completed", label: "Pronto!" },
];

function getStepIndex(status: AnalysisStep): number {
  const idx = steps.findIndex((s) => s.key === status);
  return idx === -1 ? -1 : idx;
}

interface AnalysisStepperProps {
  currentStep: AnalysisStep;
  errorMessage?: string;
}

export function AnalysisStepper({ currentStep, errorMessage }: AnalysisStepperProps) {
  const currentIndex = getStepIndex(currentStep);
  const isError = currentStep === "error";

  if (currentStep === "idle") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-4"
    >
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isActive = idx === currentIndex;
          const isDone = idx < currentIndex || currentStep === "completed";
          const isFuture = idx > currentIndex;
          const isErrorStep = isError && idx === currentIndex;

          return (
            <div key={step.key} className="flex flex-1 items-center">
              {/* Circle */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    isErrorStep
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : isDone
                      ? "border-primary bg-primary text-primary-foreground"
                      : isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {isErrorStep ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : isDone ? (
                    <Check className="h-4 w-4" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-xs font-semibold">{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isErrorStep 
                      ? "text-destructive" 
                      : isActive 
                      ? "text-foreground" 
                      : isFuture 
                      ? "text-muted-foreground" 
                      : "text-primary"
                  }`}
                >
                  {isErrorStep ? "Erro" : step.label}
                </span>
              </div>

              {/* Line */}
              {idx < steps.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    isDone ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {isError && errorMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
        >
          <p className="text-sm text-destructive text-center">
            {errorMessage}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
