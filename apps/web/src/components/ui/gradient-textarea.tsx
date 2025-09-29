import * as React from "react"

import { cn } from "@/lib/utils"

export interface GradientTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const GradientTextarea = React.forwardRef<HTMLTextAreaElement, GradientTextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative p-[2px] bg-gradient-to-r from-gradient-start to-gradient-end rounded-lg">
        <textarea
          className={cn(
            "flex min-h-[120px] w-full rounded-md bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
GradientTextarea.displayName = "GradientTextarea"

export { GradientTextarea }