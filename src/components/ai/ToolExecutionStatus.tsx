import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, ChevronDown, Database, Search, FileText, Calendar, Users, TrendingUp, Building2, Layers, GitBranch, UserPlus, Edit, Trash2, Move, Sparkles } from 'lucide-react';

export interface ToolStep {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  error?: string;
}

export interface ToolExecution {
  toolName: string;
  displayName: string;
  steps: ToolStep[];
  status?: 'running' | 'success' | 'error';
}

// Mapeamento de ferramentas para nomes amigáveis, ícones e descrições
export const TOOL_DISPLAY_CONFIG: Record<string, { 
  name: string; 
  icon: React.ElementType; 
  description: string;
  steps: string[] 
}> = {
  // Etapa inicial fake para feedback imediato
  _initializing: {
    name: 'Iniciando Assistente',
    icon: Sparkles,
    description: '⚙️ Preparando resposta...',
    steps: ['Analisando solicitação']
  },
  _analyzing: {
    name: 'Analisando Solicitação',
    icon: Search,
    description: '🔍 Processando sua pergunta...',
    steps: ['Interpretando contexto']
  },
  search_clients: {
    name: 'Buscar Clientes',
    icon: Search,
    description: '🔍 Buscando registros de clientes...',
    steps: ['Acessando base de clientes', 'Aplicando filtros de busca', 'Consolidando resultados']
  },
  get_client_details: {
    name: 'Detalhes do Cliente',
    icon: Users,
    description: '👤 Carregando perfil completo...',
    steps: ['Localizando cliente', 'Carregando apólices vinculadas', 'Montando perfil completo']
  },
  search_policies: {
    name: 'Buscar Apólices',
    icon: FileText,
    description: '📋 Consultando carteira de apólices...',
    steps: ['Consultando carteira', 'Aplicando filtros', 'Organizando resultados']
  },
  get_expiring_policies: {
    name: 'Renovações Próximas',
    icon: Calendar,
    description: '📅 Analisando vencimentos próximos...',
    steps: ['Analisando vigências', 'Identificando vencimentos', 'Ordenando por urgência']
  },
  get_financial_summary: {
    name: 'Resumo Financeiro',
    icon: TrendingUp,
    description: '💰 Calculando balanço financeiro...',
    steps: ['Calculando receitas', 'Processando despesas', 'Gerando balanço']
  },
  search_claims: {
    name: 'Buscar Sinistros',
    icon: Search,
    description: '🔎 Consultando sinistros...',
    steps: ['Acessando registros', 'Filtrando ocorrências', 'Compilando dados']
  },
  get_tasks: {
    name: 'Tarefas Pendentes',
    icon: FileText,
    description: '✅ Carregando tarefas...',
    steps: ['Carregando tarefas', 'Ordenando por prioridade']
  },
  get_appointments: {
    name: 'Agenda do Dia',
    icon: Calendar,
    description: '📆 Consultando agenda...',
    steps: ['Consultando agenda', 'Filtrando compromissos']
  },
  create_appointment: {
    name: 'Criar Agendamento',
    icon: Calendar,
    description: '📝 Criando novo agendamento...',
    steps: ['Validando dados', 'Criando compromisso', 'Confirmando agendamento']
  },
  generate_report: {
    name: 'Gerar Relatório',
    icon: FileText,
    description: '📊 Gerando relatório...',
    steps: ['Coletando dados', 'Processando métricas', 'Formatando relatório']
  },
  get_companies: {
    name: 'Listar Seguradoras',
    icon: Building2,
    description: '🏢 Carregando seguradoras...',
    steps: ['Acessando cadastro', 'Carregando seguradoras']
  },
  get_ramos: {
    name: 'Listar Ramos',
    icon: Layers,
    description: '📂 Consultando ramos...',
    steps: ['Consultando categorias', 'Carregando ramos']
  },
  get_kanban_data: {
    name: 'Consultar Funil',
    icon: GitBranch,
    description: '📊 Consultando estrutura do funil...',
    steps: ['Carregando pipelines', 'Mapeando etapas', 'Identificando deals']
  },
  move_deal_to_stage: {
    name: 'Mover Lead',
    icon: Move,
    description: '⚙️ Atualizando etapa no Kanban...',
    steps: ['Identificando deal', 'Validando destino', 'Executando movimentação']
  },
  create_client: {
    name: 'Criar Cliente',
    icon: UserPlus,
    description: '👤 Registrando novo cliente...',
    steps: ['Validando dados', 'Inserindo registro', 'Confirmando criação']
  },
  update_client: {
    name: 'Atualizar Cliente',
    icon: Edit,
    description: '✏️ Atualizando dados do cliente...',
    steps: ['Localizando registro', 'Aplicando alterações', 'Confirmando update']
  },
  delete_client: {
    name: 'Excluir Cliente',
    icon: Trash2,
    description: '🗑️ Removendo cliente...',
    steps: ['Verificando dependências', 'Executando exclusão']
  },
  create_policy: {
    name: 'Criar Apólice',
    icon: FileText,
    description: '📝 Gerando nova apólice no sistema...',
    steps: ['Validando dados', 'Criando apólice', 'Confirmando registro']
  },
  update_policy: {
    name: 'Atualizar Apólice',
    icon: Edit,
    description: '✏️ Atualizando apólice...',
    steps: ['Localizando apólice', 'Aplicando alterações', 'Confirmando update']
  },
  delete_policy: {
    name: 'Excluir Apólice',
    icon: Trash2,
    description: '🗑️ Removendo apólice...',
    steps: ['Verificando dependências', 'Executando exclusão']
  }
};

