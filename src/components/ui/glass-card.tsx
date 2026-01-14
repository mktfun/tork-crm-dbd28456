
import { cn } from "@/lib/utils";
import { ReactNode, HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: ReactNode;
}

// Este é o nosso tijolo de vidro perfeito. Tudo será construído com ele.
export function GlassCard({ className, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        // O VIDRO PERFEITO: transparência + desfoque + bordas sutis
        "rounded-xl border border-white/10 bg-white/10 backdrop-blur-lg shadow-lg",
        // Padding padrão e overflow controlado
        "p-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
