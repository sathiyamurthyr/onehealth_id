import React from "react";
import { cn } from "@/lib/utils";

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("bg-white  border border-slate-200  rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden", className)} {...props}>
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("p-5 border-b border-slate-100  flex items-center justify-between", className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, children, ...props }) => (
  <h3 className={cn("font-semibold text-slate-900  text-base sm:text-lg flex items-center gap-2", className)} {...props}>
    {children}
  </h3>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("p-5", className)} {...props}>
    {children}
  </div>
);

export const Badge: React.FC<{
  variant?: "primary" | "success" | "warning" | "danger" | "neutral" | "outline";
  className?: string;
  children: React.ReactNode;
}> = ({ variant = "primary", className, children }) => {
  const variants = {
    primary: "bg-blue-50 text-blue-700   border-blue-200 ",
    success: "bg-emerald-50 text-emerald-700   border-emerald-200 ",
    warning: "bg-amber-50 text-amber-700   border-amber-200 ",
    danger: "bg-rose-50 text-rose-700   border-rose-200 ",
    neutral: "bg-slate-100 text-slate-700   border-slate-200 ",
    outline: "bg-transparent text-slate-700  border-slate-300 ",
  };

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", variants[variant], className)}>
      {children}
    </span>
  );
};

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
    size?: "sm" | "md" | "lg";
  }
> = ({ variant = "primary", size = "md", className, children, ...props }) => {
  const base = "inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm focus:ring-blue-500",
    secondary: "bg-slate-800 hover:bg-slate-900 text-white focus:ring-slate-700",
    outline: "border border-slate-300  hover:bg-slate-50  text-slate-700  focus:ring-slate-400",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500",
    ghost: "hover:bg-slate-100  text-slate-700 ",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs min-h-[36px]",
    md: "px-4 py-2 text-sm min-h-[44px]", // minimum 44px touch target
    lg: "px-5 py-3 text-base min-h-[48px]",
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
};
