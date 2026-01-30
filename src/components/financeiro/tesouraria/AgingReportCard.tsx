import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle } from "lucide-react";
import { AgingBucket } from "@/data/mocks/financeiroMocks";

interface AgingReportCardProps {
  buckets: AgingBucket[];
  totalAmount: number;
}

export function AgingReportCard({ buckets, totalAmount }: AgingReportCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getRangeLabel = (range: string) => {
    const labels: Record<string, string> = {
      '5': '0-5 dias',
      '15': '6-15 dias',
      '30': '16-30 dias',
      '60+': '60+ dias',
    };
    return labels[range] || range;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <CardTitle className="text-base">Relatório de Aging</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {buckets.map((bucket) => {
          const percentage = (bucket.amount / totalAmount) * 100;
          return (
            <div key={bucket.range} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{getRangeLabel(bucket.range)}</span>
                <span className="font-semibold" style={{ color: bucket.color }}>
                  {formatCurrency(bucket.amount)}
                </span>
              </div>
              <Progress 
                value={percentage} 
                className="h-2" 
                indicatorClassName={`bg-[${bucket.color}]`}
                style={{ 
                  ['--progress-background' as any]: bucket.color 
                }}
              />
            </div>
          );
        })}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total em Atraso</span>
            <span className="text-lg font-bold text-red-600">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
