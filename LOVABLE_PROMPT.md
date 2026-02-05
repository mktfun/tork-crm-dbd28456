# 🚀 PROMPT PARA LOVABLE - Landing Page Chat Tork

Cole este prompt completo no Lovable para implementar a nova landing page com simulação de WhatsApp.

---

## OBJETIVO
Substituir completamente a landing page atual por uma nova landing com:
- Simulação de chat WhatsApp com animações de scroll
- Navbar com efeito glass que transforma em pill ao rolar
- Seções de features com sticky scroll
- Footer premium

---

## PASSO 1: CRIAR OS COMPONENTES DE LANDING

### 📁 Criar: `src/components/landing/TorkLogo.tsx`
```tsx
export function TorkLogo() {
    return (
        <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
            <rect width="32" height="32" rx="8" fill="url(#torkGrad)" />
            <path d="M10 12h12M16 12v10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <defs>
                <linearGradient id="torkGrad" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#6366f1" />
                    <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
            </defs>
        </svg>
    );
}
```

---

### 📁 Criar: `src/components/landing/SmartNavbar.tsx`
```tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TorkLogo } from "@/components/landing/TorkLogo";
import { Menu, X } from "lucide-react";

const navLinks = [
    { name: "Features", href: "#features" },
    { name: "Segurança", href: "#security" },
    { name: "Planos", href: "#pricing" },
];

export function SmartNavbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const iosEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

    return (
        <>
            <div className="fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none pt-4 lg:pt-6 w-full">
                <motion.div
                    layout
                    initial={{
                        width: "92%",
                        height: 80,
                        borderRadius: "16px",
                        backgroundColor: "rgba(0,0,0,0)",
                        boxShadow: "none",
                    }}
                    animate={{
                        width: scrolled ? (typeof window !== 'undefined' && window.innerWidth < 1024 ? "92%" : 620) : "92%",
                        height: scrolled ? 64 : 80,
                        borderRadius: scrolled ? "9999px" : "16px",
                        backgroundColor: scrolled ? "rgba(2, 6, 23, 0.90)" : "rgba(0,0,0,0)",
                        borderColor: scrolled ? "rgba(255, 255, 255, 0.08)" : "rgba(255,255,255,0)",
                        backdropFilter: scrolled ? "blur(20px)" : "blur(0px)",
                        boxShadow: scrolled ? "0 20px 40px -10px rgba(0, 0, 0, 0.5)" : "none",
                    }}
                    transition={{ duration: 0.6, ease: iosEase }}
                    style={{ maxWidth: "1400px" }}
                    className="pointer-events-auto relative border border-transparent overflow-hidden"
                >
                    {/* DESKTOP CONTENT */}
                    <div className="hidden lg:grid grid-cols-[1fr_auto_1fr] w-full h-full items-center px-6">
                        <div className="flex items-center justify-start gap-3">
                            <motion.div layout="position" className="relative w-8 h-8 shrink-0">
                                <TorkLogo />
                            </motion.div>
                            <AnimatePresence>
                                {!scrolled && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="font-bold text-white text-lg tracking-tight whitespace-nowrap"
                                    >
                                        Tork
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex items-center justify-center gap-8">
                            {navLinks.map((link) => (
                                <a key={link.name} href={link.href} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors whitespace-nowrap">
                                    {link.name}
                                </a>
                            ))}
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <a href="/auth" className="text-sm font-semibold text-white/70 hover:text-white transition-colors mr-2">
                                Acessar Sistema
                            </a>
                            <motion.a
                                layout="position"
                                href="/auth"
                                className={`flex items-center justify-center text-sm font-bold rounded-full transition-all whitespace-nowrap
                                    ${scrolled ? "bg-white text-slate-950 px-6 py-2.5 hover:bg-zinc-200" : "bg-white/10 text-white px-7 py-3 hover:bg-white/20 border border-white/10"}`}
                            >
                                Começar
                            </motion.a>
                        </div>
                    </div>

                    {/* MOBILE CONTENT */}
                    <div className="flex lg:hidden w-full h-full items-center justify-between px-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8"><TorkLogo /></div>
                            {!scrolled && <span className="text-lg font-bold text-white">Tork</span>}
                        </div>
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="p-2 text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors border border-white/5"
                        >
                            <Menu size={20} />
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* MOBILE MENU OVERLAY */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-[60] bg-slate-950/98 backdrop-blur-3xl flex flex-col p-6 lg:hidden"
                    >
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8"><TorkLogo /></div>
                                <span className="text-xl font-bold text-white">Tork</span>
                            </div>
                            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-zinc-400 hover:text-white bg-white/10 rounded-full border border-white/5">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-6 text-center mt-10">
                            {navLinks.map(link => (
                                <a key={link.name} href={link.href} onClick={() => setMobileMenuOpen(false)} className="text-3xl font-bold text-white hover:text-cyan-400 transition-colors">
                                    {link.name}
                                </a>
                            ))}
                            <hr className="border-white/10 my-8 w-1/2 mx-auto" />
                            <a href="/auth" onClick={() => setMobileMenuOpen(false)} className="w-full py-4 bg-white text-slate-950 rounded-2xl font-bold text-xl mt-4 shadow-xl shadow-cyan-500/10">
                                Começar Agora
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
```

