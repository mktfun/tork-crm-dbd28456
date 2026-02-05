
import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll } from 'framer-motion';
import { Shield, Zap, Server, Globe } from 'lucide-react';

export function InfrastructureScrollSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const [activeFeature, setActiveFeature] = useState(0);

    useEffect(() => {
        const unsubscribe = scrollYProgress.on("change", (latest) => {
            if (latest < 0.33) setActiveFeature(0);
            else if (latest < 0.66) setActiveFeature(1);
            else setActiveFeature(2);
        });
        return () => unsubscribe();
    }, [scrollYProgress]);

    return (
        /* EFEITO CORTINA: 
           Esta seção tem z-10 para passar POR CIMA da anterior (z-0 sticky).
           A sombra negativa no topo reforça a sensação de sobreposição.
        */
        <section ref={containerRef} className="relative z-10 bg-zinc-50 py-32 shadow-[0_-50px_100px_-20px_rgba(0,0,0,0.5)]">
            <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row">

                {/* COLUNA ESQUERDA: VISUALIZADOR FIXO */}
                <div className="hidden lg:flex w-1/2 sticky top-0 h-screen items-center justify-center">
                    <div className="w-full max-w-md aspect-square bg-white rounded-3xl shadow-2xl border border-zinc-100 p-8 relative overflow-hidden ring-1 ring-zinc-900/5">
                        {/* Grid de Fundo */}
                        <div className="absolute inset-0 grid grid-cols-8 gap-4 p-8 opacity-[0.03]">
                            {Array.from({ length: 64 }).map((_, i) => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-black" />
                            ))}
                        </div>

                        {/* Camadas Animadas */}
                        <div className="relative z-10 h-full flex flex-col items-center justify-center">
                            <AnimatePresence mode="wait">
                                {activeFeature === 0 && (
                                    <motion.div
                                        key="latency"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.5 }}
                                        className="flex flex-col items-center"
                                    >
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-cyan-400 blur-3xl opacity-20 animate-pulse" />
                                            <Globe size={100} className="text-cyan-500 relative z-10" strokeWidth={1} />
                                        </div>
                                        <div className="mt-8 flex flex-col items-center">
                                            <div className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-bold uppercase tracking-widest border border-cyan-100 mb-2">
                                                Region: South-1
                                            </div>
                                            <p className="font-bold text-slate-900 text-2xl">São Paulo, BR</p>
                                        </div>
                                    </motion.div>
                                )}
                                {activeFeature === 1 && (
                                    <motion.div
                                        key="security"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.5 }}
                                        className="flex flex-col items-center"
                                    >
                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 bg-emerald-400 blur-3xl opacity-20" />
                                            <Shield size={100} className="text-emerald-500 relative z-10" strokeWidth={1} />
                                            <div className="absolute -bottom-2 -right-2 bg-emerald-100 p-2 rounded-full border-2 border-white">
                                                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-lg font-bold border border-emerald-100 shadow-sm">
                                            AES-256 Encrypted
                                        </div>
                                    </motion.div>
                                )}
                                {activeFeature === 2 && (
                                    <motion.div
                                        key="uptime"
                                        initial={{ opacity: 0, scale: 1.1 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.5 }}
                                        className="w-full max-w-[280px]"
                                    >
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-between">
                                                <div>
                                                    <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Uptime SLA</div>
                                                    <div className="text-3xl font-bold text-slate-900">99.99%</div>
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
                                                    <Server size={20} />
                                                </div>
                                            </div>
                                            <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-between">
                                                <div>
                                                    <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Latency</div>
                                                    <div className="text-3xl font-bold text-slate-900">~45ms</div>
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600">
                                                    <Zap size={20} />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* COLUNA DIREITA: TEXTO SCROLLÁVEL */}
                <div className="w-full lg:w-1/2 lg:pl-24 relative z-20">
                    {/* Bloco 1: Latência */}
                    <div className="min-h-screen flex flex-col justify-center">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ margin: "-20% 0px -20% 0px" }}
                        >
                            <div className="w-14 h-14 bg-cyan-100 rounded-2xl flex items-center justify-center mb-8 text-cyan-600 shadow-sm">
                                <Zap size={28} />
                            </div>
                            <h3 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
                                Latência Zero. <br />
                                <span className="text-zinc-300">Servidores no Brasil.</span>
                            </h3>
                            <p className="text-xl text-zinc-500 leading-relaxed max-w-lg">
                                Esqueça o delay. Nossa infraestrutura roda em instâncias locais em São Paulo, garantindo que suas mensagens cheguem instantaneamente.
                            </p>
                        </motion.div>
                    </div>

                    {/* Bloco 2: Segurança */}
                    <div className="min-h-screen flex flex-col justify-center">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ margin: "-20% 0px -20% 0px" }}
                        >
                            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-8 text-emerald-600 shadow-sm">
                                <Shield size={28} />
                            </div>
                            <h3 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
                                Blindagem Militar. <br />
                                <span className="text-zinc-300">Seus dados são seus.</span>
                            </h3>
                            <p className="text-xl text-zinc-500 leading-relaxed max-w-lg">
                                Criptografia de ponta a ponta e conformidade total com a LGPD. Nem nós temos acesso às suas conversas confidenciais.
                            </p>
                        </motion.div>
                    </div>

                    {/* Bloco 3: Redundância */}
                    <div className="min-h-screen flex flex-col justify-center">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ margin: "-20% 0px -20% 0px" }}
                        >
                            <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mb-8 text-violet-600 shadow-sm">
                                <Server size={28} />
                            </div>
                            <h3 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
                                Sempre Online. <br />
                                <span className="text-zinc-300">Redundância tripla.</span>
                            </h3>
                            <p className="text-xl text-zinc-500 leading-relaxed max-w-lg">
                                Arquitetura distribuída que garante disponibilidade mesmo em picos de tráfego. Seu negócio nunca para, nem por um segundo.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
