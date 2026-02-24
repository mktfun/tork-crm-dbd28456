import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type RequestType = 'cotacao' | 'endosso' | 'sinistro' | 'renovacao';

export const usePortalWizardSubmit = () => {
    const submitToPortal = async (
        payload: any,
        requestType: RequestType,
        qarReport: string,
        isQualified: boolean = true,
        disqualificationReason: string | undefined = undefined
    ) => {
        try {
            const clientDataStr = sessionStorage.getItem('portal_client');
            const brokerageDataStr = sessionStorage.getItem('portal_brokerage');

            if (!clientDataStr || !brokerageDataStr) {
                toast.error('Sessão expirada. Volte para a página inicial.');
                return false;
            }

            const client = JSON.parse(clientDataStr);
            const brokerage = JSON.parse(brokerageDataStr);

            const insuranceType = payload?.customFields?.cf_tipo_solicitacao_seguro || 'Desconhecido';

            const { data: result, error } = await supabase.rpc('insert_portal_request' as any, {
                p_client_id: client.id,
                p_brokerage_user_id: brokerage.user_id,
                p_request_type: requestType,
                p_insurance_type: insuranceType,
                p_qar_report: qarReport,
                p_custom_fields: payload?.customFields || payload || {},
                p_is_qualified: isQualified,
                p_disqualification_reason: disqualificationReason || null
            });

            const res = result as any;

            if (error) {
                console.error('Error submitting request:', error);
                toast.error('Erro ao enviar solicitação. Tente novamente.');
                return false;
            }

            toast.success('Solicitação enviada com sucesso!');
            return true;

        } catch (err) {
            console.error('Submit error:', err);
            toast.error('Erro inesperado ao enviar solicitação.');
            return false;
        }
    };

    return { submitToPortal };
};
