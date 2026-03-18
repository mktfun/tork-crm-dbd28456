import { Car, Home, Heart, Building2, Plane, Users, ChevronLeft, ChevronRight, ArrowRight, Sparkles, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

import { Smartphone } from "lucide-react";

const insuranceTypes = [
  {
    icon: Car,
    title: "Auto",
    description: "Cobertura contra roubo, colisão e terceiros",
    color: "from-blue-500/20 to-blue-600/10",
    featured: true,
    type: "auto",
  },
  {
    icon: Smartphone,
    title: "Uber/Similares",
    description: "Cobertura para motoristas de aplicativo",
    color: "from-violet-500/20 to-violet-600/10",
    featured: false,
    type: "uber",
  },
  {
    icon: Home,
    title: "Residencial",
    description: "Proteção contra incêndio, roubo e danos",
    color: "from-amber-500/20 to-amber-600/10",
    featured: false,
    type: "residencial",
  },
  {
    icon: Heart,
    title: "Vida",
    description: "Segurança financeira para quem você ama",
    color: "from-rose-500/20 to-rose-600/10",
    featured: false,
    type: "vida",
  },
  {
    icon: Building2,
    title: "Empresarial",
    description: "Riscos operacionais e responsabilidade civil",
    color: "from-slate-500/20 to-slate-600/10",
    featured: false,
    type: "empresarial",
  },
  {
    icon: Plane,
    title: "Viagem",
    description: "Assistência médica e bagagem internacional",
    color: "from-sky-500/20 to-sky-600/10",
    featured: false,
    type: "viagem",
  },
  {
    icon: Users,
    title: "Saúde",
    description: "Consultas, exames e emergências cobertas",
    color: "from-emerald-500/20 to-emerald-600/10",
    featured: false,
    type: "saude",
  },
  {
    icon: Smartphone,
    title: "Smartphone",
    description: "Proteção completa para seu celular",
    color: "from-purple-500/20 to-purple-600/10",
    featured: false,
    type: "smartphone",
  },
  {
    icon: KeyRound,
    title: "Fiança Residencial",
    description: "Dispense fiador e garanta seu aluguel",
    color: "from-stone-500/20 to-stone-600/10",
    featured: false,
    type: "fianca",
  },
];

export const InsuranceTypes = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      
      // Calculate active index for dots
      const cardWidth = 240;
      const newIndex = Math.round(scrollLeft / cardWidth);
      setActiveIndex(Math.min(newIndex, insuranceTypes.length - 1));
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        ref.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 260;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="relative py-16 sm:py-20 lg:py-28 bg-[#f5f6f7]">
      {/* Decorative shapes - Removidos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="container mx-auto mb-8 sm:mb-12 max-w-2xl text-center px-4 sm:px-6"
        >
          <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4 bg-white border px-3 sm:px-4 py-1.5 rounded-full shadow-sm">
            <Sparkles size={14} className="text-primary"/>
            +6 tipos de seguro
          </span>
          <h2 className="mb-3 sm:mb-4 text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-foreground">
            Proteção para o que{" "}
            <span className="text-primary">importa</span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
            Escolha a cobertura ideal para cada momento da sua vida
          </p>
        </motion.div>

        {/* Carousel container */}
        <div className="relative overflow-hidden">
          {/* Navigation arrows - Desktop only */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`hidden md:flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-white border border-slate-200 shadow-md hover:bg-slate-50 hover:shadow-lg transition-all duration-300 ${!canScrollLeft ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <ChevronLeft size={24} className="text-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`hidden md:flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-white border border-slate-200 shadow-md hover:bg-slate-50 hover:shadow-lg transition-all duration-300 ${!canScrollRight ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <ChevronRight size={24} className="text-foreground" />
          </Button>

          {/* Gradient masks */}
          <div className={`absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-[#f5f6f7] via-[#f5f6f7]/80 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`} />
          <div className={`absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-[#f5f6f7] via-[#f5f6f7]/80 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`} />

          <div
            ref={scrollRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-proximity px-4 sm:px-8 lg:px-16 py-8 scrollbar-hide"
            style={{ 
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {insuranceTypes.map((insurance, index) => (
              <div
                key={index}
                className={`group relative flex-shrink-0 snap-center flex flex-col items-center rounded-3xl bg-white border border-[#f0f0f0] p-6 sm:p-8 cursor-pointer min-w-[220px] sm:min-w-[240px] lg:min-w-[260px] hover:-translate-y-1.5 transition-all duration-400 ease-out ${
                  insurance.featured 
                    ? 'shadow-elevated ring-1 ring-border' 
                    : 'shadow-card hover:shadow-elevated'
                }`}
              >
                {/* Featured badge */}
                {insurance.featured && (
                  <div className="absolute -top-0 -right-0 bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-bl-lg rounded-tr-2xl">
                    Mais cotado
                  </div>
                )}
                
                <div className="relative z-10 w-full">
                  <div className={`mb-4 sm:mb-5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl mx-auto bg-[#f8f9fa] group-hover:bg-muted transition-colors duration-300`}>
                    <insurance.icon size={28} className="text-primary" />
                  </div>
                  <h3 className="mb-1.5 sm:mb-2 text-base sm:text-lg font-semibold text-foreground text-center">
                    {insurance.title}
                  </h3>
                  <p className="text-center text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-5 leading-relaxed min-h-[36px] sm:min-h-[40px]">
                    {insurance.description}
                  </p>
                  
                  {/* CTA button */}
                  <Link 
                    to={`/cotacao?type=${insurance.type}`}
                    className="w-full flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl transition-colors duration-200"
                  >
                    <span>Fazer cotação</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile scroll indicator */}
          <div className="flex md:hidden justify-center items-center gap-3 mt-4 sm:mt-6 px-4">
            <div className="flex gap-1.5">
              {insuranceTypes.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === activeIndex 
                      ? 'w-5 sm:w-6 bg-primary' 
                      : 'w-1.5 bg-slate-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground ml-2">
              Deslize para ver mais
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
