import React from 'react';
import { motion } from 'framer-motion';
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
          <motion.button
            key={option.value}
            type="button"
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.015 }}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-2xl p-4 text-left transition-all",
              value === option.value
                ? "bg-foreground text-background shadow-md"
                : "bg-muted/40 text-foreground hover:bg-muted/60"
            )}
          >
            {option.icon && (
              <div className={cn(
                "mb-1",
                value === option.value ? "text-background" : "text-muted-foreground"
              )}>
                {option.icon}
              </div>
            )}
            <span className={cn(
              "text-sm font-semibold",
              value === option.value ? "text-background" : "text-foreground"
            )}>
              {option.label}
            </span>
            {option.description && (
              <span className={cn(
                "text-xs",
                value === option.value ? "text-background/70" : "text-muted-foreground"
              )}>
                {option.description}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
