import { useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar,
  FileText,
  User,
  FileCheck,
  ArrowUpDown,
  ExternalLink,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Lock,
  Info,
  FileWarning,
  Paperclip,
  Image as ImageIcon,
  CheckCircle,
  Banknote,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useTransactionDetails, useReverseTransaction, useSettleCommission, useFinancialAccounts } from '@/hooks/useFinanceiro';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

import { parseDateOnly } from '@/lib/utils';

// Helper seguro para formatar datas - evita "Invalid time value"
function safeFormatDate(dateValue: string | null | undefined, formatStr: string, fallback: string = '---'): string {
  if (!dateValue) return fallback;

  try {
    // Usa parseDateOnly para evitar o bug do dia anterior
    const parsed = parseDateOnly(dateValue);
    if (!parsed || isNaN(parsed.getTime())) {
      // Fallback para parseISO se parseDateOnly falhar
      const isoP = parseISO(dateValue);
      if (!isValid(isoP)) return fallback;
      return format(isoP, formatStr, { locale: ptBR });
    }
    return format(parsed, formatStr, { locale: ptBR });
  } catch {
    return fallback;
  }
}

interface TransactionDetailsSheetProps {
  transactionId: string | null;
  isLegacyId?: boolean;
  open: boolean;
  onClose: () => void;
}

