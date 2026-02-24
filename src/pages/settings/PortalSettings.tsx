import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Globe, Copy, Check, Loader2, Save, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface PortalConfig {
  portal_enabled: boolean;
  portal_show_policies: boolean;
  portal_allow_policy_download: boolean;
  portal_show_cards: boolean;
  portal_allow_card_download: boolean;
  portal_allow_profile_edit: boolean;
}

export default function PortalSettings() {
  const { user } = useAuth();
  const [brokerageId, setBrokerageId] = useState<number | null>(null);
  const [brokerageSlug, setBrokerageSlug] = useState<string | null>(null);
  const [settings, setSettings] = useState<PortalConfig>({
    portal_enabled: false,
    portal_show_policies: true,
    portal_allow_policy_download: true,
    portal_show_cards: true,
    portal_allow_card_download: true,
    portal_allow_profile_edit: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const baseUrl = window.location.origin;
  const portalLink = brokerageSlug ? `${baseUrl}/${brokerageSlug}/portal` : null;

  useEffect(() => {
    const fetchBrokerage = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('brokerages')
          .select('id, slug, portal_enabled, portal_show_policies, portal_allow_policy_download, portal_show_cards, portal_allow_card_download, portal_allow_profile_edit')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching brokerage:', error);
          return;
        }

        if (data) {
          setBrokerageId(data.id);
          setBrokerageSlug(data.slug);
          setSettings({
            portal_enabled: data.portal_enabled ?? false,
            portal_show_policies: data.portal_show_policies ?? true,
            portal_allow_policy_download: data.portal_allow_policy_download ?? true,
            portal_show_cards: data.portal_show_cards ?? true,
            portal_allow_card_download: data.portal_allow_card_download ?? true,
            portal_allow_profile_edit: data.portal_allow_profile_edit ?? true,
          });
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrokerage();
  }, [user]);

  const handleSave = async () => {
    if (!brokerageId) {
      toast.error('Nenhuma corretora cadastrada. Cadastre uma corretora primeiro.');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('brokerages')
        .update({
          portal_enabled: settings.portal_enabled,
          portal_show_policies: settings.portal_show_policies,
          portal_allow_policy_download: settings.portal_allow_policy_download,
          portal_show_cards: settings.portal_show_cards,
          portal_allow_card_download: settings.portal_allow_card_download,
          portal_allow_profile_edit: settings.portal_allow_profile_edit,
        })
        .eq('id', brokerageId);

      if (error) throw error;
      toast.success('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const copyLink = async () => {
    if (!portalLink) return toast.error('Configure um slug para a corretora primeiro');
    try {
      await navigator.clipboard.writeText(portalLink);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar link');
    }
  };

  const updateSetting = (key: keyof PortalConfig, value: boolean) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      if (key === 'portal_show_policies' && !value) newSettings.portal_allow_policy_download = false;
      if (key === 'portal_show_cards' && !value) newSettings.portal_allow_card_download = false;
      return newSettings;
    });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando configurações...</div>;

  if (!brokerageId) {
    return (
      <div className="flex flex-col h-full bg-card rounded-2xl border border-white/5 shadow-sm max-w-4xl mx-auto p-12 text-center items-center justify-center">
        <Globe className="w-16 h-16 opacity-20 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground">Portal Indisponível</h3>
        <p className="text-muted-foreground mt-2 max-w-sm">Você precisa cadastrar uma corretora ativa antes de configurar o Portal do Cliente.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-card rounded-2xl border border-white/5 shadow-sm max-w-4xl mx-auto">
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Portal do Cliente</h2>
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${settings.portal_enabled ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
              {settings.portal_enabled ? 'ATIVO' : 'INATIVO'}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Personalize o acesso e módulos do aplicativo web de seus clientes
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-full px-6 bg-primary text-primary-foreground"
        >
          {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : <><Save className="w-4 h-4 mr-2" />Salvar Alterações</>}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">

        {/* Link Dinâmico */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-primary uppercase tracking-widest pl-2">Acesso</h3>
          {portalLink ? (
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-primary/5 border border-primary/20 rounded-2xl p-4">
              <div className="flex-1 bg-black/20 rounded-xl px-4 py-3 font-mono text-sm text-primary/90 select-all border border-black/40 w-full truncate text-center sm:text-left shadow-inner">
                {portalLink}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="default"
                  className="flex-1 sm:flex-none rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                  onClick={copyLink}
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none rounded-xl border-white/10 hover:bg-white/5 shadow-sm"
                  onClick={() => window.open(portalLink, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" /> Abrir
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4">
              <div className="p-2 bg-amber-500/20 rounded-full shrink-0"><Globe className="w-5 h-5 text-amber-500" /></div>
              <div>
                <p className="text-amber-400 text-sm font-medium">Link não configurado</p>
                <p className="text-amber-500/70 text-xs mt-1">Configure um Slug ("apelido_url") nas configurações da sua Corretora para gerar o link único do seu portal.</p>
              </div>
            </div>
          )}
        </section>

        {/* Master Active */}
        <section className="space-y-4">
          <div className="bg-background rounded-2xl border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => updateSetting('portal_enabled', !settings.portal_enabled)}>
              <div>
                <Label className="text-foreground text-base font-semibold pointer-events-none">Portal do Cliente Ativo</Label>
                <p className="text-sm text-muted-foreground mt-1 pointer-events-none">Permitir que os clientes se conectem com e-mail/telefone e visualizem seu painel.</p>
              </div>
              <Switch checked={settings.portal_enabled} onCheckedChange={(v) => updateSetting('portal_enabled', v)} />
            </div>
          </div>
        </section>

        {/* Módulos de Visualização */}
        <section className={`space-y-4 transition-opacity duration-300 ${!settings.portal_enabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
          <h3 className="text-xs font-semibold text-primary uppercase tracking-widest pl-2">Módulos & Permissões</h3>
          <div className="bg-background rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">

            {/* bloco apolices */}
            <div className="px-6 py-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground font-medium">Apólices Ativas</Label>
                  <p className="text-xs text-muted-foreground mt-1">Exibir a guia com apólices vigentes e histórico</p>
                </div>
                <Switch checked={settings.portal_show_policies} onCheckedChange={(v) => updateSetting('portal_show_policies', v)} />
              </div>

              {settings.portal_show_policies && (
                <div className="ml-4 pl-4 border-l border-white/10 flex items-center justify-between">
                  <Label className="text-muted-foreground text-sm font-normal">Permitir download do PDF na nuvem</Label>
                  <Switch checked={settings.portal_allow_policy_download} onCheckedChange={(v) => updateSetting('portal_allow_policy_download', v)} className="data-[state=checked]:bg-slate-600 scale-75" />
                </div>
              )}
            </div>

            {/* bloco carteirinhas */}
            <div className="px-6 py-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground font-medium">Carteirinhas Digitais</Label>
                  <p className="text-xs text-muted-foreground mt-1">Exibir carteirinhas de Saúde/Odonto como imagem</p>
                </div>
                <Switch checked={settings.portal_show_cards} onCheckedChange={(v) => updateSetting('portal_show_cards', v)} />
              </div>

              {settings.portal_show_cards && (
                <div className="ml-4 pl-4 border-l border-white/10 flex items-center justify-between">
                  <Label className="text-muted-foreground text-sm font-normal">Permitir download da imagem</Label>
                  <Switch checked={settings.portal_allow_card_download} onCheckedChange={(v) => updateSetting('portal_allow_card_download', v)} className="data-[state=checked]:bg-slate-600 scale-75" />
                </div>
              )}
            </div>

            {/* bloco profile */}
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <Label className="text-foreground font-medium">Auto-Acondicionamento de Perfil</Label>
                <p className="text-xs text-muted-foreground mt-1">Clientes podem atualizar próprios endereços e contatos</p>
              </div>
              <Switch checked={settings.portal_allow_profile_edit} onCheckedChange={(v) => updateSetting('portal_allow_profile_edit', v)} />
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
