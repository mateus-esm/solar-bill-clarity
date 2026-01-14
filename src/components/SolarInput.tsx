import { Sun } from "lucide-react";
import { motion } from "framer-motion";

interface SolarInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SolarInput({ value, onChange }: SolarInputProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="stat-card"
    >
      <label className="block">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-secondary/20 p-2">
            <Sun className="h-5 w-5 text-secondary" />
          </div>
          <span className="font-medium text-foreground">
            Geração Solar no Período
          </span>
        </div>
        <div className="relative">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ex: 450"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-lg font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
            kWh
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Retire este valor do app do seu inversor
        </p>
      </label>
    </motion.div>
  );
}
