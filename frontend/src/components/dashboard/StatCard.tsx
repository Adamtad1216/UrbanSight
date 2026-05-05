import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  delay?: number;
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-primary",
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="stat-card overflow-hidden rounded-2xl border border-cyan-400/10 bg-slate-950/70 shadow-[0_18px_48px_rgba(2,8,23,0.15)] backdrop-blur-xl"
    >
      <div className="flex items-start justify-between p-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
          {change && (
            <p
              className={`text-xs font-medium ${changeType === "positive" ? "text-success" : changeType === "negative" ? "text-destructive" : "text-muted-foreground"}`}
            >
              {change}
            </p>
          )}
        </div>
        <div
          className={`h-10 w-10 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 flex items-center justify-center ${iconColor}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
