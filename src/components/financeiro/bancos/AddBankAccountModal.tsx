import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateBankAccount, type BankAccountType } from "@/hooks/useBancos";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

const BANK_COLORS = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Laranja', value: '#FF6B00' },
  { name: 'Vermelho', value: '#CC092F' },
  { name: 'Roxo', value: '#8A05BE' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Amarelo', value: '#F59E0B' },
];

const BANK_ICONS = [
  { name: 'Banco', value: '🏦' },
  { name: 'Caixa', value: '🏧' },
  { name: 'Cartão', value: '💳' },
  { name: 'Dinheiro', value: '💵' },
  { name: 'Cofre', value: '🔒' },
  { name: 'Porquinho', value: '🐷' },
];

export function AddBankAccountModal() {
  const [open, setOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [agency, setAgency] = useState('');
  const [accountType, setAccountType] = useState<BankAccountType>('corrente');
  const [initialBalance, setInitialBalance] = useState('');
  const [color, setColor] = useState(BANK_COLORS[0].value);
  const [icon, setIcon] = useState(BANK_ICONS[0].value);

  const createMutation = useCreateBankAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankName.trim()) {
      toast.error('Nome do banco é obrigatório');
      return;
    }

    const balance = parseFloat(initialBalance) || 0;

    try {
      await createMutation.mutateAsync({
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim() || undefined,
        agency: agency.trim() || undefined,
        accountType,
        initialBalance: balance,
        color,
        icon,
      });

      toast.success('Banco cadastrado com sucesso!');
      setOpen(false);
      
      // Reset form
      setBankName('');
      setAccountNumber('');
      setAgency('');
      setAccountType('corrente');
      setInitialBalance('');
      setColor(BANK_COLORS[0].value);
      setIcon(BANK_ICONS[0].value);
    } catch (error: any) {
      toast.error('Erro ao cadastrar banco: ' + error.message);
    }
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseFloat(numbers) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numbers = value.replace(/\D/g, '');
    setInitialBalance(numbers ? String(parseFloat(numbers) / 100) : '');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Banco
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar Conta Bancária</DialogTitle>
            <DialogDescription>
              Cadastre uma nova conta bancária para gerenciar seus saldos e movimentações.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Nome do Banco */}
            <div className="grid gap-2">
              <Label htmlFor="bank-name">
                Nome do Banco <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bank-name"
                placeholder="Ex: Itaú Empresas, Bradesco, Nubank PJ"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
              />
            </div>

            {/* Tipo de Conta */}
            <div className="grid gap-2">
              <Label htmlFor="account-type">Tipo de Conta</Label>
              <Select value={accountType} onValueChange={(v) => setAccountType(v as BankAccountType)}>
                <SelectTrigger id="account-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrente">Conta Corrente</SelectItem>
                  <SelectItem value="poupanca">Poupança</SelectItem>
                  <SelectItem value="investimento">Investimento</SelectItem>
                  <SelectItem value="giro">Conta Giro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Agência e Conta */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="agency">Agência</Label>
                <Input
                  id="agency"
                  placeholder="Ex: 0001"
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account-number">Número da Conta</Label>
                <Input
                  id="account-number"
                  placeholder="Ex: 12345-6"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Saldo Inicial */}
            <div className="grid gap-2">
              <Label htmlFor="initial-balance">
                Saldo Inicial <span className="text-red-500">*</span>
              </Label>
              <Input
                id="initial-balance"
                type="text"
                placeholder="R$ 0,00"
                value={initialBalance ? formatCurrency(initialBalance) : ''}
                onChange={handleBalanceChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                Informe o saldo atual desta conta. Pode ser zero se estiver começando agora.
              </p>
            </div>

            {/* Cor e Ícone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="color">Cor</Label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger id="color">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                      <span>{BANK_COLORS.find(c => c.value === color)?.name}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: c.value }} />
                          <span>{c.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="icon">Ícone</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger id="icon">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{icon}</span>
                      <span>{BANK_ICONS.find(i => i.value === icon)?.name}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_ICONS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{i.value}</span>
                          <span>{i.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Cadastrar Banco
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
