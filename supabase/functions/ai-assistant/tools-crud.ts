/**
 * Tools CRUD para o Assistente de IA - Fase P1
 * 
 * Implementa operações de Create, Read, Update e Delete para:
 * - Clientes (clientes)
 * - Apólices (apolices)
 * 
 * Todas as operações são auditadas e respeitam RLS do Supabase.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { logger } from '../_shared/logger.ts';
import { createAuditTimer } from '../_shared/audit.ts';

// ========== CLIENTES ==========

/**
 * Cria um novo cliente
 */
export async function create_client(
  args: {
    name: string;
    phone: string;
    email: string;
    cpf_cnpj?: string;
    birth_date?: string;
    marital_status?: string;
    profession?: string;
    cep?: string;
    address?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    observations?: string;
  },
  supabase: SupabaseClient,
  userId: string
): Promise<any> {
  const audit = createAuditTimer(supabase, {
    user_id: userId,
    operation_type: 'create',
    entity_type: 'client',
    tool_name: 'create_client',
  });

  try {
    logger.info('Creating new client', { userId, clientName: args.name });

    // Validações básicas
    if (!args.name || args.name.trim().length < 2) {
      throw new Error('Nome do cliente deve ter pelo menos 2 caracteres');
    }
    if (!args.phone || args.phone.trim().length < 10) {
      throw new Error('Telefone inválido');
    }
    if (!args.email || !args.email.includes('@')) {
      throw new Error('Email inválido');
    }

    const clientData = {
      user_id: userId,
      name: args.name.trim(),
      phone: args.phone.trim(),
      email: args.email.trim().toLowerCase(),
      cpf_cnpj: args.cpf_cnpj?.trim() || null,
      birth_date: args.birth_date || null,
      marital_status: args.marital_status || null,
      profession: args.profession?.trim() || null,
      status: 'Ativo',
      cep: args.cep?.trim() || null,
      address: args.address?.trim() || null,
      number: args.number?.trim() || null,
      complement: args.complement?.trim() || null,
      neighborhood: args.neighborhood?.trim() || null,
      city: args.city?.trim() || null,
      state: args.state?.trim() || null,
      observations: args.observations?.trim() || null,
    };

    const { data, error } = await supabase
      .from('clientes')
      .insert(clientData)
      .select()
      .single();

    if (error) throw error;

    await audit.success(data);

    logger.info('Client created successfully', { userId, clientId: data.id });

    return {
      success: true,
      message: `Cliente "${data.name}" criado com sucesso!`,
      client: {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
      },
    };
  } catch (error: any) {
    await audit.failure(error);
    logger.error('Failed to create client', { userId, error: error.message });
    throw error;
  }
}

/**
 * Atualiza um cliente existente
 */
export async function update_client(
  args: {
    client_id: string;
    name?: string;
    phone?: string;
    email?: string;
    cpf_cnpj?: string;
    birth_date?: string;
    marital_status?: string;
    profession?: string;
    status?: string;
    cep?: string;
    address?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    observations?: string;
  },
  supabase: SupabaseClient,
  userId: string
): Promise<any> {
  const audit = createAuditTimer(supabase, {
    user_id: userId,
    operation_type: 'update',
    entity_type: 'client',
    entity_id: args.client_id,
    tool_name: 'update_client',
  });

  try {
    logger.info('Updating client', { userId, clientId: args.client_id });

    // Buscar estado anterior
    const { data: beforeState, error: fetchError } = await supabase
      .from('clientes')
      .select()
      .eq('id', args.client_id)
      .single();

    if (fetchError) throw new Error('Cliente não encontrado');

    // Construir objeto de atualização apenas com campos fornecidos
    const updateData: any = {};
    if (args.name !== undefined) updateData.name = args.name.trim();
    if (args.phone !== undefined) updateData.phone = args.phone.trim();
    if (args.email !== undefined) updateData.email = args.email.trim().toLowerCase();
    if (args.cpf_cnpj !== undefined) updateData.cpf_cnpj = args.cpf_cnpj.trim();
    if (args.birth_date !== undefined) updateData.birth_date = args.birth_date;
    if (args.marital_status !== undefined) updateData.marital_status = args.marital_status;
    if (args.profession !== undefined) updateData.profession = args.profession.trim();
    if (args.status !== undefined) updateData.status = args.status;
    if (args.cep !== undefined) updateData.cep = args.cep.trim();
    if (args.address !== undefined) updateData.address = args.address.trim();
    if (args.number !== undefined) updateData.number = args.number.trim();
    if (args.complement !== undefined) updateData.complement = args.complement.trim();
    if (args.neighborhood !== undefined) updateData.neighborhood = args.neighborhood.trim();
    if (args.city !== undefined) updateData.city = args.city.trim();
    if (args.state !== undefined) updateData.state = args.state.trim();
    if (args.observations !== undefined) updateData.observations = args.observations.trim();

    if (Object.keys(updateData).length === 0) {
      throw new Error('Nenhum campo para atualizar foi fornecido');
    }

    const { data, error } = await supabase
      .from('clientes')
      .update(updateData)
      .eq('id', args.client_id)
      .select()
      .single();

    if (error) throw error;

    await audit.success({ before: beforeState, after: data });

    logger.info('Client updated successfully', { userId, clientId: data.id });

    return {
      success: true,
      message: `Cliente "${data.name}" atualizado com sucesso!`,
      client: {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
      },
    };
  } catch (error: any) {
    await audit.failure(error);
    logger.error('Failed to update client', { userId, clientId: args.client_id, error: error.message });
    throw error;
  }
}

