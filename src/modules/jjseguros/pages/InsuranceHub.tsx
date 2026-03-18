import { useRef, useState, MouseEvent, useEffect } from "react";
import { Header } from "@/modules/jjseguros/components/Header";
import { Footer } from "@/modules/jjseguros/components/Footer";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Car, 
  Home, 
  Heart, 
  Building2, 
  Plane, 
  HeartPulse,
  ChevronRight,
  Shield,
  Smartphone,
  KeyRound
} from "lucide-react";
import { cn } from "@/modules/jjseguros/lib/utils";
import { LucideIcon } from "lucide-react";

interface InsuranceProduct {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  iconColor: string;
  type: string;
  colSpan?: number;
  rowSpan?: number;
}

const insuranceProducts: InsuranceProduct[] = [
  {
    icon: Car,
    title: "Seguro Auto",
    description: "Proteção completa para seu veículo contra roubo, colisão e danos a terceiros.",
    gradient: "from-blue-500/20 via-blue-400/10 to-sky-300/5",
    iconColor: "text-blue-600",
    type: "auto",
    colSpan: 2,
    rowSpan: 1,
  },
  {
    icon: Heart,
    title: "Seguro de Vida",
    description: "Segurança financeira para quem você ama. Coberturas para morte, invalidez e doenças graves.",
    gradient: "from-rose-500/20 via-rose-400/10 to-pink-300/5",
    iconColor: "text-rose-600",
    type: "vida",
    colSpan: 1,
    rowSpan: 2,
  },
  {
    icon: Home,
    title: "Residencial",
    description: "Proteja seu lar contra incêndio, roubo e danos elétricos.",
    gradient: "from-amber-500/20 via-amber-400/10 to-orange-300/5",
    iconColor: "text-amber-600",
    type: "residencial",
  },
  {
    icon: Building2,
    title: "Seguros Empresariais",
    description: "Coberturas pensadas para proteger seu negócio, funcionários e patrimônio corporativo.",
    gradient: "from-indigo-500/20 via-indigo-400/10 to-indigo-300/5",
    iconColor: "text-indigo-600",
    type: "empresarial",
  },
  {
    icon: Shield,
    title: "Aviso de Sinistro",
    description: "Reporte uma ocorrência (acidente, roubo, furto) de forma rápida e digital.",
    gradient: "from-amber-500/20 via-amber-400/10 to-amber-300/5",
    iconColor: "text-amber-600",
    type: "sinistro",
    colSpan: 1,
    rowSpan: 1,
  },
  {
    icon: HeartPulse,
    title: "Saúde",
    description: "Planos de saúde com a melhor cobertura para você e sua família.",
    gradient: "from-emerald-500/20 via-emerald-400/10 to-green-300/5",
    iconColor: "text-emerald-600",
    type: "saude",
  },
  {
    icon: Plane,
    title: "Viagem",
    description: "Viaje tranquilo com cobertura médica e proteção de bagagem.",
    gradient: "from-violet-500/20 via-violet-400/10 to-purple-300/5",
    iconColor: "text-violet-600",
    type: "viagem",
  },
  {
    icon: Smartphone,
    title: "Smartphone",
    description: "Proteção completa para seu celular contra roubo e danos.",
    gradient: "from-purple-500/20 via-purple-400/10 to-violet-300/5",
    iconColor: "text-purple-600",
    type: "smartphone",
  },
  {
    icon: KeyRound,
    title: "Fiança Residencial",
    description: "Dispense fiador e garanta seu aluguel com segurança.",
    gradient: "from-stone-500/20 via-stone-400/10 to-neutral-300/5",
    iconColor: "text-stone-600",
    type: "fianca",
  },
];

interface InsuranceTileProps extends InsuranceProduct {
  index: number;
}

