import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,#00327d,#0047ab)] text-primary-foreground hover:bg-[linear-gradient(135deg,#0047ab,#00327d)]",
        destructive:
          "border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.08)] text-[#dc2626] hover:bg-[rgba(220,38,38,0.12)]",
        outline:
          "border border-[rgba(25,28,30,0.12)] bg-white text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]",
        secondary:
          "bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]",
        ghost:
          "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "gradient-primary text-primary-foreground shadow-glow hover:-translate-y-0.5 hover:shadow-[0_24px_64px_-28px_hsl(var(--primary)/0.52)] active:translate-y-0 active:scale-[0.99]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        xl: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
