import { Logo } from "./Logo";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
export const Footer = () => {
  return <footer className="bg-[#0a0a0a] text-white">
      <div className="container py-12 lg:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo size="xl" className="mb-4" variant="light" rounded={false} />
            <p className="text-sm text-neutral-400 leading-relaxed mb-4">
              <strong className="text-white">JJ & Amorim Corretora de Seguros</strong>
            </p>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Sua corretora de seguros de confiança. Protegendo o que importa há mais de 10 anos.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">
              Nossos Seguros
            </h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li><a href="#" className="hover:text-white transition-colors">Auto</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Residencial</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Vida</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Empresarial</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Viagem</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Saúde</a></li>
            </ul>
          </div>

          {/* Institucional */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">
              Institucional
            </h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li><a href="#" className="hover:text-white transition-colors">Sobre Nós</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Política de Privacidade</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">
              Contato
            </h4>
            <ul className="space-y-3 text-sm text-neutral-400">
              <li>
                <a href="tel:+551134933605" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone size={14} className="text-white/80 flex-shrink-0" />
                  <span>(11) 3493-3605</span>
                </a>
              </li>
              <li>
                <a href="https://wa.me/5511979699832" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                  <MessageCircle size={14} className="text-white/80 flex-shrink-0" />
                  <span>(11) 97969-9832</span>
                </a>
              </li>
              <li>
                
              </li>
              <li>
                <a href="mailto:contato@jjamorimseguros.com.br" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail size={14} className="text-white/80 flex-shrink-0" />
                  <span>contato@jjamorimseguros.com.br</span>
                </a>
              </li>
              <li className="flex items-start gap-2 pt-2">
                <MapPin size={14} className="text-white/80 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">
                  R. Frei Gaspar, 941 - Sala 603<br />
                  Vila Santa Rita de Cassia<br />
                  São Bernardo do Campo - SP<br />
                  CEP: 09720-440
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar with CNPJ */}
        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-center text-xs text-neutral-500">
            © {new Date().getFullYear()} JJ & Amorim Corretora de Seguros. Todos os direitos reservados.
          </p>
          <p className="text-center text-xs text-neutral-500 mt-2">
            CNPJ: 21.364.352/0001-04
          </p>
        </div>
      </div>
    </footer>;
};