import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReconciliationProgressBarProps {
  progress: number; // 0-100
  pendingCount?: number;
}

export function ReconciliationProgressBar({ progress, pendingCount }: ReconciliationProgressBarProps) {
  const getProgressColor = () => {
    if (progress >= 80) return "bg-emerald-500";
    if (progress >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const getStatusText = () => {
    if (progress >= 80) return "Conciliação em dia";
    if (progress >= 50) return "Atenção necessária";
    return "Existem transações pendentes de conciliação";
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className={cn(
            "w-5 h-5",
            progress >= 80 ? "text-emerald-500" : progress >= 50 ? "text-amber-500" : "text-red-500"
          )} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Conciliação Bancária</span>
              <span className="text-sm font-bold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" indicatorClassName={getProgressColor()} />
            <p className="text-xs text-muted-foreground mt-1">
              {getStatusText()}
              {pendingCount && pendingCount > 0 && ` (${pendingCount} pendentes)`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
