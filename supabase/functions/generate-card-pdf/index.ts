import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { policy_id } = await req.json();

    if (!policy_id) {
      return new Response(
        JSON.stringify({ error: 'policy_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch policy with client and company data
    const { data: policy, error: policyError } = await supabase
      .from('apolices')
      .select(`
        id,
        policy_number,
        type,
        start_date,
        expiration_date,
        insured_asset,
        user_id,
        clientes:client_id (
          id,
          name,
          cpf_cnpj
        ),
        companies:insurance_company (
          id,
          name,
          assistance_phone
        )
      `)
      .eq('id', policy_id)
      .single();

    if (policyError || !policy) {
      console.error('Policy fetch error:', policyError);
      return new Response(
        JSON.stringify({ error: 'Policy not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch brokerage info
    const { data: brokerage } = await supabase
      .from('brokerages')
      .select('name, cnpj')
      .eq('user_id', policy.user_id)
      .limit(1)
      .maybeSingle();

    // Type assertions for joined data (Supabase returns arrays for relations)
    const clientData = policy.clientes as unknown as { id: string; name: string; cpf_cnpj: string | null } | { id: string; name: string; cpf_cnpj: string | null }[] | null;
    const companyData = policy.companies as unknown as { id: string; name: string; assistance_phone: string | null } | { id: string; name: string; assistance_phone: string | null }[] | null;
    
    const client = Array.isArray(clientData) ? clientData[0] : clientData;
    const company = Array.isArray(companyData) ? companyData[0] : companyData;

    // Format CPF
    const formatCpf = (cpf: string | null): string => {
      if (!cpf) return '---';
      const cleaned = cpf.replace(/\D/g, '');
      if (cleaned.length === 11) {
        return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
      }
      return cpf;
    };

    // Format date
    const formatDate = (dateStr: string | null): string => {
      if (!dateStr) return '---';
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    };

    // Get assistance phone with fallback to known insurers
    const getAssistancePhone = (companyName: string | null, customPhone: string | null): string => {
      if (customPhone && customPhone.trim()) return customPhone.trim();
      if (!companyName) return '';

      const normalized = companyName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const assistanceMap: Record<string, string> = {
        'porto': '0800 727 2810',
        'bradesco': '0800 701 2778',
        'sulamerica': '0800 725 4545',
        'tokio': '0800 703 2038',
        'liberty': '0800 709 4440',
        'mapfre': '0800 775 4545',
        'hdi': '0800 770 1608',
        'allianz': '0800 130 000',
        'azul': '0800 703 0203',
        'itau': '0800 723 9090',
        'zurich': '0800 284 4848',
        'sompo': '0800 775 0700',
      };

      for (const [key, phone] of Object.entries(assistanceMap)) {
        if (normalized.includes(key)) return phone;
      }
      return '';
    };

    const assistancePhone = getAssistancePhone(company?.name || null, company?.assistance_phone || null);

    // Generate PDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 53.98] // Credit card size
    });

    // Background - Dark silver gradient effect
    doc.setFillColor(40, 40, 45);
    doc.rect(0, 0, 85.6, 53.98, 'F');

    // Decorative circles (silver effect)
    doc.setFillColor(80, 80, 85);
    doc.circle(75, -5, 15, 'F');
    doc.setFillColor(60, 60, 65);
    doc.circle(-5, 50, 12, 'F');

    // Header
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 125);
    doc.text('CARTEIRINHA DIGITAL', 5, 6);

    // Brokerage name (top right)
    if (brokerage?.name) {
      doc.setFontSize(5);
      doc.setTextColor(100, 100, 105);
      doc.text(brokerage.name.toUpperCase(), 80, 6, { align: 'right' });
    }

    // Insurance type icon area
    doc.setFillColor(55, 55, 60);
    doc.roundedRect(5, 9, 8, 8, 1, 1, 'F');
    
    // Type label
    doc.setFontSize(7);
    doc.setTextColor(220, 220, 225);
    doc.text(policy.type || 'Seguro', 15, 13);

    // Company name
    if (company?.name) {
      doc.setFontSize(5);
      doc.setTextColor(120, 120, 125);
      doc.text(company.name, 15, 16);
    }

    // Client name (main info)
    doc.setFontSize(4);
    doc.setTextColor(100, 100, 105);
    doc.text('SEGURADO', 5, 22);
    
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    const clientName = client?.name || 'Nome não informado';
    doc.text(clientName.length > 28 ? clientName.substring(0, 28) + '...' : clientName, 5, 26);

    // CPF and Policy Number row
    doc.setFontSize(4);
    doc.setTextColor(100, 100, 105);
    doc.text('CPF', 5, 31);
    doc.text('Nº APÓLICE', 40, 31);

    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text(formatCpf(client?.cpf_cnpj || null), 5, 35);
    
    const policyNumber = policy.policy_number || '---';
    doc.text(policyNumber.length > 20 ? policyNumber.substring(0, 20) + '...' : policyNumber, 40, 35);

    // Validity
    doc.setFontSize(4);
    doc.setTextColor(100, 100, 105);
    doc.text('VIGÊNCIA', 5, 40);

    doc.setFontSize(5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${formatDate(policy.start_date)} → ${formatDate(policy.expiration_date)}`, 5, 43.5);

    // Insured asset (if exists)
    if (policy.insured_asset) {
      doc.setFillColor(50, 50, 55);
      doc.roundedRect(5, 46, 75, 5, 0.5, 0.5, 'F');
      doc.setFontSize(4);
      doc.setTextColor(180, 180, 185);
      const asset = policy.insured_asset.length > 50 ? policy.insured_asset.substring(0, 50) + '...' : policy.insured_asset;
      doc.text(asset, 7, 49.5);
    }

    // Assistance phone (bottom area - if available)
    if (assistancePhone) {
      const phoneY = policy.insured_asset ? 53 : 48;
      doc.setFillColor(55, 55, 60);
      doc.roundedRect(45, phoneY - 5, 35, 6, 1, 1, 'F');
      
      doc.setFontSize(3.5);
      doc.setTextColor(120, 120, 125);
      doc.text('ASSISTÊNCIA 24H', 47, phoneY - 2.5);
      
      doc.setFontSize(5);
      doc.setTextColor(255, 255, 255);
      doc.text(assistancePhone, 47, phoneY + 0.5);
    }

    // Generate PDF as base64
    const pdfOutput = doc.output('arraybuffer');

    console.log('PDF generated successfully for policy:', policy_id);

    return new Response(pdfOutput, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="carteirinha-${policy.policy_number || policy.id}.pdf"`,
      },
    });

  } catch (error: unknown) {
    console.error('Error generating PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Failed to generate PDF', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
