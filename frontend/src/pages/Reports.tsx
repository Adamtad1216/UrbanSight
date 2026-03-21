import { motion } from "framer-motion";
import { Download, TrendingUp, BarChart3, Users, Building2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { monthlyData, branchData } from "@/data/dummy";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Comprehensive performance insights</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Export Report</Button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Service Performance" value="91%" icon={TrendingUp} delay={0} change="+3.2% this month" changeType="positive" />
        <StatCard title="Avg Resolution Time" value="2.4 days" icon={BarChart3} delay={0.05} change="-0.8 days" changeType="positive" />
        <StatCard title="Technician Utilization" value="87%" icon={Users} delay={0.1} />
        <StatCard title="Branch Efficiency" value="85%" icon={Building2} delay={0.15} />
      </div>

      <Tabs defaultValue="service" className="w-full">
        <TabsList className="bg-muted/50 border border-border/50">
          <TabsTrigger value="service">Service Performance</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
        </TabsList>

        <TabsContent value="service">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5 mt-4">
            <h3 className="font-semibold mb-4">Monthly Service Performance</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 13%, 50%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 13%, 50%)" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(214, 20%, 90%)", fontSize: "13px" }} />
                <Legend />
                <Line type="monotone" dataKey="requests" stroke="hsl(199, 89%, 48%)" strokeWidth={2} dot={{ r: 4 }} name="Requests" />
                <Line type="monotone" dataKey="completed" stroke="hsl(172, 66%, 50%)" strokeWidth={2} dot={{ r: 4 }} name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </TabsContent>

        <TabsContent value="revenue">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5 mt-4">
            <h3 className="font-semibold mb-4">Revenue Overview</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 13%, 50%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 13%, 50%)" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(214, 20%, 90%)", fontSize: "13px" }} />
                <Bar dataKey="revenue" fill="hsl(152, 69%, 40%)" radius={[6, 6, 0, 0]} name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </TabsContent>

        <TabsContent value="branches">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5 mt-4">
            <h3 className="font-semibold mb-4">Branch Comparison</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={branchData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" strokeOpacity={0.5} />
                <XAxis dataKey="branch" tick={{ fontSize: 11 }} stroke="hsl(215, 13%, 50%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 13%, 50%)" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(214, 20%, 90%)", fontSize: "13px" }} />
                <Legend />
                <Bar dataKey="requests" fill="hsl(199, 89%, 48%)" radius={[6, 6, 0, 0]} name="Requests" />
                <Bar dataKey="completed" fill="hsl(172, 66%, 50%)" radius={[6, 6, 0, 0]} name="Completed" />
                <Bar dataKey="satisfaction" fill="hsl(262, 83%, 58%)" radius={[6, 6, 0, 0]} name="Satisfaction" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
