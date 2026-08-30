import * as React from "react";

import { cn } from "@/shared/lib/utils";

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        className,
      )}
      {...props}
    >
      {icon && (
        <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <h2 className="t-h2 mt-6 font-display text-foreground">
        {title}
      </h2>
      {description && (
        <p className="t-body mt-3 max-w-sm text-muted-foreground">
          {description}
        </p>
      )}
      {(action || children) && <div className="mt-6">{action ?? children}</div>}
    </div>
  ),
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
