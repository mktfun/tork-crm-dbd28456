import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
    Zap, ArrowRight, PlayCircle, CheckCircle
} from "lucide-react";

// Landing Components
import { SmartNavbar } from "@/components/landing/SmartNavbar";
import { MegaFooter } from "@/components/landing/MegaFooter";
import { SectionDivider } from "@/components/landing/SectionDivider";
import { HeroMockups } from "@/components/landing/HeroMockups";
import { StickyScrollSection } from "@/components/landing/StickyScrollSection";
import { InfrastructureScrollSection } from "@/components/landing/InfrastructureSection";

// --- UTILS: FADE IN COMPONENT ---
function FadeInWhenVisible({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay, ease: "easeOut" }}
        >
            {children}
        </motion.div>
    );
}

function Landing() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    // Redirect to dashboard if logged in
    useEffect(() => {
        if (!loading && user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, loading, navigate]);

    // Premium loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(39,39,42,0.2)_0%,_transparent_60%)]" />
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="relative z-10 text-center"
                >
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <img
                            src="/tork_symbol_favicon.png"
                            alt="Tork"
                            className="h-12 w-12"
                            style={{ filter: 'brightness(0) invert(1) drop-shadow(0 0 8px rgba(255,255,255,0.3))' }}
                        />
                        <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">
                            Tork CRM
                        </h1>
                    </div>
                    <div className="w-48 mx-auto mb-6">
                        <div className="h-[2px] bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full w-full progress-metallic" />
                        </div>
                    </div>
                    <p className="text-zinc-500 text-xs font-medium tracking-[0.2em] uppercase">
                        Aguarde...
                    </p>
                </motion.div>
            </div>
        );
    }

    // Redirect in progress
    if (user) {
        return null;
    }

    return (
        <main className="flex flex-col min-h-screen w-full bg-slate-950 selection:bg-cyan-500/30 selection:text-cyan-200">

            {/* 1. HEADER */}
            <SmartNavbar />

            {/* 2. HERO SECTION */}
            <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 overflow-hidden bg-slate-950">
                {/* Ambient Light */}
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-full max-w-[600px] h-[300px] bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                    <FadeInWhenVisible>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 mb-8 backdrop-blur-sm">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-sm font-medium text-slate-300">Tork v2.0 Live</span>
                        </div>
                    </FadeInWhenVisible>

                    <FadeInWhenVisible delay={0.1}>
                        <h1 className="text-4xl md:text-7xl font-semibold tracking-tight text-white mb-6 leading-[1.1]">
                            A espinha dorsal da <br />
                            sua operação de seguros.
                        </h1>
                    </FadeInWhenVisible>

                    <FadeInWhenVisible delay={0.2}>
                        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10 font-light">
                            Conecte WhatsApp, CRM e automação em um único fluxo contínuo.
                            Sem complexidade. Apenas resultados.
                        </p>
                    </FadeInWhenVisible>

                    <FadeInWhenVisible delay={0.3}>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => navigate('/auth')}
                                className="w-full sm:w-auto px-8 py-3.5 bg-white text-slate-950 rounded-full font-bold hover:bg-slate-200 transition-colors shadow-lg shadow-white/5"
                            >
                                Começar Agora
                            </button>
                            <button className="w-full sm:w-auto px-8 py-3.5 text-slate-300 hover:text-white transition-colors font-medium flex items-center justify-center gap-2">
                                <PlayCircle size={20} /> Ver Demo
                            </button>
                        </div>
                    </FadeInWhenVisible>
                </div>

                {/* Floating Mockup */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                    className="relative mt-16 md:mt-24 max-w-6xl w-full px-4"
                >
                    <div className="relative rounded-2xl bg-[#0F1117] border border-white/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)] overflow-hidden">
                        <div className="h-8 md:h-10 border-b border-white/5 bg-white/[0.02] flex items-center px-4 gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                        </div>
                        <div className="aspect-[16/9] bg-slate-900/50 flex items-center justify-center text-slate-600">
                            <HeroMockups />
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* 3. DIVIDER */}
            <SectionDivider variant="dark-glow" />

            {/* 4. STICKY SCROLL SECTION (WhatsApp Simulation) */}
            <div className="relative z-10 bg-zinc-50">
                <StickyScrollSection />
            </div>

            {/* 5. ENGINE SECTION */}
            <section className="relative lg:sticky lg:top-0 lg:z-0 min-h-screen bg-slate-950 py-24 flex items-center">
                <div className="max-w-7xl mx-auto px-6 w-full">
                    <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
                        <div className="order-2 md:order-1 space-y-8">
                            <FadeInWhenVisible>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-violet-500/10 rounded-lg"><Zap className="text-violet-400" size={24} /></div>
                                    <span className="text-violet-400 font-medium">Automação Invisível</span>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                                    Você conversa. <br /> <span className="text-slate-500">O Tork trabalha.</span>
                                </h2>
                                <p className="text-lg text-slate-400 leading-relaxed">
                                    Esqueça configurar fluxos complexos. O sistema identifica intenção de compra, cria o lead no CRM e agenda o follow-up automaticamente.
                                </p>
                            </FadeInWhenVisible>

                            {/* Feature List */}
                            <div className="space-y-4">
                                {[
                                    "Captura de Leads via WhatsApp Oficial",
                                    "Enriquecimento de Dados Automático",
                                    "Distribuição Inteligente para Corretores"
                                ].map((item, i) => (
                                    <FadeInWhenVisible key={i} delay={i * 0.1}>
                                        <div className="flex items-center gap-3 text-slate-300">
                                            <CheckCircle size={18} className="text-emerald-500" />
                                            {item}
                                        </div>
                                    </FadeInWhenVisible>
                                ))}
                            </div>
                        </div>

                        {/* Visualização de Causa e Efeito */}
                        <div className="order-1 md:order-2">
                            <FadeInWhenVisible delay={0.2}>
                                <div className="bg-slate-900/30 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl relative">
                                    <div className="flex flex-col gap-6">
                                        {/* Chat Bubble */}
                                        <div className="self-start bg-slate-800 border border-slate-700 p-4 rounded-2xl rounded-tl-sm max-w-[200px]">
                                            <div className="h-2 w-24 bg-slate-700 rounded mb-2"></div>
                                            <p className="text-xs text-slate-400">Gostaria de uma cotação...</p>
                                        </div>

                                        {/* Arrow */}
                                        <div className="self-center text-violet-500 animate-pulse">
                                            <ArrowRight size={24} className="rotate-90 md:rotate-0" />
                                        </div>

                                        {/* CRM Card */}
                                        <div className="self-end bg-slate-800 border-l-4 border-l-emerald-500 p-4 rounded-xl w-full max-w-[240px] shadow-lg">
                                            <div className="flex justify-between mb-2">
                                                <div className="h-2 w-16 bg-slate-700 rounded"></div>
                                                <div className="h-2 w-8 bg-emerald-500/20 rounded"></div>
                                            </div>
                                            <div className="h-2 w-full bg-slate-700/50 rounded mb-2"></div>
                                            <div className="h-2 w-2/3 bg-slate-700/50 rounded"></div>
                                        </div>
                                    </div>
                                </div>
                            </FadeInWhenVisible>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. INFRASTRUCTURE SECTION */}
            <div className="relative z-10 bg-zinc-50 shadow-[0_-50px_100px_-20px_rgba(0,0,0,0.5)]">
                <InfrastructureScrollSection />
            </div>

            {/* 7. CTA */}
            <SectionDivider variant="light-to-dark" className="relative z-20" />

            <section className="relative flex flex-col items-center justify-center bg-slate-950 overflow-hidden py-32 pb-40 z-20">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-violet-600/20 blur-[180px] rounded-full pointer-events-none" />

                <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
                    <FadeInWhenVisible>
                        <h2 className="text-5xl md:text-8xl lg:text-9xl font-bold tracking-tighter mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40">
                            O futuro da sua <br /> corretora é agora.
                        </h2>
                    </FadeInWhenVisible>

                    <FadeInWhenVisible delay={0.2}>
                        <p className="text-xl text-zinc-400 max-w-xl mx-auto mb-12 leading-relaxed">
                            Sem cartão de crédito necessário no início. Setup em 2 minutos.
                            Junte-se à elite do mercado.
                        </p>
                    </FadeInWhenVisible>

                    <FadeInWhenVisible delay={0.4}>
                        <div className="flex flex-col items-center gap-6">
                            <button
                                onClick={() => navigate('/auth')}
                                className="group relative inline-flex h-16 items-center justify-center overflow-hidden rounded-full bg-white px-12 font-medium text-slate-950 transition-all duration-300 hover:bg-zinc-200 hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]"
                            >
                                <span className="relative z-10 text-lg font-bold mr-2">Começar Gratuitamente</span>
                                <ArrowRight className="relative z-10 group-hover:translate-x-1 transition-transform" />
                                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent z-0 opacity-50" />
                            </button>
                        </div>
                    </FadeInWhenVisible>
                </div>
            </section>

            {/* 8. FOOTER */}
            <MegaFooter />

        </main>
    );
}

export default Landing;
