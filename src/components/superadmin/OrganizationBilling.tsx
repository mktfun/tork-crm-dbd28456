import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CalendarClock, CreditCard, Plus, Loader2 } from 'lucide-react';
import { useBrokeragePayments, useRegisterPayment } from '@/hooks/useAdminControlCenter';
import type { OrganizationDetails } from '@/hooks/useOrganizationDetails';

interface Props {
  organization: OrganizationDetails;
}

function isExpired(dateStr: string | null) {
  if (!dateStr) return true;
  return new Date(dateStr) < new Date();
}

function formatDateBR(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export function OrganizationBilling({ organization }: Props) {
  const brokerageId = parseInt(organization.id);
  const { data: payments = [], isLoading: paymentsLoading } = useBrokeragePayments(brokerageId);
  const registerPayment = useRegisterPayment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentPeriod, setPaymentPeriod] = useState('1 Mês');
  const [paymentDate, setPaymentDate] = useState('');

  const expired = isExpired(organization.subscription_valid_until);

  const openDialog = () => {
    setPaymentAmount('');
    setPaymentPeriod('1 Mês');
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setDialogOpen(true);
  };

  const handleSave = () => {
    const amount = parseFloat(paymentAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    registerPayment.mutate({
      brokerageId,
      amount,
      periodAdded: paymentPeriod,
      paymentDate: new Date(paymentDate).toISOString(),
      currentValidUntil: organization.subscription_valid_until,
    }, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  return (
    <div className="grid gap-6">
      {/* Status Card */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data de Vencimento Atual</p>
              <p className="text-lg font-semibold text-foreground">{formatDateBR(organization.subscription_valid_until)}</p>
            </div>
            <Badge className={`ml-auto ${expired
              ? 'bg-destructive/15 text-destructive border-destructive/30'
              : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
            }`}>
              {expired ? 'Vencido' : 'Ativo'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Register Button */}
      <Button onClick={openDialog} className="w-full sm:w-auto">
        <Plus className="h-4 w-4 mr-2" />
        Registrar Pagamento Manual
      </Button>

      {/* Payment History */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Histórico de Pagamentos
          </CardTitle>
          <CardDescription>Pagamentos registrados manualmente</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum pagamento registrado.</p>
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="text-muted-foreground text-xs">Data</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Valor</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Período</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Registrado por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id} className="border-border">
                      <TableCell className="text-sm">{formatDateBR(p.payment_date)}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {Number(p.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className="text-sm">{p.period_added}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Pago</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.recorder_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento Manual</DialogTitle>
            <DialogDescription>Registre um pagamento para {organization.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="text" placeholder="0,00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Período a adicionar</Label>
              <select
                value={paymentPeriod}
                onChange={(e) => setPaymentPeriod(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                <option value="1 Mês">1 Mês</option>
                <option value="6 Meses">6 Meses</option>
                <option value="1 Ano">1 Ano</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Data do Pagamento</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={registerPayment.isPending}>
              {registerPayment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
