import { motion } from "framer-motion";
import { CheckCircle, Search, Phone, Shield, ArrowRight, Star, ExternalLink, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/modules/jjseguros/components/Header";
import { Footer } from "@/modules/jjseguros/components/Footer";

const steps = [
  {
    icon: Search,
    title: "Análise de Perfil",
    description: "Cruzamos seus dados com +15 seguradoras parceiras.",
  },
  {
    icon: Phone,
    title: "Contato",
    description: "Um consultor entrará em contato via WhatsApp ou Ligação.",
  },
  {
    icon: Shield,
    title: "Proteção Ativa",
    description: "Você escolhe a melhor proposta e ativa o seguro.",
  },
];

const Success = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 md:py-16 pt-24 md:pt-20">
        {/* Container com max-w-md para desktop */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="max-w-md w-full text-center"
        >
          {/* Animated Success Icon - Check grande e animado */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.1,
            }}
            className="mb-6 md:mb-8 inline-flex"
          >
            <div className="relative">
              {/* Círculo com fundo primary/10 */}
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-primary/10 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: 0.3,
                  }}
                >
                  <CheckCircle className="w-12 h-12 md:w-16 md:h-16 text-primary" strokeWidth={1.5} />
                </motion.div>
              </div>
              {/* Pulse ring animado */}
              <motion.div
                initial={{ scale: 0.8, opacity: 1 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
                className="absolute inset-0 w-20 h-20 md:w-28 md:h-28 rounded-full bg-primary/20"
              />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-2xl md:text-3xl font-bold text-foreground mb-3"
          >
            Solicitação Recebida!
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-base text-muted-foreground mb-8 px-2"
          >
            Nossa equipe já recebeu seus dados e iniciou a cotação nas melhores seguradoras.
          </motion.p>

          {/* Timeline Steps - Card com border consistente */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card border border-border rounded-xl p-5 md:p-6 mb-8"
          >
            <h2 className="text-sm font-semibold text-foreground mb-4 text-left uppercase tracking-wide">
              Próximos Passos
            </h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-start gap-3 text-left"
                >
                  {/* Ícone dentro de círculo com bg-primary/10 */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="font-medium text-foreground mb-0.5 text-sm">
                      {index + 1}. {step.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Action Buttons - Padronizados com rounded-xl */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="space-y-3"
          >
            {/* Primary CTA - Solid */}
            <button
              onClick={() => navigate("/seguros")}
              className="w-full py-3.5 px-6 bg-primary text-primary-foreground rounded-xl font-medium transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Cotar Outro Seguro
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Secondary Actions - Outline */}
            <div className="flex gap-3 w-full">
              <button
                onClick={() => window.open("https://search.google.com/local/writereview?placeid=ChIJJccNKahDzpQR9Hc-bGNri8k&source=g.page.m.ia._&laa=nmx-review-solicitation-ia2", "_blank")}
                className="flex-1 py-3 px-4 border-2 border-primary/20 text-primary rounded-xl font-medium transition-all hover:bg-primary/5 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Star className="w-4 h-4" />
                <span className="hidden sm:inline">Avaliar</span>
                <span className="sm:hidden">Avaliar</span>
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex-1 py-3 px-4 border-2 border-primary/20 text-primary rounded-xl font-medium transition-all hover:bg-primary/5 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>
            </div>

            {/* Link institucional - Texto simples */}
            <button
              onClick={() => window.open("https://jjamorimseguros.com.br", "_blank")}
              className="w-full py-2 text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Site Institucional
            </button>
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default Success;
