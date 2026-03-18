import { Shield, Clock, Award, Headphones } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { StatsCounter } from "./StatsCounter";
import { SocialProof } from "./SocialProof";

const features = [
  {
    icon: Shield,
    title: "Segurança Garantida",
    description: "Seus dados protegidos com criptografia de ponta a ponta",
    gradient: "from-primary/10 to-primary/5",
    bgGradient: "from-primary/5 to-transparent",
  },
  {
    icon: Clock,
    title: "Resposta Rápida",
    description: "Cotações em até 24 horas úteis",
    gradient: "from-primary/10 to-primary/5",
    bgGradient: "from-primary/5 to-transparent",
  },
  {
    icon: Award,
    title: "Parceiros Premium",
    description: "Trabalhamos com as melhores seguradoras do mercado",
    gradient: "from-primary/10 to-primary/5",
    bgGradient: "from-primary/5 to-transparent",
  },
  {
    icon: Headphones,
    title: "Suporte Dedicado",
    description: "Atendimento humanizado do início ao fim",
    gradient: "from-primary/10 to-primary/5",
    bgGradient: "from-primary/5 to-transparent",
  },
];

export const TrustSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  // Check if desktop on mount and resize
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Only apply parallax transforms on desktop
  const sectionY = useTransform(scrollYProgress, [0, 0.3], isDesktop ? [60, 0] : [0, 0]);
  const sectionOpacity = useTransform(
    scrollYProgress, 
    [0, 0.2, 0.8, 1], 
    isDesktop ? [0.3, 1, 1, 0.8] : [1, 1, 1, 1]
  );

  return (
    <motion.section 
      ref={sectionRef}
      style={{ opacity: sectionOpacity }}
      className="relative py-20 sm:py-28 overflow-hidden bg-white"
    >
      {/* Light edge effect at top - visual separator */}
      <div className="absolute top-0 left-0 right-0 h-px bg-border/50 pointer-events-none z-[1]" />
      
      {/* Decorative background elements Removidos */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
      </div>

      <motion.div 
        style={{ y: sectionY }}
        className="container relative z-10"
      >
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto mb-14 max-w-2xl text-center"
        >
          <motion.span
            className="inline-block mb-4 px-4 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
          >
            Por que nos escolher
          </motion.span>
          
          <motion.h2 
            className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
          >
            A{" "}
            <span className="text-primary">JJ & Amorim</span>
            {" "}em números
          </motion.h2>
          <motion.p 
            className="text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
          >
            Mais de uma década de experiência protegendo famílias e empresas
          </motion.p>
        </motion.div>

        {/* Stats Counter Section */}
        <StatsCounter />

        {/* Feature Cards */}
        <div 
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          style={{ perspective: "1000px" }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ 
                duration: 0.4, 
                delay: index * 0.08,
                ease: "easeOut"
              }}
              className="group relative rounded-2xl bg-white border border-[#f0f0f0] p-6 sm:p-8 overflow-hidden hover:shadow-card hover:-translate-y-1 transition-all duration-300"
            >
              {/* Neutral background that fills on hover */}
              <div 
                className={`absolute inset-0 bg-[#f8f9fa] opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />

              {/* Icon with neutral background */}
              <div className="mb-5 sm:mb-6 relative">
                <div 
                  className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary/5 group-hover:bg-primary/10 transition-colors duration-300`}
                >
                  <feature.icon size={26} className="text-primary" />
                </div>
              </div>

              <h3 className="relative mb-2 sm:mb-3 text-base sm:text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="relative text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Subtle border glow on hover */}
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-transparent group-hover:ring-border transition-all duration-300 pointer-events-none" />
            </motion.div>
          ))}
        </div>

        {/* Social Proof Section */}
        <SocialProof />
      </motion.div>
    </motion.section>
  );
};