interface ToolExecutionStatusProps {
  executions: ToolExecution[];
}

export function ToolExecutionStatus({ executions }: ToolExecutionStatusProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);

  // Check if all executions are complete
  const allComplete = executions.length > 0 && executions.every(
    exec => exec.status === 'success' || exec.status === 'error' || 
    exec.steps.every(s => s.status === 'done' || s.status === 'error')
  );

  // Auto-collapse quando tudo completar (cascata animada)
  useEffect(() => {
    if (allComplete && !hasAutoCollapsed) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
        setHasAutoCollapsed(true);
      }, 800); // Reduzido para transição mais fluida
      return () => clearTimeout(timer);
    }
  }, [allComplete, hasAutoCollapsed]);

  // Reset auto-collapse when new executions start
  useEffect(() => {
    if (!allComplete) {
      setIsExpanded(true);
      setHasAutoCollapsed(false);
    }
  }, [executions.length, allComplete]);

  if (executions.length === 0) return null;

  const successCount = executions.filter(e => 
    e.status === 'success' || e.steps.every(s => s.status === 'done')
  ).length;
  const errorCount = executions.filter(e => 
    e.status === 'error' || e.steps.some(s => s.status === 'error')
  ).length;

  // Título dinâmico reativo ao status
  const headerText = !allComplete 
    ? `⚙️ Processando ${executions.length === 1 ? 'solicitação' : `${executions.length} etapas`}...`
    : errorCount > 0
      ? `⚠️ ${successCount} concluída${successCount !== 1 ? 's' : ''}, ${errorCount} com erro`
      : `✅ ${executions.length === 1 ? 'Etapa concluída' : `${executions.length} etapas concluídas`}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="mb-2"
    >
      {/* Summary Header - Estética Glass Premium Flutuante */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl
          bg-white/5 backdrop-blur-md
          border border-white/10 hover:border-white/15
          transition-all duration-200 group
          ${allComplete ? 'opacity-60 hover:opacity-80' : ''}
        `}
        whileHover={{ scale: 1.003 }}
        whileTap={{ scale: 0.997 }}
      >
        <div className="flex items-center gap-2">
          {!allComplete ? (
            // Glow Pulse Effect Premium
            <motion.div 
              className="relative w-2.5 h-2.5"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6]
              }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute inset-0 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.7)]" />
            </motion.div>
          ) : errorCount > 0 ? (
            <AlertCircle className="w-2.5 h-2.5 text-destructive" />
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <CheckCircle className="w-2.5 h-2.5 text-green-500" />
            </motion.div>
          )}
          <span className="text-[10px] font-medium text-foreground/70">
            {headerText}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronDown className="w-2.5 h-2.5 text-muted-foreground/60 group-hover:text-foreground/60 transition-colors" />
        </motion.div>
      </motion.button>

      {/* Expanded Timeline - Cascata Animada */}
      <AnimatePresence mode="sync">
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-1.5 pl-0.5 space-y-1">
              <AnimatePresence mode="popLayout">
                {executions.map((execution, execIndex) => {
                  const config = TOOL_DISPLAY_CONFIG[execution.toolName] || {
                    name: execution.displayName,
                    icon: Database,
                    description: 'Processando...',
                    steps: ['Executando...']
                  };
                  const IconComponent = config.icon;
                  
                  const isRunning = execution.status === 'running' || 
                    execution.steps.some(s => s.status === 'running');
                  const isSuccess = execution.status === 'success' || 
                    execution.steps.every(s => s.status === 'done');
                  const isError = execution.status === 'error' || 
                    execution.steps.some(s => s.status === 'error');

                  return (
                    <motion.div
                      key={`${execution.toolName}-${execIndex}`}
                      layout
                      initial={{ opacity: 0, height: 0, x: -8 }}
                      animate={{ 
                        opacity: isSuccess && !isRunning ? 0.4 : 1, 
                        height: 'auto',
                        x: 0 
                      }}
                      exit={{ opacity: 0, height: 0, x: 8 }}
                      transition={{ 
                        duration: 0.2,
                        delay: isSuccess ? 0 : execIndex * 0.1, // Cascata na entrada
                        layout: { duration: 0.2 }
                      }}
                      className="relative overflow-hidden"
                    >
                      {/* Timeline connector minimalista */}
                      {execIndex < executions.length - 1 && !isSuccess && (
                        <motion.div 
                          className="absolute left-[7px] top-6 bottom-0 w-px bg-gradient-to-b from-white/8 to-transparent"
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: 0.1 }}
                        />
                      )}

                      {/* Tool Card - Glass Flutuante */}
                      <motion.div
                        layout
                        className={`
                          relative flex items-start gap-2 p-1.5 rounded-lg
                          transition-colors duration-200
                          ${isRunning 
                            ? 'bg-white/[0.03] border border-white/8' 
                            : isError
                              ? 'bg-destructive/[0.03] border border-destructive/15'
                              : 'bg-transparent border border-transparent'
                          }
                        `}
                        animate={isRunning ? {
                          boxShadow: [
                            '0 0 4px rgba(255, 255, 255, 0.02)',
                            '0 0 8px rgba(255, 255, 255, 0.05)',
                            '0 0 4px rgba(255, 255, 255, 0.02)'
                          ]
                        } : { boxShadow: 'none' }}
                        transition={{ duration: 1.5, repeat: isRunning ? Infinity : 0 }}
                      >
                        {/* Status Icon - Compacto */}
                        <div className={`
                          flex-shrink-0 p-0.5 rounded
                          ${isRunning 
                            ? 'bg-primary/8' 
                            : isError
                              ? 'bg-destructive/8'
                              : 'bg-green-500/8'
                          }
                        `}>
                          {isRunning ? (
                            <motion.div 
                              className="relative w-2.5 h-2.5"
                              animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.7, 1, 0.7]
                              }}
                              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                            >
                              <div className="absolute inset-0 rounded-full bg-primary shadow-[0_0_4px_rgba(var(--primary),0.4)]" />
                            </motion.div>
                          ) : isError ? (
                            <AlertCircle className="w-2.5 h-2.5 text-destructive" />
                          ) : (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                            >
                              <CheckCircle className="w-2.5 h-2.5 text-green-500/80" />
                            </motion.div>
                          )}
                        </div>

                      {/* Content - Minimalista quando completo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <IconComponent className={`
                            w-2.5 h-2.5 flex-shrink-0
                            ${isRunning ? 'text-primary/80' : isError ? 'text-destructive/70' : 'text-muted-foreground/40'}
                          `} />
                          <span className={`
                            text-[10px] font-medium truncate
                            ${isRunning ? 'text-foreground/90' : 'text-muted-foreground/50'}
                          `}>
                            {config.name}
                          </span>
                        </div>

                        {/* Description - Apenas quando running (colapsa ao concluir) */}
                        <AnimatePresence mode="wait">
                          {isRunning && (
                            <motion.p
                              initial={{ height: 0, opacity: 0, marginTop: 0 }}
                              animate={{ height: 'auto', opacity: 1, marginTop: 2 }}
                              exit={{ height: 0, opacity: 0, marginTop: 0 }}
                              transition={{ duration: 0.15 }}
                              className="text-[9px] leading-tight text-muted-foreground/50"
                            >
                              {config.description}
                            </motion.p>
                          )}
                        </AnimatePresence>

                        {/* Progress Steps - Apenas quando running (cascata de colapso) */}
                        <AnimatePresence mode="wait">
                          {isRunning && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="mt-1 space-y-0.5"
                            >
                              {execution.steps.map((step, stepIndex) => (
                                <motion.div
                                  key={stepIndex}
                                  initial={{ opacity: 0, x: -4 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 4 }}
                                  transition={{ delay: stepIndex * 0.05, duration: 0.15 }}
                                  className="flex items-center gap-1 text-[9px]"
                                >
                                  {step.status === 'done' ? (
                                    <CheckCircle className="w-2 h-2 text-green-500/60 flex-shrink-0" />
                                  ) : step.status === 'running' ? (
                                    <motion.div 
                                      className="w-2 h-2 rounded-full bg-primary/80 flex-shrink-0"
                                      animate={{ opacity: [0.4, 1, 0.4] }}
                                      transition={{ duration: 0.8, repeat: Infinity }}
                                    />
                                  ) : step.status === 'error' ? (
                                    <AlertCircle className="w-2 h-2 text-destructive flex-shrink-0" />
                                  ) : (
                                    <div className="w-2 h-2 rounded-full border border-muted-foreground/15 flex-shrink-0" />
                                  )}
                                  <span className={
                                    step.status === 'done' 
                                      ? 'text-muted-foreground/30 line-through' 
                                      : step.status === 'running'
                                        ? 'text-foreground/70'
                                        : step.status === 'error'
                                          ? 'text-destructive/70'
                                          : 'text-muted-foreground/20'
                                  }>
                                    {step.label}
                                  </span>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Helpers para gerenciar estado de execução
export function createToolExecution(toolName: string): ToolExecution {
  const config = TOOL_DISPLAY_CONFIG[toolName];
  const steps = config?.steps || ['Processando...'];
  
  return {
    toolName,
    displayName: config?.name || toolName,
    status: 'running',
    steps: steps.map((label, index) => ({
      label,
      status: index === 0 ? 'running' : 'pending'
    }))
  };
}

export function advanceToolStep(execution: ToolExecution): ToolExecution {
  const currentIndex = execution.steps.findIndex(s => s.status === 'running');
  if (currentIndex === -1) return execution;

  const newSteps = execution.steps.map((step, idx) => {
    if (idx === currentIndex) return { ...step, status: 'done' as const };
    if (idx === currentIndex + 1) return { ...step, status: 'running' as const };
    return step;
  });

  return { ...execution, steps: newSteps };
}

export function completeToolExecution(execution: ToolExecution): ToolExecution {
  return {
    ...execution,
    status: 'success',
    steps: execution.steps.map(step => ({ ...step, status: 'done' as const }))
  };
}

export function failToolExecution(execution: ToolExecution, error: string): ToolExecution {
  const currentIndex = execution.steps.findIndex(s => s.status === 'running');
  const newSteps = execution.steps.map((step, idx) => {
    if (idx === currentIndex) return { ...step, status: 'error' as const, error };
    return step;
  });

  return {
    ...execution,
    status: 'error',
    steps: newSteps
  };
}
