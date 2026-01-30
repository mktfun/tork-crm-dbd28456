import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Users, Building2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useRevenueByDimension } from "@/hooks/useFinanceiro";
import { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FaturamentoBreakdownProps {
  dateRange?: DateRange;
}

function BreakdownList({ 
  dimension, 
  dateRange 
}: { 
  dimension: 'producer' | 'type' | 'insurance_company';
  dateRange?: DateRange;
}) {
  const { data, isLoading, error } = useRevenueByDimension(dimension, dateRange);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar dados: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhum dado disponível para este período</p>
      </div>
    );
  }

  // Mostrar apenas os top 3
  const topItems = data.slice(0, 3);

  return (
    <div className="space-y-4">
      {topItems.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium truncate max-w-[200px]" title={item.dimensionName}>
              {item.dimensionName}
            </span>
            <span className="text-muted-foreground">
              {formatCurrency(item.totalAmount)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={item.percentage} className="h-2" />
            <span className="text-xs text-muted-foreground w-12 text-right">
              {item.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {item.transactionCount} {item.transactionCount === 1 ? 'transação' : 'transações'}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FaturamentoBreakdown({ dateRange }: FaturamentoBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="w-5 h-5 text-primary" />
          Análise por Dimensão
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="produtor" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="produtor" className="gap-1 text-xs">
              <Users className="w-3 h-3" />
              Produtor
            </TabsTrigger>
            <TabsTrigger value="ramo" className="gap-1 text-xs">
              <PieChart className="w-3 h-3" />
              Ramo
            </TabsTrigger>
            <TabsTrigger value="seguradora" className="gap-1 text-xs">
              <Building2 className="w-3 h-3" />
              Seguradora
            </TabsTrigger>
          </TabsList>

          <TabsContent value="produtor" className="mt-4">
            <BreakdownList dimension="producer" dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="ramo" className="mt-4">
            <BreakdownList dimension="type" dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="seguradora" className="mt-4">
            <BreakdownList dimension="insurance_company" dateRange={dateRange} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
