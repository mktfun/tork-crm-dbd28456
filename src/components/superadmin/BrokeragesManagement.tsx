import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  useBrokeragesAdmin, 
  useUpdateBrokerage,
  useImpersonateBrokerage 
} from '@/hooks/useBrokeragesAdmin';
import { MoreHorizontal, Pencil, Ban, UserCheck, Search, RefreshCw, Settings2, Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface BrokerageIntegrationModalProps {
  brokerage: {
    id: number;
    name: string;
    chatwoot_token?: string | null;
    chatwoot_account_id?: string | null;
    chatwoot_url?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function BrokerageIntegrationModal({ brokerage, open, onOpenChange }: BrokerageIntegrationModalProps) {
  const updateBrokerage = useUpdateBrokerage();
  const [chatwootToken, setChatwootToken] = useState(brokerage?.chatwoot_token || '');
  const [chatwootAccountId, setChatwootAccountId] = useState(brokerage?.chatwoot_account_id || '');
  const [chatwootUrl, setChatwootUrl] = useState(brokerage?.chatwoot_url || '');

  const handleSave = async () => {
    if (!brokerage) return;
    
    try {
      await updateBrokerage.mutateAsync({
        id: brokerage.id,
        updates: {
          chatwoot_token: chatwootToken || null,
          chatwoot_account_id: chatwootAccountId || null,
          chatwoot_url: chatwootUrl || null,
        },
      });
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-400" />
            Configurar Integrações
          </DialogTitle>
          <DialogDescription>
            Configure as integrações do Chatwoot para <span className="font-medium text-zinc-300">{brokerage?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">URL do Chatwoot</Label>
            <Input
              placeholder="https://app.chatwoot.com"
              value={chatwootUrl}
              onChange={(e) => setChatwootUrl(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300">Account ID</Label>
            <Input
              placeholder="12345"
              value={chatwootAccountId}
              onChange={(e) => setChatwootAccountId(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300">Token de API</Label>
            <Input
              type="password"
              placeholder="••••••••••••••••"
              value={chatwootToken}
              onChange={(e) => setChatwootToken(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
            <p className="text-xs text-zinc-500">O token é armazenado de forma segura</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700 text-zinc-300"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateBrokerage.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {updateBrokerage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BrokeragesManagement() {
  const [search, setSearch] = useState('');
  const [integrationModal, setIntegrationModal] = useState<{
    open: boolean;
    brokerage: any | null;
  }>({ open: false, brokerage: null });
  
  const { data: brokerages, isLoading, refetch } = useBrokeragesAdmin();
  const updateBrokerage = useUpdateBrokerage();
  const { startImpersonation } = useImpersonateBrokerage();
  const queryClient = useQueryClient();

  const filteredBrokerages = (brokerages || []).filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleStatus = (id: number, currentStatus: boolean | null) => {
    updateBrokerage.mutate({
      id,
      updates: { portal_enabled: !currentStatus },
    });
  };

  const handleImpersonate = (id: number, name: string) => {
    startImpersonation(id, name);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-brokerages'] });
    refetch();
  };

  const handleOpenIntegration = (brokerage: any) => {
    setIntegrationModal({ open: true, brokerage });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Gestão de Corretoras</h1>
          <p className="text-sm text-zinc-400 mt-1">Gerencie todas as corretoras cadastradas no sistema</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          placeholder="Buscar por nome ou slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-zinc-900/50 border-zinc-700"
        />
      </div>

      {/* Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Corretoras Cadastradas</CardTitle>
          <CardDescription>
            {filteredBrokerages.length} corretora(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 bg-zinc-800" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Nome</TableHead>
                  <TableHead className="text-zinc-400">Slug</TableHead>
                  <TableHead className="text-zinc-400">CNPJ</TableHead>
                  <TableHead className="text-zinc-400">Chatwoot</TableHead>
                  <TableHead className="text-zinc-400">Portal</TableHead>
                  <TableHead className="text-zinc-400">Criado em</TableHead>
                  <TableHead className="text-zinc-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrokerages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-zinc-500 py-8">
                      Nenhuma corretora encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBrokerages.map((brokerage) => (
                    <TableRow 
                      key={brokerage.id} 
                      className="border-zinc-800 hover:bg-zinc-800/50"
                    >
                      <TableCell className="font-medium text-zinc-100">
                        {brokerage.name}
                      </TableCell>
                      <TableCell className="text-zinc-300 font-mono text-sm">
                        {brokerage.slug}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {brokerage.cnpj || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            (brokerage as any).chatwoot_token
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-zinc-700 text-zinc-400'
                          }
                        >
                          {(brokerage as any).chatwoot_token ? 'Configurado' : 'Não Config.'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            brokerage.portal_enabled
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-zinc-700 text-zinc-400'
                          }
                        >
                          {brokerage.portal_enabled ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {format(new Date(brokerage.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem 
                              className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                              onClick={() => {/* TODO: Open edit modal */}}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                              onClick={() => handleOpenIntegration(brokerage)}
                            >
                              <Settings2 className="h-4 w-4 mr-2" />
                              Configurar Integrações
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                              onClick={() => handleImpersonate(brokerage.id, brokerage.name)}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Personificar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem
                              className="text-amber-400 focus:bg-amber-500/10 focus:text-amber-300"
                              onClick={() => handleToggleStatus(brokerage.id, brokerage.portal_enabled)}
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              {brokerage.portal_enabled ? 'Desativar Portal' : 'Ativar Portal'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Integration Modal */}
      <BrokerageIntegrationModal
        brokerage={integrationModal.brokerage}
        open={integrationModal.open}
        onOpenChange={(open) => setIntegrationModal({ ...integrationModal, open })}
      />
    </div>
  );
}
