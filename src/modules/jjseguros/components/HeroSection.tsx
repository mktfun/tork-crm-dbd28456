import { ArrowRight, Phone } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

// Importação direta dos assets para o Vite processar corretamente
import allianzLogo from "../assets/insurers/allianz.png";
import azulLogo from "../assets/insurers/azul-seguros.png";
import bradescoLogo from "../assets/insurers/bradesco-seguros.png";
import hdiLogo from "../assets/insurers/hdi-seguros.png";
import portoLogo from "../assets/insurers/porto-seguro.png";
import tokioLogo from "../assets/insurers/tokio-marine.png";
import yelumLogo from "../assets/insurers/yelum.png";
import zurichLogo from "../assets/insurers/zurich.png";
import suhaiLogo from "../assets/insurers/suhai.png";

const HeroSection = () => {
  const insurers = [
    { name: "Allianz", logo: allianzLogo },
    { name: "Azul Seguros", logo: azulLogo },
    { name: "Bradesco Seguros", logo: bradescoLogo },
    { name: "HDI Seguros", logo: hdiLogo },
    { name: "Porto Seguro", logo: portoLogo },
    { name: "Tokio Marine", logo: tokioLogo },
    { name: "Yelum", logo: yelumLogo },
    { name: "Zurich", logo: zurichLogo },
    { name: "Suhai", logo: suhaiLogo },
  ];

  return (
    <section className="relative min-h-[100svh] flex flex-col overflow-hidden bg-white">
      {/* Background Decorativo Removido */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
      </div>

      {/* Conteúdo Principal - Padding reduzido no mobile */}
      <div className="relative z-10 container mx-auto px-4 md:px-6 flex-1 flex flex-col justify-center pt-20 pb-6 lg:py-16">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-8 items-center">
          {/* Texto Hero */}
          <div className="flex flex-col gap-4 lg:gap-6 text-center lg:text-left animate-fade-in">
            <div className="inline-flex items-center justify-center lg:justify-start gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground w-fit mx-auto lg:mx-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/50 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary/50"></span>
              </span>
              <span className="text-sm font-medium text-foreground/80">+10 anos protegendo o que importa</span>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Seu seguro com <br />
              <span className="text-primary font-black tracking-tight relative inline-block">
                transparência
                <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary/10" viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M0 10 Q 50 20 100 10" stroke="currentColor" strokeWidth="4" fill="none"/></svg>
              </span>{" "}
              e confiança
            </h1>

            <p className="text-base md:text-xl text-muted-foreground max-w-[600px] mx-auto lg:mx-0 leading-relaxed">
              Encontre a melhor proteção para você, sua família e seu patrimônio. Cotação rápida, atendimento humanizado
              e as melhores seguradoras do mercado.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center lg:justify-start mt-2 lg:mt-4">
              <Link to="/seguros" className="w-full sm:w-auto">
                <Button
                  size="xl"
                  className="w-full sm:w-auto rounded-full text-base font-semibold shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-300 bg-primary text-primary-foreground relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Fazer Cotação Agora{" "}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </Link>

              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto rounded-full text-base font-medium border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-300"
                onClick={() => window.open("https://wa.me/5511979699832", "_blank")}
              >
                <Phone className="w-4 h-4 mr-2" />
                Falar com Consultor
              </Button>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-4 mt-2 lg:mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                  ✓
                </div>
                <span>Cotação em minutos</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                  ✓
                </div>
                <span>Melhores seguradoras</span>
              </div>
            </div>
          </div>

          {/* Imagem Hero - Oculta no mobile */}
          <div className="relative animate-fade-in-up delay-200 hidden lg:block">
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-white/20 bg-white/5 backdrop-blur-sm group">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80"
                alt="Família feliz protegida"
                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
              />

              {/* Card Flutuante - Estatística */}
              <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/50 animate-float flex items-center gap-3 max-w-[200px]">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-shield-check"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Clientes Protegidos</p>
                  <p className="text-lg font-bold text-foreground">+1.000</p>
                </div>
              </div>
            </div>

            {/* Elementos Decorativos de Fundo Removidos */}
          </div>
        </div>
      </div>

      {/* Marquee de Seguradoras (Rodapé do Hero) */}
      <div className="relative z-10 w-full mt-auto border-t border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden py-4 lg:py-6">
        <div className="max-w-[1400px] mx-auto px-4">
          <p className="text-[10px] md:text-xs font-bold tracking-[0.2em] text-muted-foreground/70 uppercase text-center mb-4 lg:mb-6">
            Trabalhamos com as melhores seguradoras do país
          </p>

          <div className="relative flex w-full overflow-hidden mask-linear-fade">
            <div className="flex min-w-full shrink-0 gap-8 md:gap-12 lg:gap-20 animate-scroll hover:[animation-play-state:paused] items-center">
              {[...insurers, ...insurers].map((insurer, index) => (
                <div
                  className="relative group flex items-center justify-center h-8 md:h-10 grayscale opacity-50 cursor-pointer"
                >
                  <img
                    src={insurer.logo}
                    alt={insurer.name}
                    className="h-full w-auto object-contain max-w-[100px] md:max-w-[120px]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
