import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2, AlertCircle, ChevronDown, ChevronUp, Database, Search, FileText, Calendar, Users, TrendingUp, Building2, Layers, GitBranch, UserPlus, Edit, Trash2, Move, Plus } from 'lucide-react';

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
  move_lead_to_status: {
    name: 'Mover Lead (Status)',
    icon: Move,
    description: '⚙️ Atualizando status no Kanban...',
    steps: ['Identificando lead', 'Resolvendo nome da etapa', 'Executando movimentação']
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
  },
  create_client_v2: {
    name: 'Criar Cliente (v2)',
    icon: UserPlus,
    description: '👤 Registrando novo cliente com validação...',
    steps: ['Validando dados', 'Verificando duplicados', 'Inserindo registro', 'Confirmando criação']
  },
  update_client_v2: {
    name: 'Atualizar Cliente (v2)',
    icon: Edit,
    description: '✏️ Atualizando dados com auditoria...',
    steps: ['Localizando registro', 'Aplicando alterações', 'Confirmando update']
  },
  delete_client_v2: {
    name: 'Excluir Cliente (v2)',
    icon: Trash2,
    description: '🗑️ Removendo cliente (soft delete)...',
    steps: ['Verificando dependências', 'Marcando como inativo']
  },
  create_policy_v2: {
    name: 'Criar Apólice (v2)',
    icon: FileText,
    description: '📝 Gerando nova apólice com validação...',
    steps: ['Validando dados', 'Criando apólice', 'Confirmando registro']
  },
  update_policy_v2: {
    name: 'Atualizar Apólice (v2)',
    icon: Edit,
    description: '✏️ Atualizando apólice...',
    steps: ['Localizando apólice', 'Aplicando alterações', 'Confirmando update']
  },
  delete_policy_v2: {
    name: 'Excluir Apólice (v2)',
    icon: Trash2,
    description: '🗑️ Removendo apólice...',
    steps: ['Verificando dependências', 'Executando exclusão']
  },
  create_deal: {
    name: 'Criar Deal',
    icon: Plus,
    description: '➕ Criando novo deal no Kanban...',
    steps: ['Validando dados', 'Criando deal', 'Posicionando no funil']
  },
  update_deal: {
    name: 'Atualizar Deal',
    icon: Edit,
    description: '✏️ Atualizando deal...',
    steps: ['Localizando deal', 'Aplicando alterações', 'Confirmando update']
  },
  delete_deal: {
    name: 'Excluir Deal',
    icon: Trash2,
    description: '🗑️ Removendo deal...',
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
      className="mb-3"
    >
      {/* Summary Header */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl
          bg-gradient-to-r from-primary/10 to-primary/5
          border border-primary/20 hover:border-primary/30
          transition-all duration-300 group
          ${allComplete ? 'opacity-80' : ''}
        `}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        <div className="flex items-center gap-2">
          {!allComplete ? (
            <div className="relative">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <div className="absolute inset-0 w-4 h-4 bg-primary/30 rounded-full animate-ping" />
            </div>
          ) : errorCount > 0 ? (
            <AlertCircle className="w-4 h-4 text-destructive" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          <span className="text-sm font-medium text-foreground">
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
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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
            <div className="pt-3 pl-2 space-y-2">
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
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: execIndex * 0.1 }}
                    className="relative"
                  >
                    {/* Timeline connector */}
                    {execIndex < executions.length - 1 && (
                      <div className="absolute left-[11px] top-8 bottom-0 w-px bg-gradient-to-b from-primary/30 to-transparent" />
                    )}

                    {/* Tool Card */}
                    <motion.div
                      className={`
                        relative flex items-start gap-3 p-2.5 rounded-lg
                        transition-all duration-300
                        ${isRunning 
                          ? 'bg-primary/10 border border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.15)]' 
                          : isError
                            ? 'bg-destructive/10 border border-destructive/30'
                            : 'bg-muted/30 border border-transparent'
                        }
                      `}
                      animate={isRunning ? {
                        boxShadow: [
                          '0 0 10px rgba(var(--primary), 0.1)',
                          '0 0 20px rgba(var(--primary), 0.2)',
                          '0 0 10px rgba(var(--primary), 0.1)'
                        ]
                      } : {}}
                      transition={{ duration: 2, repeat: isRunning ? Infinity : 0 }}
                    >
                      {/* Status Icon */}
                      <div className={`
                        flex-shrink-0 p-1.5 rounded-lg
                        ${isRunning 
                          ? 'bg-primary/20 border border-primary/40' 
                          : isError
                            ? 'bg-destructive/20 border border-destructive/40'
                            : 'bg-green-500/20 border border-green-500/40'
                        }
                      `}>
                        {isRunning ? (
                          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                        ) : isError ? (
                          <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                        ) : (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          </motion.div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <IconComponent className={`
                            w-3.5 h-3.5 flex-shrink-0
                            ${isRunning ? 'text-primary' : isError ? 'text-destructive' : 'text-muted-foreground'}
                          `} />
                          <span className={`
                            text-sm font-medium truncate
                            ${isRunning ? 'text-foreground' : 'text-muted-foreground'}
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
                                text-xs mt-1
                                ${isError ? 'text-destructive' : 'text-muted-foreground'}
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
                              className="mt-2 space-y-1"
                            >
                              {execution.steps.map((step, stepIndex) => (
                                <motion.div
                                  key={stepIndex}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: stepIndex * 0.1 }}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  {step.status === 'done' ? (
                                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                  ) : step.status === 'running' ? (
                                    <div className="relative">
                                      <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                    </div>
                                  ) : step.status === 'error' ? (
                                    <AlertCircle className="w-3 h-3 text-destructive flex-shrink-0" />
                                  ) : (
                                    <div className="w-3 h-3 rounded-full border border-muted-foreground/30 flex-shrink-0" />
                                  )}
                                  <span className={
                                    step.status === 'done' 
                                      ? 'text-muted-foreground/60 line-through' 
                                      : step.status === 'running'
                                        ? 'text-foreground'
                                        : step.status === 'error'
                                          ? 'text-destructive'
                                          : 'text-muted-foreground/40'
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
