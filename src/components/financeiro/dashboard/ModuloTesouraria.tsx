import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpCircle, ArrowDownCircle, Wallet, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgingCategory {
  label: string;
  value: string;
  percent: number;
  color: string;
}

interface Transaction {
  description: string;
  value: string;
  date: string;
  type: "in" | "out";
}

const AGING_DATA: AgingCategory[] = [
  { label: "0-5 dias", value: "R$ 94.250", percent: 65, color: "bg-emerald-500" },
  { label: "6-15 dias", value: "R$ 29.000", percent: 20, color: "bg-yellow-500" },
  { label: "16-30 dias", value: "R$ 14.500", percent: 10, color: "bg-orange-500" },
  { label: "30-60 dias", value: "R$ 4.350", percent: 3, color: "bg-red-500" },
  { label: "60+ dias", value: "R$ 2.900", percent: 2, color: "bg-red-700" },
];

const UPCOMING_TRANSACTIONS: Transaction[] = [
  { description: "Apólice Auto #1234", value: "R$ 2.450,00", date: "31/01", type: "in" },
  { description: "Comissão Seguradora X", value: "R$ 8.900,00", date: "02/02", type: "in" },
  { description: "Aluguel Escritório", value: "R$ 3.200,00", date: "05/02", type: "out" },
  { description: "Renovação Empresarial", value: "R$ 15.000,00", date: "07/02", type: "in" },
  { description: "Impostos DAS", value: "R$ 1.850,00", date: "10/02", type: "out" },
];

const LIQUIDITY = {
  receivable: { value: "R$ 145.000,00", label: "A Receber (30d)" },
  payable: { value: "R$ 89.400,00", label: "A Pagar (30d)" },
};

const AgingBar = ({ item }: { item: AgingCategory }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-400">{item.label}</span>
      <span className="text-zinc-300 font-medium">{item.value}</span>
    </div>
    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", item.color)}
        style={{ width: `${item.percent}%` }}
      />
    </div>
  </div>
);

export const ModuloTesouraria = () => {
  return (
    <Card className="h-full bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Wallet className="h-5 w-5 text-primary" />
          Tesouraria & Contas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Coluna Esquerda: Liquidez */}
          <div className="space-y-4">
            {/* Cards de Saldo */}
            <div className="grid grid-cols-2 gap-3">
              {/* A Receber */}
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                <div className="flex items-center gap-2 text-emerald-500 mb-1">
                  <ArrowUpCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">A Receber</span>
                </div>
                <p className="text-lg font-bold text-emerald-400">
                  {LIQUIDITY.receivable.value}
                </p>
                <p className="text-xs text-zinc-500">Próx. 30 dias</p>
              </div>

              {/* A Pagar */}
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3">
                <div className="flex items-center gap-2 text-rose-500 mb-1">
                  <ArrowDownCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">A Pagar</span>
                </div>
                <p className="text-lg font-bold text-rose-400">
                  {LIQUIDITY.payable.value}
                </p>
                <p className="text-xs text-zinc-500">Próx. 30 dias</p>
              </div>
            </div>

            {/* Próximos Vencimentos */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-zinc-500" />
                <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  Próximos Vencimentos
                </h4>
              </div>
              <div className="space-y-2">
                {UPCOMING_TRANSACTIONS.map((tx, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5 border-b border-zinc-800 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          tx.type === "in" ? "bg-emerald-500" : "bg-rose-500"
                        )}
                      />
                      <span className="text-xs text-zinc-300 truncate max-w-[120px]">
                        {tx.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-500">{tx.date}</span>
                      <span
                        className={cn(
                          "font-medium",
                          tx.type === "in" ? "text-emerald-400" : "text-rose-400"
                        )}
                      >
                        {tx.type === "out" && "-"}
                        {tx.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Aging Report */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Inadimplência por Período
            </h4>
            <div className="space-y-3">
              {AGING_DATA.map((item, index) => (
                <AgingBar key={index} item={item} />
              ))}
            </div>
            
            {/* Resumo Aging */}
            <div className="mt-4 pt-3 border-t border-zinc-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Taxa de inadimplência</span>
                <span className="text-yellow-500 font-semibold">5%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModuloTesouraria;
