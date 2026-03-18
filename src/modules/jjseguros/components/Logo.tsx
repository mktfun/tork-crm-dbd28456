import { cn } from "@/modules/jjseguros/lib/utils";
import logoImage from "@/modules/jjseguros/assets/logo.png";
import logoWhite from "@/modules/jjseguros/assets/logo-white.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "light";
  rounded?: boolean;
}

export const Logo = ({
  className,
  size = "md",
  variant = "default",
  rounded = true
}: LogoProps) => {
  const sizes = {
    sm: {
      icon: 28,
      text: "text-lg",
      gap: "gap-2"
    },
    md: {
      icon: 36,
      text: "text-2xl",
      gap: "gap-2.5"
    },
    lg: {
      icon: 44,
      text: "text-3xl",
      gap: "gap-3"
    },
    xl: {
      icon: 120,
      text: "text-2xl",
      gap: "gap-5"
    }
  };

  const logoSrc = variant === "light" ? logoWhite : "/lovable-uploads/b1c3e60d-1da1-4434-bbf8-b01ec0a469ec.png";

  return (
    <div className={cn("flex items-center", sizes[size].gap, className)}>
      <img 
        alt="Corretora JJ" 
        width={sizes[size].icon} 
        height={sizes[size].icon} 
        className={cn("object-contain", rounded && "rounded-lg")} 
        src={logoSrc} 
      />
      <span className={cn(
        "font-bold tracking-tight", 
        sizes[size].text, 
        variant === "light" ? "text-primary-foreground" : "text-foreground"
      )}>
        JJ <span className={variant === "light" ? "text-secondary" : "text-secondary"}>&</span> Amorim
      </span>
    </div>
  );
};
