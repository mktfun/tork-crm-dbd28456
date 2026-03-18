import * as React from "react";
import { cn } from "@/modules/jjseguros/lib/utils";
import { motion } from "framer-motion";

interface SegmentedControlOption {
  value: string;
  label: string;
  description?: string;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

const SegmentedControl = ({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps) => {
  return (
    <div className={cn("w-full space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative flex rounded-xl bg-slate-200 p-1.5 gap-1">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "relative flex-1 px-4 py-3 min-h-[44px] rounded-lg text-sm transition-all duration-200 z-10",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
                isSelected
                  ? "text-primary font-semibold"
                  : "text-slate-500 hover:text-slate-700 font-medium"
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="segmented-active"
                  className="absolute inset-0 bg-white rounded-lg shadow-md"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}
              <span className="relative z-10">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export { SegmentedControl, type SegmentedControlOption };
