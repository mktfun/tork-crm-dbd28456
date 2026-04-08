import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Save,
  MessageCircle,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Wifi,
  Send,
  Copy,
  Check,
  Settings,
  Link,
  Brain,
  Zap,
  Shield,
  Users,
  Mic,
  Info
} from "lucide-react";
import { InboxAgentMapping } from "@/components/settings/InboxAgentMapping";

interface AutomationSettings {
  brokerageId?: number;
  crmSettingsId?: string;
  chatwoot_url: string;
  chatwoot_api_key: string;
  chatwoot_account_id: string;
  chatwoot_webhook_secret: string;
  n8n_webhook_url: string;
}

const MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  gemini: [
    { value: "gemini-3.1-pro", label: "Gemini 3.1 Pro (Alta Inteligência)" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Alta Velocidade)" },
  ],
  openai: [
    { value: "gpt-4.1", label: "GPT-4.1 (Alta Inteligência)" },
    { value: "o3", label: "o3 (Raciocínio)" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini (Alta Velocidade)" },
  ],
  grok: [
    { value: "grok-4.20", label: "Grok 4.20 (Alta Inteligência)" },
    { value: "grok-3-mini", label: "Grok 3 Mini (Alta Velocidade)" },
  ],
  anthropic: [
    { value: "claude-sonnet-4.6", label: "Claude Sonnet 4.6 (Alta Inteligência)" },
    { value: "claude-3.5-haiku", label: "Claude 3.5 Haiku (Alta Velocidade)" },
  ],
  deepseek: [
    { value: "deepseek-r1", label: "DeepSeek R1 (Alta Inteligência)" },
    { value: "deepseek-vl2", label: "DeepSeek VL2 (Alta Velocidade)" },
  ],
};

/** Remove trailing slashes and /api/v1 suffix */
function sanitizeUrl(url: string): string {
  return url
    .trim()
    .replace(/\/api\/v1\/?$/i, "")
    .replace(/\/+$/, "");
}