const InsuranceTile = ({ 
  icon: Icon, 
  title, 
  description, 
  gradient, 
  iconColor, 
  type,
  colSpan = 1,
  rowSpan = 1,
  index
}: InsuranceTileProps) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch device on mount
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newRotateX = ((y - centerY) / centerY) * -6;
    const newRotateY = ((x - centerX) / centerX) * 6;
    
    setRotateX(newRotateX);
    setRotateY(newRotateY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  const handleClick = () => {
    navigate(`/cotacao?type=${type}`);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={cn(
        "relative overflow-hidden cursor-pointer group",
        "bg-white rounded-2xl md:rounded-3xl border border-slate-200/60",
        "shadow-lg transition-shadow duration-300",
        // Only apply spans on md+ screens
        colSpan === 2 && "md:col-span-2",
        rowSpan === 2 && "md:row-span-2"
      )}
      style={{
        transform: !isTouchDevice ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` : undefined,
        transition: 'transform 0.15s ease-out',
        minHeight: rowSpan === 2 ? '280px' : '180px',
      }}
      onMouseMove={!isTouchDevice ? handleMouseMove : undefined}
      onMouseEnter={!isTouchDevice ? () => setIsHovered(true) : undefined}
      onMouseLeave={!isTouchDevice ? handleMouseLeave : undefined}
      onClick={handleClick}
      whileTap={{ scale: 0.98 }}
    >
      {/* Gradient background overlay */}
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-br transition-opacity duration-500",
          gradient,
          isHovered ? "opacity-100" : "opacity-[0.15] md:opacity-0"
        )}
      />

      {/* Border glow on hover */}
      <div 
        className={cn(
          "absolute inset-0 rounded-2xl md:rounded-3xl ring-2 ring-transparent transition-all duration-300",
          isHovered && "ring-secondary/20"
        )}
      />

      {/* Large decorative icon */}
      <Icon 
        className={cn(
          "absolute -right-4 -bottom-4 md:-right-6 md:-bottom-6 w-24 h-24 md:w-36 md:h-36 transition-all duration-500",
          iconColor,
          "opacity-[0.06]",
          isHovered && "opacity-[0.12] scale-110"
        )}
        strokeWidth={1}
      />

      {/* Content */}
      <div className="relative z-10 h-full p-5 sm:p-7 md:p-8 flex flex-col justify-between">
        <div>
          {/* Icon badge */}
          <div 
            className={cn(
              "w-11 h-11 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-5",
              "bg-gradient-to-br shadow-sm transition-transform duration-300",
              gradient.replace('/20', '/30').replace('/10', '/20').replace('/5', '/10'),
              isHovered && "scale-105"
            )}
          >
            <Icon className={cn("w-5 h-5 md:w-6 md:h-6", iconColor)} strokeWidth={2} />
          </div>

          {/* Title */}
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-1 md:mb-2">
            {title}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed line-clamp-2 md:line-clamp-none">
            {description}
          </p>
        </div>

        {/* CTA Button */}
        <div 
          className={cn(
            "flex items-center gap-2 text-secondary font-semibold mt-4 md:mt-6",
            "transition-all duration-300",
            "opacity-70 translate-y-1",
            isHovered && "opacity-100 translate-y-0"
          )}
        >
          <span className="text-sm md:text-base">Cotar agora</span>
          <ChevronRight 
            className={cn(
              "w-4 h-4 md:w-5 md:h-5 transition-transform duration-300",
              isHovered && "translate-x-1"
            )} 
          />
        </div>
      </div>

      {/* Subtle hover shadow increase - desktop only */}
      {!isTouchDevice && (
        <div 
          className={cn(
            "absolute inset-0 rounded-2xl md:rounded-3xl transition-shadow duration-300 pointer-events-none",
            isHovered && "shadow-2xl"
          )}
        />
      )}
    </motion.div>
  );
};

const InsuranceHub = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Header />
      
      <main className="flex-1 pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-24">
        {/* Hero Section */}
        <div className="container text-center mb-8 sm:mb-12 md:mb-16 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-1.5 text-sm font-medium text-secondary mb-4 md:mb-5"
          >
            <Shield size={16} />
            <span>Encontre o seguro ideal</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 md:mb-4"
          >
            Qual proteção você busca hoje?
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xl mx-auto"
          >
            Selecione uma categoria para iniciar sua cotação personalizada
          </motion.p>
        </div>

        {/* Bento Grid - 1 col on mobile, 2 on md, 3 on lg */}
        <div className="container max-w-6xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
            {insuranceProducts.map((product, index) => (
              <InsuranceTile 
                key={product.type} 
                {...product} 
                index={index}
              />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default InsuranceHub;
