import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CostPieChartProps {
  availabilityCost: number;
  publicLightingCost: number;
  uncompensatedCost: number;
  icmsCost?: number;
  pisCofins?: number;
}

export function CostPieChart({
  availabilityCost,
  publicLightingCost,
  uncompensatedCost,
  icmsCost = 0,
  pisCofins = 0,
}: CostPieChartProps) {
  const data = [
    { name: "Disponibilidade", value: availabilityCost, color: "hsl(var(--chart-1))" },
    { name: "Iluminação Pública", value: publicLightingCost, color: "hsl(var(--chart-2))" },
    { name: "Consumo não compensado", value: uncompensatedCost, color: "hsl(var(--chart-3))" },
  ].filter(item => item.value > 0);

  // Add taxes if significant
  if (icmsCost > 0) {
    data.push({ name: "ICMS", value: icmsCost, color: "hsl(var(--chart-4))" });
  }
  if (pisCofins > 0) {
    data.push({ name: "PIS/COFINS", value: pisCofins, color: "hsl(var(--chart-5))" });
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return null;
  }

  const formatValue = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = ((item.value / total) * 100).toFixed(1);
      return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="font-medium text-sm">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatValue(item.value)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Composição do Valor Pago
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
