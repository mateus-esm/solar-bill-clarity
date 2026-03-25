import { motion } from "framer-motion";

interface BillSummaryCardProps {
  totalPaid: number;
  minimumPossible: number;
  connectionType?: string | null;
  extraChargesTotal?: number;
}

const connectionLabel: Record<string, string> = {
  monofasico: "Monofásico",
  bifasico:   "Bifásico",
  trifasico:  "Trifásico",
};

const connectionMinKwh: Record<string, number> = {
  monofasico: 30,
  bifasico:   50,
  trifasico:  100,
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function BillSummaryCard({
  totalPaid,
  minimumPossible,
  connectionType,
  extraChargesTotal = 0,
}: BillSummaryCardProps) {
  const difference = totalPaid - minimumPossible;
  const paidMoreThanMinimum = difference > 1;
  const minKwh = connectionType ? connectionMinKwh[connectionType] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="border border-border bg-card p-5 space-y-4"
      style={{ borderRadius: "var(--radius)" }}
    >
      {/* Label */}
      <p className="solo-label">Resumo da conta</p>

      {/* Two key numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-muted/40 border border-border" style={{ borderRadius: "var(--radius)" }}>
          <p className="text-xs text-muted-foreground mb-1">Você pagou</p>
          <p className="text-2xl font-bold text-foreground tabular-nums leading-none">{fmt(totalPaid)}</p>
        </div>
        <div
          className="p-4 border"
          style={{
            borderRadius: "var(--radius)",
            background: "linear-gradient(135deg, rgb(255 72 30 / 0.08) 0%, rgb(255 194 0 / 0.05) 100%)",
            borderColor: "rgb(255 72 30 / 0.25)",
          }}
        >
          <p className="text-xs text-muted-foreground mb-1">
            Mínimo obrigatório
            {connectionType && connectionLabel[connectionType] && (
              <span className="ml-1 text-primary/80">· {connectionLabel[connectionType]}</span>
            )}
          </p>
          <p className="text-2xl font-bold text-primary tabular-nums leading-none">{fmt(minimumPossible)}</p>
          {minKwh && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Base {minKwh} kWh + CIP
              {extraChargesTotal > 0 && " + serviços"}
            </p>
          )}
        </div>
      </div>

      {/* Difference callout */}
      {paidMoreThanMinimum ? (
        <div
          className="flex items-center gap-3 p-3 border"
          style={{
            borderRadius: "var(--radius)",
            background: "rgb(245 158 11 / 0.06)",
            borderColor: "rgb(245 158 11 / 0.2)",
          }}
        >
          <span className="text-base shrink-0">⚡</span>
          <p className="text-sm text-foreground">
            Você pagou{" "}
            <span className="font-semibold text-amber-400 tabular-nums">{fmt(difference)}</span>{" "}
            além do mínimo obrigatório
          </p>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 p-3 border border-emerald-500/20"
          style={{ borderRadius: "var(--radius)", background: "rgb(34 197 94 / 0.06)" }}
        >
          <span className="text-base shrink-0">✅</span>
          <p className="text-sm text-foreground">
            Você está pagando próximo ao mínimo possível!
          </p>
        </div>
      )}
    </motion.div>
  );
}
