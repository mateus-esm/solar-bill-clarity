import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  /* Base: precise, sharp, NeueMontreal Bold */
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 tracking-wide",
  {
    variants: {
      variant: {
        /* Primary solid — Solo orange */
        default:
          "bg-primary text-primary-foreground hover:bg-[#E03D17] active:scale-[0.98] rounded",

        /* Solar gradient — for key CTAs */
        gradient:
          "bg-solo-gradient text-white shadow-[0_0_20px_-4px_rgb(255_72_30_/_0.4)] hover:shadow-[0_0_28px_-4px_rgb(255_72_30_/_0.6)] hover:opacity-95 active:scale-[0.98] rounded",

        /* Destructive */
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded",

        /* Outline — hairline border */
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted hover:border-primary/40 active:scale-[0.98] rounded",

        /* Secondary — muted fill */
        secondary:
          "bg-muted text-foreground hover:bg-muted/80 active:scale-[0.98] rounded",

        /* Ghost — no border, text only */
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground rounded",

        /* Link */
        link:
          "text-primary underline-offset-4 hover:underline",

        /* Gradient outline — brand border with transparent fill */
        "gradient-outline":
          "gradient-border bg-card text-foreground hover:bg-muted rounded",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm:      "h-8 px-4 text-xs",
        lg:      "h-11 px-7 text-base",
        xl:      "h-13 px-9 text-base",
        icon:    "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
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
