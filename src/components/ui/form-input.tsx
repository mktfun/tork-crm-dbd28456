import React from 'react';
import { cn } from '@/lib/utils';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  success?: boolean;
  containerClassName?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, hint, success, containerClassName, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={cn(
        "flex flex-col border-b border-muted/50 px-1 pt-3 pb-2 focus-within:bg-muted/10 transition-colors last:border-0",
        containerClassName
      )}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1"
          >
            {label}
            {props.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "w-full bg-transparent text-foreground text-[15px] font-medium placeholder:text-muted-foreground/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            error && "text-destructive",
            success && "text-foreground",
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-[11px] text-muted-foreground/60 mt-1">{hint}</p>}
        {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';
