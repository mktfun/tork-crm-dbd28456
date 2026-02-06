import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, MoreVertical, Landmark } from "lucide-react";
import { BankAccount } from "@/hooks/useBancos";
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
  onClick?: (account: BankAccount) => void;
}

export function BankAccountCard({ account, onEdit, onDelete, onClick }: BankAccountCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Não disparar onClick se clicar no dropdown
    if ((e.target as HTMLElement).closest('[data-dropdown]')) return;
    onClick?.(account);
  };

  // Mapeamento de tipo de conta para português
  const accountTypeLabels: Record<string, string> = {
    corrente: 'Corrente',
    poupanca: 'Poupança',
    investimento: 'Investimento',
    giro: 'Giro',
  };

  return (
    <Card
      className="relative overflow-hidden hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] group"
      style={{ borderLeftColor: account.color || '#3b82f6', borderLeftWidth: '4px' }}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {account.icon ? (
              <span className="text-2xl">{account.icon}</span>
            ) : (
              <div
                className="p-1.5 rounded-lg"
                style={{ backgroundColor: account.color ? `${account.color}20` : '#3b82f620' }}
              >
                <Landmark
                  className="w-5 h-5"
                  style={{ color: account.color || '#3b82f6' }}
                />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                {account.bankName}
              </h3>
              {account.accountNumber && (
                <p className="text-xs text-muted-foreground">{account.accountNumber}</p>
              )}
            </div>
          </div>

          {(onEdit || onDelete) && (
            <div data-dropdown>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(account); }}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onDelete(account); }}
                      className="text-destructive"
                    >
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-2xl font-bold" style={{ color: account.color || '#3b82f6' }}>
              {formatCurrency(account.currentBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Saldo atual</p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Badge variant={account.isActive ? "default" : "secondary"} className="text-xs">
              {account.isActive ? "Ativa" : "Inativa"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {accountTypeLabels[account.accountType] || account.accountType}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