export function TransactionDetailsSheet({ transactionId, isLegacyId = false, open, onClose }: TransactionDetailsSheetProps) {
  const { data: transaction, isLoading, error } = useTransactionDetails(transactionId, isLegacyId);
  const reverseTransaction = useReverseTransaction();
  const settleCommission = useSettleCommission();
  const { data: assetAccounts = [] } = useFinancialAccounts('asset');

  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('');

  // Calcular valor total - Prioriza total_amount da transação (agora confiável)
  const entries = transaction?.ledgerEntries ?? [];
  const headerAmount = transaction?.amount || entries.reduce((acc, entry) => {
    if (entry.accountType === 'revenue' || entry.accountType === 'expense') {
      return acc + Math.abs(entry.amount);
    }
    return acc;
  }, 0);

  // Verificar se é transação sincronizada (não pode ser editada manualmente)
  const isSynchronized = transaction?.relatedEntityType === 'legacy_transaction' ||
    transaction?.relatedEntityType === 'policy';

  // Verificar se já foi anulada
  const isVoid = transaction?.isVoid ?? false;

  // Verificar se é um estorno
  const isReversal = transaction?.relatedEntityType === 'reversal';

  // Pode estornar se não está anulada e não é um estorno
  const canReverse = !isVoid && !isReversal;

  // ✅ CORREÇÃO: Verificar se é uma provisão pendente de baixa
  // Agora considera TANTO legacy_transaction QUANTO policy com status 'pending'
  const transactionStatus = (transaction as any)?.status || transaction?.legacyData?.originalStatus;
  const isPendingSettlement = !isVoid && !isReversal &&
    (transaction?.relatedEntityType === 'legacy_transaction' || transaction?.relatedEntityType === 'policy') &&
    (transactionStatus === 'pending' || transaction?.legacyData?.originalStatus === 'PENDENTE');

  // Verificar se é origem de apólice (para exibição correta)
  const isFromPolicy = transaction?.relatedEntityType === 'policy';

  // Handler para dar baixa na comissão
  const handleSettlement = async () => {
    if (!transactionId || !selectedBankAccount) {
      toast.error('Selecione uma conta bancária');
      return;
    }

    try {
      const result = await settleCommission.mutateAsync({
        transactionId,
        bankAccountId: selectedBankAccount
      });

      if (result.success) {
        toast.success('Recebimento confirmado!', {
          description: `${formatCurrency(result.settledAmount || 0)} creditado na conta bancária.`
        });
        setShowSettlementDialog(false);
        setSelectedBankAccount('');
        onClose();
      } else {
        toast.error(result.message || 'Erro ao dar baixa');
      }
    } catch (err: any) {
      console.error('Erro ao dar baixa:', err);
      toast.error(err.message || 'Erro ao dar baixa na comissão');
    }
  };

  const handleReverse = async () => {
    if (!transactionId || !reverseReason.trim()) {
      toast.error('Informe o motivo do estorno');
      return;
    }

    try {
      const result = await reverseTransaction.mutateAsync({
        transactionId,
        reason: reverseReason.trim()
      });

      if (result.success) {
        toast.success('Transação estornada com sucesso!', {
          description: `Estorno de ${formatCurrency(result.reversedAmount || 0)} criado.`
        });
        setShowReverseDialog(false);
        setReverseReason('');
        onClose();
      } else {
        toast.error(result.error || 'Erro ao estornar transação');
      }
    } catch (err: any) {
      console.error('Erro ao estornar:', err);
      toast.error(err.message || 'Erro ao estornar transação');
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader className="flex flex-row items-center justify-between pb-4">
            <SheetTitle>Detalhes da Transação</SheetTitle>
            <SheetDescription className="sr-only">
              Visualize os detalhes contábeis desta transação
            </SheetDescription>
          </SheetHeader>

          {isLoading && (
            <div className="space-y-6 p-4">
              {/* Skeleton do valor em destaque */}
              <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-muted/30">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-4 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>

              <Skeleton className="h-px w-full" />

              {/* Skeleton dos metadados */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-28" />
                </div>
              </div>

              <Skeleton className="h-px w-full" />

              {/* Skeleton dos links */}
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-9 w-32" />
                </div>
              </div>

              <Skeleton className="h-px w-full" />

              {/* Skeleton dos movimentos */}
              <div className="space-y-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-destructive">
              <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
              <p>Erro ao carregar transação</p>
            </div>
          )}

          {transaction && (
            <ScrollArea className="h-[calc(100vh-120px)]">
              <div className="space-y-6 pr-4">
                {/* Valor em Destaque */}
                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                  <p className={`text-3xl font-bold ${isVoid ? 'text-muted-foreground line-through' : 'text-emerald-500'}`}>
                    {formatCurrency(headerAmount)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {transaction.description}
                  </p>

                  {/* Badges de Status */}
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    {isVoid && (
                      <Badge variant="destructive">
                        Transação Anulada
                      </Badge>
                    )}
                    {isReversal && (
                      <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Estorno
                      </Badge>
                    )}
                    {/* ✅ Badge de Pendente para comissões não liquidadas */}
                    {isPendingSettlement && (
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
                        Pendente
                      </Badge>
                    )}
                    {/* ✅ Badge de Origem: Apólice */}
                    {isFromPolicy && !isReversal && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="gap-1 cursor-help bg-blue-500/10 text-blue-700 border-blue-500/30">
                              <FileCheck className="w-3 h-3" />
                              Origem: Apólice
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Comissão gerada automaticamente.</p>
                            <p className="text-xs text-muted-foreground">Vinculada a uma apólice ativa.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {isSynchronized && !isReversal && !isFromPolicy && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="gap-1 cursor-help">
                              <Lock className="w-3 h-3" />
                              Sincronizada
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Transação vinculada a apólice.</p>
                            <p className="text-xs text-muted-foreground">Alterações devem ser feitas na origem.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Metadados Básicos */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Calendar className="w-4 h-4" />
                      Data
                    </div>
                    <p className="font-medium">
                      {safeFormatDate(transaction.transactionDate, "dd 'de' MMMM, yyyy")}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <FileText className="w-4 h-4" />
                      Referência
                    </div>
                    <p className="font-medium">
                      {transaction.referenceNumber || 'Sem referência'}
                    </p>
                  </div>
                </div>

                {/* Links Rápidos - Dados legados OU relatedEntityType */}
                {(transaction.legacyData || (transaction.relatedEntityType === 'policy' && transaction.relatedEntityId)) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Links Rápidos
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {/* Link via legacyData */}
                        {transaction.legacyData?.clientId && (
                          <Button asChild variant="outline" size="sm" className="gap-2">
                            <Link to={`/dashboard/clients/${transaction.legacyData.clientId}`}>
                              <User className="w-4 h-4" />
                              {transaction.legacyData.clientName || 'Ver Cliente'}
                            </Link>
                          </Button>
                        )}
                        {transaction.legacyData?.policyId && (
                          <Button asChild variant="outline" size="sm" className="gap-2">
                            <Link to={`/dashboard/policies/${transaction.legacyData.policyId}`}>
                              <FileCheck className="w-4 h-4" />
                              {transaction.legacyData.policyNumber
                                ? `Apólice #${transaction.legacyData.policyNumber.slice(0, 10)}`
                                : 'Ver Apólice'}
                            </Link>
                          </Button>
                        )}

                        {/* Link direto via relatedEntityType (quando não há legacyData) */}
                        {!transaction.legacyData?.policyId &&
                          transaction.relatedEntityType === 'policy' &&
                          transaction.relatedEntityId && (
                            <Button asChild variant="outline" size="sm" className="gap-2">
                              <Link to={`/dashboard/policies/${transaction.relatedEntityId}`}>
                                <FileWarning className="w-4 h-4" />
                                Ver Apólice Relacionada
                              </Link>
                            </Button>
                          )}
                      </div>

                      {/* Dados Adicionais do Legado */}
                      {transaction.legacyData && (transaction.legacyData.ramo || transaction.legacyData.company) && (
                        <div className="grid grid-cols-2 gap-3 text-sm p-3 rounded-lg bg-muted/30">
                          {transaction.legacyData.ramo && (
                            <div>
                              <p className="text-muted-foreground">Ramo</p>
                              <p className="font-medium">{transaction.legacyData.ramo}</p>
                            </div>
                          )}
                          {transaction.legacyData.company && (
                            <div>
                              <p className="text-muted-foreground">Seguradora</p>
                              <p className="font-medium">{transaction.legacyData.company}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Movimentos no Ledger */}
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    Movimentos Contábeis
                  </h4>
                  <div className="space-y-2">
                    {transaction.ledgerEntries.map((entry) => {
                      // Contas de resultado: mostrar valor absoluto, sem sinal negativo
                      const isResultAccount = entry.accountType === 'revenue' || entry.accountType === 'expense';
                      const displayAmount = isResultAccount ? Math.abs(entry.amount) : entry.amount;
                      const isRevenue = entry.accountType === 'revenue';
                      const isExpense = entry.accountType === 'expense';

                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={isRevenue ? "default" : isExpense ? "destructive" : entry.amount > 0 ? "default" : "secondary"}
                              className="text-xs font-mono"
                            >
                              {isRevenue ? 'R' : isExpense ? 'D' : entry.amount > 0 ? 'D' : 'C'}
                            </Badge>
                            <span className="text-sm">{entry.accountName}</span>
                          </div>
                          <span className={`font-medium ${isRevenue ? 'text-emerald-500' : isExpense ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {isRevenue ? '+' : isExpense ? '-' : ''}{formatCurrency(displayAmount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Comprovantes Anexados */}
                {transaction.attachments && transaction.attachments.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        Comprovantes ({transaction.attachments.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {transaction.attachments.map((url, idx) => (
                          <Button
                            key={idx}
                            asChild
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <ImageIcon className="w-4 h-4" />
                              Ver Comprovante {idx + 1}
                            </a>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Botão de Dar Baixa (para provisões pendentes) */}
                {isPendingSettlement && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Button
                        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setShowSettlementDialog(true)}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Confirmar Recebimento / Dar Baixa
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Confirme que o valor foi recebido e selecione a conta bancária
                      </p>
                    </div>
                  </>
                )}

                {/* Botão de Estorno */}
                <Separator />
                <div className="space-y-3">
                  {canReverse ? (
                    <Button
                      variant="destructive"
                      className="w-full gap-2"
                      onClick={() => setShowReverseDialog(true)}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Estornar Transação
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {isVoid
                          ? 'Esta transação já foi anulada.'
                          : isReversal
                            ? 'Estornos não podem ser estornados novamente.'
                            : 'Esta transação não pode ser estornada.'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Metadados Técnicos */}
                <Separator />
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p><strong>Criado em:</strong> {safeFormatDate(transaction.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                  <p><strong>Origem:</strong> {transaction.relatedEntityType || 'manual'}</p>
                  <p className="font-mono break-all"><strong>ID:</strong> {transaction.id}</p>
                  {transaction.isVoid && transaction.voidReason && (
                    <p className="text-destructive"><strong>Motivo anulação:</strong> {transaction.voidReason}</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog de Confirmação de Estorno */}
      <AlertDialog open={showReverseDialog} onOpenChange={setShowReverseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-destructive" />
              Estornar Transação
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Sistemas contábeis não permitem exclusão de lançamentos.
                O estorno criará uma nova transação com valores inversos, zerando o saldo.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Motivo do estorno *
                </label>
                <Textarea
                  placeholder="Descreva o motivo do estorno..."
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReverseReason('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReverse}
              disabled={!reverseReason.trim() || reverseTransaction.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {reverseTransaction.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Estornando...
                </>
              ) : (
                'Confirmar Estorno'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação de Baixa */}
      <AlertDialog open={showSettlementDialog} onOpenChange={setShowSettlementDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-500" />
              Confirmar Recebimento
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Confirme que o valor de <strong className="text-foreground">{formatCurrency(headerAmount)}</strong> foi recebido.
                  Selecione a conta bancária onde o dinheiro entrou.
                </p>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Em qual conta o dinheiro entrou? *
                  </Label>
                  <Select
                    value={selectedBankAccount}
                    onValueChange={setSelectedBankAccount}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta bancária" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.code ? `${acc.code} - ${acc.name}` : acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedBankAccount('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSettlement}
              disabled={!selectedBankAccount || settleCommission.isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {settleCommission.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar Recebimento'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}