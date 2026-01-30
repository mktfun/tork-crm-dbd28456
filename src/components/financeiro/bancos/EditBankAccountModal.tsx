import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useUpdateBankAccount, type BankAccount, type BankAccountType } from "@/hooks/useBancos";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

interface EditBankAccountModalProps {
  account: BankAccount | null;
  open: boolean;
  onClose: () => void;
}

export function EditBankAccountModal({ account, open, onClose }: EditBankAccountModalProps) {
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [agency, setAgency] = useState('');
  const [accountType, setAccountType] = useState<BankAccountType>('corrente');
  const [color, setColor] = useState(BANK_COLORS[0].value);
  const [icon, setIcon] = useState(BANK_ICONS[0].value);

  const updateMutation = useUpdateBankAccount();

  // Preencher formulário quando modal abre
  useEffect(() => {
    if (open && account) {
      setBankName(account.bankName);
      setAccountNumber(account.accountNumber || '');
      setAgency(account.agency || '');
      setAccountType(account.accountType);
      setColor(account.color || BANK_COLORS[0].value);
      setIcon(account.icon || BANK_ICONS[0].value);
    }
  }, [open, account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) return;

    if (!bankName.trim()) {
      toast.error('Nome do banco é obrigatório');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: account.id,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim() || undefined,
        agency: agency.trim() || undefined,
        accountType,
        color,
        icon,
      });

      toast.success('Banco atualizado com sucesso!');
      onClose();
    } catch (error: any) {
      toast.error('Erro ao atualizar banco: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Conta Bancária</DialogTitle>
            <DialogDescription>
              Atualize as informações da conta bancária.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Nome do Banco */}
            <div className="grid gap-2">
              <Label htmlFor="edit-bank-name">
                Nome do Banco <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-bank-name"
                placeholder="Ex: Itaú Empresas, Bradesco, Nubank PJ"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
              />
            </div>

            {/* Tipo de Conta */}
            <div className="grid gap-2">
              <Label htmlFor="edit-account-type">Tipo de Conta</Label>
              <Select value={accountType} onValueChange={(v) => setAccountType(v as BankAccountType)}>
                <SelectTrigger id="edit-account-type">
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
                <Label htmlFor="edit-agency">Agência</Label>
                <Input
                  id="edit-agency"
                  placeholder="Ex: 0001"
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-account-number">Número da Conta</Label>
                <Input
                  id="edit-account-number"
                  placeholder="Ex: 12345-6"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Cor e Ícone */}
            <div className="grid grid-cols-2 gap-4">.model.js"-2">
                <Label htmlFor="edit-color">Cor</Label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger id="edit-color">
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
                <Label htmlFor="edit-icon">Ícone</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger id="edit-icon">
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
              onClick={onClose}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
