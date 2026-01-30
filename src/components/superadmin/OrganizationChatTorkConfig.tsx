import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, MessageCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

interface Props {
  organizationId: string;
  crmSettings: any;
}

export function OrganizationChatTorkConfig({ organizationId, crmSettings: initialSettings }: Props) {
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [settings, setSettings] = useState({
    chatwoot_url: initialSettings?.chatwoot_url || '',
    chatwoot_api_key: initialSettings?.chatwoot_api_key || '',
    chatwoot_account_id: initialSettings?.chatwoot_account_id || '',
    chatwoot_webhook_secret: initialSettings?.chatwoot_webhook_secret || ''
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings({
        chatwoot_url: initialSettings.chatwoot_url || '',
        chatwoot_api_key: initialSettings.chatwoot_api_key || '',
        chatwoot_account_id: initialSettings.chatwoot_account_id || '',
        chatwoot_webhook_secret: initialSettings.chatwoot_webhook_secret || ''
      });
    }
  }, [initialSettings]);

  const handleSave = async () => {
    setSaving(true);

    try {
      const payload = {
        organization_id: organizationId,
        chatwoot_url: settings.chatwoot_url || null,
        chatwoot_api_key: settings.chatwoot_api_key || null,
        chatwoot_account_id: settings.chatwoot_account_id || null,
        chatwoot_webhook_secret: settings.chatwoot_webhook_secret || null
      };

      if (initialSettings?.id) {
        const { error } = await supabase
          .from('crm_settings')
          .update(payload)
          .eq('id', initialSettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crm_settings')
          .insert(payload);
        if (error) throw error;
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error('Error saving CRM settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-zinc-100">Integração Chat Tork</CardTitle>
            <CardDescription>Configure a sincronização com o Chat Tork para esta organização</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="chatwoot_url" className="text-zinc-300">URL da Instância</Label>
          <Input
            id="chatwoot_url"
            placeholder="https://seu-chat-tork.com"
            value={settings.chatwoot_url}
            onChange={(e) => setSettings({ ...settings, chatwoot_url: e.target.value })}
            className="bg-zinc-800 border-zinc-700 text-zinc-100"
          />
          <p className="text-xs text-zinc-500">
            URL base da instância Chat Tork (sem /api/v1)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="chatwoot_account_id" className="text-zinc-300">Account ID</Label>
          <Input
            id="chatwoot_account_id"
            placeholder="1"
            value={settings.chatwoot_account_id}
            onChange={(e) => setSettings({ ...settings, chatwoot_account_id: e.target.value })}
            className="bg-zinc-800 border-zinc-700 text-zinc-100"
          />
          <p className="text-xs text-zinc-500">
            ID da conta no Chat Tork (encontre em Settings → Account)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="chatwoot_api_key" className="text-zinc-300">API Key</Label>
          <div className="relative">
            <Input
              id="chatwoot_api_key"
              type={showApiKey ? 'text' : 'password'}
              placeholder="sua-api-key-aqui"
              value={settings.chatwoot_api_key}
              onChange={(e) => setSettings({ ...settings, chatwoot_api_key: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4 text-zinc-400" />
              ) : (
                <Eye className="h-4 w-4 text-zinc-400" />
              )}
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            Token de acesso da API (Profile → Access Token)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="chatwoot_webhook_secret" className="text-zinc-300">Webhook Secret</Label>
          <div className="relative">
            <Input
              id="chatwoot_webhook_secret"
              type={showWebhookSecret ? 'text' : 'password'}
              placeholder="seu-webhook-secret"
              value={settings.chatwoot_webhook_secret}
              onChange={(e) => setSettings({ ...settings, chatwoot_webhook_secret: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowWebhookSecret(!showWebhookSecret)}
            >
              {showWebhookSecret ? (
                <EyeOff className="h-4 w-4 text-zinc-400" />
              ) : (
                <Eye className="h-4 w-4 text-zinc-400" />
              )}
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            Secret para validar webhooks (opcional, mas recomendado)
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}
