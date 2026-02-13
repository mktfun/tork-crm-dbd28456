import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, MessageCircle, ExternalLink, Eye, EyeOff, Loader2, RefreshCw, Wifi, Send, Copy, Check } from 'lucide-react';
import { InboxAgentMapping } from '@/components/settings/InboxAgentMapping';

interface AutomationSettings {
  id?: string;
  chatwoot_url: string;
  chatwoot_api_key: string;
  chatwoot_account_id: string;
  chatwoot_webhook_secret: string;
  n8n_webhook_url: string;
}

export function AutomationConfigTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingN8n, setTestingN8n] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testInboxId, setTestInboxId] = useState('');
  
  const [settings, setSettings] = useState<AutomationSettings>({
    chatwoot_url: '',
    chatwoot_api_key: '',
    chatwoot_account_id: '',
    chatwoot_webhook_secret: '',
    n8n_webhook_url: ''
  });

  const webhookUrl = `https://jaouwhckqqnaxqyfvgyq.supabase.co/functions/v1/chatwoot-dispatcher`;

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          chatwoot_url: data.chatwoot_url || '',
          chatwoot_api_key: data.chatwoot_api_key || '',
          chatwoot_account_id: data.chatwoot_account_id || '',
          chatwoot_webhook_secret: data.chatwoot_webhook_secret || '',
          n8n_webhook_url: data.n8n_webhook_url || ''
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
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
        chatwoot_webhook_secret: settings.chatwoot_webhook_secret || null,
        n8n_webhook_url: settings.n8n_webhook_url || null
      };

      if (settings.id) {
        const { error } = await supabase
          .from('crm_settings')
          .update(payload)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crm_settings')
          .insert(payload);
        if (error) throw error;
      }

      toast.success('Configurações salvas com sucesso!');
      fetchSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleTestChatwoot = async () => {
    if (!settings.chatwoot_url || !settings.chatwoot_api_key || !settings.chatwoot_account_id) {
      toast.error('Preencha todos os campos do Chatwoot');
      return;
    }

    setTesting(true);
    const toastId = toast.loading('Testando conexão com Chatwoot...');
    
    try {
      const { data, error } = await supabase.functions.invoke('chatwoot-sync', {
        body: { action: 'validate' }
      });

      toast.dismiss(toastId);

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || 'Conexão estabelecida!');
      } else {
        toast.error(data?.message || 'Falha na conexão');
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error('Falha na conexão: ' + (error.message || 'Verifique suas credenciais'));
    } finally {
      setTesting(false);
    }
  };

  const handleSyncLabels = async () => {
    if (!settings.chatwoot_url || !settings.chatwoot_api_key || !settings.chatwoot_account_id) {
      toast.error('Configure as credenciais do Chatwoot primeiro');
      return;
    }

    setSyncing(true);
    const toastId = toast.loading('Sincronizando etiquetas...');
    
    try {
      const { data, error } = await supabase.functions.invoke('chatwoot-sync', {
        body: { action: 'sync_stages' }
      });

      toast.dismiss(toastId);

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || 'Etiquetas sincronizadas!');
      } else {
        toast.error(data?.message || 'Erro ao sincronizar');
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      console.error('Sync error:', error);
      toast.error('Erro ao sincronizar: ' + (error.message || 'Verifique suas credenciais'));
    } finally {
      setSyncing(false);
    }
  };

  const handleTestN8n = async () => {
    if (!settings.n8n_webhook_url) {
      toast.error('Preencha a URL do webhook n8n');
      return;
    }

    if (!testInboxId) {
      toast.error('Preencha o Inbox ID para teste');
      return;
    }

    setTestingN8n(true);
    const toastId = toast.loading('Enviando teste para n8n...');
    
    try {
      // Chamar edge function que monta payload de teste e envia pro n8n
      const { data, error } = await supabase.functions.invoke('test-n8n-webhook', {
        body: { 
          inbox_id: testInboxId,
          n8n_webhook_url: settings.n8n_webhook_url
        }
      });

      toast.dismiss(toastId);

      if (error) throw error;

      if (data?.success) {
        toast.success('Teste enviado com sucesso! Verifique o n8n.');
      } else {
        toast.error(data?.message || 'Erro ao enviar teste');
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error('Erro ao enviar teste: ' + (error.message || 'Verifique a URL'));
    } finally {
      setTestingN8n(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    toast.success('URL copiada!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Chatwoot Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle>Chatwoot (Chat Tork)</CardTitle>
              <CardDescription>Configure a integração com o Chatwoot</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chatwoot_url">URL da Instância *</Label>
            <Input
              id="chatwoot_url"
              placeholder="https://seu-chat-tork.com"
              value={settings.chatwoot_url}
              onChange={(e) => setSettings({ ...settings, chatwoot_url: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              URL base da sua instância Chatwoot (sem /api/v1)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chatwoot_account_id">Account ID *</Label>
            <Input
              id="chatwoot_account_id"
              placeholder="1"
              value={settings.chatwoot_account_id}
              onChange={(e) => setSettings({ ...settings, chatwoot_account_id: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              ID da conta no Chatwoot (Settings → Account)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chatwoot_api_key">API Key *</Label>
            <div className="relative">
              <Input
                id="chatwoot_api_key"
                type={showApiKey ? 'text' : 'password'}
                placeholder="sua-api-key-aqui"
                value={settings.chatwoot_api_key}
                onChange={(e) => setSettings({ ...settings, chatwoot_api_key: e.target.value })}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Token de acesso da API (Profile → Access Token)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chatwoot_webhook_secret">Webhook Secret</Label>
            <div className="relative">
              <Input
                id="chatwoot_webhook_secret"
                type={showWebhookSecret ? 'text' : 'password'}
                placeholder="seu-webhook-secret"
                value={settings.chatwoot_webhook_secret}
                onChange={(e) => setSettings({ ...settings, chatwoot_webhook_secret: e.target.value })}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
              >
                {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Secret para validar webhooks (opcional, mas recomendado)
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>

            <Button 
              variant="outline" 
              onClick={handleTestChatwoot} 
              disabled={testing || !settings.chatwoot_url}
            >
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
              Testar Conexão
            </Button>

            <Button 
              variant="outline" 
              onClick={handleSyncLabels} 
              disabled={syncing || !settings.chatwoot_url}
            >
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar Etiquetas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook CRM */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook do CRM</CardTitle>
          <CardDescription>Configure este URL no Chatwoot para receber eventos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={handleCopyWebhook}>
              {copiedWebhook ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <h4 className="text-sm font-medium text-blue-400 mb-2">Como configurar:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Acesse Settings → Applications → Webhooks no Chatwoot</li>
              <li>Clique em "Add new webhook"</li>
              <li>Cole a URL acima</li>
              <li>Selecione os eventos: message_created, conversation_updated</li>
              <li>Salve e copie o Secret gerado para o campo acima</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* n8n Config */}
      <Card>
        <CardHeader>
          <CardTitle>n8n (Automação Avançada)</CardTitle>
          <CardDescription>Configure o webhook do n8n para automações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="n8n_webhook_url">URL do Webhook n8n *</Label>
            <Input
              id="n8n_webhook_url"
              placeholder="https://seu-n8n.com/webhook/..."
              value={settings.n8n_webhook_url}
              onChange={(e) => setSettings({ ...settings, n8n_webhook_url: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              URL do webhook no n8n que receberá os dados do CRM
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test_inbox_id">Inbox ID (para teste)</Label>
            <Input
              id="test_inbox_id"
              placeholder="123"
              value={testInboxId}
              onChange={(e) => setTestInboxId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              ID de um inbox válido para enviar dados de teste
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>

            <Button 
              variant="outline" 
              onClick={handleTestN8n} 
              disabled={testingN8n || !settings.n8n_webhook_url || !testInboxId}
            >
              {testingN8n ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar Teste
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inbox Agent Mapping */}
      <InboxAgentMapping />
    </div>
  );
}
