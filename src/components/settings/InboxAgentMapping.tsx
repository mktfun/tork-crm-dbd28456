import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppCard } from '@/components/ui/app-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Users, RefreshCw } from 'lucide-react';

interface InboxAgent {
  id: string;
  inbox_id: number;
  inbox_name: string | null;
  agent_email: string;
  user_id: string | null;
  is_default: boolean;
}

interface Profile {
  id: string;
  nome_completo: string;
  email: string;
}

interface Inbox {
  id: number;
  name: string;
}

export function InboxAgentMapping() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingInboxes, setLoadingInboxes] = useState(false);
  const [mappings, setMappings] = useState<InboxAgent[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [brokerageId, setBrokerageId] = useState<number | null>(null);
  
  // New mapping form
  const [newMapping, setNewMapping] = useState({
    inbox_id: '',
    agent_email: '',
    user_id: '',
    is_default: false
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get user's brokerage
      const { data: brokerage } = await supabase
        .from('brokerages')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (brokerage) {
        setBrokerageId(brokerage.id);

        // Get existing mappings
        const { data: mappingsData } = await supabase
          .from('chatwoot_inbox_agents')
          .select('*')
          .eq('brokerage_id', brokerage.id);

        setMappings(mappingsData || []);
      }

      // Get profiles for seller dropdown (currently just the user, expand later for team)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, nome_completo, email')
        .eq('id', user?.id);

      setProfiles(profileData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInboxesFromChatwoot = async () => {
    setLoadingInboxes(true);
    try {
      const { data, error } = await supabase.functions.invoke('chatwoot-sync', {
        body: { action: 'list_inboxes' }
      });

      if (error) throw error;

      if (data?.inboxes) {
        setInboxes(data.inboxes);
        toast.success(`${data.inboxes.length} inbox(es) encontradas`);
      } else if (data?.message) {
        toast.info(data.message);
      }
    } catch (error: any) {
      console.error('Error fetching inboxes:', error);
      toast.error('Erro ao buscar inboxes do Chat Tork');
    } finally {
      setLoadingInboxes(false);
    }
  };

  const handleAddMapping = async () => {
    if (!brokerageId || !newMapping.inbox_id || !newMapping.agent_email) {
      toast.error('Preencha Inbox ID e Email do Agente');
      return;
    }

    setSaving(true);
    try {
      const inboxId = parseInt(newMapping.inbox_id);
      const selectedInbox = inboxes.find(i => i.id === inboxId);

      const { error } = await supabase
        .from('chatwoot_inbox_agents')
        .insert({
          brokerage_id: brokerageId,
          inbox_id: inboxId,
          inbox_name: selectedInbox?.name || null,
          agent_email: newMapping.agent_email,
          user_id: newMapping.user_id || null,
          is_default: newMapping.is_default
        });

      if (error) throw error;

      toast.success('Mapeamento adicionado!');
      setNewMapping({ inbox_id: '', agent_email: '', user_id: '', is_default: false });
      fetchData();
    } catch (error: any) {
      console.error('Error adding mapping:', error);
      toast.error('Erro ao adicionar mapeamento');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMapping = async (id: string) => {
    try {
      const { error } = await supabase
        .from('chatwoot_inbox_agents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Mapeamento removido');
      setMappings(mappings.filter(m => m.id !== id));
    } catch (error: any) {
      console.error('Error deleting mapping:', error);
      toast.error('Erro ao remover mapeamento');
    }
  };

  const handleToggleDefault = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('chatwoot_inbox_agents')
        .update({ is_default: !currentValue })
        .eq('id', id);

      if (error) throw error;

      setMappings(mappings.map(m => 
        m.id === id ? { ...m, is_default: !currentValue } : m
      ));
    } catch (error: any) {
      console.error('Error updating mapping:', error);
      toast.error('Erro ao atualizar mapeamento');
    }
  };

  const getProfileName = (userId: string | null) => {
    if (!userId) return 'Não vinculado';
    const profile = profiles.find(p => p.id === userId);
    return profile?.nome_completo || 'Desconhecido';
  };

  if (loading) {
    return (
      <AppCard className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppCard>
    );
  }

  if (!brokerageId) {
    return (
      <AppCard className="p-6">
        <p className="text-muted-foreground text-center py-4">
          Configure sua corretora antes de mapear inboxes.
        </p>
      </AppCard>
    );
  }

  return (
    <AppCard className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <Users className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Mapeamento de Inboxes</h3>
          <p className="text-sm text-muted-foreground">
            Configure qual vendedor receberá os atendimentos de cada inbox
          </p>
        </div>
      </div>

      {/* Fetch Inboxes Button */}
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={fetchInboxesFromChatwoot}
          disabled={loadingInboxes}
        >
          {loadingInboxes ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Buscar Inboxes do Chat Tork
        </Button>
      </div>

      {/* Add New Mapping */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 rounded-lg bg-secondary/30 border border-border">
        <div className="space-y-2">
          <Label>Inbox</Label>
          {inboxes.length > 0 ? (
            <Select 
              value={newMapping.inbox_id} 
              onValueChange={(value) => setNewMapping({ ...newMapping, inbox_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {inboxes.map(inbox => (
                  <SelectItem key={inbox.id} value={inbox.id.toString()}>
                    {inbox.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="ID da Inbox"
              value={newMapping.inbox_id}
              onChange={(e) => setNewMapping({ ...newMapping, inbox_id: e.target.value })}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>Email do Agente</Label>
          <Input
            placeholder="agente@email.com"
            value={newMapping.agent_email}
            onChange={(e) => setNewMapping({ ...newMapping, agent_email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Vendedor no CRM</Label>
          <Select 
            value={newMapping.user_id} 
            onValueChange={(value) => setNewMapping({ ...newMapping, user_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {profiles.map(profile => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Padrão?</Label>
          <div className="flex items-center h-10">
            <Switch
              checked={newMapping.is_default}
              onCheckedChange={(checked) => setNewMapping({ ...newMapping, is_default: checked })}
            />
          </div>
        </div>

        <div className="flex items-end">
          <Button onClick={handleAddMapping} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Adicionar
          </Button>
        </div>
      </div>

      {/* Existing Mappings */}
      {mappings.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Inbox</TableHead>
              <TableHead>Email Agente</TableHead>
              <TableHead>Vendedor CRM</TableHead>
              <TableHead className="text-center">Padrão</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((mapping) => (
              <TableRow key={mapping.id}>
                <TableCell>
                  {mapping.inbox_name || `Inbox #${mapping.inbox_id}`}
                </TableCell>
                <TableCell>{mapping.agent_email}</TableCell>
                <TableCell>{getProfileName(mapping.user_id)}</TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={mapping.is_default}
                    onCheckedChange={() => handleToggleDefault(mapping.id, mapping.is_default)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMapping(mapping.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum mapeamento configurado. Adicione acima para vincular inboxes a vendedores.
        </div>
      )}

      <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <h4 className="text-sm font-medium text-blue-400 mb-2">Como funciona:</h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li><strong>Email do Agente:</strong> O email do atendente no Chat Tork</li>
          <li><strong>Vendedor CRM:</strong> Quem receberá o negócio automaticamente</li>
          <li><strong>Padrão:</strong> Usado quando não há agente atribuído à conversa</li>
          <li>Se o cliente já existir no CRM, o dono original será mantido</li>
        </ul>
      </div>
    </AppCard>
  );
}
