import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = "md" }) => {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl", 
    lg: "text-4xl"
  };

  return (
    <div className={`font-zen font-bold text-primary ${sizeClasses[size]} ${className}`}>
      <span className="text-gradient bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
        IRIOS
      </span>
      <span className="text-muted-foreground ml-1">AI</span>
    </div>
  );
};
