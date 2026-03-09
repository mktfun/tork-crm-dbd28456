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

/**
 * Formats a numeric value to BRL display format
 * e.g. 100000.00 → "100.000,00"
 */
function formatBRL(value: number, decimals: number = 2): string {
  if (isNaN(value) || value === 0) return '';
  const parts = value.toFixed(decimals).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${intPart},${parts[1]}`;
}

/**
 * Parses a BRL-formatted string to a number
 * e.g. "100.000,00" → 100000.00
 */
function parseBRL(raw: string): number {
  if (!raw) return 0;
  // Remove everything except digits, comma, dot, minus
  let cleaned = raw.replace(/[^\d,.\-]/g, '');
  // Remove thousand separators (dots) and convert decimal comma
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, placeholder = '0,00', min, max, prefix, suffix, decimals = 2 }, ref) => {
    const [displayValue, setDisplayValue] = useState(() =>
      value && value > 0 ? formatBRL(value, decimals) : ''
    );
    const [isFocused, setIsFocused] = useState(false);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Allow typing freely — only digits, dots, commas
      setDisplayValue(raw);
    }, []);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      let parsed = parseBRL(displayValue);

      if (min !== undefined && parsed < min) parsed = min;
      if (max !== undefined && parsed > max) parsed = max;

      if (parsed > 0) {
        setDisplayValue(formatBRL(parsed, decimals));
      } else {
        setDisplayValue('');
      }
      onChange(parsed);
    }, [displayValue, onChange, min, max, decimals]);

    const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Select all on focus for easy replacement
      setTimeout(() => e.target.select(), 0);
    }, []);

    // Sync external value changes (e.g. form reset)
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(value && value > 0 ? formatBRL(value, decimals) : '');
      }
    }, [value, isFocused, decimals]);

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
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
