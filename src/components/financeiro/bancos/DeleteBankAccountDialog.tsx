import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBankAccounts,
  useBankLinkedDataCount,
  useMigrateAndDeleteBank,
  type BankAccount,
} from "@/hooks/useBancos";
import { toast } from "sonner";
import { Loader2, AlertTriangle, ArrowRightLeft } from "lucide-react";

interface DeleteBankAccountDialogProps {
  account: BankAccount | null;
  open: boolean;
  onClose: () => void;
}

export function DeleteBankAccountDialog({ account, open, onClose }: DeleteBankAccountDialogProps) {
  const { data: bankData } = useBankAccounts();
  const { data: linkedData, isLoading: loadingCounts } = useBankLinkedDataCount(
    open && account ? account.id : null
  );
  const migrateAndDelete = useMigrateAndDeleteBank();

  const [targetBankId, setTargetBankId] = useState<string>("__unlink__");

  // Resetar seleção ao abrir
  useEffect(() => {
    if (open) setTargetBankId("__unlink__");
  }, [open]);

  // Bancos disponíveis para migração (excluindo o atual)
  const otherBanks = (bankData?.accounts ?? []).filter(
    (b) => b.id !== account?.id && b.isActive
  );

  const totalLinked = (linkedData?.transactions ?? 0) + (linkedData?.statements ?? 0);
  const hasLinkedData = totalLinked > 0;
  const hasOtherBanks = otherBanks.length > 0;

  const handleDelete = async () => {
    if (!account) return;

    try {
      const toBankId = targetBankId === "__unlink__" ? null : targetBankId;

      if (hasLinkedData) {
        await migrateAndDelete.mutateAsync({
          fromBankId: account.id,
          toBankId,
        });
      } else {
        // Sem dados vinculados — delete direto
        await migrateAndDelete.mutateAsync({
          fromBankId: account.id,
          toBankId: null,
        });
      }

      toast.success(`Banco "${account.bankName}" excluído com sucesso!`);
      onClose();
    } catch (error: any) {
      toast.error("Erro ao excluir banco: " + error.message);
    }
  };

  const isPending = migrateAndDelete.isPending;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir Conta Bancária
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm">
              <p>
                Tem certeza que deseja excluir a conta{" "}
                <strong className="text-foreground">{account?.bankName}</strong>?
              </p>

              {/* Loader enquanto conta dados */}
              {loadingCounts ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : hasLinkedData ? (
                <>
                  {/* Contagem de dados vinculados */}
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
                    <p className="font-medium text-amber-500 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      Este banco possui dados vinculados:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground ml-1 space-y-0.5">
                      {(linkedData?.transactions ?? 0) > 0 && (
                        <li>
                          <strong className="text-foreground">
                            {linkedData!.transactions}
                          </strong>{" "}
                          transações financeiras
                        </li>
                      )}
                      {(linkedData?.statements ?? 0) > 0 && (
                        <li>
                          <strong className="text-foreground">
                            {linkedData!.statements}
                          </strong>{" "}
                          entradas de extrato bancário
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Opção de migração */}
                  {hasOtherBanks ? (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-foreground">
                        <ArrowRightLeft className="h-4 w-4" />
                        O que fazer com os dados vinculados?
                      </Label>
                      <Select value={targetBankId} onValueChange={setTargetBankId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar destino..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__unlink__">
                            🚫 Desvincular (ficarão sem banco)
                          </SelectItem>
                          {otherBanks.map((bank) => (
                            <SelectItem key={bank.id} value={bank.id}>
                              🏦 Mover para {bank.bankName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <p className="text-amber-500">
                      ⚠️ Este é o único banco ativo. As transações e extratos ficarão sem
                      banco atribuído.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Nenhuma transação ou extrato vinculado a este banco.
                </p>
              )}

              <p className="text-destructive font-medium">
                Esta ação não pode ser desfeita.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir Banco
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
