
import * as React from "react";
import { cn } from "@/lib/utils";

export interface MaskedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mask: string;
  maskChar?: string | null;
  alwaysShowMask?: boolean;
}

/**
 * Applies a mask pattern to a raw value.
 * '9' = digit, 'a' = letter, '*' = any char
 */
function applyMask(value: string, mask: string): string {
  const digits = value.replace(/\D/g, '');
  let result = '';
  let digitIndex = 0;

  for (let i = 0; i < mask.length && digitIndex < digits.length; i++) {
    const maskChar = mask[i];
    if (maskChar === '9') {
      result += digits[digitIndex];
      digitIndex++;
    } else {
      result += maskChar;
      // If the user typed the mask char, skip it
      if (digits[digitIndex] === maskChar) {
        digitIndex++;
      }
    }
  }

  return result;
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, mask, maskChar, alwaysShowMask, onChange, value, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const masked = applyMask(rawValue, mask);
      
      // Create a synthetic event with the masked value
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: masked,
        },
      } as React.ChangeEvent<HTMLInputElement>;

      onChange?.(syntheticEvent);
    };

    // Ensure the displayed value is always masked
    const displayValue = typeof value === 'string' ? applyMask(value, mask) : value;

    return (
      <input
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        className={cn(
          "flex h-10 w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-50 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

MaskedInput.displayName = "MaskedInput";

export { MaskedInput };
