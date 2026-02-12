import { useState } from "react";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppCard } from "@/components/ui/app-card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { useAgingReport } from "@/hooks/useFinanceiro";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AgingReportCardProps {
  defaultType?: 'receivables' | 'payables';
}

export function AgingReportCard({ defaultType = 'receivables' }: AgingReportCardProps) {
  const [type, setType] = useState<'receivables' | 'payables'>(defaultType);
  const { data: buckets, isLoading, error } = useAgingReport(type);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalAmount = buckets?.reduce((sum, bucket) => sum + Number(bucket.bucketAmount), 0) || 0;

  if (isLoading) {
    return (
      <AppCard>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Relatório de Aging</CardTitle>
              <CardDescription>Faturas e recebíveis em atraso</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </AppCard>
    );
  }

  if (error) {
    return (
      <AppCard>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Relatório de Aging</CardTitle>
              <CardDescription>Faturas e recebíveis em atraso</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar relatório: {error.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </AppCard>
    );
  }

  if (!buckets || buckets.length === 0) {
    return (
      <AppCard>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Relatório de Aging</CardTitle>
                <CardDescription>Faturas e recebíveis em atraso</CardDescription>
              </div>
            </div>
            <Tabs value={type} onValueChange={(v) => v && setType(v as 'receivables' | 'payables')} className="w-auto">
              <TabsList className="bg-white/5 backdrop-blur-md border border-white/10 p-1 rounded-xl h-9">
                <TabsTrigger value="receivables" className="text-xs px-3 h-7 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  A Receber
                </TabsTrigger>
                <TabsTrigger value="payables" className="text-xs px-3 h-7 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  A Pagar
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma receita em atraso</p>
            <p className="text-xs mt-1">Parabéns! Suas contas estão em dia.</p>
          </div>
        </CardContent>
      </AppCard>
    );
  }

  return (
    <AppCard>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Relatório de Aging</CardTitle>
              <CardDescription>Faturas e recebíveis em atraso</CardDescription>
            </div>
          </div>
          <Tabs value={type} onValueChange={(v) => v && setType(v as 'receivables' | 'payables')} className="w-auto">
            <TabsList className="bg-white/5 backdrop-blur-md border border-white/10 p-1 rounded-xl h-9">
              <TabsTrigger value="receivables" className="text-xs px-3 h-7 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                A Receber
              </TabsTrigger>
              <TabsTrigger value="payables" className="text-xs px-3 h-7 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                A Pagar
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {buckets.map((bucket) => {
          const percentage = totalAmount > 0 ? (Number(bucket.bucketAmount) / totalAmount) * 100 : 0;
          return (
            <div key={bucket.bucketRange} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{bucket.bucketRange}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {bucket.bucketCount} {bucket.bucketCount === 1 ? 'transação' : 'transações'}
                  </span>
                  <span className="font-semibold" style={{ color: bucket.bucketColor }}>
                    {formatCurrency(Number(bucket.bucketAmount))}
                  </span>
                </div>
              </div>
              <Progress
                value={percentage}
                className="h-2"
                style={{
                  ['--progress-background' as any]: bucket.bucketColor
                }}
              />
            </div>
          );
        })}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total em Atraso</span>
            <span className="text-lg font-bold text-destructive">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      </CardContent>
    </AppCard>
  );
}
