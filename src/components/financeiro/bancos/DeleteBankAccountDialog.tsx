import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteBankAccount, type BankAccount } from "@/hooks/useBancos";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface DeleteBankAccountDialogProps {
  account: BankAccount | null;
  open: boolean;
  onClose: () => void;
}

export function DeleteBankAccountDialog({ account, open, onClose }: DeleteBankAccountDialogProps) {
  const deleteMutation = useDeleteBankAccount();

  const handleDelete = async () => {
    if (!account) return;

    try {
      await deleteMutation.mutateAsync(account.id);
      toast.success(`Banco "${account.bankName}" excluído com sucesso!`);
      onClose();
    } catch (error: any) {
      toast.error('Erro ao excluir banco: ' + error.message);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Conta Bancária</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a conta <strong>{account?.bankName}</strong>?
            <br /><br />
            <span className="text-amber-500">
              ⚠️ Esta ação não pode ser desfeita. As transações vinculadas a este banco ficarão sem banco atribuído.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Excluir Banco
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
