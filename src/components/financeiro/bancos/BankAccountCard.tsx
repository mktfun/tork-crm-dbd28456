import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, MoreVertical } from "lucide-react";
import { BankAccount } from "@/data/mocks/financeiroMocks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BankAccountCardProps {
  account: BankAccount;
  onEdit?: (account: BankAccount) => void;
  onDelete?: (account: BankAccount) => void;
}

export function BankAccountCard({ account, onEdit, onDelete }: BankAccountCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card 
      className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      style={{ borderLeftColor: account.color, borderLeftWidth: '4px' }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{account.icon}</span>
            <div>
              <h3 className="font-semibold text-base">{account.bankName}</h3>
              <p className="text-xs text-muted-foreground">{account.accountNumber}</p>
            </div>
          </div>
          
          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(account)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(account)}
                    className="text-destructive"
                  >
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-2xl font-bold" style={{ color: account.color }}>
              {formatCurrency(account.balance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{account.label}</p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Badge variant={account.isActive ? "default" : "secondary"} className="text-xs">
              {account.isActive ? "Ativa" : "Inativa"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
