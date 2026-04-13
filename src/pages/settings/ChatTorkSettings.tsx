import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, MessageCircle, ExternalLink, Eye, EyeOff, Loader2, RefreshCw, Wifi, Copy } from 'lucide-react';
import { InboxAgentMapping } from '@/components/settings/InboxAgentMapping';

interface CRMSettings {
  id?: string;
  chatwoot_url: string;
  chatwoot_api_key: string;
  chatwoot_account_id: string;
  chatwoot_webhook_secret: string;
}

export default function ChatTorkSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [settings, setSettings] = useState<CRMSettings>({
    chatwoot_url: '',
    chatwoot_api_key: '',
    chatwoot_account_id: '',
    chatwoot_webhook_secret: ''
  });

  useEffect(() => {
    if (user) fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('crm_settings').select('*').eq('user_id', user?.id).maybeSingle();
      if (error) throw error;
      if (data) {
        setSettings({
          id: data.id,
          chatwoot_url: data.chatwoot_url || '',
          chatwoot_api_key: data.chatwoot_api_key || '',
          chatwoot_account_id: data.chatwoot_account_id || '',
          chatwoot_webhook_secret: data.chatwoot_webhook_secret || ''
        });
      }
    } catch (error) {
      console.error('Error fetching CRM settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        chatwoot_url: settings.chatwoot_url || null,
        chatwoot_api_key: settings.chatwoot_api_key || null,
        chatwoot_account_id: settings.chatwoot_account_id || null,
        chatwoot_webhook_secret: settings.chatwoot_webhook_secret || null
      };

      if (settings.id) {
        const { error } = await supabase.from('crm_settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('crm_settings').insert(payload);
        if (error) throw error;
      }

      toast.success('Configurações salvas com sucesso!');
      fetchSettings();
    } catch (error: any) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.chatwoot_url || !settings.chatwoot_api_key || !settings.chatwoot_account_id) {
      return toast.error('Preencha os dados do servidor antes de testar');
    }
    setTesting(true);
    const toastId = toast.loading('Testando conexão com Chat Tork...');
    try {
      const { data, error } = await supabase.functions.invoke('chatwoot-sync', { body: { action: 'validate' } });
      toast.dismiss(toastId);
      if (error) throw error;
      if (data?.success) toast.success(data.message || 'Conexão estabelecida!');
      else toast.error(data?.message || 'Falha na comunicação.');
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error('Erro de conexão: ' + (error.message || 'Verifique as credenciais Informadas'));
    } finally {
      setTesting(false);
    }
  };

  const handleSyncLabels = async () => {
    if (!settings.chatwoot_url || !settings.chatwoot_api_key || !settings.chatwoot_account_id) {
      return toast.error('Preencha os dados de conexão antes de Sincronizar Etiquetas');
    }
    setSyncing(true);
    const toastId = toast.loading('Sincronizando etiquetas do pipeline...');
    try {
      const { data, error } = await supabase.functions.invoke('chatwoot-sync', { body: { action: 'sync_stages' } });
      toast.dismiss(toastId);
      if (error) throw error;
      if (data?.success) toast.success(data.message || 'Etiquetas pareadas com sucesso!');
      else toast.error(data?.message || 'Falha na sincronização.');
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error('Erro na sync: ' + (error.message || 'Falha Desconhecida'));
    } finally {
      setSyncing(false);
    }
  };

  const webhookUrl = `https://jaouwhckqqnaxqyfvgyq.supabase.co/functions/v1/chatwoot-webhook`;

  if (loading) return <div className="p-8 flex items-center justify-center text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-white/5 shadow-sm max-w-4xl mx-auto">

      {/* Header Fixo */}
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex flex-col items-center justify-center border border-white/10 shadow-inner">
            <MessageCircle className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">Chat Tork Hub</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Sincronização Bi-direcional com seu Chat de Atendimento
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="rounded-full px-6 bg-primary text-primary-foreground">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : <><Save className="w-4 h-4 mr-2" />Salvar</>}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full p-6 space-y-8">

        {/* Painel de Credenciais */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-primary uppercase tracking-widest pl-2">Credenciais da API</h3>
          <div className="bg-background rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">

            <div className="flex sm:items-center px-4 py-4 flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="w-1/3">
                <Label htmlFor="chatwoot_url" className="text-foreground">URL da Instância</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">Sem '/api/v1'</p>
              </div>
              <Input id="chatwoot_url" value={settings.chatwoot_url} onChange={(e) => setSettings({ ...settings, chatwoot_url: e.target.value })} placeholder="https://seu-chat.app.com" className="border border-white/10 bg-black/20 focus-visible:ring-1 text-foreground flex-1 font-mono text-sm" />
            </div>

            <div className="flex sm:items-center px-4 py-4 flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="w-1/3">
                <Label htmlFor="chatwoot_account_id" className="text-foreground">Account ID</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">ID numérico primário</p>
              </div>
              <Input id="chatwoot_account_id" value={settings.chatwoot_account_id} onChange={(e) => setSettings({ ...settings, chatwoot_account_id: e.target.value })} placeholder="Ex: 1 ou 2" className="border border-white/10 bg-black/20 focus-visible:ring-1 text-foreground flex-1 font-mono text-sm" />
            </div>

            <div className="flex sm:items-center px-4 py-4 flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="w-1/3">
                <Label htmlFor="chatwoot_api_key" className="text-foreground">API Token de Acesso</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">Encontrado no seu Perfil</p>
              </div>
              <div className="relative flex-1">
                <Input id="chatwoot_api_key" type={showApiKey ? 'text' : 'password'} value={settings.chatwoot_api_key} onChange={(e) => setSettings({ ...settings, chatwoot_api_key: e.target.value })} placeholder="Token de acesso OAuth/API Key" className="border border-white/10 bg-black/20 focus-visible:ring-1 text-foreground font-mono text-sm pr-10" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground" onClick={() => setShowApiKey(!showApiKey)}>
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Diagnostic Action */}
        <section className="flex flex-wrap gap-4 items-center pl-2">
          <Button variant="outline" onClick={handleTestConnection} disabled={testing || !settings.chatwoot_url} className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-foreground">
            {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />} Ping / Diagnóstico
          </Button>
          <Button variant="outline" onClick={handleSyncLabels} disabled={syncing || !settings.chatwoot_api_key} className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-foreground">
            {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Forçar Sync: Funil
          </Button>
        </section>

        {/* Settings Webhook (Readonly Box) */}
        <section className="space-y-4 pt-6 mt-6 border-t border-white/5">
          <div className="flex items-center justify-between mb-2 pl-2">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-widest flex items-center gap-2">
              Webhook Receptor Tork <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[9px]">Leitura</span>
            </h3>
            <a href="/dashboard/documentacao" target="_blank" className="text-[10px] text-blue-400 hover:underline flex items-center">
              Como configurar? <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>

          <div className="bg-background rounded-2xl border border-white/5 overflow-hidden">

            <div className="p-4 bg-blue-500/5 border-b border-blue-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-xs text-muted-foreground mb-1">Copie este endpoint e cole no cadastro de Webhooks na plataforma Chat Tork.</p>
                <code className="text-sm text-blue-300 font-mono block truncate">{webhookUrl}</code>
              </div>
              <Button variant="secondary" size="sm" className="rounded-full shrink-0 h-8" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Webhook copiado!'); }}>
                <Copy className="w-3.5 h-3.5 mr-2" /> Copiar Hook
              </Button>
            </div>

            <div className="flex sm:items-center px-4 py-4 flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="w-1/3">
                <Label htmlFor="chatwoot_webhook_secret" className="text-foreground">Assinatura Secreta</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">Segurança do Payload (Opcional)</p>
              </div>
              <div className="relative flex-1">
                <Input id="chatwoot_webhook_secret" type={showWebhookSecret ? 'text' : 'password'} value={settings.chatwoot_webhook_secret} onChange={(e) => setSettings({ ...settings, chatwoot_webhook_secret: e.target.value })} placeholder="Assinatura secreta (webhook validation token)" className="border border-white/10 bg-black/20 focus-visible:ring-1 text-foreground font-mono text-sm pr-10" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground" onClick={() => setShowWebhookSecret(!showWebhookSecret)}>
                  {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Integração do Inbox Agent Mapping agora solto no final de forma fluida */}
        <div className="pt-8">
          <InboxAgentMapping />
        </div>

      </div>
    </div>
  );
}
