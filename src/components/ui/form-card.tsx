import React from 'react';
import { cn } from '@/lib/utils';

interface FormCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormCard({ title, description, children, className }: FormCardProps) {
  return (
    <div className={cn("bg-card rounded-[2rem] shadow-sm overflow-hidden", className)}>
      {(title || description) && (
        <div className="px-5 pt-5 pb-2 space-y-1">
          {title && <h3 className="text-lg font-semibold text-foreground tracking-tight">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      <div className="px-5 pb-5">
        {children}
      </div>
    </div>
  );
}
