import { motion } from "framer-motion";
import { Brain, AlertTriangle, TrendingUp, Shield } from "lucide-react";
import { leakagePredictions } from "@/data/dummy";
import { StatCard } from "@/components/dashboard/StatCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function LeakagePredictionPage() {
  const highRiskZones = leakagePredictions.filter((z) => z.risk > 70);
  const avgConfidence = Math.round(leakagePredictions.reduce((s, z) => s + z.confidence, 0) / leakagePredictions.length);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Leakage Prediction AI</h1>
        <p className="text-muted-foreground text-sm mt-1">AI-powered leak detection and risk analysis</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="High Risk Zones" value={highRiskZones.length} icon={AlertTriangle} delay={0} />
        <StatCard title="Avg Confidence" value={`${avgConfidence}%`} icon={Brain} delay={0.05} />
        <StatCard title="Total Leaks (YTD)" value="52" change="-12% from last year" changeType="positive" icon={TrendingUp} delay={0.1} />
        <StatCard title="Prevention Rate" value="78%" change="+5% improvement" changeType="positive" icon={Shield} delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-5">
          <h3 className="font-semibold mb-4">Risk by Zone</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={leakagePredictions} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" strokeOpacity={0.5} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(215, 13%, 50%)" />
              <YAxis type="category" dataKey="zone" tick={{ fontSize: 11 }} stroke="hsl(215, 13%, 50%)" width={60} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(214, 20%, 90%)", fontSize: "13px" }} />
              <Bar dataKey="risk" fill="hsl(0, 72%, 51%)" radius={[0, 6, 6, 0]} name="Risk %" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Radar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card rounded-xl p-5">
          <h3 className="font-semibold mb-4">Zone Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={leakagePredictions}>
              <PolarGrid stroke="hsl(214, 20%, 90%)" />
              <PolarAngleAxis dataKey="zone" tick={{ fontSize: 10 }} stroke="hsl(215, 13%, 50%)" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(215, 13%, 50%)" />
              <Radar name="Risk" dataKey="risk" stroke="hsl(0, 72%, 51%)" fill="hsl(0, 72%, 51%)" fillOpacity={0.2} />
              <Radar name="Confidence" dataKey="confidence" stroke="hsl(199, 89%, 48%)" fill="hsl(199, 89%, 48%)" fillOpacity={0.2} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Zone detail cards */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-xl p-5">
        <h3 className="font-semibold mb-4">Zone Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {leakagePredictions.map((z) => (
            <div key={z.zone} className="border border-border/50 rounded-xl p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm">{z.zone}</span>
                <Badge variant={z.risk > 70 ? "destructive" : z.risk > 40 ? "outline" : "secondary"} className="text-xs">
                  {z.risk > 70 ? "High Risk" : z.risk > 40 ? "Medium" : "Low"}
                </Badge>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Risk Level</span><span className="font-medium">{z.risk}%</span></div>
                  <Progress value={z.risk} className="h-1.5" />
                </div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Confidence</span><span className="font-medium">{z.confidence}%</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Historical Leaks</span><span className="font-medium">{z.historicalLeaks}</span></div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
