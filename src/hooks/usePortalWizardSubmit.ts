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

            const { error } = await supabase.from('portal_requests').insert({
                client_id: client.id,
                brokerage_user_id: brokerage.user_id,
                request_type: requestType,
                insurance_type: insuranceType,
                qar_report: qarReport,
                custom_fields: payload?.customFields || payload || {},
                is_qualified: isQualified,
                disqualification_reason: disqualificationReason,
                status: 'pendente'
            });

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
