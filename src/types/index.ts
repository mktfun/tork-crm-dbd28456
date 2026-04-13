export interface Client {
  id: string;
  name: string;
  phone?: string; // Optional - but need at least email OR phone
  email?: string; // Optional - but need at least email OR phone
  createdAt: string;

  // --- NOVOS CAMPOS ESSENCIAIS ---
  cpfCnpj?: string; // Documento é fundamental
  birthDate?: string;
  maritalStatus?: 'Solteiro(a)' | 'Casado(a)' | 'Divorciado(a)' | 'Viúvo(a)' | '';
  profession?: string;
  status?: 'Ativo' | 'Inativo';

  // --- ENDEREÇO COMPLETO ---
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;

  // --- CONTROLE DE IA ---
  ai_enabled?: boolean;

  // --- CAMPO ABERTO ---
  observations?: string;
}

export interface Policy {
  id: string;
  clientId: string;
  policyNumber?: string; // Now optional for budgets
  insuranceCompany?: string; // 🎯 OPERAÇÃO VIRA-LATA: Agora opcional
  type?: string; // 🎯 OPERAÇÃO VIRA-LATA: Agora opcional  
  insuredAsset: string; // bem segurado
  premiumValue: number;
  commissionRate: number;
  status: 'Orçamento' | 'Aguardando Apólice' | 'Ativa' | 'Cancelada' | 'Renovada'; // ✅ Adicionado 'Renovada'
  expirationDate: string;
  pdfUrl?: string;
  createdAt: string;
  // Novo campo para PDF anexado
  pdfAnexado?: {
    nome: string;
    dados: string;
  };
  // CAMPO PADRONIZADO PARA CONTROLE DE RENOVAÇÕES
  renewalStatus?: 'Pendente' | 'Em Contato' | 'Proposta Enviada' | 'Renovada' | 'Não Renovada';
  // 🆕 NOVOS CAMPOS DNA DA CORRETAGEM
  producerId?: string;
  brokerageId?: number;
  // 🆕 CAMPOS PARA NOVA ARQUITETURA (REMOVIDO installments)
  startDate?: string; // Data de início da vigência
  // 🆕 CAMPO OBRIGATÓRIO PARA COMISSÕES
  userId?: string; // ID do usuário dono da apólice
  // 🆕 CAMPO PARA DISTINGUIR ORÇAMENTOS DE APÓLICES
  isBudget?: boolean; // Indica se é um orçamento
  // 🆕 CAMPO PARA CLASSE DE BÔNUS
  bonus_class?: string; // Classe de bônus para renovações
  // 🆕 CAMPO PARA CONTROLE DE RENOVAÇÃO AUTOMÁTICA
  automaticRenewal: boolean; // ✅ Corrigido: obrigatório (não opcional)
  // 🆕 NOVO CAMPO PARA EXPANDIR RELAÇÃO COM SEGURADORAS
  companies?: {
    id: string;
    name: string;
  };
  // 🆕 DADOS DO RAMO PARA EXIBIÇÃO
  ramos?: {
    id: string;
    nome: string;
  };
  // 🆕 DADOS DO CLIENTE PARA EXIBIÇÃO
  client?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    cpfCnpj?: string;
  };
  // 🆕 NOVOS CAMPOS - Carteirinha
  carteirinhaUrl?: string;  // URL da carteirinha no storage
  lastOcrType?: 'apolice' | 'carteirinha'; // Tipo do último OCR
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // Data de vencimento
  priority: 'Alta' | 'Média' | 'Baixa';
  status: 'Pendente' | 'Em Andamento' | 'Concluída';
  clientId?: string;   // Link para um cliente
  policyId?: string;   // Link para uma apólice
  taskType: 'Follow-up' | 'Pós-venda' | 'Documentação' | 'Renovação' | 'Sinistro' | 'Administrativa';
  createdAt: string;
  google_task_id?: string;
  google_synced_at?: string;
}

export interface TransactionType {
  id: string;
  name: string; // Ex: "Taxa de Emissão", "Reembolso de Sinistro"
  nature: 'GANHO' | 'PERDA';
  createdAt: string;
}

// ✅ INTERFACE ATUALIZADA PARA O NOVO MÓDULO FINANCEIRO + DNA DA CORRETAGEM + PAGAMENTOS PARCIAIS + PRÊMIO VS COMISSÃO
export interface Transaction {
  id: string;
  typeId: string; // UUID do tipo de transação
  description: string;
  amount: number;
  status: 'PREVISTO' | 'REALIZADO' | 'PENDENTE' | 'PAGO' | 'PARCIALMENTE_PAGO' | 'ATRASADO' | 'CANCELADO';
  date: string;

  // 🆕 CAMPOS DO MÓDULO FINANCEIRO
  nature: 'RECEITA' | 'DESPESA'; // Natureza da transação (alinhado com transaction_types no DB)
  transactionDate: string; // Data da transação financeira
  dueDate: string; // Data de vencimento

  // 🆕 NOVOS CAMPOS DNA DA CORRETAGEM
  brokerageId?: number; // ID da corretora
  producerId?: string; // ID do produtor
  ramoId?: string; // ID do ramo de seguro

  // 🆕 CAMPOS PARA PRÊMIO VS COMISSÃO (calculados via JOIN com apolices)
  premiumValue?: number; // Valor do prêmio da apólice (ou amount se for bônus manual)
  commissionValue?: number; // Valor da comissão (sempre amount)
  commissionRate?: number; // Taxa de comissão da apólice (ou 100% se for bônus)
  transactionType?: 'policy_commission' | 'manual_bonus'; // Tipo discriminado

  // Associações opcionais
  clientId?: string;
  policyId?: string;
  companyId?: string;
  createdAt: string;
}

// 🆕 NOVA INTERFACE PARA PAGAMENTOS PARCIAIS
export interface TransactionPayment {
  id: string;
  transactionId: string; // ID da transação principal
  amountPaid: number; // Valor efetivamente pago
  paymentDate: string; // Data do pagamento
  description?: string; // Descrição opcional do pagamento
  createdAt: string;
}

export interface Appointment {
  id: string;
  clientId?: string; // ✅ AGORA É OPCIONAL - O SALVADOR!
  policyId?: string;
  title: string;
  date: string;
  time: string;
  status: 'Pendente' | 'Realizado';
  createdAt: string;
  google_event_id?: string;
  google_synced_at?: string;
}

export interface Company {
  id: string;
  name: string;
  service_phone?: string | null;
  createdAt: string;
}

export interface CompanyBranch {
  id: string;
  companyId: string;
  name: string;
  createdAt: string;
}

// Novas interfaces para o ecossistema de corretoras e produtores
export interface BrokerageFinancialSettings {
  default_commission_asset_account_id?: string;
  commission_initial_status?: 'pending' | 'completed';
}

export interface Brokerage {
  id: number;
  name: string;
  cnpj?: string;
  susep_code?: string;
  logo_url?: string;
  financial_settings?: BrokerageFinancialSettings;
  portal_allow_policy_download?: boolean;
  portal_allow_card_download?: boolean;
  portal_allow_profile_edit?: boolean;
  createdAt: string;
}

export interface Producer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpfCnpj?: string;
  companyName?: string;
  brokerage_id: number;
  createdAt: string;
}

// 🆕 NOVA INTERFACE PARA NOTIFICAÇÕES
export interface Notification {
  id: string;
  user_id: string;
  appointment_id?: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}