/**
 * Exclui um cliente (soft delete - muda status para Inativo)
 */
export async function delete_client(
  args: {
    client_id: string;
    confirmed: boolean;
  },
  supabase: SupabaseClient,
  userId: string
): Promise<any> {
  const audit = createAuditTimer(supabase, {
    user_id: userId,
    operation_type: 'delete',
    entity_type: 'client',
    entity_id: args.client_id,
    tool_name: 'delete_client',
  });

  try {
    logger.info('Deleting client', { userId, clientId: args.client_id, confirmed: args.confirmed });

    // Buscar cliente
    const { data: client, error: fetchError } = await supabase
      .from('clientes')
      .select()
      .eq('id', args.client_id)
      .single();

    if (fetchError) throw new Error('Cliente não encontrado');

    // Se não confirmado, retornar mensagem de confirmação
    if (!args.confirmed) {
      return {
        success: false,
        requires_confirmation: true,
        message: `⚠️ Você tem certeza que deseja excluir o cliente "${client.name}"? Todas as apólices associadas também serão afetadas. Confirme para prosseguir.`,
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
        },
      };
    }

    // Soft delete: mudar status para Inativo
    const { data, error } = await supabase
      .from('clientes')
      .update({ status: 'Inativo' })
      .eq('id', args.client_id)
      .select()
      .single();

    if (error) throw error;

    await audit.success({ before: client, after: data });

    logger.info('Client deleted successfully', { userId, clientId: data.id });

    return {
      success: true,
      message: `Cliente "${client.name}" foi marcado como Inativo.`,
    };
  } catch (error: any) {
    await audit.failure(error);
    logger.error('Failed to delete client', { userId, clientId: args.client_id, error: error.message });
    throw error;
  }
}

// ========== APÓLICES ==========

/**
 * Cria uma nova apólice
 */
export async function create_policy(
  args: {
    client_id: string;
    policy_number: string;
    insurance_company: string;
    type: string;
    insured_asset?: string;
    premium_value: number;
    commission_rate: number;
    expiration_date: string;
    status?: string;
    renewal_status?: string;
  },
  supabase: SupabaseClient,
  userId: string
): Promise<any> {
  const audit = createAuditTimer(supabase, {
    user_id: userId,
    operation_type: 'create',
    entity_type: 'policy',
    tool_name: 'create_policy',
  });

  try {
    logger.info('Creating new policy', { userId, clientId: args.client_id });

    // Validações
    if (!args.client_id) throw new Error('ID do cliente é obrigatório');
    if (!args.policy_number) throw new Error('Número da apólice é obrigatório');
    if (!args.insurance_company) throw new Error('Seguradora é obrigatória');
    if (!args.type) throw new Error('Tipo de seguro é obrigatório');
    if (args.premium_value < 0) throw new Error('Valor do prêmio não pode ser negativo');
    if (args.commission_rate < 0 || args.commission_rate > 100) throw new Error('Taxa de comissão deve estar entre 0 e 100');
    if (!args.expiration_date) throw new Error('Data de vencimento é obrigatória');

    const policyData = {
      user_id: userId,
      client_id: args.client_id,
      policy_number: args.policy_number.trim(),
      insurance_company: args.insurance_company.trim(),
      type: args.type.trim(),
      insured_asset: args.insured_asset?.trim() || null,
      premium_value: args.premium_value,
      commission_rate: args.commission_rate,
      expiration_date: args.expiration_date,
      status: args.status || 'Aguardando Apólice',
      renewal_status: args.renewal_status || null,
    };

    const { data, error } = await supabase
      .from('apolices')
      .insert(policyData)
      .select()
      .single();

    if (error) throw error;

    await audit.success(data);

    logger.info('Policy created successfully', { userId, policyId: data.id });

    return {
      success: true,
      message: `Apólice "${data.policy_number}" criada com sucesso!`,
      policy: {
        id: data.id,
        policy_number: data.policy_number,
        insurance_company: data.insurance_company,
        type: data.type,
        premium_value: data.premium_value,
      },
    };
  } catch (error: any) {
    await audit.failure(error);
    logger.error('Failed to create policy', { userId, error: error.message });
    throw error;
  }
}

