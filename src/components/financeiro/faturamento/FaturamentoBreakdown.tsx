import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Users, Building2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BreakdownItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface FaturamentoBreakdownProps {
  porProdutor?: BreakdownItem[];
  porRamo?: BreakdownItem[];
  porSeguradora?: BreakdownItem[];
}

const MOCK_POR_PRODUTOR: BreakdownItem[] = [
  { name: "João Silva", value: 125000, percentage: 36, color: "bg-blue-500" },
  { name: "Maria Santos", value: 98000, percentage: 28, color: "bg-emerald-500" },
  { name: "Carlos Oliveira", value: 75000, percentage: 22, color: "bg-amber-500" },
  { name: "Ana Costa", value: 47200, percentage: 14, color: "bg-purple-500" },
];

const MOCK_POR_RAMO: BreakdownItem[] = [
  { name: "Auto", value: 180000, percentage: 52, color: "bg-blue-500" },
  { name: "Vida", value: 95000, percentage: 28, color: "bg-emerald-500" },
  { name: "Residencial", value: 70200, percentage: 20, color: "bg-amber-500" },
];

const MOCK_POR_SEGURADORA: BreakdownItem[] = [
  { name: "Porto Seguro", value: 140000, percentage: 41, color: "bg-blue-500" },
  { name: "Azul Seguros", value: 115000, percentage: 33, color: "bg-sky-500" },
  { name: "Bradesco", value: 90200, percentage: 26, color: "bg-red-500" },
];

function BreakdownList({ items }: { items: BreakdownItem[] }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{item.name}</span>
            <span className="text-muted-foreground">{formatCurrency(item.value)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={item.percentage} className="h-2" />
            <span className="text-xs text-muted-foreground w-12 text-right">
              {item.percentage}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FaturamentoBreakdown({
  porProdutor = MOCK_POR_PRODUTOR,
  porRamo = MOCK_POR_RAMO,
  porSeguradora = MOCK_POR_SEGURADORA,
}: FaturamentoBreakdownProps) {
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
            <BreakdownList items={porProdutor} />
          </TabsContent>

          <TabsContent value="ramo" className="mt-4">
            <BreakdownList items={porRamo} />
          </TabsContent>

          <TabsContent value="seguradora" className="mt-4">
            <BreakdownList items={porSeguradora} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
