import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface GaugeChartProps {
  percentage: number;
  size?: number;
}

export function GaugeChart({ percentage, size = 200 }: GaugeChartProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const clampedPercent = Math.min(animatedValue, 100);

  useEffect(() => {
    // Small delay then animate
    const timer = setTimeout(() => setAnimatedValue(Math.min(percentage, 100)), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const getColor = (val: number) => {
    if (val >= 90) return 'hsl(152, 69%, 41%)'; // emerald
    if (val >= 50) return 'hsl(38, 92%, 50%)';  // amber
    return 'hsl(0, 84%, 60%)';                   // red
  };

  const color = getColor(percentage);
  const isAchieved = percentage >= 100;

  // Data for the filled arc
  const filledAngle = 180 * (clampedPercent / 100);
  const bgData = [{ value: 1 }];
  const fillData = [{ value: clampedPercent }, { value: 100 - clampedPercent }];

  return (
    <div className="relative flex justify-center items-end" style={{ height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* Background track */}
          <Pie
            data={bgData}
            dataKey="value"
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius="65%"
            outerRadius="90%"
            fill="hsl(var(--muted))"
            stroke="none"
            isAnimationActive={false}
          />
          {/* Filled arc */}
          <Pie
            data={fillData}
            dataKey="value"
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius="65%"
            outerRadius="90%"
            cornerRadius={6}
            stroke="none"
            isAnimationActive={true}
            animationBegin={100}
            animationDuration={1800}
            animationEasing="ease-out"
          >
            <Cell fill={color} />
            <Cell fill="transparent" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center value */}
      <motion.div
        className="absolute bottom-2 text-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <span
          className="text-4xl font-bold"
          style={isAchieved ? { color, textShadow: `0 0 20px ${color}` } : { color: 'hsl(var(--foreground))' }}
        >
          {Math.round(percentage)}%
        </span>
        <p className="text-xs text-muted-foreground">do objetivo</p>
      </motion.div>

      {/* Glow effect when achieved */}
      {isAchieved && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 rounded-full blur-2xl opacity-30 animate-pulse"
          style={{ backgroundColor: color }}
        />
      )}
    </div>
  );
}
