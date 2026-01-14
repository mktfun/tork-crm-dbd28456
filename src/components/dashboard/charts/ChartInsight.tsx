
import { LucideIcon } from 'lucide-react';

interface ChartInsightProps {
  icon: LucideIcon;
  text: string;
}

export function ChartInsight({ icon: Icon, text }: ChartInsightProps) {
  return (
    <div className="mt-4 p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/20 rounded-lg">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <p className="text-sm text-white/80 leading-relaxed flex-1">
          {text}
        </p>
      </div>
    </div>
  );
}
