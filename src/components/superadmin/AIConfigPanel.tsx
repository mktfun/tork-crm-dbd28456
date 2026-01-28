import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSystemSettings, useUpsertSystemSetting, getSettingValue } from '@/hooks/useSuperAdminData';
import { Eye, EyeOff, Save, Cpu, AlertTriangle, Loader2 } from 'lucide-react';

const API_KEYS_CONFIG = [
  { 
    key: 'gemini_api_key', 
    label: 'Gemini API Key', 
    description: 'Usado para assistente de IA e chat'
  },
  { 
    key: 'mistral_api_key', 
    label: 'Mistral API Key', 
    description: 'Usado para OCR e análise de documentos'
  },
  { 
    key: 'openai_api_key', 
    label: 'OpenAI API Key', 
    description: 'Backup para funcionalidades avançadas'
  },
];

export function AIConfigPanel() {
  const { data: settings, isLoading } = useSystemSettings();
  const upsertSetting = useUpsertSystemSetting();
  
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [globalBypass, setGlobalBypass] = useState(false);

  // Initialize local values from settings when loaded
  const getDisplayValue = (key: string) => {
    if (localValues[key] !== undefined) {
      return localValues[key];
    }
    return settings ? getSettingValue(settings, key) || '' : '';
  };

  const isConfigured = (key: string) => {
    const settingValue = settings ? getSettingValue(settings, key) : null;
    return !!settingValue || !!localValues[key];
  };

  const toggleShowKey = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveKey = async (key: string, description: string) => {
    const value = localValues[key];
    if (!value) return;
    
    await upsertSetting.mutateAsync({
      key,
      value,
      description,
    });
    
    // Clear local value after save
    setLocalValues((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleToggleBypass = async (checked: boolean) => {
    setGlobalBypass(checked);
    await upsertSetting.mutateAsync({
      key: 'global_ai_bypass',
      value: String(checked),
      description: 'Desabilita todas as funcionalidades de IA',
    });
  };

  // Check if bypass is enabled from settings
  const bypassEnabled = settings 
    ? getSettingValue(settings, 'global_ai_bypass') === 'true' || globalBypass
    : globalBypass;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-zinc-800" />
        <Skeleton className="h-32 w-full bg-zinc-800" />
        <Skeleton className="h-64 w-full bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Configurações de IA</h1>
        <p className="text-sm text-zinc-400 mt-1">Gerencie as chaves de API globais do sistema</p>
      </div>

      {/* Global Bypass Alert */}
      {bypassEnabled && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-400">IA Desabilitada Globalmente</p>
            <p className="text-xs text-red-400/70">Todas as funcionalidades de IA estão desativadas no sistema</p>
          </div>
        </div>
      )}

      {/* Global Settings */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Controles Globais</CardTitle>
          <CardDescription>Configurações que afetam todo o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-md bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <Label className="text-zinc-100 font-medium">Global AI Bypass</Label>
                <p className="text-sm text-zinc-500">Desabilita todas as funcionalidades de IA em caso de emergência</p>
              </div>
            </div>
            <Switch
              checked={bypassEnabled}
              onCheckedChange={handleToggleBypass}
              disabled={upsertSetting.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Chaves de API
          </CardTitle>
          <CardDescription>Configure as chaves de acesso aos provedores de IA. As integrações do Chatwoot são gerenciadas por corretora.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {API_KEYS_CONFIG.map((api) => {
            const hasLocalChange = localValues[api.key] !== undefined;
            const configured = isConfigured(api.key);
            
            return (
              <div 
                key={api.key}
                className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-zinc-100 font-medium">{api.label}</Label>
                    <p className="text-xs text-zinc-500">{api.description}</p>
                  </div>
                  <Badge
                    className={
                      configured
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }
                  >
                    {configured ? 'Configurada (••••)' : 'Não Configurada'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKeys[api.key] ? 'text' : 'password'}
                      value={getDisplayValue(api.key)}
                      onChange={(e) => handleChange(api.key, e.target.value)}
                      placeholder={configured && !showKeys[api.key] ? '••••••••••••••••' : 'Digite a chave...'}
                      className="bg-zinc-900/50 border-zinc-600 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey(api.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                    >
                      {showKeys[api.key] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <Button 
                    onClick={() => handleSaveKey(api.key, api.description)} 
                    disabled={!hasLocalChange || upsertSetting.isPending}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {upsertSetting.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
