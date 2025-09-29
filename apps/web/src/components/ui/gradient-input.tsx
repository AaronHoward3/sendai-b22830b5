import * as React from "react"

import { cn } from "@/lib/utils"

export interface GradientInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const GradientInput = React.forwardRef<HTMLInputElement, GradientInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <div className="relative p-[2px] bg-gradient-to-r from-gradient-start to-gradient-end rounded-lg">
        <input
          type={type}
          className={cn(
            "flex h-12 w-full rounded-md bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
GradientInput.displayName = "GradientInput"

export { GradientInput }