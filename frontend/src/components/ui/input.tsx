import * as React from "react";

import { cn } from "@/lib/utils";

function hasValue(value: unknown) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, ...props }, ref) => {
    const [isFilled, setIsFilled] = React.useState(() =>
      hasValue(props.value ?? props.defaultValue),
    );

    React.useEffect(() => {
      setIsFilled(hasValue(props.value ?? props.defaultValue));
    }, [props.value, props.defaultValue]);

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      setIsFilled(hasValue(event.currentTarget.value));
      onChange?.(event);
    };

    return (
      <input
        type={type}
        data-filled={isFilled ? "true" : "false"}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[filled=true]:border-emerald-400/70 data-[filled=true]:bg-emerald-50/40 dark:data-[filled=true]:bg-emerald-900/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
        onChange={handleChange}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
