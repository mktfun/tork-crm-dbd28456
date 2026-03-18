import { motion, Variants } from "framer-motion";
import { Star, Quote, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

const testimonial = {
  quote: "Atendimento excepcional! Conseguiram o melhor preço e ainda me ajudaram em todo o processo de sinistro.",
  author: "Maria Silva",
  role: "Cliente há 3 anos",
};

const avatars = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face",
];

export const SocialProof = () => {
  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 200,
        damping: 15,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="mt-16 relative"
    >
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 via-transparent to-secondary/5 rounded-3xl" />

      <div className="relative glass-card rounded-3xl p-8 lg:p-12 overflow-hidden">
        {/* Quote decoration */}
        <motion.div 
          className="absolute top-6 right-8 text-secondary/10"
          initial={{ opacity: 0, rotate: -20 }}
          whileInView={{ opacity: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Quote size={80} />
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Testimonial */}
          <div>
            <motion.blockquote 
              className="text-lg lg:text-xl text-foreground font-medium mb-6 relative z-10"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              "{testimonial.quote}"
            </motion.blockquote>

            <motion.div 
              className="flex items-center gap-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center text-white font-bold text-lg">
                {testimonial.author.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-foreground">{testimonial.author}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </motion.div>
          </div>

          {/* Right side - Stats & CTA */}
          <div className="flex flex-col items-center lg:items-end gap-6">
            {/* Google Reviews Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
              whileHover={{ scale: 1.05, y: -2 }}
              className="flex items-center gap-3 bg-white rounded-full px-5 py-2.5 shadow-sm border border-border"
            >
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">5 estrelas</span>
                <span className="text-xs text-muted-foreground">+100 avaliações no Google</span>
              </div>
            </motion.div>

            {/* Avatars stack */}
            <motion.div 
              className="flex items-center"
              variants={containerVariants}
            >
              <div className="flex -space-x-3">
                {avatars.map((avatar, i) => (
                  <motion.img
                    key={i}
                    src={avatar}
                    alt={`Cliente ${i + 1}`}
                    className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                    variants={itemVariants}
                    whileHover={{ y: -4, zIndex: 10 }}
                  />
                ))}
              </div>
              <motion.span 
                className="ml-4 text-sm text-muted-foreground"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
              >
                +1.000 clientes
              </motion.span>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button variant="cta" size="lg" className="group" asChild>
                <Link to="/cotacao">
                  Junte-se a milhares de clientes
                  <ExternalLink size={16} className="ml-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
