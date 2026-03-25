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

const SEGMENTS = [
  { key: "availability",    label: "Disponibilidade",        color: "#f97316" },
  { key: "cip",             label: "Ilum. Pública (CIP)",    color: "#f59e0b" },
  { key: "uncompensated",   label: "Consumo não compensado", color: "#3b82f6" },
  { key: "icms",            label: "ICMS",                   color: "#8b5cf6" },
  { key: "piscofins",       label: "PIS/COFINS",             color: "#06b6d4" },
  { key: "extras",          label: "Serviços/Parcelas",      color: "#ec4899" },
];

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const CustomTooltip = ({ active, payload, total }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-sm">
      <p className="font-semibold text-foreground">{item.name}</p>
      <p className="text-muted-foreground">{fmt(item.value)} · {pct}%</p>
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
      className="rounded-2xl border border-border bg-card p-5 space-y-4"
    >
      <p className="text-sm font-semibold text-foreground">Para onde foi o dinheiro?</p>

      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={items}
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={66}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                animationBegin={200}
                animationDuration={900}
              >
                {items.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip total={chartTotal} />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-muted-foreground leading-none">Total</span>
            <span className="text-base font-bold text-foreground leading-tight mt-0.5">
              {fmt(totalPaid)}
            </span>
          </div>
        </div>

        {/* Receipt-style legend */}
        <div className="flex-1 space-y-2 min-w-0">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground truncate flex-1">{item.name}</span>
              <span className="text-xs font-medium text-foreground whitespace-nowrap">
                {item.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bar breakdown */}
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{item.name}</span>
              <span className="font-medium text-foreground">{fmt(item.value)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: item.color }}
                initial={{ width: 0 }}
                animate={{ width: `${item.pct}%` }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.05, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
