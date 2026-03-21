import { motion } from "framer-motion";
import { MapPin, AlertTriangle } from "lucide-react";
import { serviceRequests, leakagePredictions } from "@/data/dummy";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useEffect, useState } from "react";
import { NewConnectionRequest } from "@/types/request";
import { apiRequest } from "@/lib/api";

const requestMarkerPositions = [
  "top-[20%] left-[15%]",
  "top-[35%] left-[31%]",
  "top-[50%] left-[47%]",
  "top-[65%] left-[63%]",
  "top-[80%] left-[79%]",
];

const riskMarkerPositions = [
  "top-[30%] left-[50%]",
  "top-[50%] left-[62%]",
  "top-[70%] left-[74%]",
];

export default function MapPage() {
  const [requests, setRequests] = useState<NewConnectionRequest[]>([]);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const response = await apiRequest<{ requests: NewConnectionRequest[] }>(
          "/requests",
        );
        setRequests(response.requests);
      } catch {
        setRequests([]);
      }
    };

    loadRequests();
  }, []);

  const activeRequests = requests.filter(
    (request) =>
      request.status !== "completed" && request.status !== "rejected",
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Map Monitoring</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time field operations map
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 glass-card rounded-xl overflow-hidden"
        >
          <div className="h-[500px] bg-muted/50 flex items-center justify-center relative">
            <div className="text-center space-y-3">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="text-lg font-semibold">Interactive Map</p>
                <p className="text-sm text-muted-foreground">
                  Connect Google Maps API to enable live map
                </p>
              </div>
            </div>
            {/* Simulated markers */}
            {(activeRequests.length > 0
              ? activeRequests.slice(0, 5).map((request) => ({
                  id: request._id,
                  status: request.status,
                }))
              : serviceRequests.slice(0, 5)
            ).map((r, i) => (
              <div key={r.id} className={`absolute ${requestMarkerPositions[i] || requestMarkerPositions[0]}`}>
                <div
                  className={`h-4 w-4 rounded-full border-2 border-card shadow-md ${
                    r.status === "submitted"
                      ? "bg-warning"
                      : r.status === "inspection"
                        ? "bg-primary"
                        : r.status === "completed"
                          ? "bg-success"
                          : "bg-muted-foreground"
                  }`}
                />
              </div>
            ))}
            {leakagePredictions
              .filter((l) => l.risk > 70)
              .map((l, i) => (
                <div key={l.zone} className={`absolute ${riskMarkerPositions[i] || riskMarkerPositions[0]}`}>
                  <div className="h-8 w-8 rounded-full bg-destructive/20 border border-destructive/40 flex items-center justify-center animate-pulse">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                </div>
              ))}
          </div>
        </motion.div>

        {/* Sidebar legend & list */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Legend</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-warning" /> Pending
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" /> In Progress
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" /> Completed
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive/60 animate-pulse" />{" "}
                Leak Risk
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Active Requests</h3>
            <div className="space-y-3">
              {(activeRequests.length > 0
                ? activeRequests.slice(0, 4).map((request) => ({
                    id: request._id,
                    status: request.status,
                    type: request.serviceType,
                    location: request.readingZone,
                  }))
                : serviceRequests
                    .filter(
                      (r) =>
                        r.status !== "completed" && r.status !== "rejected",
                    )
                    .slice(0, 4)
              ).map((r) => (
                <div
                  key={r.id}
                  className="text-xs space-y-1 pb-2 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium">{r.id}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-muted-foreground">
                    {r.type} · {r.location}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
