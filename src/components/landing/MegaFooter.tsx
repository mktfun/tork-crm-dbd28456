"use client";

import { TorkLogo } from "./TorkLogo";
import { Twitter, Linkedin, Github, Instagram } from "lucide-react";

export function MegaFooter() {
    return (
        // FIX APLICADO: bg-slate-950 sólido + relative z-50 para cobrir camadas anteriores
        <footer className="w-full bg-slate-950 border-t border-white/5 pt-20 pb-32 lg:pb-10 relative z-50">
            <div className="max-w-7xl mx-auto px-6">

                {/* MAIN GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-20">

                    {/* COLUNA 1: MARCA */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 shrink-0"><TorkLogo /></div>
                            <span className="text-xl font-bold text-white tracking-tight">Tork</span>
                        </div>
                        <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
                            A espinha dorsal tecnológica para corretoras de seguros que buscam escala, segurança e automação real.
                        </p>
                        {/* Socials */}
                        <div className="flex items-center gap-4 text-zinc-500">
                            <a href="#" className="hover:text-white transition-colors"><Twitter size={20} /></a>
                            <a href="#" className="hover:text-white transition-colors"><Linkedin size={20} /></a>
                            <a href="#" className="hover:text-white transition-colors"><Instagram size={20} /></a>
                        </div>
                    </div>

                    {/* COLUNA 2: PRODUTO */}
                    <div className="space-y-4">
                        <h4 className="text-white font-semibold text-sm tracking-wide">Produto</h4>
                        <ul className="space-y-3 text-sm text-zinc-500">
                            <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Integrações</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Segurança</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Docs API</a></li>
                        </ul>
                    </div>

                    {/* COLUNA 3: EMPRESA */}
                    <div className="space-y-4">
                        <h4 className="text-white font-semibold text-sm tracking-wide">Empresa</h4>
                        <ul className="space-y-3 text-sm text-zinc-500">
                            <li><a href="#" className="hover:text-white transition-colors">Sobre nós</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                        </ul>
                    </div>

                    {/* COLUNA 4: LEGAL */}
                    <div className="space-y-4">
                        <h4 className="text-white font-semibold text-sm tracking-wide">Legal</h4>
                        <ul className="space-y-3 text-sm text-zinc-500">
                            <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Compliance</a></li>
                        </ul>
                    </div>
                </div>

                {/* BOTTOM BAR */}
                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">

                    <div className="text-zinc-600 text-xs">
                        © 2024 Tork CRM Ltda. Todos os direitos reservados.
                    </div>

                    {/* SYSTEM STATUS INDICATOR */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                        <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </div>
                        <span className="text-xs font-medium text-zinc-400">All systems normal</span>
                    </div>

                </div>
            </div>
        </footer>
    );
}
