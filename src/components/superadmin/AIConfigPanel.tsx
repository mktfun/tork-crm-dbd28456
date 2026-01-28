import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Eye, EyeOff, Save, Cpu, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface AIConfig {
  geminiApiKey: string;
  mistralApiKey: string;
  openaiApiKey: string;
  chatwootToken: string;
  globalAIBypass: boolean;
}

const defaultConfig: AIConfig = {
  geminiApiKey: '',
  mistralApiKey: '',
  openaiApiKey: '',
  chatwootToken: '',
  globalAIBypass: false,
};

export function AIConfigPanel() {
  const [config, setConfig] = useLocalStorage<AIConfig>('admin_ai_config', defaultConfig);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const toggleShowKey = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const maskValue = (value: string) => {
    if (!value) return '';
    if (value.length <= 8) return '••••••••';
    return value.slice(0, 4) + '••••••••' + value.slice(-4);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save - in production, this would save to a secure backend
    await new Promise((resolve) => setTimeout(resolve, 500));
    toast.success('Configurações salvas com sucesso');
    setIsSaving(false);
  };

  const handleChange = (key: keyof AIConfig, value: string | boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const apiKeys = [
    { 
      key: 'geminiApiKey' as const, 
      label: 'Gemini API Key', 
      description: 'Usado para assistente de IA e chat',
      status: config.geminiApiKey ? 'configured' : 'missing'
    },
    { 
      key: 'mistralApiKey' as const, 
      label: 'Mistral API Key', 
      description: 'Usado para OCR e análise de documentos',
      status: config.mistralApiKey ? 'configured' : 'missing'
    },
    { 
      key: 'openaiApiKey' as const, 
      label: 'OpenAI API Key', 
      description: 'Backup para funcionalidades avançadas',
      status: config.openaiApiKey ? 'configured' : 'missing'
    },
    { 
      key: 'chatwootToken' as const, 
      label: 'Chatwoot Token', 
      description: 'Integração com sistema de chat',
      status: config.chatwootToken ? 'configured' : 'missing'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Configurações de IA</h1>
        <p className="text-sm text-zinc-400 mt-1">Gerencie as chaves de API e integrações de IA do sistema</p>
      </div>

      {/* Global Bypass Alert */}
      {config.globalAIBypass && (
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
              checked={config.globalAIBypass}
              onCheckedChange={(checked) => handleChange('globalAIBypass', checked)}
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
          <CardDescription>Configure as chaves de acesso aos provedores de IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiKeys.map((api) => (
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
                    api.status === 'configured'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  }
                >
                  {api.status === 'configured' ? 'Configurada' : 'Não Configurada'}
                </Badge>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKeys[api.key] ? 'text' : 'password'}
                    value={config[api.key]}
                    onChange={(e) => handleChange(api.key, e.target.value)}
                    placeholder={showKeys[api.key] ? 'Digite a chave...' : '••••••••••••••••'}
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
              </div>
            </div>
          ))}

          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
