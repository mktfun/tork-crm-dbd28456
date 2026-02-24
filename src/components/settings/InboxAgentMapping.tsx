import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Users, RefreshCw, Mail } from 'lucide-react';

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

  const [newMapping, setNewMapping] = useState({
    inbox_id: '',
    agent_email: '',
    user_id: '',
    is_default: false
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: brokerage } = await supabase.from('brokerages').select('id').eq('user_id', user?.id).maybeSingle();
      if (brokerage) {
        setBrokerageId(brokerage.id);
        const { data: mappingsData } = await supabase.from('chatwoot_inbox_agents').select('*').eq('brokerage_id', brokerage.id);
        setMappings(mappingsData || []);
      }
      const { data: profileData } = await supabase.from('profiles').select('id, nome_completo, email').eq('id', user?.id);
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
      const { data, error } = await supabase.functions.invoke('chatwoot-sync', { body: { action: 'list_inboxes' } });
      if (error) throw error;
      if (data?.inboxes) {
        setInboxes(data.inboxes);
        toast.success(`${data.inboxes.length} inbox(es) encontradas`);
      } else if (data?.message) {
        toast.info(data.message);
      }
    } catch (error: any) {
      toast.error('Erro ao buscar inboxes do Chat Tork');
    } finally {
      setLoadingInboxes(false);
    }
  };

  const handleAddMapping = async () => {
    if (!brokerageId || !newMapping.inbox_id || !newMapping.agent_email) return toast.error('Preencha Inbox ID e Email do Agente');
    setSaving(true);
    try {
      const inboxId = parseInt(newMapping.inbox_id);
      const selectedInbox = inboxes.find(i => i.id === inboxId);
      const { error } = await supabase.from('chatwoot_inbox_agents').insert({
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
      toast.error('Erro ao adicionar mapeamento');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMapping = async (id: string) => {
    try {
      const { error } = await supabase.from('chatwoot_inbox_agents').delete().eq('id', id);
      if (error) throw error;
      toast.success('Mapeamento removido');
      setMappings(mappings.filter(m => m.id !== id));
    } catch (error: any) {
      toast.error('Erro ao remover mapeamento');
    }
  };

  const handleToggleDefault = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase.from('chatwoot_inbox_agents').update({ is_default: !currentValue }).eq('id', id);
      if (error) throw error;
      setMappings(mappings.map(m => m.id === id ? { ...m, is_default: !currentValue } : m));
    } catch (error: any) {
      toast.error('Erro ao atualizar mapeamento');
    }
  };

  const getProfileName = (userId: string | null) => {
    if (!userId) return 'Não vinculado';
    return profiles.find(p => p.id === userId)?.nome_completo || 'Desconhecido';
  };

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!brokerageId) return <div className="text-center py-8 text-muted-foreground text-sm">Configure sua corretora na aba apropriada antes de mapear Inboxes.</div>;

  return (
    <div className="space-y-6 pt-6 border-t border-white/5">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-widest">Rotas da Central (Inbox Mapping)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Determine quem herda os leads de cada caixa de entrada</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchInboxesFromChatwoot} disabled={loadingInboxes} className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-xs">
          {loadingInboxes ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-2" />}
          Ler Inboxes Remotas
        </Button>
      </div>

      {/* Area de Criacao de Rota */}
      <div className="bg-background rounded-2xl border border-white/5 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Caixa de Entrada (Inbox)</Label>
            {inboxes.length > 0 ? (
              <Select value={newMapping.inbox_id} onValueChange={(value) => setNewMapping({ ...newMapping, inbox_id: value })}>
                <SelectTrigger className="h-9 bg-black/20 border-white/10 text-xs text-foreground focus:ring-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="bg-card border-white/10"><div className="px-2 py-1 space-y-1">{inboxes.map(inbox => <SelectItem key={inbox.id} value={inbox.id.toString()} className="text-xs">{inbox.name}</SelectItem>)}</div></SelectContent>
              </Select>
            ) : (
              <Input placeholder="ID Numérico" value={newMapping.inbox_id} onChange={(e) => setNewMapping({ ...newMapping, inbox_id: e.target.value })} className="h-9 bg-black/20 border-white/10 text-xs font-mono" />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">E-mail do Agente no Chat</Label>
            <Input placeholder="user@chat.com" value={newMapping.agent_email} onChange={(e) => setNewMapping({ ...newMapping, agent_email: e.target.value })} className="h-9 bg-black/20 border-white/10 text-xs" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Vinculado ao Operador CRM</Label>
            <Select value={newMapping.user_id} onValueChange={(value) => setNewMapping({ ...newMapping, user_id: value })}>
              <SelectTrigger className="h-9 bg-black/20 border-white/10 text-xs text-foreground focus:ring-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent className="bg-card border-white/10"><div className="px-2 py-1 space-y-1">{profiles.map(profile => <SelectItem key={profile.id} value={profile.id} className="text-xs">{profile.nome_completo}</SelectItem>)}</div></SelectContent>
            </Select>
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label className="text-xs text-muted-foreground opacity-0">Addicionar Rota</Label>
            <Button size="sm" onClick={handleAddMapping} disabled={saving} className="h-9 rounded-full bg-primary/20 text-primary hover:bg-primary/30 w-full shrink-0">
              {saving ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Plus className="h-3 w-3 mr-2" />} Criar Rota
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-white/5 opacity-80">
          <Switch checked={newMapping.is_default} onCheckedChange={(checked) => setNewMapping({ ...newMapping, is_default: checked })} className="scale-75 origin-left" />
          <span className="text-xs text-muted-foreground">Assumir liderança por conversas órfãs (Rota Padrão / Fallback)</span>
        </div>
      </div>

      <div className="space-y-3">
        {mappings.length > 0 ? (
          <div className="bg-background rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
            {mappings.map((mapping) => (
              <div key={mapping.id} className="group p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">

                <div className="flex items-center gap-4 flex-1">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 border border-white/5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">{mapping.inbox_name || `Caixa Direta #${mapping.inbox_id}`}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span className="bg-white/5 px-1.5 border border-white/5 rounded text-primary/80" title="E-mail Operador Chat">{mapping.agent_email}</span>
                      <span>→</span>
                      <span className="bg-white/5 px-1.5 border border-white/5 rounded" title="Operador Master CRM">{getProfileName(mapping.user_id)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t sm:border-0 border-white/5 pt-3 sm:pt-0">
                  <div className="flex items-center gap-2 px-3">
                    <span className="text-xs text-muted-foreground">Padrão</span>
                    <Switch checked={mapping.is_default} onCheckedChange={() => handleToggleDefault(mapping.id, mapping.is_default)} className="scale-75" />
                  </div>
                  <div className="h-6 w-px bg-white/5 hidden sm:block"></div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteMapping(mapping.id)} className="w-8 h-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4 bg-background border border-border border-dashed rounded-2xl">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-muted-foreground opacity-50" />
            </div>
            <p className="text-sm font-medium text-foreground">Ainda não há Rotas Configuradas</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">Adicione mapeamentos acima para garantir que leads de diferentes inboxes sejam atribuídos para os consultores corretos automaticamente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
