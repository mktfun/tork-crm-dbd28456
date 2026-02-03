
import React, { useState } from 'react';
import { useAIConfig } from '@/hooks/useModularAI';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export function IntegrationsPanel() {
    const { config, upsertConfig } = useAIConfig();
    const [copied, setCopied] = useState(false);

    // URL da Edge Function (hardcoded por enquanto ou via env vars no frontend)
    // Em produção, isso viria de uma ENV exposta pelo Vite
    const edgeFunctionUrl = "https://jaouwhckqqnaxqyfvgyq.supabase.co/functions/v1/chatwoot-dispatcher";

    const handleCopy = () => {
        navigator.clipboard.writeText(edgeFunctionUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('URL copiada!');
    };

    const handleSaveConfig = async (key: string, value: any) => {
        await upsertConfig.mutateAsync({ [key]: value });
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Integrações & Configuração Global</h2>
                    <p className="text-muted-foreground">Conecte seus canais e ajuste o comportamento da IA.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="ai-active">IA Ativa</Label>
                    <Switch
                        id="ai-active"
                        checked={config?.is_active ?? true}
                        onCheckedChange={(val) => handleSaveConfig('is_active', val)}
                    />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Chatwoot Connection */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <img src="https://avatars.githubusercontent.com/u/16704908" className="w-5 h-5 rounded-sm" alt="Chatwoot" />
                            Chatwoot
                        </CardTitle>
                        <CardDescription>Configure o webhook para receber mensagens.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Webhook URL (Copie e cole no Chatwoot)</Label>
                            <div className="flex gap-2">
                                <Input value={edgeFunctionUrl} readOnly className="font-mono text-xs" />
                                <Button variant="outline" size="icon" onClick={handleCopy}>
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Vá em Configurações &gt; Integrações &gt; Webhooks no Chatwoot e adicione esta URL.
                            </p>
                        </div>
                        <Button variant="secondary" className="w-full" asChild>
                            <a href="https://app.chatwoot.com" target="_blank" rel="noopener noreferrer">
                                Abrir Chatwoot <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                        </Button>
                    </CardContent>
                </Card>

                {/* Global Model Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Cérebro da IA</CardTitle>
                        <CardDescription>Parâmetros globais do modelo.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Modelo</Label>
                            <Select
                                value={config?.model || 'gpt-4o'}
                                onValueChange={(val) => handleSaveConfig('model', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o modelo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gpt-4o">GPT-4o (Recomendado)</SelectItem>
                                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Rápido)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Criatividade (Temperatura): {config?.temperature ?? 0.7}</Label>
                            </div>
                            <Slider
                                value={[config?.temperature ?? 0.7]}
                                max={1.0}
                                step={0.1}
                                onValueChange={(vals) => handleSaveConfig('temperature', vals[0])}
                            />
                            <p className="text-xs text-muted-foreground pt-1">
                                Valores mais altos tornam a IA mais criativa, mas menos previsível.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* n8n Connection (Optional View) */}
            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Configuração Avançada (n8n)</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        O Webhook do n8n é configurado via Segredos do Supabase (Server-side) por motivos de segurança.
                        <br />
                        Para alterar, use o comando CLI: <code>npx supabase secrets set N8N_WEBHOOK_URL=...</code>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
