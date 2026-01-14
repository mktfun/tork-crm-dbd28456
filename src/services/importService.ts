import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';

export interface AggerImportRow {
    cliente: string;
    cpfCnpj?: string;
    email?: string;
    telefone?: string;
    apolice?: string;
    seguradora?: string;
    ramo?: string;
    inicioVigencia?: string;
    fimVigencia?: string;
    premioLiquido?: number;
    comissao?: number;
    [key: string]: any;
}

export interface ImportStats {
    total: number;
    success: number;
    errors: number;
    skipped: number;
}

export const parseAggerCSV = (file: File): Promise<AggerImportRow[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const parsedData = results.data.map((row: any) => {
                    // Normalização básica de colunas comuns do Agger
                    return {
                        cliente: row['Segurado'] || row['Cliente'] || row['Nome'] || '',
                        cpfCnpj: row['CPF/CNPJ'] || row['CPF'] || row['CNPJ'] || '',
                        email: row['Email'] || row['E-mail'] || '',
                        telefone: row['Telefone'] || row['Celular'] || '',
                        apolice: row['Apólice'] || row['Numero Apolice'] || '',
                        seguradora: row['Seguradora'] || row['Cia'] || '',
                        ramo: row['Ramo'] || row['Produto'] || '',
                        inicioVigencia: row['Início Vigência'] || row['Vigência Início'] || row['Inicio'] || '',
                        fimVigencia: row['Fim Vigência'] || row['Vigência Fim'] || row['Fim'] || '',
                        premioLiquido: parseCurrency(row['Prêmio Líquido'] || row['Premio'] || '0'),
                        comissao: parseCurrency(row['Comissão'] || row['Valor Comissão'] || '0'),
                        ...row
                    };
                });
                resolve(parsedData);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};

const parseCurrency = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    // Remove R$, espaços e substitui vírgula por ponto se necessário
    const cleanStr = value.toString().replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanStr) || 0;
};

const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    // Tenta formato PT-BR (DD/MM/YYYY)
    const ptBrMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (ptBrMatch) {
        return `${ptBrMatch[3]}-${ptBrMatch[2]}-${ptBrMatch[1]}`;
    }
    // Tenta formato ISO
    const isoMatch = dateStr.match(/^\d{4}-\d{2}-\d{2}/);
    if (isoMatch) return isoMatch[0];

    return null;
};

export const processAggerImport = async (
    data: AggerImportRow[],
    userId: string,
    onProgress: (progress: number) => void
): Promise<ImportStats> => {
    let success = 0;
    let errors = 0;
    let skipped = 0;
    const total = data.length;

    for (let i = 0; i < total; i++) {
        const row = data[i];
        onProgress(Math.round(((i + 1) / total) * 100));

        if (!row.cliente) {
            skipped++;
            continue;
        }

        try {
            // 1. Buscar ou Criar Cliente
            let clientId = await findClient(row.cpfCnpj, row.cliente, userId);

            if (!clientId) {
                clientId = await createClient({
                    name: row.cliente,
                    cpf_cnpj: row.cpfCnpj,
                    email: row.email || `cliente_${Date.now()}@temp.com`, // Email temporário se não tiver
                    phone: row.telefone || '',
                    user_id: userId,
                    status: 'Ativo'
                });
            }

            // 2. Criar Apólice
            if (row.apolice) {
                // Verificar se apólice já existe
                const exists = await checkPolicyExists(row.apolice, userId);

                if (!exists) {
                    await createPolicy({
                        user_id: userId,
                        client_id: clientId,
                        policy_number: row.apolice,
                        insurance_company: row.seguradora || 'Não Informada',
                        type: row.ramo || 'Outros',
                        start_date: parseDate(row.inicioVigencia),
                        expiration_date: parseDate(row.fimVigencia) || new Date().toISOString(), // Fallback
                        premium_value: row.premioLiquido,
                        commission_rate: row.premioLiquido > 0 ? (row.comissao / row.premioLiquido) * 100 : 0,
                        status: 'Ativa'
                    });
                }
            }

            success++;
        } catch (error) {
            console.error(`Erro na linha ${i + 1}:`, error);
            errors++;
        }
    }

    return { total, success, errors, skipped };
};

// Helpers de Banco de Dados
async function findClient(cpfCnpj: string | undefined, name: string, userId: string): Promise<string | null> {
    if (cpfCnpj) {
        const { data } = await supabase
            .from('clientes')
            .select('id')
            .eq('user_id', userId)
            .eq('cpf_cnpj', cpfCnpj)
            .single();
        if (data) return data.id;
    }

    // Fallback: busca por nome exato
    const { data } = await supabase
        .from('clientes')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', name)
        .single();

    return data?.id || null;
}

async function createClient(clientData: any): Promise<string> {
    const { data, error } = await supabase
        .from('clientes')
        .insert([clientData])
        .select('id')
        .single();

    if (error) throw error;
    return data.id;
}

async function checkPolicyExists(policyNumber: string, userId: string): Promise<boolean> {
    const { data } = await supabase
        .from('apolices')
        .select('id')
        .eq('user_id', userId)
        .eq('policy_number', policyNumber)
        .single();

    return !!data;
}

async function createPolicy(policyData: any): Promise<void> {
    const { error } = await supabase
        .from('apolices')
        .insert([policyData]);

    if (error) throw error;
}
