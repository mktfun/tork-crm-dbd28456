
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Client, Policy, Appointment, Transaction, Task } from '@/types';
import { subDays } from 'date-fns';

interface AppState {
  // Estado
  clients: Client[];
  policies: Policy[];
  appointments: Appointment[];
  transactions: Transaction[];
  tasks: Task[];
  
  // Novo estado para Workspace Ativo
  activeBrokerageId: string | null;
  setActiveBrokerage: (id: string | null) => void;
  
  // Ações para Clientes
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  
  // Ações para Apólices
  addPolicy: (policy: Omit<Policy, 'id' | 'createdAt'>) => void;
  updatePolicy: (id: string, updates: Partial<Policy>) => void;
  deletePolicy: (id: string) => void;
  ativarEAnexarPdf: (policyId: string, pdfFileName: string, pdfBase64: string) => void;
  
  // Ações para Agendamentos
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  
  // Ações para Transações
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  updateTransactionStatus: (transactionId: string, newStatus: Transaction['status']) => void;
  markAsRealized: (id: string) => void;
  
  // Ações para Tarefas
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
  updateTaskStatus: (taskId: string, status: Task['status']) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Estado inicial - apenas dados que não são entidades de configuração
      clients: [],
      policies: [],
      appointments: [],
      transactions: [],
      tasks: [],
      
      // Novo estado para Workspace
      activeBrokerageId: null,
      setActiveBrokerage: (id) => set({ activeBrokerageId: id }),
      
      // Ações para Clientes
      addClient: (client) =>
        set((state) => ({
          clients: [
            ...state.clients,
            {
              ...client,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
        
      updateClient: (id, updates) =>
        set((state) => ({
          clients: state.clients.map((client) =>
            client.id === id ? { ...client, ...updates } : client
          ),
        })),
        
      deleteClient: (id) =>
        set((state) => ({
          clients: state.clients.filter((client) => client.id !== id),
        })),
      
      // 🚀 AÇÕES PARA APÓLICES - REFATORADO PARA REMOVER LÓGICA DUPLICADA E INCORRETA
      addPolicy: (policy) => {
        const newPolicyId = crypto.randomUUID();
        const newPolicy = {
          ...policy,
          id: newPolicyId,
          createdAt: new Date().toISOString(),
        };

        // 1. Salva a nova apólice
        set((state) => ({
          policies: [...state.policies, newPolicy],
        }));

        // 2. CRIA APENAS O AGENDAMENTO DE RENOVAÇÃO (TRANSAÇÃO SERÁ CRIADA PELO SUPABASE)
        const currentState = get();
        
        if (policy.expirationDate) {
          const expirationDate = new Date(policy.expirationDate);
          const reminderDate = subDays(expirationDate, 15); // 15 dias antes do vencimento

          const cliente = currentState.clients.find(c => c.id === policy.clientId);
          const clienteName = cliente?.name || 'Cliente não encontrado';

          const newAppointment: Appointment = {
            id: crypto.randomUUID(),
            clientId: policy.clientId,
            policyId: newPolicyId,
            title: `Renovação Apólice ${policy.policyNumber} - ${clienteName}`,
            date: reminderDate.toISOString().split('T')[0],
            time: '09:00',
            status: 'Pendente',
            createdAt: new Date().toISOString(),
          };

          console.log('📅 Criando agendamento de renovação:', newAppointment);

          set((state) => ({
            appointments: [...state.appointments, newAppointment],
          }));
        }

        console.log('✅ Apólice criada (transação será gerenciada pelo Supabase):', newPolicyId);
      },
        
      updatePolicy: (id, updates) =>
        set((state) => ({
          policies: state.policies.map((policy) =>
            policy.id === id ? { ...policy, ...updates } : policy
          ),
        })),
        
      deletePolicy: (id) =>
        set((state) => ({
          policies: state.policies.filter((policy) => policy.id !== id),
        })),
        
      ativarEAnexarPdf: (policyId, pdfFileName, pdfBase64) =>
        set((state) => ({
          policies: state.policies.map((policy) =>
            policy.id === policyId
              ? { 
                  ...policy, 
                  status: 'Ativa', 
                  pdfAnexado: { nome: pdfFileName, dados: pdfBase64 } 
                }
              : policy
          ),
        })),
      
      addAppointment: (appointment) => {
        console.log('✅ RECEBIDO PARA SALVAR:', appointment);
        
        const newAppointment = {
          ...appointment,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          appointments: [...state.appointments, newAppointment],
        }));

        console.log('✅ ESTADO ATUALIZADO:', get().appointments);
        console.log('✅ NOVO AGENDAMENTO CRIADO:', newAppointment);
      },
        
      updateAppointment: (id, updates) =>
        set((state) => ({
          appointments: state.appointments.map((appointment) =>
            appointment.id === id ? { ...appointment, ...updates } : appointment
          ),
        })),
        
      deleteAppointment: (id) =>
        set((state) => ({
          appointments: state.appointments.filter((appointment) => appointment.id !== id),
        })),
      
      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [
            ...state.transactions,
            {
              ...transaction,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
        
      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((transaction) =>
            transaction.id === id ? { ...transaction, ...updates } : transaction
          ),
        })),
        
      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((transaction) => transaction.id !== id),
        })),
        
      updateTransactionStatus: (transactionId, newStatus) =>
        set((state) => ({
          transactions: state.transactions.map((transaction) =>
            transaction.id === transactionId ? { ...transaction, status: newStatus } : transaction
          ),
        })),
        
      markAsRealized: (id) =>
        set((state) => ({
          transactions: state.transactions.map((transaction) =>
            transaction.id === id ? { ...transaction, status: 'PAGO' } : transaction
          ),
        })),
        
      addTask: (task) => {
        const newTask: Task = {
          ...task,
          id: crypto.randomUUID(),
          status: 'Pendente',
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));

        console.log('✅ Nova tarefa criada:', newTask);
      },

      updateTaskStatus: (taskId, status) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, status } : task
          ),
        })),

      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates } : task
          ),
        })),

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        })),
    }),
    {
      name: 'corretora-storage',
      partialize: (state) => ({
        clients: state.clients,
        policies: state.policies,
        appointments: state.appointments,
        transactions: state.transactions,
        tasks: state.tasks,
        activeBrokerageId: state.activeBrokerageId,
      }),
    }
  )
);
