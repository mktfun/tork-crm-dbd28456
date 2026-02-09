/**
 * Mapeamento de códigos de erro do Supabase para mensagens amigáveis ao usuário
 */
export const ERROR_MESSAGES: Record<string, string> = {
    // PostgreSQL Error Codes
    '23505': 'Esta apólice já está cadastrada no sistema',
    '23502': 'Falta preencher um campo obrigatório',
    '23503': 'Registro relacionado não existe (verifique seguradora, cliente ou ramo)',
    '42P01': 'Erro no banco de dados: tabela não encontrada',
    '42703': 'Erro no banco de dados: coluna não encontrada',

    // PostgREST Error Codes  
    'PGRST202': 'Falta vincular a seguradora. Por favor, selecione uma seguradora válida',
    'PGRST204': 'Nenhum dado encontrado',
    'PGRST116': 'Acesso negado ou credenciais inválidas',

    // Custom Application Errors
    'INVALID_CPF': 'CPF inválido. Verifique os 11 dígitos',
    'INVALID_CNPJ': 'CNPJ inválido. Verifique os 14 dígitos',
    'MISSING_COMPANY': 'Seguradora não foi selecionada',
    'MISSING_RAMO': 'Ramo do seguro não foi identificado',
    'MISSING_CLIENT': 'Cliente não foi identificado. Verifique CPF/nome',
    'MISSING_POLICY_NUMBER': 'Número da apólice está vazio',
    'MISSING_PREMIUM': 'Valor do prêmio não foi extraído',
    'INVALID_DATES': 'Datas de vigência inválidas ou ausentes',

    // Storage/Upload Errors
    'storage/object-not-found': 'Arquivo não encontrado no armazenamento',
    'storage/unauthorized': 'Sem permissão para acessar o arquivo',
    'storage/unauthenticated': 'Você precisa fazer login novamente',
    'storage/quota-exceeded': 'Limite de armazenamento excedido',

    // Network/Timeout Errors
    'NETWORK_ERROR': 'Erro de conexão. Verifique sua internet',
    'TIMEOUT': 'Operação demorou muito. Tente novamente',
    'ECONNABORTED': 'Conexão interrompida',
};

/**
 * Converte um código de erro técnico em mensagem amigável
 */
export function getFriendlyErrorMessage(error: any): string {
    if (!error) return 'Erro desconhecido';

    // Se error é string, tenta encontrar código conhecido  
    if (typeof error === 'string') {
        for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
            if (error.includes(code)) {
                return message;
            }
        }
        return error;
    }

    // Se error é objeto com code
    const code = error.code || error.error_code || error.status;
    if (code && ERROR_MESSAGES[code]) {
        return ERROR_MESSAGES[code];
    }

    // Se error tem message personalizada
    const message = error.message || error.error || error.details;
    if (message) {
        // Tenta encontrar código na mensagem
        for (const [errorCode, friendlyMsg] of Object.entries(ERROR_MESSAGES)) {
            if (message.includes(errorCode)) {
                return friendlyMsg;
            }
        }
        return message;
    }

    return 'Erro ao processar. Tente novamente';
}

/**
 * Valida item antes de importar e retorna lista de erros amigáveis
 */
export function getValidationErrors(item: any): string[] {
    const errors: string[] = [];

    if (!item.clientName || item.clientName === 'Cliente Não Identificado') {
        errors.push('Nome do cliente não identificado');
    }

    if (!item.numeroApolice) {
        errors.push('Número da apólice está vazio');
    }

    if (!item.seguradoraId) {
        errors.push('Seguradora não vinculada');
    }

    if (!item.ramoId) {
        errors.push('Ramo não vinculado');
    }

    if (!item.dataInicio || !item.dataFim) {
        errors.push('Faltam datas de vigência');
    }

    if (!item.premioLiquido || item.premioLiquido <= 0) {
        errors.push('Prêmio líquido inválido');
    }

    return errors;
}
