import { motion, useReducedMotion } from "framer-motion";
import { Droplets, Activity, ShieldCheck } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.3),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(56,189,248,0.2),transparent_35%),radial-gradient(circle_at_55%_80%,rgba(16,185,129,0.15),transparent_35%)]" />
          {!reduceMotion && (
            <>
              <motion.div
                animate={{ x: [0, 30, 0], y: [0, -24, 0] }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 12,
                  ease: "easeInOut",
                }}
                className="absolute left-20 top-16 h-52 w-52 rounded-full bg-cyan-400/20 blur-3xl"
              />
              <motion.div
                animate={{ x: [0, -40, 0], y: [0, 26, 0] }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 14,
                  ease: "easeInOut",
                }}
                className="absolute bottom-20 right-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"
              />
            </>
          )}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.8 }}
            className="relative z-10 m-8 flex w-full flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/20">
                <Droplets className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">
                  UrbanSight
                </p>
                <p className="text-sm text-slate-300">
                  Smart City Water Utility
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <h1 className="max-w-md text-4xl font-semibold leading-tight">
                Secure access to city-wide water service operations.
              </h1>
              <div className="grid grid-cols-1 gap-3">
                <FeatureItem
                  icon={Activity}
                  text="Live workflow monitoring and assignment"
                  delay={0.05}
                  reduceMotion={reduceMotion}
                />
                <FeatureItem
                  icon={ShieldCheck}
                  text="Role-based access for operational teams"
                  delay={0.1}
                  reduceMotion={reduceMotion}
                />
                <FeatureItem
                  icon={Droplets}
                  text="Citizen-centered connection request lifecycle"
                  delay={0.15}
                  reduceMotion={reduceMotion}
                />
              </div>
            </div>

            <p className="text-sm text-slate-400">
              Government-grade utility operations platform
            </p>
          </motion.div>
        </div>

        <div className="relative flex items-center justify-center p-4 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  icon: Icon,
  text,
  delay,
  reduceMotion,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  delay: number;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: reduceMotion ? 0 : delay,
        duration: reduceMotion ? 0.01 : 0.35,
      }}
      whileHover={reduceMotion ? undefined : { x: 4, scale: 1.01 }}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
    >
      <Icon className="h-4 w-4 text-cyan-300" />
      <span className="text-sm text-slate-200">{text}</span>
    </motion.div>
  );
}
