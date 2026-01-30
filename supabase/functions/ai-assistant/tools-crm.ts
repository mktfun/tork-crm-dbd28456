/**
 * Tools CRM/Kanban para o Assistente de IA - Fase P1
 * 
 * Implementa operações de gestão do pipeline de vendas:
 * - Movimentação de deals entre etapas do Kanban
 * - Criação e atualização de deals
 * 
 * Todas as operações são auditadas e respeitam RLS do Supabase.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { logger } from '../_shared/logger.ts';
import { createAuditTimer } from '../_shared/audit.ts';

/**
 * Move um deal para uma nova etapa do Kanban
 */
export async function move_deal_to_stage(
  args: {
    deal_id: string;
    stage_id: string;
  },
  supabase: SupabaseClient,
  userId: string
): Promise<any> {
  const audit = createAuditTimer(supabase, {
    user_id: userId,
    operation_type: 'update',
    entity_type: 'deal',
    entity_id: args.deal_id,
    tool_name: 'move_deal_to_stage',
  });

  try {
    logger.info('Moving deal to new stage', { 
      userId, 
      dealId: args.deal_id, 
      stageId: args.stage_id 
    });

    // Buscar deal atual
    const { data: deal, error: dealError } = await supabase
      .from('crm_deals')
      .select('*, stage:crm_stages!stage_id(name)')
      .eq('id', args.deal_id)
      .single();

    if (dealError) throw new Error('Deal não encontrado');

    // Buscar nova etapa
    const { data: newStage, error: stageError } = await supabase
      .from('crm_stages')
      .select()
      .eq('id', args.stage_id)
      .single();

    if (stageError) throw new Error('Etapa não encontrada');

    // Atualizar deal
    const { data: updatedDeal, error: updateError } = await supabase
      .from('crm_deals')
      .update({ 
        stage_id: args.stage_id,
        last_sync_source: 'crm'
      })
      .eq('id', args.deal_id)
      .select()
      .single();

    if (updateError) throw updateError;

    await audit.success({ 
      before: { stage_id: deal.stage_id, stage_name: deal.stage?.name },
      after: { stage_id: newStage.id, stage_name: newStage.name }
    });

    logger.info('Deal moved successfully', { 
      userId, 
      dealId: updatedDeal.id,
      fromStage: deal.stage?.name,
      toStage: newStage.name
    });

    return {
      success: true,
      message: `Deal "${deal.title}" movido de "${deal.stage?.name}" para "${newStage.name}"`,
      deal: {
        id: updatedDeal.id,
        title: updatedDeal.title,
        stage: newStage.name,
      },
    };
  } catch (error: any) {
    await audit.failure(error);
    logger.error('Failed to move deal', { 
      userId, 
      dealId: args.deal_id, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Cria um novo deal no CRM
 */
export async function create_deal(
  args: {
    client_id?: string;
    stage_id: string;
    title: string;
    value?: number;
    expected_close_date?: string;
    notes?: string;
  },
  supabase: SupabaseClient,
  userId: string
): Promise<any> {
  const audit = createAuditTimer(supabase, {
    user_id: userId,
    operation_type: 'create',
    entity_type: 'deal',
    tool_name: 'create_deal',
  });

  try {
    logger.info('Creating new deal', { userId, title: args.title });

    // Validações
    if (!args.title || args.title.trim().length < 3) {
      throw new Error('Título do deal deve ter pelo menos 3 caracteres');
    }
    if (!args.stage_id) {
      throw new Error('Etapa (stage_id) é obrigatória');
    }

    // Buscar a etapa para validar
    const { data: stage, error: stageError } = await supabase
      .from('crm_stages')
      .select()
      .eq('id', args.stage_id)
      .single();

    if (stageError) throw new Error('Etapa não encontrada');

    // Buscar a maior posição atual na etapa
    const { data: maxPositionData } = await supabase
      .from('crm_deals')
      .select('position')
      .eq('stage_id', args.stage_id)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPositionData?.position || 0) + 1;

    const dealData = {
      user_id: userId,
      client_id: args.client_id || null,
      stage_id: args.stage_id,
      title: args.title.trim(),
      value: args.value || 0,
      expected_close_date: args.expected_close_date || null,
      notes: args.notes?.trim() || null,
      position: nextPosition,
      last_sync_source: 'crm',
    };

    const { data, error } = await supabase
      .from('crm_deals')
      .insert(dealData)
      .select('*, stage:crm_stages!stage_id(name)')
      .single();

    if (error) throw error;

    await audit.success(data);

    logger.info('Deal created successfully', { userId, dealId: data.id });

    return {
      success: true,
      message: `Deal "${data.title}" criado na etapa "${data.stage?.name}"`,
      deal: {
        id: data.id,
        title: data.title,
        stage: data.stage?.name,
        value: data.value,
      },
    };
  } catch (error: any) {
    await audit.failure(error);
    logger.error('Failed to create deal', { userId, error: error.message });
    throw error;
  }
}

/**
 * Atualiza um deal existente
 */
export async function update_deal(
  args: {
    deal_id: string;
    title?: string;
    value?: number;
    expected_close_date?: string;
    notes?: string;
    client_id?: string;
  },
  supabase: SupabaseClient,
  userId: string
): Promise<any> {
  const audit = createAuditTimer(supabase, {
    user_id: userId,
    operation_type: 'update',
    entity_type: 'deal',
    entity_id: args.deal_id,
    tool_name: 'update_deal',
  });

  try {
    logger.info('Updating deal', { userId, dealId: args.deal_id });

    // Buscar estado anterior
    const { data: beforeState, error: fetchError } = await supabase
      .from('crm_deals')
      .select()
      .eq('id', args.deal_id)
      .single();

    if (fetchError) throw new Error('Deal não encontrado');

    // Construir objeto de atualização
    const updateData: any = { last_sync_source: 'crm' };
    if (args.title !== undefined) updateData.title = args.title.trim();
    if (args.value !== undefined) updateData.value = args.value;
    if (args.expected_close_date !== undefined) updateData.expected_close_date = args.expected_close_date;
    if (args.notes !== undefined) updateData.notes = args.notes.trim();
    if (args.client_id !== undefined) updateData.client_id = args.client_id;

    if (Object.keys(updateData).length === 1) { // Apenas last_sync_source
      throw new Error('Nenhum campo para atualizar foi fornecido');
    }

    const { data, error } = await supabase
      .from('crm_deals')
      .update(updateData)
      .eq('id', args.deal_id)
      .select('*, stage:crm_stages!stage_id(name)')
      .single();

    if (error) throw error;

    await audit.success({ before: beforeState, after: data });

    logger.info('Deal updated successfully', { userId, dealId: data.id });

    return {
      success: true,
      message: `Deal "${data.title}" atualizado com sucesso`,
      deal: {
        id: data.id,
        title: data.title,
        stage: data.stage?.name,
        value: data.value,
      },
    };
  } catch (error: any) {
    await audit.failure(error);
    logger.error('Failed to update deal', { userId, dealId: args.deal_id, error: error.message });
    throw error;
  }
}

/**
 * Exclui um deal
 */
export async function delete_deal(
  args: {
    deal_id: string;
    confirmed: boolean;
  },
  supabase: SupabaseClient,
  userId: string
): Promise<any> {
  const audit = createAuditTimer(supabase, {
    user_id: userId,
    operation_type: 'delete',
    entity_type: 'deal',
    entity_id: args.deal_id,
    tool_name: 'delete_deal',
  });

  try {
    logger.info('Deleting deal', { userId, dealId: args.deal_id, confirmed: args.confirmed });

    // Buscar deal
    const { data: deal, error: fetchError } = await supabase
      .from('crm_deals')
      .select('*, stage:crm_stages!stage_id(name)')
      .eq('id', args.deal_id)
      .single();

    if (fetchError) throw new Error('Deal não encontrado');

    // Se não confirmado, retornar mensagem de confirmação
    if (!args.confirmed) {
      return {
        success: false,
        requires_confirmation: true,
        message: `⚠️ Você tem certeza que deseja excluir o deal "${deal.title}" da etapa "${deal.stage?.name}"? Esta ação não pode ser desfeita. Confirme para prosseguir.`,
        deal: {
          id: deal.id,
          title: deal.title,
          stage: deal.stage?.name,
        },
      };
    }

    // Hard delete
    const { error } = await supabase
      .from('crm_deals')
      .delete()
      .eq('id', args.deal_id);

    if (error) throw error;

    await audit.success({ before: deal });

    logger.info('Deal deleted successfully', { userId, dealId: args.deal_id });

    return {
      success: true,
      message: `Deal "${deal.title}" foi excluído permanentemente.`,
    };
  } catch (error: any) {
    await audit.failure(error);
    logger.error('Failed to delete deal', { userId, dealId: args.deal_id, error: error.message });
    throw error;
  }
}
