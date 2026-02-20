import React from 'react';
import { cn } from '@/lib/utils';

interface RadioCardOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface RadioCardGroupProps {
  options: RadioCardOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  columns?: number;
}

export function RadioCardGroup({ options, value, onChange, label, className, columns = 2 }: RadioCardGroupProps) {
  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}
      <div className={cn(
        "grid gap-3",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 1 && "grid-cols-1",
        className
      )}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all",
              value === option.value
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border bg-card/50 hover:border-border/80 hover:bg-muted/30"
            )}
          >
            {option.icon && <div className="mb-1">{option.icon}</div>}
            <span className="text-sm font-medium text-foreground">{option.label}</span>
            {option.description && (
              <span className="text-xs text-muted-foreground">{option.description}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
