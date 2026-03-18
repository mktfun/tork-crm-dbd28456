import { motion, Variants } from "framer-motion";

interface AnimatedTextProps {
  children: string;
  className?: string;
  delay?: number;
  highlightWord?: string;
  highlightClassName?: string;
}

export const AnimatedText = ({
  children,
  className = "",
  delay = 0,
  highlightWord,
  highlightClassName = "text-secondary",
}: AnimatedTextProps) => {
  const words = children.split(" ");

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: delay },
    },
  };

  const child: Variants = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
    },
  };

  return (
    <motion.span
      className={`inline-flex flex-wrap ${className}`}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, index) => {
        const isHighlight = word.includes(highlightWord || "");
        return (
          <motion.span
            key={index}
            variants={child}
            className={`mr-[0.25em] ${isHighlight ? highlightClassName : ""}`}
          >
            {word}
          </motion.span>
        );
      })}
    </motion.span>
  );
};

interface AnimatedHeadlineProps {
  line1: string;
  highlight: string;
  line2: string;
  className?: string;
}

export const AnimatedHeadline = ({
  line1,
  highlight,
  line2,
  className = "",
}: AnimatedHeadlineProps) => {
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const wordVariants: Variants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      filter: "blur(10px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        damping: 20,
        stiffness: 100,
      },
    },
  };

  const highlightVariants: Variants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.9,
      filter: "blur(10px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        damping: 15,
        stiffness: 80,
        delay: 0.1,
      },
    },
  };

  const underlineVariants: Variants = {
    hidden: { 
      pathLength: 0,
      opacity: 0,
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 0.8,
        delay: 0.6,
        ease: "easeOut" as const,
      },
    },
  };

  return (
    <motion.h1
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {line1.split(" ").map((word, i) => (
        <motion.span key={i} variants={wordVariants} className="inline-block mr-[0.25em]">
          {word}
        </motion.span>
      ))}
      <motion.span className="relative inline-block mr-[0.25em]" variants={highlightVariants}>
        <span className="text-secondary">{highlight}</span>
        <motion.svg 
          className="absolute -bottom-2 left-0 w-full h-3 text-secondary/30" 
          viewBox="0 0 200 12" 
          fill="none"
        >
          <motion.path 
            d="M2 10C50 4 150 4 198 10" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round"
            variants={underlineVariants}
          />
        </motion.svg>
      </motion.span>
      {line2.split(" ").map((word, i) => (
        <motion.span key={`l2-${i}`} variants={wordVariants} className="inline-block mr-[0.25em]">
          {word}
        </motion.span>
      ))}
    </motion.h1>
  );
};
