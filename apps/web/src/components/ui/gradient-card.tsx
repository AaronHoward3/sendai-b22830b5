import * as React from "react"

import { cn } from "@/lib/utils"

const GradientCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div className="relative p-[2px] bg-gradient-to-r from-gradient-start to-gradient-end rounded-lg">
    <div
      ref={ref}
      className={cn(
        "rounded-md border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  </div>
))
GradientCard.displayName = "GradientCard"

const GradientCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
GradientCardHeader.displayName = "GradientCardHeader"

const GradientCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
GradientCardTitle.displayName = "GradientCardTitle"

const GradientCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
GradientCardDescription.displayName = "GradientCardDescription"

const GradientCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
GradientCardContent.displayName = "GradientCardContent"

const GradientCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
GradientCardFooter.displayName = "GradientCardFooter"

export { GradientCard, GradientCardHeader, GradientCardFooter, GradientCardTitle, GradientCardDescription, GradientCardContent }