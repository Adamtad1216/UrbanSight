import { motion } from "framer-motion";
import { Wrench } from "lucide-react";

export function MaintenanceScreen() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 p-6 sm:p-10">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-28 top-10 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-300/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-3xl rounded-3xl border border-white/20 bg-white/90 p-8 text-slate-900 shadow-2xl backdrop-blur-xl sm:p-10"
          role="dialog"
          aria-modal="true"
          aria-label="System maintenance notice"
        >
          <div className="mb-6 flex items-center justify-center">
            <img
              src="/maintenance-hero.svg"
              alt="System maintenance illustration"
              className="h-auto w-full max-w-xl"
            />
          </div>

          <div className="mb-4 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2.8 }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700"
            >
              <Wrench className="h-7 w-7" />
            </motion.div>
          </div>

          <h1 className="mb-3 text-center text-3xl font-bold tracking-tight sm:text-4xl">
            We&rsquo;re Improving Things
          </h1>

          <p className="mx-auto max-w-2xl text-center text-base leading-relaxed text-slate-600 sm:text-lg">
            UrbanFlow is temporarily under maintenance to improve reliability
            and performance. Please check back shortly.
          </p>

          <div className="mt-7 flex items-center justify-center gap-2">
            <motion.span
              className="h-2.5 w-2.5 rounded-full bg-cyan-500"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
            />
            <motion.span
              className="h-2.5 w-2.5 rounded-full bg-cyan-500"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{
                duration: 1.2,
                repeat: Number.POSITIVE_INFINITY,
                delay: 0.2,
              }}
            />
            <motion.span
              className="h-2.5 w-2.5 rounded-full bg-cyan-500"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{
                duration: 1.2,
                repeat: Number.POSITIVE_INFINITY,
                delay: 0.4,
              }}
            />
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            Thank you for your patience.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
