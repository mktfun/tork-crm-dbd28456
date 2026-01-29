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

  // Auto-collapse when all complete
  useEffect(() => {
    if (allComplete && !hasAutoCollapsed) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
        setHasAutoCollapsed(true);
      }, 1500);
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-2"
    >
      {/* Summary Header - Estética Glass Premium */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl
          bg-white/5 backdrop-blur-md
          border border-white/10 hover:border-white/20
          transition-all duration-300 group
          ${allComplete ? 'opacity-70' : ''}
        `}
        whileHover={{ scale: 1.002 }}
        whileTap={{ scale: 0.998 }}
      >
        <div className="flex items-center gap-2">
          {!allComplete ? (
            // Glow Pulse Effect ao invés de Spinner
            <motion.div 
              className="relative w-3 h-3"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute inset-0 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
            </motion.div>
          ) : errorCount > 0 ? (
            <AlertCircle className="w-3 h-3 text-destructive" />
          ) : (
            <CheckCircle className="w-3 h-3 text-green-500" />
          )}
          <span className="text-[11px] font-medium text-foreground/80">
            {!allComplete 
              ? `Processando ${executions.length} ${executions.length === 1 ? 'etapa' : 'etapas'}...`
              : errorCount > 0
                ? `${successCount} concluída${successCount !== 1 ? 's' : ''}, ${errorCount} com erro`
                : `✅ ${executions.length} ${executions.length === 1 ? 'etapa concluída' : 'etapas concluídas'}`
            }
          </span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        </motion.div>
      </motion.button>

      {/* Expanded Timeline */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-2 pl-1 space-y-1.5">
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
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: isSuccess && !isRunning ? 0.5 : 1, x: 0 }}
                    transition={{ delay: execIndex * 0.08 }}
                    className="relative"
                  >
                    {/* Timeline connector */}
                    {execIndex < executions.length - 1 && (
                      <div className="absolute left-[9px] top-7 bottom-0 w-px bg-gradient-to-b from-white/10 to-transparent" />
                    )}

                    {/* Tool Card - Estética Glass Minimalista */}
                    <motion.div
                      className={`
                        relative flex items-start gap-2.5 p-2 rounded-lg
                        transition-all duration-300
                        ${isRunning 
                          ? 'bg-white/5 border border-white/10' 
                          : isError
                            ? 'bg-destructive/5 border border-destructive/20'
                            : 'bg-transparent border border-transparent'
                        }
                      `}
                      animate={isRunning ? {
                        boxShadow: [
                          '0 0 6px rgba(255, 255, 255, 0.05)',
                          '0 0 12px rgba(255, 255, 255, 0.1)',
                          '0 0 6px rgba(255, 255, 255, 0.05)'
                        ]
                      } : {}}
                      transition={{ duration: 2, repeat: isRunning ? Infinity : 0 }}
                    >
                      {/* Status Icon - Glow Pulse para Running */}
                      <div className={`
                        flex-shrink-0 p-1 rounded-md
                        ${isRunning 
                          ? 'bg-primary/10' 
                          : isError
                            ? 'bg-destructive/10'
                            : 'bg-green-500/10'
                        }
                      `}>
                        {isRunning ? (
                          <motion.div 
                            className="relative w-3 h-3"
                            animate={{
                              scale: [1, 1.15, 1],
                              opacity: [0.8, 1, 0.8]
                            }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                          >
                            <div className="absolute inset-0 rounded-full bg-primary shadow-[0_0_6px_rgba(var(--primary),0.5)]" />
                          </motion.div>
                        ) : isError ? (
                          <AlertCircle className="w-3 h-3 text-destructive" />
                        ) : (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                          >
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          </motion.div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <IconComponent className={`
                            w-3 h-3 flex-shrink-0
                            ${isRunning ? 'text-primary' : isError ? 'text-destructive' : 'text-muted-foreground/60'}
                          `} />
                          <span className={`
                            text-[11px] font-medium truncate
                            ${isRunning ? 'text-foreground' : 'text-muted-foreground/70'}
                          `}>
                            {config.name}
                          </span>
                        </div>

                        {/* Description - only show when running or error */}
                        <AnimatePresence>
                          {(isRunning || isError) && (
                            <motion.p
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className={`
                                text-[10px] mt-0.5 leading-tight
                                ${isError ? 'text-destructive' : 'text-muted-foreground/60'}
                              `}
                            >
                              {isError 
                                ? execution.steps.find(s => s.status === 'error')?.error || 'Erro na execução'
                                : config.description
                              }
                            </motion.p>
                          )}
                        </AnimatePresence>

                        {/* Progress Steps - only show when running */}
                        <AnimatePresence>
                          {isRunning && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-1.5 space-y-0.5"
                            >
                              {execution.steps.map((step, stepIndex) => (
                                <motion.div
                                  key={stepIndex}
                                  initial={{ opacity: 0, x: -5 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: stepIndex * 0.08 }}
                                  className="flex items-center gap-1.5 text-[10px]"
                                >
                                  {step.status === 'done' ? (
                                    <CheckCircle className="w-2.5 h-2.5 text-green-500/70 flex-shrink-0" />
                                  ) : step.status === 'running' ? (
                                    <motion.div 
                                      className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0"
                                      animate={{ opacity: [0.5, 1, 0.5] }}
                                      transition={{ duration: 1, repeat: Infinity }}
                                    />
                                  ) : step.status === 'error' ? (
                                    <AlertCircle className="w-2.5 h-2.5 text-destructive flex-shrink-0" />
                                  ) : (
                                    <div className="w-2.5 h-2.5 rounded-full border border-muted-foreground/20 flex-shrink-0" />
                                  )}
                                  <span className={
                                    step.status === 'done' 
                                      ? 'text-muted-foreground/40 line-through' 
                                      : step.status === 'running'
                                        ? 'text-foreground/80'
                                        : step.status === 'error'
                                          ? 'text-destructive'
                                          : 'text-muted-foreground/30'
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
