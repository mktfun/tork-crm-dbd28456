import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, MessageCircle, Users, Activity, Loader2, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useGlobalAiConfig, VoiceTone } from '@/hooks/useGlobalAiConfig';
import { useCRMPipelines } from '@/hooks/useCRMPipelines';
import { usePipelineAiDefaults } from '@/hooks/usePipelineAiDefaults';
import { supabase } from '@/integrations/supabase/client';

const PERSONAS = [
  { id: 'friendly', name: 'O Amigo', description: 'Empático, prestativo e cordial.', icon: Users, color: 'bg-emerald-500/20 text-emerald-400' },
  { id: 'technical', name: 'O Consultor Técnico', description: 'Direto, focado em dados e apólices.', icon: Activity, color: 'bg-blue-500/20 text-blue-400' },
  { id: 'honest', name: 'O Vendedor Agressivo', description: 'Focado em conversão e fechamento.', icon: Sparkles, color: 'bg-amber-500/20 text-amber-400' },
  { id: 'general', name: 'O Geral', description: 'Equilibrado e versátil.', icon: Brain, color: 'bg-purple-500/20 text-purple-400' },
];

export function LiquidAutomationConfig() {
  const { config, isLoading: configLoading, upsertConfig } = useGlobalAiConfig();
  const { pipelines, isLoading: pipelinesLoading } = useCRMPipelines();
  
  const [selectedPersona, setSelectedPersona] = useState<VoiceTone>('friendly');
  const [baseInstructions, setBaseInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  // States for pipeline toggles
  const [activePipelines, setActivePipelines] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (config) {
      setSelectedPersona(config.voice_tone || 'friendly');
      setBaseInstructions(config.base_instructions || '');
    }
  }, [config]);

  // Fetch which pipelines have AI active (we'll check if any stage has is_active = true)
  useEffect(() => {
    async function fetchActivePipelines() {
      if (pipelines.length === 0) return;
      const { data } = await supabase.from('crm_ai_settings').select('stage_id, is_active');
      if (!data) return;

      // We need to map stage_id to pipeline_id. 
      const { data: stages } = await supabase.from('crm_stages').select('id, pipeline_id');
      if (!stages) return;

      const newActiveMap: Record<string, boolean> = {};
      
      pipelines.forEach(p => {
        const pipelineStages = stages.filter(s => s.pipeline_id === p.id).map(s => s.id);
        const hasActiveStage = data.some(setting => pipelineStages.includes(setting.stage_id) && setting.is_active);
        newActiveMap[p.id] = hasActiveStage;
      });

      setActivePipelines(newActiveMap);
    }
    fetchActivePipelines();
  }, [pipelines]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertConfig.mutateAsync({
        voice_tone: selectedPersona,
        base_instructions: baseInstructions,
      });
      toast.success('Cérebro da IA atualizado com sucesso!');
    } catch (e) {
      // error handled in hook
    } finally {
      setSaving(false);
    }
  };

  const togglePipelineAI = async (pipelineId: string, active: boolean) => {
    // Optimistic update
    setActivePipelines(prev => ({ ...prev, [pipelineId]: active }));
    
    // To simplify, if they turn it on, we will update ALL stages in this pipeline to active.
    const { data: stages } = await supabase.from('crm_stages').select('id').eq('pipeline_id', pipelineId);
    if (!stages) return;

    for (const stage of stages) {
      // Upsert stage AI setting
      await supabase.from('crm_ai_settings').upsert({
        stage_id: stage.id,
        is_active: active,
        updated_at: new Date().toISOString()
      }, { onConflict: 'stage_id' });
    }
    
    toast.success(`IA ${active ? 'ativada' : 'desativada'} no funil com sucesso!`);
  };

  if (configLoading || pipelinesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      {/* Intro */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-2">
          <Brain className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Configure sua Inteligência</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Escolha como o seu agente de vendas deve se comportar. Ative a IA nos funis desejados e deixe que ela faça o trabalho pesado.
        </p>
      </motion.div>

      {/* Toggles de Funil (Liquid Glass) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Ativar IA por Funil
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pipelines.map(pipeline => (
              <div key={pipeline.id} className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/40 hover:border-primary/30 transition-all">
                <span className="font-medium text-foreground">{pipeline.name}</span>
                <Switch 
                  checked={activePipelines[pipeline.id] || false}
                  onCheckedChange={(c) => togglePipelineAI(pipeline.id, c)}
                  className="data-[state=checked]:bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                />
              </div>
            ))}
            {pipelines.length === 0 && <p className="text-muted-foreground text-sm">Nenhum funil criado.</p>}
          </div>
        </div>
      </motion.div>

      {/* Personas */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-lg font-semibold mb-4 px-2">Modo de Operação (Personalidade)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PERSONAS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPersona(p.id as VoiceTone)}
              className={`
                flex flex-col items-center text-center p-6 rounded-2xl transition-all duration-300 border
                ${selectedPersona === p.id 
                  ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(var(--primary),0.2)] scale-105' 
                  : 'bg-card/30 border-border/50 hover:bg-card/50 hover:border-primary/50'
                }
              `}
            >
              <div className={`p-4 rounded-full mb-3 ${p.color}`}>
                <p.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground">{p.name}</h3>
              <p className="text-xs text-muted-foreground mt-2">{p.description}</p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Regras de Negócio */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Regras do seu Negócio
          </h2>
          <p className="text-sm text-muted-foreground">
            Escreva de forma simples o que a IA precisa saber. Ex: "Não vendemos seguro de vida", "Sempre peça o CPF antes da cotação".
          </p>
          <Textarea 
            value={baseInstructions}
            onChange={(e) => setBaseInstructions(e.target.value)}
            placeholder="Nossas principais regras de atendimento são..."
            className="min-h-[120px] bg-background/50 resize-none"
          />
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} size="lg" className="w-full sm:w-auto shadow-[0_0_15px_rgba(var(--primary),0.3)]">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Atualizar Cérebro
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