---

### 📁 Criar: `src/components/landing/SectionDivider.tsx`
```tsx
import { motion } from "framer-motion";

type DividerVariant = "dark-glow" | "light-to-dark";

export function SectionDivider({ variant, className = "" }: { variant: DividerVariant; className?: string }) {
    if (variant === "dark-glow") {
        return (
            <div className={`relative h-32 bg-slate-950 overflow-hidden ${className}`}>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-indigo-500/5 blur-[100px] rounded-full" />
            </div>
        );
    }

    if (variant === "light-to-dark") {
        return (
            <div className={`relative h-48 overflow-hidden ${className}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-50 via-zinc-200 to-slate-950" />
            </div>
        );
    }

    return null;
}
```

---

### 📁 Criar: `src/components/landing/StickyScrollSection.tsx`
```tsx
import { useRef, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useScroll } from 'framer-motion';
import { Zap, Phone, Video } from 'lucide-react';

const steps = [
    { id: "capture", badge: "Etapa 1 • Captura", title: "Captura Automática", description: "Cada mensagem é uma oportunidade. O Tork captura leads instantaneamente." },
    { id: "qualify", badge: "Etapa 2 • Qualificação", title: "Qualificação IA", description: "Nossa IA analisa a intenção de compra e separa leads quentes." },
    { id: "convert", badge: "Etapa 3 • Conversão", title: "Sync CRM em Tempo Real", description: "Conversa e dados do lead são enviados para o CRM instantaneamente." }
];

const fullConversation = [
    { id: 1, from: "client", text: "Olá! Gostaria de cotar um seguro auto." },
    { id: 2, from: "bot", text: "Perfeito! Vou te ajudar. Qual o modelo do carro?" },
    { id: 3, from: "client", text: "Honda Civic 2023" },
    { id: 4, from: "bot", text: "Ótimo! Buscando as melhores condições..." },
    { id: 5, from: "success", text: "Lead Qualificado Enviado" }
];

