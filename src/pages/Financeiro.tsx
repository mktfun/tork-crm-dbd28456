import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Wallet } from "lucide-react";
import FinanceiroExecutivo from "./FinanceiroExecutivo";
import FinanceiroERP from "./FinanceiroERP";

const Financeiro = () => {
  return (
    <div className="space-y-6">
      {/* Header Unificado */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Wallet className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão Financeira</h1>
          <p className="text-sm text-muted-foreground">
            Controle total de fluxo de caixa, faturamento e contas.
          </p>
        </div>
      </div>

      {/* Sistema de Tabs */}
      <Tabs defaultValue="executivo" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="executivo" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Dashboard Executivo
          </TabsTrigger>
          <TabsTrigger value="erp" className="gap-2">
            <Wallet className="w-4 h-4" />
            Lançamentos & ERP
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo: Executivo */}
        <TabsContent value="executivo">
          <FinanceiroExecutivo />
        </TabsContent>

        {/* Conteúdo: ERP */}
        <TabsContent value="erp">
          <FinanceiroERP />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Financeiro;
