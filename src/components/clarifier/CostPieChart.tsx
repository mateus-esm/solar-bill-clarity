import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";

interface CostPieChartProps {
  availabilityCost: number;
  publicLightingCost: number;
  uncompensatedCost: number;
  icmsCost?: number;
  pisCofins?: number;
  extraChargesTotal?: number;
  totalPaid: number;
}

/* Solo brand palette — sequential from primary to warm neutrals */
const SEGMENTS = [
  { key: "availability",  label: "Disponibilidade",        color: "#FF481E" }, /* primary */
  { key: "cip",           label: "Ilum. Pública (CIP)",    color: "#FF7A45" }, /* lighter primary */
  { key: "uncompensated", label: "Consumo não compensado", color: "#FFC200" }, /* solar yellow */
  { key: "icms",          label: "ICMS",                   color: "#9E2A19" }, /* crimson */
  { key: "piscofins",     label: "PIS/COFINS",             color: "#C44020" }, /* mid */
  { key: "extras",        label: "Serviços/Parcelas",      color: "#E36040" }, /* warm */
];

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CustomTooltip = ({ active, payload, total }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
  return (
    <div
      className="bg-[#1A1A1A] border border-border px-3 py-2 shadow-xl text-sm"
      style={{ borderRadius: "var(--radius)" }}
    >
      <p className="font-semibold text-foreground">{item.name}</p>
      <p className="text-muted-foreground tabular-nums">{fmt(item.value)} · {pct}%</p>
    </div>
  );
};

export function CostPieChart({
  availabilityCost,
  publicLightingCost,
  uncompensatedCost,
  icmsCost = 0,
  pisCofins = 0,
  extraChargesTotal = 0,
  totalPaid,
}: CostPieChartProps) {
  const raw = [
    { ...SEGMENTS[0], value: availabilityCost },
    { ...SEGMENTS[1], value: publicLightingCost },
    { ...SEGMENTS[2], value: uncompensatedCost },
    { ...SEGMENTS[3], value: icmsCost },
    { ...SEGMENTS[4], value: pisCofins },
    { ...SEGMENTS[5], value: extraChargesTotal },
  ].filter((d) => d.value > 0.01);

  const chartTotal = raw.reduce((s, d) => s + d.value, 0);
  if (chartTotal === 0) return null;

  const items = raw.map((d) => ({
    name: d.label,
    value: d.value,
    color: d.color,
    pct: ((d.value / chartTotal) * 100).toFixed(1),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="border border-border bg-card p-5 space-y-4"
      style={{ borderRadius: "var(--radius)" }}
    >
      <p className="solo-label">Composição do gasto</p>

      <div className="flex items-center gap-5">
        {/* Donut */}
        <div className="relative shrink-0" style={{ width: 130, height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={items}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={62}
                paddingAngle={1.5}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                animationBegin={200}
                animationDuration={900}
                strokeWidth={0}
              >
                {items.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip total={chartTotal} />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center — total */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-muted-foreground leading-none">Total</span>
            <span className="text-sm font-bold text-foreground leading-tight mt-0.5 tabular-nums">
              {fmt(totalPaid)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 min-w-0">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-2 h-2 shrink-0"
                style={{ backgroundColor: item.color, borderRadius: "1px" }}
              />
              <span className="text-xs text-muted-foreground truncate flex-1">{item.name}</span>
              <span className="text-xs font-semibold text-foreground tabular-nums whitespace-nowrap">
                {item.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Horizontal bar breakdown */}
      <div className="space-y-2 pt-1 border-t border-border">
        {items.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{item.name}</span>
              <span className="font-medium text-foreground tabular-nums">{fmt(item.value)}</span>
            </div>
            <div className="h-1 overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
              <motion.div
                className="h-full"
                style={{ backgroundColor: item.color }}
                initial={{ width: 0 }}
                animate={{ width: `${item.pct}%` }}
                transition={{ duration: 0.7, delay: 0.2 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
