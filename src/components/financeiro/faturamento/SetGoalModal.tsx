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
import { Textarea } from "@/components/ui/textarea";
import { useUpsertGoal } from "@/hooks/useFinanceiro";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SetGoalModalProps {
  open: boolean;
  onClose: () => void;
  year: number;
  month: number;
  currentGoal?: number;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function SetGoalModal({ open, onClose, year, month, currentGoal }: SetGoalModalProps) {
  // Armazena valor em centavos para evitar problemas de arredondamento
  const [goalAmountCents, setGoalAmountCents] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  
  const upsertGoalMutation = useUpsertGoal();

  // Preencher valores quando modal abre
  useEffect(() => {
    if (open) {
      // Converter valor atual para centavos
      setGoalAmountCents(currentGoal ? Math.round(currentGoal * 100) : 0);
      setDescription('');
    }
  }, [open, currentGoal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Converter centavos para reais
    const amount = goalAmountCents / 100;
    
    if (amount <= 0) {
      toast.error('Por favor, insira um valor válido');
      return;
    }

    try {
      await upsertGoalMutation.mutateAsync({
        year,
        month,
        goalAmount: amount,
        goalType: 'revenue',
        description: description || undefined
      });

      toast.success(
        currentGoal 
          ? 'Meta atualizada com sucesso!' 
          : 'Meta definida com sucesso!'
      );
      onClose();
    } catch (error: any) {
      toast.error('Erro ao salvar meta: ' + error.message);
    }
  };

  const formatCurrency = (cents: number) => {
    const amount = cents / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '');
    // Armazena como centavos (número inteiro)
    setGoalAmountCents(numbers ? parseInt(numbers, 10) : 0);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {currentGoal ? 'Atualizar Meta' : 'Definir Meta'}
            </DialogTitle>
            <DialogDescription>
              Meta de faturamento para {MONTH_NAMES[month - 1]} de {year}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="goal-amount">
                Valor da Meta <span className="text-red-500">*</span>
              </Label>
              <Input
                id="goal-amount"
                type="text"
                placeholder="R$ 0,00"
                value={formatCurrency(goalAmountCents)}
                onChange={handleAmountChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                Digite o valor que deseja alcançar em receitas neste mês
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">
                Observações (opcional)
              </Label>
              <Textarea
                id="description"
                placeholder="Ex: Meta ajustada devido à sazonalidade..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={upsertGoalMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={upsertGoalMutation.isPending || goalAmountCents === 0}
            >
              {upsertGoalMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {currentGoal ? 'Atualizar' : 'Definir'} Meta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
