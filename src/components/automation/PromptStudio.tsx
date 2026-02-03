
import React, { useState } from 'react';
import { useAIPrompts, useAIConfig, AIPrompt } from '@/hooks/useModularAI';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Save, MoveVertical, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export function PromptStudio() {
    const { config } = useAIConfig();
    const { prompts, isLoading, upsertPrompt, deletePrompt } = useAIPrompts(config?.id);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    const handleEdit = (prompt: AIPrompt) => {
        setEditingId(prompt.id);
        setEditContent(prompt.content);
    };

    const handleSave = async (prompt: AIPrompt) => {
        await upsertPrompt.mutateAsync({ ...prompt, content: editContent });
        setEditingId(null);
    };

    const handleToggle = async (prompt: AIPrompt) => {
        await upsertPrompt.mutateAsync({ ...prompt, is_enabled: !prompt.is_enabled });
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja remover este módulo?')) {
            await deletePrompt.mutateAsync(id);
        }
    };

    const handleAddModule = async () => {
        if (!config?.id) return;
        await upsertPrompt.mutateAsync({
            config_id: config.id,
            module_type: 'custom',
            content: 'Instrução customizada...',
            is_enabled: true,
            position: (prompts?.length || 0) + 1
        });
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    if (!config) {
        return <div className="p-4 text-center">Configure a IA primeiro na aba Integrações.</div>;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Prompt Studio 🧠</h2>
                    <p className="text-muted-foreground">Construa o cérebro da sua IA em módulos.</p>
                </div>
                <Button onClick={handleAddModule}><Plus className="mr-2 h-4 w-4" /> Novo Módulo</Button>
            </div>

            <div className="grid gap-4">
                {prompts?.map((prompt) => (
                    <Card key={prompt.id} className={!prompt.is_enabled ? 'opacity-60' : ''}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="flex items-center gap-2">
                                <MoveVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                <Badge variant="outline" className="uppercase text-xs">{prompt.module_type}</Badge>
                                {editingId !== prompt.id && (
                                    <span className="font-semibold text-sm truncate max-w-[300px]">
                                        {prompt.content.substring(0, 50)}...
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={prompt.is_enabled}
                                        onCheckedChange={() => handleToggle(prompt)}
                                    />
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(prompt.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {editingId === prompt.id ? (
                                <div className="space-y-4">
                                    <Textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        rows={6}
                                        className="font-mono text-sm"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                                        <Button onClick={() => handleSave(prompt)}><Save className="mr-2 h-4 w-4" /> Salvar</Button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="p-3 bg-muted rounded-md text-sm font-mono whitespace-pre-wrap cursor-pointer hover:bg-muted/80 transition"
                                    onClick={() => handleEdit(prompt)}
                                >
                                    {prompt.content}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}

                {prompts?.length === 0 && (
                    <div className="text-center p-10 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground mb-4">Nenhum módulo configurado.</p>
                        <Button onClick={handleAddModule}>Adicionar Primeiro Módulo</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
