import * as React from "react";
import { cn } from "@/modules/jjseguros/lib/utils";

interface FormCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

const FormCard = ({ children, title, description, className }: FormCardProps) => {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-xl shadow-slate-900/5",
        className
      )}
    >
      {(title || description) && (
        <div className="mb-6 pb-4 border-b border-slate-100">
          {title && (
            <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export { FormCard };
