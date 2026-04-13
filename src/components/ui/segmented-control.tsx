import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SegmentedControlOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  layoutId?: string;
}

export function SegmentedControl({ options, value, onChange, label, className, layoutId }: SegmentedControlProps) {
  const pillId = layoutId || `segmented-${label?.replace(/\s+/g, '-') || 'default'}`;

  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}
      <div className="bg-muted/60 p-1 rounded-2xl flex items-center shadow-inner relative">
        {options.map((option) => (
          <motion.button
            key={option.value}
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 py-2.5 text-sm font-semibold rounded-xl text-center transition-colors relative z-10",
              value === option.value
                ? "text-background"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {value === option.value && (
              <motion.div
                layoutId={pillId}
                className="absolute inset-0 bg-foreground rounded-xl shadow-md -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="flex items-center justify-center gap-2">
              {option.icon}
              {option.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
