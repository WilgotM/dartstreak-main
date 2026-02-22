import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-display",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_12px_28px_-16px_rgba(34,197,94,0.75)] hover:bg-primary/92 hover:shadow-[0_18px_32px_-18px_rgba(34,197,94,0.8)] active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground shadow-[0_12px_28px_-16px_rgba(239,68,68,0.7)] hover:bg-destructive/90 active:scale-[0.98]",
        outline: "border border-white/20 bg-[#15151D] text-foreground hover:border-primary/40 hover:bg-[#1B1B25]",
        secondary: "border border-white/10 bg-[#1A1A24] text-secondary-foreground hover:bg-[#20202B]",
        ghost: "text-foreground/85 hover:bg-white/5 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-primary text-primary-foreground shadow-[0_14px_30px_-16px_rgba(34,197,94,0.8)] hover:bg-primary/90 hover:shadow-[0_18px_34px_-15px_rgba(34,197,94,0.85)] hover:scale-[1.01] active:scale-[0.98]",
        accent: "bg-accent text-accent-foreground shadow-[0_14px_30px_-16px_rgba(245,158,11,0.8)] hover:bg-accent/92",
        gold: "bg-dart-gold text-foreground font-bold shadow-[0_14px_30px_-16px_rgba(245,158,11,0.8)] hover:bg-dart-gold/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
