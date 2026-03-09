import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value?: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

function formatBRL(value: number, decimals: number = 2): string {
  if (isNaN(value) || value === 0) return '';
  const parts = value.toFixed(decimals).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${intPart},${parts[1]}`;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, placeholder = '0,00', min, max, decimals = 2 }, ref) => {
    const [displayValue, setDisplayValue] = useState(() =>
      value && value > 0 ? formatBRL(value, decimals) : ''
    );
    const [isFocused, setIsFocused] = useState(false);

    const divisor = Math.pow(10, decimals);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, '');
      if (!digits) {
        setDisplayValue('');
        onChange(0);
        return;
      }
      let numericValue = parseInt(digits, 10) / divisor;
      if (max !== undefined && numericValue > max) numericValue = max;
      if (min !== undefined && numericValue < min) numericValue = min;
      setDisplayValue(formatBRL(numericValue, decimals));
      onChange(numericValue);
    }, [onChange, min, max, decimals, divisor]);

    const handleFocus = useCallback(() => setIsFocused(true), []);
    const handleBlur = useCallback(() => setIsFocused(false), []);

    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(value && value > 0 ? formatBRL(value, decimals) : '');
      }
    }, [value, isFocused, decimals]);

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn(
          "flex h-10 w-full rounded-md border border-border bg-card/50 backdrop-blur-sm px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
