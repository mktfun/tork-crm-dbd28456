import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface GaugeChartProps {
  percentage: number;
}

export function GaugeChart({ percentage }: GaugeChartProps) {
  const clamped = Math.min(percentage, 100);

  const getColor = (val: number) => {
    if (val >= 90) return 'hsl(152, 69%, 41%)';
    if (val >= 50) return 'hsl(38, 92%, 50%)';
    return 'hsl(0, 84%, 60%)';
  };

  const color = getColor(percentage);
  const isAchieved = percentage >= 100;

  const endAngle = 180 - (180 * (clamped / 100));
  const fillData = [{ value: clamped }, { value: 100 - clamped }];

  return (
    <div className="relative h-[180px] w-full flex justify-center items-end -mt-4 pb-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          {/* Background track */}
          <Pie
            data={[{ value: 100 }]}
            dataKey="value"
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius="60%"
            outerRadius="100%"
            fill="hsl(var(--muted))"
            stroke="none"
            isAnimationActive={false}
          />
          {/* Filled indicator */}
          <Pie
            data={fillData}
            dataKey="value"
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius="60%"
            outerRadius="100%"
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

      {/* Center value overlay */}
      <motion.div
        className="absolute bottom-2 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <span
          className="text-4xl font-bold tracking-tighter"
          style={isAchieved
            ? { color, textShadow: `0 0 20px ${color}` }
            : { color: 'hsl(var(--foreground))' }
          }
        >
          {Math.round(percentage)}%
        </span>
        {isAchieved ? (
          <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-1">
            Meta Batida! 🚀
          </span>
        ) : (
          <p className="text-xs text-muted-foreground">do objetivo</p>
        )}
      </motion.div>

      {/* Glow pulse when achieved */}
      {isAchieved && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 rounded-full blur-2xl opacity-30 animate-pulse"
          style={{ backgroundColor: color }}
        />
      )}
    </div>
  );
}
