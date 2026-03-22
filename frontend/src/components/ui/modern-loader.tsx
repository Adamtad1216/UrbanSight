import { cn } from "@/lib/utils";

interface ModernLoaderProps {
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

export function ModernLoader({
  label = "Loading",
  fullScreen = false,
  className,
}: ModernLoaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fullScreen ? "min-h-screen" : "min-h-[220px]",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border border-primary/25" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary border-r-primary/70 animate-spin [animation-duration:850ms]" />
          <div className="absolute inset-[8px] rounded-full bg-background/90" />
          <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.55)] animate-pulse" />
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <div
            className="mt-1 flex items-center justify-center gap-1.5"
            aria-hidden
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:140ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:280ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
