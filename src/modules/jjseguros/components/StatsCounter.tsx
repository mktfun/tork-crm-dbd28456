import { motion, Variants } from "framer-motion";
import { AnimatedCounter } from "./AnimatedCounter";
import { Calendar, Users, BadgeDollarSign, ThumbsUp } from "lucide-react";

const stats = [
  {
    icon: Calendar,
    value: 10,
    prefix: "+",
    suffix: "",
    label: "anos de experiência",
    gradient: "from-primary/10 to-primary/5",
  },
  {
    icon: Users,
    value: 1000,
    prefix: "+",
    suffix: "",
    label: "clientes protegidos",
    gradient: "from-primary/10 to-primary/5",
  },
  {
    icon: BadgeDollarSign,
    value: 8,
    prefix: "R$ ",
    suffix: "M+",
    label: "em sinistros pagos",
    gradient: "from-primary/10 to-primary/5",
  },
  {
    icon: ThumbsUp,
    value: 97,
    prefix: "",
    suffix: "%",
    label: "de satisfação",
    gradient: "from-primary/10 to-primary/5",
  },
];

export const StatsCounter = () => {
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.9,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-16"
    >
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          variants={itemVariants}
          whileHover={{ 
            y: -4,
            transition: { type: "spring", stiffness: 300, damping: 20 }
          }}
          className="relative group text-center"
        >
          {/* Glow effect on hover */}
          <motion.div
            className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} rounded-2xl blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
          />
          
          <div className="relative glass-card rounded-2xl p-6 lg:p-8 bg-white border border-[#f0f0f0] shadow-sm">
            {/* Icon */}
            <motion.div
              className={`mx-auto mb-4 w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center`}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
            >
              <stat.icon size={24} className="text-primary" />
            </motion.div>

            {/* Number */}
            <div className="text-3xl lg:text-4xl font-bold text-foreground mb-1">
              <AnimatedCounter 
                value={stat.value} 
                prefix={stat.prefix} 
                suffix={stat.suffix}
              />
            </div>

            {/* Label */}
            <p className="text-sm text-muted-foreground">
              {stat.label}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};
