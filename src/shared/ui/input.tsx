import * as React from "react";

import { cn } from "@/shared/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-[rgba(25,28,30,0.12)] bg-[var(--color-surface-muted)] px-4 py-2 text-base text-[var(--color-text-primary)] ring-offset-background transition-all placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