export function StickyScrollSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
    const [visibleCount, setVisibleCount] = useState(0);
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        const unsubscribe = scrollYProgress.on("change", (latest) => {
            let count = 0, typing = false;
            if (latest < 0.1) count = 0;
            else if (latest < 0.2) count = 1;
            else if (latest < 0.3) { count = 1; typing = true; }
            else if (latest < 0.45) count = 2;
            else if (latest < 0.55) count = 3;
            else if (latest < 0.65) { count = 3; typing = true; }
            else if (latest < 0.75) count = 4;
            else count = 5;
            setVisibleCount(count);
            setIsTyping(typing);
        });
        return () => unsubscribe();
    }, [scrollYProgress]);

    const currentList = useMemo(() => fullConversation.slice(0, visibleCount), [visibleCount]);

    return (
        <section ref={containerRef} className="bg-zinc-50 relative w-full py-24 border-t border-zinc-200" style={{ height: "300vh" }}>
            <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row gap-8 lg:gap-20">
                {/* CARDS */}
                <div className="w-full lg:w-1/2 flex flex-col gap-8 pb-32">
                    {steps.map((step, index) => (
                        <div key={step.id} className="sticky bg-white p-8 lg:p-12 rounded-[2rem] shadow-lg border border-zinc-100 min-h-[50vh]" style={{ top: `${120 + (index * 20)}px`, zIndex: index }}>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6 w-fit">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{step.badge}</span>
                            </div>
                            <h3 className="text-3xl lg:text-4xl font-bold mb-6 text-slate-900">{step.title}</h3>
                            <p className="text-lg text-slate-500">{step.description}</p>
                        </div>
                    ))}
                </div>

                {/* IPHONE MOCKUP */}
                <div className="w-full lg:w-1/2 sticky top-8 h-[calc(100vh-4rem)] hidden lg:flex items-center justify-center">
                    <div className="relative w-full max-w-[340px]">
                        <div className="relative bg-[#f5f5f5] rounded-[3rem] p-1.5 shadow-2xl border-[4px] border-[#e2e2e4]">
                            <div className="bg-black rounded-[2.6rem] p-[3px] overflow-hidden">
                                <div className="bg-[#EFE7DE] rounded-[2.4rem] overflow-hidden min-h-[620px] flex flex-col relative">
                                    {/* Status Bar */}
                                    <div className="h-12 bg-[#f6f6f6]/80 backdrop-blur-md flex items-center justify-between px-6 text-xs font-semibold text-black">
                                        <span>9:41</span>
                                        <div className="flex gap-1.5 items-center">
                                            <span className="text-[10px]">5G</span>
                                            <div className="w-5 h-2.5 bg-black rounded-sm" />
                                        </div>
                                    </div>
                                    {/* Dynamic Island */}
                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black w-[100px] h-7 rounded-full z-30" />
                                    {/* Header */}
                                    <div className="h-16 bg-[#f6f6f6]/95 border-b border-black/5 flex items-center px-4 gap-3">
                                        <span className="text-blue-500 text-2xl">‹</span>
                                        <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500 font-semibold text-sm">JS</div>
                                        <div className="flex-1">
                                            <div className="text-black font-semibold text-sm">João da Silva</div>
                                            <div className="text-zinc-400 text-xs">Online</div>
                                        </div>
                                        <div className="flex gap-4 text-blue-500">
                                            <Video size={20} /><Phone size={20} />
                                        </div>
                                    </div>
                                    {/* Chat */}
                                    <div className="flex-1 p-4 flex flex-col justify-end space-y-3">
                                        <AnimatePresence mode="popLayout" initial={false}>
                                            {currentList.map((msg) => (
                                                <motion.div key={msg.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex w-full ${msg.from === 'client' ? 'justify-end' : msg.from === 'bot' ? 'justify-start' : 'justify-center'}`}>
                                                    {msg.from === 'client' && <div className="bg-[#D9FDD3] text-black text-[14px] px-3 py-1.5 rounded-lg rounded-tr-none max-w-[80%] shadow-sm">{msg.text}</div>}
                                                    {msg.from === 'bot' && <div className="bg-white text-black text-[14px] px-3 py-1.5 rounded-lg rounded-tl-none max-w-[80%] shadow-sm">{msg.text}</div>}
                                                    {msg.from === 'success' && <div className="bg-[#FFF5C4] text-amber-800 text-[10px] px-3 py-1 rounded-full flex items-center gap-1"><Zap size={10} />{msg.text}</div>}
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                        {isTyping && (
                                            <div className="flex justify-start">
                                                <div className="bg-white rounded-xl px-3 py-2 flex gap-1">
                                                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* Input */}
                                    <div className="bg-[#f0f2f5] px-3 py-2 flex items-center gap-2 pb-6">
                                        <span className="text-blue-500 text-2xl">+</span>
                                        <div className="flex-1 bg-white rounded-full h-9 border border-zinc-200 px-4 flex items-center text-sm text-zinc-400">Mensagem</div>
                                        <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white">
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
```

---

### 📁 Criar: `src/components/landing/MegaFooter.tsx`
```tsx
import { TorkLogo } from "./TorkLogo";
import { Twitter, Linkedin, Instagram } from "lucide-react";

export function MegaFooter() {
    return (
        <footer className="w-full bg-slate-950 border-t border-white/5 pt-20 pb-32 lg:pb-10 relative z-50">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8"><TorkLogo /></div>
                            <span className="text-xl font-bold text-white">Tork</span>
                        </div>
                        <p className="text-zinc-500 text-sm max-w-xs">A espinha dorsal tecnológica para corretoras de seguros.</p>
                        <div className="flex items-center gap-4 text-zinc-500">
                            <a href="#" className="hover:text-white"><Twitter size={20} /></a>
                            <a href="#" className="hover:text-white"><Linkedin size={20} /></a>
                            <a href="#" className="hover:text-white"><Instagram size={20} /></a>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-white font-semibold text-sm">Produto</h4>
                        <ul className="space-y-3 text-sm text-zinc-500">
                            <li><a href="#" className="hover:text-white">Features</a></li>
                            <li><a href="#" className="hover:text-white">Integrações</a></li>
                            <li><a href="#" className="hover:text-white">Segurança</a></li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-white font-semibold text-sm">Empresa</h4>
                        <ul className="space-y-3 text-sm text-zinc-500">
                            <li><a href="#" className="hover:text-white">Sobre nós</a></li>
                            <li><a href="#" className="hover:text-white">Blog</a></li>
                            <li><a href="#" className="hover:text-white">Contato</a></li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-white font-semibold text-sm">Legal</h4>
                        <ul className="space-y-3 text-sm text-zinc-500">
                            <li><a href="#" className="hover:text-white">Termos de Uso</a></li>
                            <li><a href="#" className="hover:text-white">Privacidade</a></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-zinc-600 text-xs">© 2024 Tork CRM. Todos os direitos reservados.</div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-xs text-zinc-400">All systems normal</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
```

---

### 📁 Criar: `src/components/landing/HeroMockups.tsx`
```tsx
import { motion } from "framer-motion";

export function HeroMockups() {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">T</span>
                </div>
                <p className="text-zinc-400 text-sm">Dashboard Preview</p>
            </div>
        </motion.div>
    );
}
```

---

## PASSO 2: SUBSTITUIR A LANDING PAGE PRINCIPAL

### 📁 Substituir COMPLETAMENTE: `src/pages/Landing.tsx`

```tsx
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Zap, ArrowRight, PlayCircle, CheckCircle } from "lucide-react";

import { SmartNavbar } from "@/components/landing/SmartNavbar";
import { MegaFooter } from "@/components/landing/MegaFooter";
import { SectionDivider } from "@/components/landing/SectionDivider";
import { HeroMockups } from "@/components/landing/HeroMockups";
import { StickyScrollSection } from "@/components/landing/StickyScrollSection";

function FadeInWhenVisible({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, delay, ease: "easeOut" }}>
            {children}
        </motion.div>
    );
}

function Landing() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) navigate('/dashboard', { replace: true });
    }, [user, loading, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <p className="text-zinc-500 text-sm">Carregando...</p>
                </motion.div>
            </div>
        );
    }

    if (user) return null;

    return (
        <main className="flex flex-col min-h-screen w-full bg-slate-950 selection:bg-cyan-500/30 selection:text-cyan-200">
            <SmartNavbar />

            {/* HERO */}
            <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 overflow-hidden bg-slate-950">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
                
                <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                    <FadeInWhenVisible>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 mb-8 backdrop-blur-sm">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm font-medium text-slate-300">Tork v2.0 Live</span>
                        </div>
                    </FadeInWhenVisible>

                    <FadeInWhenVisible delay={0.1}>
                        <h1 className="text-4xl md:text-7xl font-semibold tracking-tight text-white mb-6 leading-[1.1]">
                            A espinha dorsal da <br />sua operação de seguros.
                        </h1>
                    </FadeInWhenVisible>

                    <FadeInWhenVisible delay={0.2}>
                        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10 font-light">
                            Conecte WhatsApp, CRM e automação em um único fluxo contínuo.
                        </p>
                    </FadeInWhenVisible>

                    <FadeInWhenVisible delay={0.3}>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button onClick={() => navigate('/auth')} className="w-full sm:w-auto px-8 py-3.5 bg-white text-slate-950 rounded-full font-bold hover:bg-slate-200 transition-colors shadow-lg">
                                Começar Agora
                            </button>
                            <button className="w-full sm:w-auto px-8 py-3.5 text-slate-300 hover:text-white transition-colors font-medium flex items-center justify-center gap-2">
                                <PlayCircle size={20} /> Ver Demo
                            </button>
                        </div>
                    </FadeInWhenVisible>
                </div>

                {/* Mockup */}
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.4 }} className="relative mt-16 md:mt-24 max-w-6xl w-full px-4">
                    <div className="relative rounded-2xl bg-[#0F1117] border border-white/10 shadow-2xl overflow-hidden">
                        <div className="h-8 md:h-10 border-b border-white/5 bg-white/[0.02] flex items-center px-4 gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                        </div>
                        <div className="aspect-[16/9] bg-slate-900/50 flex items-center justify-center">
                            <HeroMockups />
                        </div>
                    </div>
                </motion.div>
            </section>

            <SectionDivider variant="dark-glow" />

            {/* WHATSAPP SIMULATION SECTION */}
            <div className="relative z-10 bg-zinc-50">
                <StickyScrollSection />
            </div>

            {/* ENGINE SECTION */}
            <section className="relative min-h-screen bg-slate-950 py-24 flex items-center">
                <div className="max-w-7xl mx-auto px-6 w-full">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <FadeInWhenVisible>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-violet-500/10 rounded-lg"><Zap className="text-violet-400" size={24} /></div>
                                    <span className="text-violet-400 font-medium">Automação Invisível</span>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                                    Você conversa. <br /><span className="text-slate-500">O Tork trabalha.</span>
                                </h2>
                                <p className="text-lg text-slate-400 leading-relaxed">
                                    O sistema identifica intenção de compra, cria o lead no CRM e agenda o follow-up automaticamente.
                                </p>
                            </FadeInWhenVisible>

                            <div className="space-y-4">
                                {["Captura de Leads via WhatsApp Oficial", "Enriquecimento de Dados Automático", "Distribuição Inteligente para Corretores"].map((item, i) => (
                                    <FadeInWhenVisible key={i} delay={i * 0.1}>
                                        <div className="flex items-center gap-3 text-slate-300">
                                            <CheckCircle size={18} className="text-emerald-500" />
                                            {item}
                                        </div>
                                    </FadeInWhenVisible>
                                ))}
                            </div>
                        </div>

                        <FadeInWhenVisible delay={0.2}>
                            <div className="bg-slate-900/30 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl">
                                <div className="flex flex-col gap-6">
                                    <div className="self-start bg-slate-800 border border-slate-700 p-4 rounded-2xl rounded-tl-sm max-w-[200px]">
                                        <p className="text-xs text-slate-400">Gostaria de uma cotação...</p>
                                    </div>
                                    <div className="self-center text-violet-500 animate-pulse">
                                        <ArrowRight size={24} className="rotate-90 md:rotate-0" />
                                    </div>
                                    <div className="self-end bg-slate-800 border-l-4 border-l-emerald-500 p-4 rounded-xl w-full max-w-[240px] shadow-lg">
                                        <div className="flex justify-between mb-2">
                                            <div className="h-2 w-16 bg-slate-700 rounded" />
                                            <div className="h-2 w-8 bg-emerald-500/20 rounded" />
                                        </div>
                                        <div className="h-2 w-full bg-slate-700/50 rounded mb-2" />
                                        <div className="h-2 w-2/3 bg-slate-700/50 rounded" />
                                    </div>
                                </div>
                            </div>
                        </FadeInWhenVisible>
                    </div>
                </div>
            </section>

            <SectionDivider variant="light-to-dark" className="relative z-20" />

            {/* CTA */}
            <section className="relative flex flex-col items-center justify-center bg-slate-950 overflow-hidden py-32 pb-40 z-20">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-violet-600/20 blur-[180px] rounded-full pointer-events-none" />
                
                <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
                    <FadeInWhenVisible>
                        <h2 className="text-5xl md:text-8xl font-bold tracking-tighter mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40">
                            O futuro da sua <br />corretora é agora.
                        </h2>
                    </FadeInWhenVisible>

                    <FadeInWhenVisible delay={0.2}>
                        <p className="text-xl text-zinc-400 max-w-xl mx-auto mb-12 leading-relaxed">
                            Sem cartão de crédito. Setup em 2 minutos.
                        </p>
                    </FadeInWhenVisible>

                    <FadeInWhenVisible delay={0.4}>
                        <button onClick={() => navigate('/auth')} className="group relative inline-flex h-16 items-center justify-center overflow-hidden rounded-full bg-white px-12 font-medium text-slate-950 transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]">
                            <span className="text-lg font-bold mr-2">Começar Gratuitamente</span>
                            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </FadeInWhenVisible>
                </div>
            </section>

            <MegaFooter />
        </main>
    );
}

export default Landing;
```

---

## ✅ CHECKLIST FINAL

1. [ ] Criar `src/components/landing/TorkLogo.tsx`
2. [ ] Criar `src/components/landing/SmartNavbar.tsx`
3. [ ] Criar `src/components/landing/SectionDivider.tsx`
4. [ ] Criar `src/components/landing/StickyScrollSection.tsx`
5. [ ] Criar `src/components/landing/MegaFooter.tsx`
6. [ ] Criar `src/components/landing/HeroMockups.tsx`
7. [ ] **SUBSTITUIR COMPLETAMENTE** `src/pages/Landing.tsx`

---

## 🎯 RESULTADO ESPERADO
- Hero com animações de fade-in
- Navbar que transforma em pill ao rolar
- **Simulação de WhatsApp com chat animado no scroll**
- Seção de features com cards sticky
- Footer premium
- Tema escuro moderno (slate-950)