export function AutomationConfigTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingN8n, setTestingN8n] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [showAiApiKey, setShowAiApiKey] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testInboxId, setTestInboxId] = useState("");
  const [testContactId, setTestContactId] = useState("");

  const [aiProvider, setAiProvider] = useState("gemini");
  const [aiModel, setAiModel] = useState("gemini-2.0-flash");
  const [aiApiKey, setAiApiKey] = useState("");
  const [globalConfigId, setGlobalConfigId] = useState<string | null>(null);

  // ElevenLabs state
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState("");
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState("");
  const [elevenLabsModelId, setElevenLabsModelId] = useState("eleven_multilingual_v2");
  const [showElevenLabsKey, setShowElevenLabsKey] = useState(false);
  const [testingElevenLabs, setTestingElevenLabs] = useState(false);
  const [adminAlertPhone, setAdminAlertPhone] = useState("");
  const [activeTab, setActiveTab] = useState<'ai' | 'rules' | 'integrations'>('ai');

  const [settings, setSettings] = useState<AutomationSettings>({
    chatwoot_url: "",
    chatwoot_api_key: "",
    chatwoot_account_id: "",
    chatwoot_webhook_secret: "",
    n8n_webhook_url: "",
  });

  const webhookUrl = `https://jaouwhckqqnaxqyfvgyq.supabase.co/functions/v1/chatwoot-dispatcher`;

  useEffect(() => {
    if (user?.id) {
      fetchSettings();
    }
  }, [user?.id]);

  // Reset model when provider changes
  useEffect(() => {
    const models = MODEL_OPTIONS[aiProvider] || [];
    if (!models.find((m) => m.value === aiModel)) {
      setAiModel(models[0]?.value || "");
    }
  }, [aiProvider]);

  const fetchSettings = async () => {
    try {
      const [brokerageRes, crmRes, globalRes] = await Promise.all([
        supabase
          .from("brokerages")
          .select("id, chatwoot_url, chatwoot_token, chatwoot_account_id, updated_at, elevenlabs_api_key, elevenlabs_voice_id, elevenlabs_model_id")
          .eq("user_id", user?.id ?? "")
          .maybeSingle(),
        supabase
          .from("crm_settings")
          .select("id, chatwoot_url, chatwoot_api_key, chatwoot_account_id, chatwoot_webhook_secret, n8n_webhook_url, updated_at")
          .eq("user_id", user?.id ?? "")
          .maybeSingle(),
        supabase
          .from("crm_ai_global_config")
          .select("id, ai_provider, ai_model, api_key")
          .eq("user_id", user?.id ?? "")
          .maybeSingle(),
      ]);

      const brok = brokerageRes.data;
      const crm = crmRes.data;
      const global = globalRes.data;

      const brokDate = brok?.updated_at ? new Date(brok.updated_at).getTime() : 0;
      const crmDate = crm?.updated_at ? new Date(crm.updated_at).getTime() : 0;
      const useCrmCreds = crmDate >= brokDate && crm?.chatwoot_url;

      setSettings({
        brokerageId: brok?.id ?? undefined,
        crmSettingsId: crm?.id ?? undefined,
        chatwoot_url: (useCrmCreds ? crm?.chatwoot_url : brok?.chatwoot_url) || "",
        chatwoot_api_key: (useCrmCreds ? crm?.chatwoot_api_key : brok?.chatwoot_token) || "",
        chatwoot_account_id: (useCrmCreds ? crm?.chatwoot_account_id : brok?.chatwoot_account_id) || "",
        chatwoot_webhook_secret: crm?.chatwoot_webhook_secret || "",
        n8n_webhook_url: crm?.n8n_webhook_url || "",
      });

      // AI Engine fields
      if (global) {
        setGlobalConfigId(global.id);
        setAiProvider((global as any).ai_provider || "gemini");
        setAiModel((global as any).ai_model || "gemini-2.0-flash");
        setAiApiKey((global as any).api_key || "");
      }

      if (brok) {
        setElevenLabsApiKey(brok.elevenlabs_api_key || "");
        setElevenLabsVoiceId(brok.elevenlabs_voice_id || "");
        setElevenLabsModelId(brok.elevenlabs_model_id || "eleven_multilingual_v2");
        setAdminAlertPhone((brok as any).admin_alert_phone || "");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const cleanUrl = sanitizeUrl(settings.chatwoot_url);

    try {
      if (settings.brokerageId) {
        const { error: brokErr } = await supabase
          .from("brokerages")
          .update({
            chatwoot_url: cleanUrl || null,
            chatwoot_token: settings.chatwoot_api_key || null,
            chatwoot_account_id: settings.chatwoot_account_id || null,
            elevenlabs_api_key: elevenLabsApiKey || null,
            elevenlabs_voice_id: elevenLabsVoiceId || null,
            elevenlabs_model_id: elevenLabsModelId || 'eleven_multilingual_v2',
            admin_alert_phone: adminAlertPhone || null,
          })
          .eq("id", settings.brokerageId)
          .eq("user_id", user.id);
        if (brokErr) throw brokErr;
      }

      // 2) Upsert crm_settings
      const crmPayload = {
        user_id: user.id,
        chatwoot_url: cleanUrl || null,
        chatwoot_api_key: settings.chatwoot_api_key || null,
        chatwoot_account_id: settings.chatwoot_account_id || null,
        chatwoot_webhook_secret: settings.chatwoot_webhook_secret || null,
        n8n_webhook_url: settings.n8n_webhook_url || null,
      };

      if (settings.crmSettingsId) {
        const { error: crmErr } = await supabase
          .from("crm_settings")
          .update(crmPayload)
          .eq("id", settings.crmSettingsId);
        if (crmErr) throw crmErr;
      } else {
        const { error: crmErr } = await supabase
          .from("crm_settings")
          .insert(crmPayload);
        if (crmErr) throw crmErr;
      }

      // 3) Upsert AI engine config
      const aiPayload = {
        user_id: user.id,
        ai_provider: aiProvider,
        ai_model: aiModel,
        api_key: aiApiKey || null,
      };

      if (globalConfigId) {
        const { error: aiErr } = await supabase
          .from("crm_ai_global_config")
          .update(aiPayload)
          .eq("id", globalConfigId);
        if (aiErr) throw aiErr;
      } else {
        const { data: inserted, error: aiErr } = await supabase
          .from("crm_ai_global_config")
          .insert(aiPayload)
          .select("id")
          .single();
        if (aiErr) throw aiErr;
        if (inserted) setGlobalConfigId(inserted.id);
      }

      toast.success("Configurações salvas com sucesso!");
      fetchSettings();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar: " + (error.message || "Verifique os dados"));
    } finally {
      setSaving(false);
    }
  };

  const buildConfigOverride = () => ({
    chatwoot_url: sanitizeUrl(settings.chatwoot_url),
    chatwoot_api_key: settings.chatwoot_api_key,
    chatwoot_account_id: settings.chatwoot_account_id,
  });

  const handleTestChatwoot = async () => {
    if (!settings.chatwoot_url || !settings.chatwoot_api_key || !settings.chatwoot_account_id) {
      toast.error("Preencha todos os campos do Chatwoot");
      return;
    }
    setTesting(true);
    const toastId = toast.loading("Testando conexão com Chatwoot...");
    try {
      const { data, error } = await supabase.functions.invoke("chatwoot-sync", {
        body: { action: "validate", config_override: buildConfigOverride() },
      });
      toast.dismiss(toastId);
      if (error) throw error;
      if (data?.success) {
        toast.success(data.message || "Conexão estabelecida!");
      } else {
        toast.error(data?.message || "Falha na conexão");
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error("Falha na conexão: " + (error.message || "Verifique suas credenciais"));
    } finally {
      setTesting(false);
    }
  };

  const handleSyncLabels = async () => {
    if (!settings.chatwoot_url || !settings.chatwoot_api_key || !settings.chatwoot_account_id) {
      toast.error("Configure as credenciais do Chatwoot primeiro");
      return;
    }
    setSyncing(true);
    const toastId = toast.loading("Sincronizando etiquetas...");
    try {
      const { data, error } = await supabase.functions.invoke("chatwoot-sync", {
        body: { action: "sync_stages", config_override: buildConfigOverride() },
      });
      toast.dismiss(toastId);
      if (error) throw error;
      if (data?.success) {
        toast.success(data.message || "Etiquetas sincronizadas!");
      } else {
        toast.error(data?.message || "Erro ao sincronizar");
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error("Erro ao sincronizar: " + (error.message || "Verifique suas credenciais"));
    } finally {
      setSyncing(false);
    }
  };

  const handleTestN8n = async () => {
    if (!settings.n8n_webhook_url) {
      toast.error("Preencha a URL do webhook n8n");
      return;
    }
    if (!testInboxId) {
      toast.error("Preencha o Inbox ID para teste");
      return;
    }
    setTestingN8n(true);
    const toastId = toast.loading("Enviando teste para n8n...");
    try {
      const { data, error } = await supabase.functions.invoke("test-n8n-webhook", {
        body: {
          inbox_id: testInboxId,
          n8n_webhook_url: settings.n8n_webhook_url,
          contact_id: testContactId || undefined,
        },
      });
      toast.dismiss(toastId);
      if (error) throw error;
      if (data?.success) {
        toast.success("Teste enviado com sucesso! Verifique o n8n.");
      } else {
        toast.error(data?.message || "Erro ao enviar teste");
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error("Erro ao enviar teste: " + (error.message || "Verifique a URL"));
    } finally {
      setTestingN8n(false);
    }
  };

  const handleTestAiApiKey = async () => {
    if (!aiApiKey) {
      toast.error("Insira a API Key antes de testar");
      return;
    }
    setTestingAi(true);
    const toastId = toast.loading(`Validando chave ${aiProvider}...`);
    try {
      const { data, error } = await supabase.functions.invoke("test-ai-apikey", {
        body: { provider: aiProvider, model: aiModel, api_key: aiApiKey },
      });
      toast.dismiss(toastId);
      if (error) throw error;
      if (data?.success) {
        toast.success(`✅ Chave válida! Provedor: ${aiProvider}`);
      } else {
        toast.error(data?.message || "Chave inválida ou sem permissão");
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error("Erro ao testar: " + (err.message || "Verifique a chave"));
    } finally {
      setTestingAi(false);
    }
  };

  const handleTestElevenLabs = async () => {
    if (!elevenLabsApiKey) {
      toast.error("Insira a API Key da ElevenLabs antes de testar");
      return;
    }
    setTestingElevenLabs(true);
    const toastId = toast.loading("Validando chave ElevenLabs...");
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": elevenLabsApiKey }
      });
      toast.dismiss(toastId);
      if (response.ok) {
        toast.success("✅ Chave ElevenLabs válida!");
      } else {
        toast.error("Chave ElevenLabs inválida.");
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error("Erro ao conectar à ElevenLabs.");
    } finally {
      setTestingElevenLabs(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    toast.success("URL copiada!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const models = MODEL_OPTIONS[aiProvider] || [];

  return (
    <div className="space-y-6 pb-24 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-base text-foreground">
              Configurações de Automação
            </h2>
            <p className="text-xs text-muted-foreground">
              Credenciais e integrações
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Sidebar Nav */}
        <div className="w-full md:w-56 shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 sticky top-24">
          <Button 
            variant={activeTab === 'ai' ? 'secondary' : 'ghost'} 
            className={`justify-start ${activeTab === 'ai' ? 'bg-secondary/60 font-semibold' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('ai')}
          >
            <Brain className="h-4 w-4 mr-2" /> IA & Síntese
          </Button>
          <Button 
            variant={activeTab === 'rules' ? 'secondary' : 'ghost'} 
            className={`justify-start ${activeTab === 'rules' ? 'bg-secondary/60 font-semibold' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('rules')}
          >
            <Shield className="h-4 w-4 mr-2" /> Regras SDR
          </Button>
          <Button 
            variant={activeTab === 'integrations' ? 'secondary' : 'ghost'} 
            className={`justify-start ${activeTab === 'integrations' ? 'bg-secondary/60 font-semibold' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('integrations')}
          >
            <Zap className="h-4 w-4 mr-2" /> Integrações
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6 min-w-0 w-full animate-in fade-in duration-300">
          
          {/* ── AI SECTION ── */}
          {activeTab === 'ai' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">

      {/* ── Card 0: Motor de IA ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Brain className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Motor de Inteligência</CardTitle>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">IA</Badge>
              </div>
              <CardDescription>
                Provedor, modelo e chave de acesso — usado pelo Assistente Tork e Relatórios
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provedor de IA</Label>
              <Select value={aiProvider} onValueChange={setAiProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o provedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="grok">Grok (xAI)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select value={aiModel} onValueChange={setAiModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showAiApiKey ? "text" : "password"}
                    placeholder="Insira a chave do provedor"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowAiApiKey(!showAiApiKey)}
                  >
                    {showAiApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  title="Testar conexão com o provedor"
                  disabled={!aiApiKey || testingAi}
                  onClick={handleTestAiApiKey}
                  className="shrink-0 h-10 w-10"
                >
                  {testingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Chave de API do provedor selecionado. Armazenada de forma segura.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 0.5: ElevenLabs — Voz do SDR ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Mic className="h-5 w-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">ElevenLabs — Voz do SDR</CardTitle>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Áudio</Badge>
              </div>
              <CardDescription>
                Síntese de áudio autônoma para mensagens de voz
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modelo de Síntese</Label>
              <Select value={elevenLabsModelId} onValueChange={setElevenLabsModelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eleven_multilingual_v2">Multilingual v2 (Recomendado)</SelectItem>
                  <SelectItem value="eleven_turbo_v2_5">Turbo v2.5 (Alta Velocidade)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Voice ID Padrão</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="ID da voz (ex: pNInz6obpg...)"
                  value={elevenLabsVoiceId}
                  onChange={(e) => setElevenLabsVoiceId(e.target.value)}
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showElevenLabsKey ? "text" : "password"}
                    placeholder="Insira a chave da ElevenLabs"
                    value={elevenLabsApiKey}
                    onChange={(e) => setElevenLabsApiKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowElevenLabsKey(!showElevenLabsKey)}
                  >
                    {showElevenLabsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  title="Testar API Key da ElevenLabs"
                  disabled={!elevenLabsApiKey || testingElevenLabs}
                  onClick={handleTestElevenLabs}
                  className="shrink-0 h-10 w-10"
                >
                  {testingElevenLabs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="md:col-span-2 mt-2">
              <Alert className="bg-muted">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  O Voice ID prioritário é o configurado nas Etapas do Funil (em Motor de IA). Este Voice ID Padrão atua como fallback caso a etapa não tenha uma voz configurada.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
      </Card>
      
      </div>
      )}

      {/* ── RULES SECTION ── */}
      {activeTab === 'rules' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">

      {/* ── Card 0.6: Alertas do SDR ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Send className="h-5 w-5 text-red-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Alertas do SDR</CardTitle>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Escalonamento</Badge>
              </div>
              <CardDescription>
                Número que receberá alertas quando o SDR precisar de intervenção humana
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="admin_alert_phone">Telefone para Alertas (WhatsApp)</Label>
              <Input
                id="admin_alert_phone"
                placeholder="Ex: +5511999999999"
                value={adminAlertPhone}
                onChange={(e) => setAdminAlertPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Quando o SDR escalar um atendimento (ex: 2ª via, cancelamento), este número será notificado automaticamente pelo WhatsApp. Use o formato internacional com código do país.
              </p>
            </div>
            <Alert className="bg-muted">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                O SDR pausará automaticamente durante 24h após o escalonamento. O cliente não receberá respostas automáticas nesse período — você assume o atendimento manualmente.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 4: Mapeamento de Inboxes (moved from bottom) ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Mapeamento de Inboxes</CardTitle>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Roteamento</Badge>
              </div>
              <CardDescription>
                Determine quem herda os leads de cada caixa de entrada
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <InboxAgentMapping />
        </CardContent>
      </Card>

      </div>
      )}

      {/* ── INTEGRATIONS SECTION ── */}
      {activeTab === 'integrations' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">

      {/* ── Card 1: Chat Tork (Chatwoot) ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Chat Tork (Chatwoot)</CardTitle>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Integração</Badge>
              </div>
              <CardDescription>
                Credenciais da instância Chatwoot para comunicação em tempo real
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
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
                  type={showApiKey ? "text" : "password"}
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

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="chatwoot_webhook_secret">Webhook Secret</Label>
              <div className="relative">
                <Input
                  id="chatwoot_webhook_secret"
                  type={showWebhookSecret ? "text" : "password"}
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
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-border/50">
            <Button variant="outline" size="sm" onClick={handleTestChatwoot} disabled={testing || !settings.chatwoot_url}>
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
              Testar Conexão
            </Button>
            <Button variant="outline" size="sm" onClick={handleSyncLabels} disabled={syncing || !settings.chatwoot_url}>
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar Etiquetas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 2: Webhook do CRM ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Link className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Webhook do CRM</CardTitle>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Endpoint</Badge>
              </div>
              <CardDescription>
                Configure no Chatwoot para receber eventos em tempo real
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs bg-muted/30" />
            <Button variant="outline" size="icon" onClick={handleCopyWebhook} className="shrink-0">
              {copiedWebhook ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <h4 className="text-sm font-medium mb-2">Como configurar:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Acesse Settings → Applications → Webhooks no Chatwoot</li>
                <li>Clique em "Add new webhook"</li>
                <li>Cole a URL acima</li>
                <li>Selecione os eventos: message_created, conversation_updated</li>
                <li>Salve e copie o Secret gerado para o campo acima</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* ── Card 3: n8n — Automação Avançada ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">n8n — Automação Avançada</CardTitle>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Webhook</Badge>
              </div>
              <CardDescription>
                Configure o webhook do n8n para automações externas
              </CardDescription>
            </div>
          </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="test_contact_id">Contact ID (opcional)</Label>
              <Input
                id="test_contact_id"
                placeholder="uuid do cliente"
                value={testContactId}
                onChange={(e) => setTestContactId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                ID de um cliente específico (se vazio, usa qualquer um)
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestN8n}
              disabled={testingN8n || !settings.n8n_webhook_url || !testInboxId}
            >
              {testingN8n ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar Teste
            </Button>
          </div>
        </CardContent>
      </Card>

      </div>
      )}

        </div>
      </div>

      {/* ── Sticky Save Bar — Glassmorphism ── */}
      <div className="sticky bottom-0 z-10 -mx-1 px-1 py-4 bg-background/60 backdrop-blur-xl border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>Credenciais armazenadas com criptografia AES-256</span>
          </div>
          <Button onClick={handleSave} disabled={saving} size="lg" className="min-w-[180px]">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Configurações
          </Button>
        </div>
      </div>
    </div>
  );
}
