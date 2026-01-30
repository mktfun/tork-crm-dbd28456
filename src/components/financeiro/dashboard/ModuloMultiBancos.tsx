import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Landmark, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BankAccount {
  id: string;
  name: string;
  balance: number;
  color: string;
  bgColor: string;
  lastTransaction: string;
  type: "corrente" | "poupanca" | "investimento" | "giro";
}

const BANK_DATA: BankAccount[] = [
  {
    id: "1",
    name: "Itaú Empresas",
    balance: 45200,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10 border-orange-500/20",
    lastTransaction: "Entrada: R$ 2k hoje",
    type: "corrente",
  },
  {
    id: "2",
    name: "Nubank PJ",
    balance: 12850,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10 border-purple-500/20",
    lastTransaction: "Saída: R$ 800 ontem",
    type: "giro",
  },
  {
    id: "3",
    name: "Bradesco",
    balance: 8900,
    color: "text-red-500",
    bgColor: "bg-red-500/10 border-red-500/20",
    lastTransaction: "Rendimento: R$ 45",
    type: "poupanca",
  },
  {
    id: "4",
    name: "Caixinha Inter",
    balance: 55000,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10 border-yellow-500/20",
    lastTransaction: "Aporte: R$ 5k",
    type: "investimento",
  },
];

const TOTAL_BALANCE = BANK_DATA.reduce((sum, bank) => sum + bank.balance, 0);

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const getTypeBadge = (type: BankAccount["type"]) => {
  const types = {
    corrente: { label: "Corrente", variant: "secondary" as const },
    poupanca: { label: "Poupança", variant: "outline" as const },
    investimento: { label: "Investimento", variant: "default" as const },
    giro: { label: "Giro", variant: "secondary" as const },
  };
  return types[type];
};

export const ModuloMultiBancos = () => {
  return (
    <Card className="h-full bg-zinc-900/50 border-zinc-800 flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Landmark className="h-5 w-5 text-primary" />
          Saldos Bancários
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {/* Hero: Saldo Consolidado */}
        <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-4 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-400 uppercase tracking-wide">
              Saldo Consolidado Disponível
            </span>
            <Badge variant="secondary" className="text-[10px] h-5">
              Atualizado agora
            </Badge>
          </div>
          <p className="text-3xl font-bold tracking-tight text-primary">
            {formatCurrency(TOTAL_BALANCE)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {BANK_DATA.length} contas ativas
          </p>
        </div>

        {/* Grid de Bancos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          {BANK_DATA.map((bank) => {
            const typeBadge = getTypeBadge(bank.type);
            return (
              <div
                key={bank.id}
                className={cn(
                  "rounded-lg border p-3 transition-colors hover:bg-zinc-800/50",
                  bank.bgColor
                )}
              >
                {/* Header do Mini-Card */}
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className={cn("h-4 w-4", bank.color)} />
                  <span className="text-sm font-medium text-zinc-200 truncate">
                    {bank.name}
                  </span>
                </div>

                {/* Saldo */}
                <p className="text-lg font-semibold text-white mb-2">
                  {formatCurrency(bank.balance)}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <Badge variant={typeBadge.variant} className="text-[10px] h-5">
                    {typeBadge.label}
                  </Badge>
                  <span className="text-[10px] text-zinc-500 truncate max-w-[80px]">
                    {bank.lastTransaction}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ModuloMultiBancos;
