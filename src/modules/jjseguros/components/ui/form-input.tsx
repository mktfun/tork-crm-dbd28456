import * as React from "react";
import { cn } from "@/modules/jjseguros/lib/utils";
import { CheckCircle2, AlertCircle } from "lucide-react";

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  success?: boolean;
  hint?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "url" | "search" | "none" | "decimal";
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, label, error, success, hint, type, inputMode, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);

    const handleFocus = () => setIsFocused(true);
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(e.target.value.length > 0);
      props.onBlur?.(e);
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      props.onChange?.(e);
    };

    const isActive = isFocused || hasValue || props.value;

    return (
      <div className="w-full space-y-1.5">
        <label className="block text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        <div className="relative">
          <input
            type={type}
            inputMode={inputMode}
            className={cn(
              // Base styles - Mobile first with min-height 44px for touch
              "flex h-12 w-full rounded-lg border-2 bg-card px-4 py-3 text-base",
              "ring-offset-background transition-all duration-200",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-0",
              "disabled:cursor-not-allowed disabled:opacity-50",
              // Numeric data styling
              inputMode === "numeric" || inputMode === "tel" 
                ? "font-mono tracking-wide" 
                : "",
              // State-based styling with premium focus rings
              error
                ? "border-destructive bg-destructive/5 focus-visible:ring-destructive/20 pr-10"
                : success
                ? "border-success bg-success/5 focus-visible:ring-success/20 pr-10"
                : "border-input hover:border-secondary/50 focus-visible:ring-secondary/15 focus-visible:border-secondary",
              className
            )}
            ref={ref}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            {...props}
          />
          {/* Validation icons */}
          {error && (
            <AlertCircle 
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-destructive" 
            />
          )}
          {success && !error && (
            <CheckCircle2 
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-success" 
            />
          )}
        </div>
        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive flex items-center gap-1">
            {error}
          </p>
        )}
        {/* Hint text */}
        {hint && !error && (
          <p className="text-sm text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
);
FormInput.displayName = "FormInput";

export { FormInput };
