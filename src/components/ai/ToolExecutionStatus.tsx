import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2, Database, Search, FileText, Calendar, Users, TrendingUp, Building2, Layers } from 'lucide-react';

export interface ToolStep {
  label: string;
  status: 'pending' | 'running' | 'done';
}

export interface ToolExecution {
  toolName: string;
  displayName: string;
  steps: ToolStep[];
}

// Mapeamento de ferramentas para nomes amigáveis e passos
export const TOOL_DISPLAY_CONFIG: Record<string, { name: string; icon: React.ElementType; steps: string[] }> = {
  search_clients: {
    name: 'Buscar Clientes',
    icon: Users,
    steps: ['Acessando base de clientes', 'Aplicando filtros de busca', 'Consolidando resultados']
  },
  get_client_details: {
    name: 'Detalhes do Cliente',
    icon: Users,
    steps: ['Localizando cliente', 'Carregando apólices vinculadas', 'Montando perfil completo']
  },
  search_policies: {
    name: 'Buscar Apólices',
    icon: FileText,
    steps: ['Consultando carteira', 'Aplicando filtros', 'Organizando resultados']
  },
  get_expiring_policies: {
    name: 'Renovações Próximas',
    icon: Calendar,
    steps: ['Analisando vigências', 'Identificando vencimentos', 'Ordenando por urgência']
  },
  get_financial_summary: {
    name: 'Resumo Financeiro',
    icon: TrendingUp,
    steps: ['Calculando receitas', 'Processando despesas', 'Gerando balanço']
  },
  search_claims: {
    name: 'Buscar Sinistros',
    icon: Search,
    steps: ['Acessando registros', 'Filtrando ocorrências', 'Compilando dados']
  },
  get_tasks: {
    name: 'Tarefas Pendentes',
    icon: FileText,
    steps: ['Carregando tarefas', 'Ordenando por prioridade']
  },
  get_appointments: {
    name: 'Agenda do Dia',
    icon: Calendar,
    steps: ['Consultando agenda', 'Filtrando compromissos']
  },
  create_appointment: {
    name: 'Criar Agendamento',
    icon: Calendar,
    steps: ['Validando dados', 'Criando compromisso', 'Confirmando agendamento']
  },
  generate_report: {
    name: 'Gerar Relatório',
    icon: FileText,
    steps: ['Coletando dados', 'Processando métricas', 'Formatando relatório']
  },
  get_companies: {
    name: 'Listar Seguradoras',
    icon: Building2,
    steps: ['Acessando cadastro', 'Carregando seguradoras']
  },
  get_ramos: {
    name: 'Listar Ramos',
    icon: Layers,
    steps: ['Consultando categorias', 'Carregando ramos']
  }
};

interface ToolExecutionStatusProps {
  executions: ToolExecution[];
}

export function ToolExecutionStatus({ executions }: ToolExecutionStatusProps) {
  if (executions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl my-2 space-y-3"
      >
        {executions.map((execution, execIndex) => {
          const config = TOOL_DISPLAY_CONFIG[execution.toolName] || {
            name: execution.displayName,
            icon: Database,
            steps: ['Processando...']
          };
          const IconComponent = config.icon;

          return (
            <motion.div
              key={`${execution.toolName}-${execIndex}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: execIndex * 0.1 }}
              className="space-y-2"
            >
              {/* Tool Header */}
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <div className="p-1.5 rounded-lg bg-primary/20 border border-primary/30">
                  <IconComponent className="w-3.5 h-3.5 text-primary" />
                </div>
                <span>{config.name}</span>
              </div>

              {/* Steps */}
              <div className="ml-2 pl-4 border-l border-white/10 space-y-1.5">
                {execution.steps.map((step, stepIndex) => (
                  <motion.div
                    key={stepIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: stepIndex * 0.15 }}
                    className="flex items-center gap-2.5 text-xs"
                  >
                    {step.status === 'done' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    ) : step.status === 'running' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 flex-shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0" />
                    )}
                    <span
                      className={
                        step.status === 'done'
                          ? 'text-muted-foreground line-through'
                          : step.status === 'running'
                          ? 'text-foreground'
                          : 'text-muted-foreground/60'
                      }
                    >
                      {step.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}

// Helpers para gerenciar estado de execução
export function createToolExecution(toolName: string): ToolExecution {
  const config = TOOL_DISPLAY_CONFIG[toolName];
  const steps = config?.steps || ['Processando...'];
  
  return {
    toolName,
    displayName: config?.name || toolName,
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
    steps: execution.steps.map(step => ({ ...step, status: 'done' as const }))
  };
}
