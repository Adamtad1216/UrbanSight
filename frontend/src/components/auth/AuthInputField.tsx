import { forwardRef, useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AuthInputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  rightAdornment?: React.ReactNode;
}

export const AuthInputField = forwardRef<HTMLInputElement, AuthInputFieldProps>(
  function AuthInputField(
    { id, label, error, rightAdornment, className, ...props },
    ref,
  ) {
    const { onFocus, onBlur, onChange, placeholder, ...restProps } = props;
    const [focused, setFocused] = useState(false);
    const errorId = useId();
    const reduceMotion = useReducedMotion();

    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs font-medium text-slate-300">
          {label}
        </Label>
        <motion.div
          animate={focused && !reduceMotion ? { scale: 1.005 } : { scale: 1 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
          className="relative"
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity",
              "bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_60%)]",
              focused && "opacity-100",
            )}
          />
          <Input
            id={id}
            ref={ref}
            placeholder={placeholder ?? label}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            onChange={(event) => {
              onChange?.(event);
            }}
            className={cn(
              "h-12 rounded-xl border-white/10 bg-white/5 pr-11 text-slate-100 placeholder:text-slate-400/70",
              "transition-shadow duration-200 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-0",
              focused &&
                "shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_0_24px_rgba(34,211,238,0.18)]",
              error && "border-red-400/60 focus-visible:ring-red-400/60",
              className,
            )}
            {...restProps}
          />
          {rightAdornment && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightAdornment}
            </div>
          )}
        </motion.div>
        {error && (
          <p
            id={errorId}
            className="flex items-center gap-1 text-xs text-red-300"
            role="alert"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
      </div>
    );
  },
);
