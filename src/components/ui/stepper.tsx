import React from 'react';
import { Check, User, Building2, DollarSign, Users2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEP_ICONS = [User, Building2, DollarSign, Users2];

interface StepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("flex items-center justify-center w-full mb-8", className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;
        const Icon = STEP_ICONS[index] ?? User;

        return (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center">
              {/* Circle */}
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                  isCompleted
                    ? "bg-primary/20 border-primary text-primary"
                    : isActive
                      ? "bg-primary border-primary text-primary-foreground shadow-[0_0_15px_-3px_hsl(var(--primary)/0.4)]"
                      : "bg-muted/50 border-border text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 animate-in zoom-in-50 duration-200" strokeWidth={3} />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "mt-2 text-xs font-medium transition-colors duration-200 whitespace-nowrap",
                  isActive
                    ? "text-primary font-semibold"
                    : isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {step}
              </span>
            </div>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div className="relative h-0.5 w-12 sm:w-20 mx-2 sm:mx-4">
                <div className="absolute inset-0 bg-border rounded-full" />
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out",
                    stepNumber < currentStep ? "w-full bg-primary" : "w-0 bg-primary"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
