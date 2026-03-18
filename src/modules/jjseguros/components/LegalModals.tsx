import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/modules/jjseguros/components/ui/dialog";
import { ScrollArea } from "@/modules/jjseguros/components/ui/scroll-area";

interface LegalModalsProps {
  showTerms: boolean;
  showPrivacy: boolean;
  onCloseTerms: () => void;
  onClosePrivacy: () => void;
}

export const LegalModals = ({
  showTerms,
  showPrivacy,
  onCloseTerms,
  onClosePrivacy,
}: LegalModalsProps) => {
  return (
    <>
      {/* Modal Termos de Uso */}
      <Dialog open={showTerms} onOpenChange={onCloseTerms}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Termos de Uso</DialogTitle>
            <DialogDescription>
              Última atualização: Janeiro de 2026
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <section>
                <h3 className="font-semibold text-foreground mb-2">1. Aceitação dos Termos</h3>
                <p>
                  Ao utilizar os serviços da JJ Seguros, você concorda com estes Termos de Uso. 
                  Se você não concordar com qualquer parte destes termos, não utilize nossos serviços.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">2. Serviços Oferecidos</h3>
                <p>
                  A JJ Seguros atua como corretora de seguros, intermediando a contratação de 
                  seguros entre você e as seguradoras parceiras. Nosso papel é apresentar as 
                  melhores opções de acordo com seu perfil e necessidades.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">3. Informações do Usuário</h3>
                <p>
                  Você se compromete a fornecer informações verdadeiras, precisas e completas 
                  durante o processo de cotação. Informações incorretas podem afetar a validade 
                  do seguro contratado.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">4. Responsabilidades</h3>
                <p>
                  A JJ Seguros não se responsabiliza por decisões de aceitação ou recusa de 
                  propostas pelas seguradoras, que são de exclusiva competência destas.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">5. Propriedade Intelectual</h3>
                <p>
                  Todo o conteúdo deste site, incluindo textos, imagens, logos e design, 
                  é de propriedade da JJ Seguros e está protegido por leis de direitos autorais.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">6. Modificações</h3>
                <p>
                  Reservamo-nos o direito de modificar estes termos a qualquer momento. 
                  As alterações entram em vigor imediatamente após sua publicação.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">7. Contato</h3>
                <p>
                  Para dúvidas sobre estes termos, entre em contato conosco através dos 
                  canais disponíveis em nosso site.
                </p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal Política de Privacidade */}
      <Dialog open={showPrivacy} onOpenChange={onClosePrivacy}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Política de Privacidade</DialogTitle>
            <DialogDescription>
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD) - Lei nº 13.709/2018
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <section>
                <h3 className="font-semibold text-foreground mb-2">1. Dados Coletados</h3>
                <p>
                  Coletamos os seguintes dados pessoais para fins de cotação de seguros:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Nome completo</li>
                  <li>CPF/CNPJ</li>
                  <li>Data de nascimento</li>
                  <li>Endereço</li>
                  <li>Telefone e e-mail</li>
                  <li>Informações sobre bens a serem segurados</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">2. Finalidade do Tratamento</h3>
                <p>
                  Seus dados são utilizados exclusivamente para:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Elaboração de cotações de seguros</li>
                  <li>Contato para apresentação de propostas</li>
                  <li>Intermediação com seguradoras parceiras</li>
                  <li>Cumprimento de obrigações legais</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">3. Compartilhamento de Dados</h3>
                <p>
                  Seus dados podem ser compartilhados com as seguradoras parceiras apenas 
                  para fins de cotação e contratação de seguros. Não comercializamos ou 
                  compartilhamos seus dados com terceiros para fins de marketing.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">4. Armazenamento e Segurança</h3>
                <p>
                  Seus dados são armazenados em servidores seguros, com criptografia e 
                  controles de acesso. Mantemos seus dados pelo tempo necessário para 
                  cumprir as finalidades descritas e obrigações legais.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">5. Seus Direitos</h3>
                <p>
                  Conforme a LGPD, você tem direito a:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Confirmar a existência de tratamento de dados</li>
                  <li>Acessar seus dados</li>
                  <li>Corrigir dados incompletos ou desatualizados</li>
                  <li>Solicitar a exclusão de dados desnecessários</li>
                  <li>Revogar o consentimento a qualquer momento</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">6. Cookies</h3>
                <p>
                  Utilizamos cookies para melhorar sua experiência de navegação. Você pode 
                  configurar seu navegador para recusar cookies, mas isso pode afetar 
                  algumas funcionalidades do site.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">7. Contato do Encarregado (DPO)</h3>
                <p>
                  Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de 
                  seus dados, entre em contato conosco através do e-mail disponível em nosso site.
                </p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
