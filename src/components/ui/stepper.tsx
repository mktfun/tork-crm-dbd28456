import React from 'react';
import { Check, User, Building2, DollarSign, Users2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  id: string;
  title: string;
  description?: string;
}

const STEP_ICONS = [User, Building2, DollarSign, Users2];

interface StepperProps {
  steps: string[] | Step[];
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
        const label = typeof step === 'string' ? step : step.title;

        return (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-500",
                  isCompleted
                    ? "bg-foreground text-background"
                    : isActive
                      ? "bg-card shadow-[0_4px_12px_rgba(0,0,0,0.1)] text-foreground"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 animate-in zoom-in-50 duration-200" strokeWidth={3} />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-[10px] sm:text-xs font-medium transition-colors duration-200 max-w-[56px] sm:max-w-none text-center leading-tight truncate",
                  isActive
                    ? "text-foreground font-semibold"
                    : isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="relative h-1 w-10 sm:w-16 mx-2 sm:mx-3">
                <div className="absolute inset-0 bg-muted rounded-full" />
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-in-out",
                    stepNumber < currentStep ? "w-full bg-foreground" : "w-0 bg-foreground"
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
