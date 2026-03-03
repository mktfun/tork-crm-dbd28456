import * as React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { FormCard } from "@/components/ui/form-card";
import { Textarea } from "@/components/ui/textarea";
import { LgpdConsent } from "@/components/ui/lgpd-consent";

interface GenericRequestWizardProps {
    type: 'endosso' | 'sinistro';
    policyData?: any;
    onComplete?: (payload: any) => void;
}

export const GenericRequestWizard: React.FC<GenericRequestWizardProps> = ({ type, policyData, onComplete }) => {
    const [description, setDescription] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // LGPD Consent
    const [acceptedTerms, setAcceptedTerms] = React.useState(false);
    const [acceptedPrivacy, setAcceptedPrivacy] = React.useState(false);

    const handleSubmit = async () => {
        if (description.trim().length < 10) {
            toast.error('Por favor, descreva sua solicitação com mais detalhes (mínimo 10 caracteres).');
            return;
        }

        if (!acceptedTerms || !acceptedPrivacy) {
            toast.error('Aceite os termos para continuar.');
            return;
        }

        setIsSubmitting(true);
        try {
            const clientRaw = sessionStorage.getItem('portal_client');
            const client = clientRaw ? JSON.parse(clientRaw) : {};

            const payload = {
                name: client.name || "Cliente Portal",
                email: client.email || "",
                phone: client.phone || "",
                cpf: client.cpf_cnpj || "",
                customFields: {
                    cf_policy_id: policyData?.id,
                    cf_policy_number: policyData?.policy_number,
                    cf_policy_insurance_company: policyData?.insurance_company,
                    cf_policy_product: policyData?.product,
                    cf_policy_insured_asset: policyData?.insured_asset,
                    cf_policy_end_date: policyData?.end_date,
                    cf_description: description,
                    cf_request_context: `Solicitação criada via portal do segurado.\nApólice Associada: ${policyData?.policy_number || 'Não informada'}\nOperador: Portal do Segurado`
                },
                insuranceType: type === 'sinistro' ? 'Aviso de Sinistro' : 'Endosso/Alteração',
                is_qualified: true
            };

            if (onComplete) {
                onComplete(payload);
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao enviar solicitação.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const title = type === 'sinistro' ? 'Aviso de Sinistro' : 'Solicitar Endosso / Alteração';
    const descriptionText = type === 'sinistro'
        ? 'Descreva com o máximo de detalhes o que aconteceu para acionarmos o seguro.'
        : 'Descreva a alteração que deseja fazer na sua apólice (ex: troca de veículo, novo endereço, etc).';

    return (
        <div className="w-full">
            <div className="min-h-[400px]">
                <FormCard title={title} description={descriptionText}>
                    <div className="space-y-6">

                        {policyData && (
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                                <FileText className="text-primary mt-1 shrink-0" size={20} />
                                <div>
                                    <h4 className="font-semibold text-foreground text-sm">Apólice Vinculada</h4>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        {policyData.insurance_company} - {policyData.product}
                                        <br />
                                        Apolice: {policyData.policy_number}
                                    </p>
                                </div>
                            </div>
                        )}

                        {!policyData && (
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                                <AlertCircle className="text-amber-600 mt-1 shrink-0" size={20} />
                                <div>
                                    <h4 className="font-semibold text-amber-900 text-sm">Sem Apólice Selecionada</h4>
                                    <p className="text-sm text-amber-800 mt-0.5">
                                        Não localizamos uma apólice específica. Descreva do que se trata para nossa equipe ajudar.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <label className="text-sm font-medium text-foreground">
                                Sua Solicitação <span className="text-destructive">*</span>
                            </label>
                            <Textarea
                                placeholder={type === 'sinistro' ? "O que aconteceu? Onde, quando e como..." : "Qual alteração você precisa? Relate os novos dados se houver..."}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={6}
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground text-right">
                                {description.length} caracteres (mínimo 10)
                            </p>
                        </div>

                        <LgpdConsent
                            acceptedTerms={acceptedTerms}
                            acceptedPrivacy={acceptedPrivacy}
                            onAcceptTermsChange={setAcceptedTerms}
                            onAcceptPrivacyChange={setAcceptedPrivacy}
                        />
                    </div>

                    <div className="mt-8 flex justify-end">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSubmit}
                            disabled={isSubmitting || description.trim().length < 10 || !acceptedTerms || !acceptedPrivacy}
                            className="px-8 h-14 rounded-full bg-foreground text-background font-semibold shadow-lg flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    Enviar Solicitação
                                    <ArrowRight className="w-5 h-5" strokeWidth={2} />
                                </>
                            )}
                        </motion.button>
                    </div>
                </FormCard>
            </div>
        </div>
    );
};
