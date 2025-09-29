
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const gradientButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-2 border-transparent bg-gradient-to-r from-gradient-start to-gradient-end bg-clip-border p-[2px] hover:shadow-lg hover:shadow-gradient-start/20",
        outline: "border-2 border-transparent bg-gradient-to-r from-gradient-start to-gradient-end bg-clip-border p-[2px] hover:shadow-lg hover:shadow-gradient-start/20",
        solid: "bg-gradient-to-r from-gradient-start to-gradient-end text-white hover:shadow-lg hover:shadow-gradient-start/30",
        "white-outline": "border border-gradient-start/30 bg-white dark:bg-gray-900 text-foreground hover:border-gradient-start/50 hover:shadow-sm",
      },
      size: {
        default: "h-12 px-6 py-2",
        sm: "h-9 px-3",
        lg: "h-14 px-8",
        xl: "h-16 px-10 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof gradientButtonVariants> {
  asChild?: boolean
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    if (variant === "solid") {
      return (
        <Comp
          className={cn(gradientButtonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      )
    }

    if (variant === "white-outline") {
      return (
        <Comp
          className={cn(gradientButtonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      )
    }
    
    return (
      <Comp
        className={cn(gradientButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        <span className="relative z-10 flex items-center justify-center w-full h-full bg-background rounded-md px-6 py-2 group-hover:bg-gradient-subtle transition-colors duration-200">
          {children}
        </span>
      </Comp>
    )
  }
)
GradientButton.displayName = "GradientButton"

export { GradientButton, gradientButtonVariants }
