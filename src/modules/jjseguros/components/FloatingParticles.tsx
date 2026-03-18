import { motion } from "framer-motion";

interface Particle {
  id: number;
  size: number;
  x: string;
  y: string;
  duration: number;
  delay: number;
}

interface FloatingParticlesProps {
  count?: number;
  className?: string;
}

export const FloatingParticles = ({ count = 5, className = "" }: FloatingParticlesProps) => {
  const particles: Particle[] = Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 4,
    x: `${Math.random() * 100}%`,
    y: `${Math.random() * 100}%`,
    duration: Math.random() * 4 + 6,
    delay: Math.random() * 2,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-secondary/20"
          style={{
            width: particle.size,
            height: particle.size,
            left: particle.x,
            top: particle.y,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 10, -10, 0],
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};