/**
 * Atualiza uma apólice existente
 */
export async function update_policy(
  args: {
    policy_id: string;
    policy_number?: string;
    insurance_company?: string;
    type?: string;
    insured_asset?: string;
    premium_value?: number;
    commission_rate?: number;
    expiration_date?: string;
    status?: string;
    renewal_status?: string;
  },
  supabase: SupabaseClient,
  userId: string
): Promise<any> {
  const audit = createAuditTimer(supabase, {
    user_id: userId,
    operation_type: 'update',
    entity_type: 'policy',
    entity_id: args.policy_id,
    tool_name: 'update_policy',
  });

  try {
    logger.info('Updating policy', { userId, policyId: args.policy_id });

    // Buscar estado anterior
    const { data: beforeState, error: fetchError } = await supabase
      .from('apolices')
      .select()
      .eq('id', args.policy_id)
      .single();

    if (fetchError) throw new Error('Apólice não encontrada');

    // Construir objeto de atualização
    const updateData: any = {};
    if (args.policy_number !== undefined) updateData.policy_number = args.policy_number.trim();
    if (args.insurance_company !== undefined) updateData.insurance_company = args.insurance_company.trim();
    if (args.type !== undefined) updateData.type = args.type.trim();
    if (args.insured_asset !== undefined) updateData.insured_asset = args.insured_asset.trim();
    if (args.premium_value !== undefined) updateData.premium_value = args.premium_value;
    if (args.commission_rate !== undefined) updateData.commission_rate = args.commission_rate;
    if (args.expiration_date !== undefined) updateData.expiration_date = args.expiration_date;
    if (args.status !== undefined) updateData.status = args.status;
    if (args.renewal_status !== undefined) updateData.renewal_status = args.renewal_status;

    if (Object.keys(updateData).length === 0) {
      throw new Error('Nenhum campo para atualizar foi fornecido');
    }

    const { data, error } = await supabase
      .from('apolices')
      .update(updateData)
      .eq('id', args.policy_id)
      .select()
      .single();

    if (error) throw error;

    await audit.success({ before: beforeState, after: data });

    logger.info('Policy updated successfully', { userId, policyId: data.id });

    return {
      success: true,
      message: `Apólice "${data.policy_number}" atualizada com sucesso!`,
      policy: {
        id: data.id,
        policy_number: data.policy_number,
        insurance_company: data.insurance_company,
        premium_value: data.premium_value,
      },
    };
  } catch (error: any) {
    await audit.failure(error);
    logger.error('Failed to update policy', { userId, policyId: args.policy_id, error: error.message });
    throw error;
  }
}

/**
 * Exclui uma apólice (soft delete - muda status)
 */
export async function delete_policy(
  args: {
    policy_id: string;
    confirmed: boolean;
  },
  supabase: SupabaseClient,
  userId: string
): Promise<any> {
  const audit = createAuditTimer(supabase, {
    user_id: userId,
    operation_type: 'delete',
    entity_type: 'policy',
    entity_id: args.policy_id,
    tool_name: 'delete_policy',
  });

  try {
    logger.info('Deleting policy', { userId, policyId: args.policy_id, confirmed: args.confirmed });

    // Buscar apólice
    const { data: policy, error: fetchError } = await supabase
      .from('apolices')
      .select()
      .eq('id', args.policy_id)
      .single();

    if (fetchError) throw new Error('Apólice não encontrada');

    // Se não confirmado, retornar mensagem de confirmação
    if (!args.confirmed) {
      return {
        success: false,
        requires_confirmation: true,
        message: `⚠️ Você tem certeza que deseja excluir a apólice "${policy.policy_number}" da seguradora ${policy.insurance_company}? Esta ação não pode ser desfeita. Confirme para prosseguir.`,
        policy: {
          id: policy.id,
          policy_number: policy.policy_number,
          insurance_company: policy.insurance_company,
        },
      };
    }

    // Hard delete (a tabela tem ON DELETE CASCADE)
    const { error } = await supabase
      .from('apolices')
      .delete()
      .eq('id', args.policy_id);

    if (error) throw error;

    await audit.success({ before: policy });

    logger.info('Policy deleted successfully', { userId, policyId: args.policy_id });

    return {
      success: true,
      message: `Apólice "${policy.policy_number}" foi excluída permanentemente.`,
    };
  } catch (error: any) {
    await audit.failure(error);
    logger.error('Failed to delete policy', { userId, policyId: args.policy_id, error: error.message });
    throw error;
  }
}
