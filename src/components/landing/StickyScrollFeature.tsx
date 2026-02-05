
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MessageSquare, BarChart3, Zap, Users } from 'lucide-react';

interface Feature {
    id: number;
    title: string;
    description: string;
    icon: React.ReactNode;
    mockup: string;
}

const features: Feature[] = [
    {
        id: 1,
        title: "Atendimento Unificado",
        description: "Gerencie WhatsApp, Email e Web Chat em uma única interface. Responda mais rápido, venda mais.",
        icon: <MessageSquare size={32} />,
        mockup: "chat"
    },
    {
        id: 2,
        title: "Pipeline Visual",
        description: "Kanban drag-and-drop com sincronização em tempo real. Visualize seu funil de vendas como nunca antes.",
        icon: <BarChart3 size={32} />,
        mockup: "kanban"
    },
    {
        id: 3,
        title: "Automações Inteligentes",
        description: "Workflows automáticos para follow-up, renovações e lembretes. Sua equipe no piloto automático.",
        icon: <Zap size={32} />,
        mockup: "automation"
    },
    {
        id: 4,
        title: "Sincronização Bidirecional",
        description: "Contato criado no Chat? Aparece no CRM. Lead adicionado no CRM? Conversa iniciada automaticamente.",
        icon: <Users size={32} />,
        mockup: "sync"
    }
];

export function StickyScrollFeature() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeFeature, setActiveFeature] = useState(0);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const opacity1 = useTransform(scrollYProgress, [0, 0.25, 0.3], [1, 1, 0]);
    const opacity2 = useTransform(scrollYProgress, [0.2, 0.45, 0.5], [0, 1, 0]);
    const opacity3 = useTransform(scrollYProgress, [0.4, 0.65, 0.7], [0, 1, 0]);
    const opacity4 = useTransform(scrollYProgress, [0.6, 0.85, 1], [0, 1, 1]);

    const opacities = [opacity1, opacity2, opacity3, opacity4];

    useEffect(() => {
        const unsubscribe = scrollYProgress.on("change", (latest) => {
            if (latest < 0.25) setActiveFeature(0);
            else if (latest < 0.5) setActiveFeature(1);
            else if (latest < 0.75) setActiveFeature(2);
            else setActiveFeature(3);
        });

        return () => unsubscribe();
    }, [scrollYProgress]);

    return (
        <section ref={containerRef} className="relative">
            {/* Desktop: Sticky Scroll */}
            <div className="hidden lg:block h-[300vh]">
                <div className="sticky top-0 h-screen flex items-center">
                    <div className="max-w-7xl mx-auto px-6 w-full">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            {/* Left: Sticky Text Content */}
                            <div className="relative">
                                {features.map((feature, index) => (
                                    <motion.div
                                        key={feature.id}
                                        style={{ opacity: opacities[index] }}
                                        className="absolute inset-0"
                                    >
                                        <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-600/20 border border-cyan-500/30 mb-8 backdrop-blur-sm">
                                            <div className="text-cyan-400">
                                                {feature.icon}
                                            </div>
                                        </div>
                                        <h2 className="text-5xl font-bold mb-6 leading-tight">
                                            {feature.title}
                                        </h2>
                                        <p className="text-xl text-zinc-400 leading-relaxed max-w-xl">
                                            {feature.description}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Right: Visual Mockups */}
                            <div className="relative">
                                {features.map((feature, index) => (
                                    <motion.div
                                        key={feature.id}
                                        style={{ opacity: opacities[index] }}
                                        className="absolute inset-0"
                                    >
                                        <MockupCard type={feature.mockup} />
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile: Simple Stack */}
            <div className="lg:hidden py-20 px-6 space-y-24">
                {features.map((feature) => (
                    <div key={feature.id} className="space-y-8">
                        <div>
                            <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-600/20 border border-cyan-500/30 mb-6 backdrop-blur-sm">
                                <div className="text-cyan-400">
                                    {feature.icon}
                                </div>
                            </div>
                            <h2 className="text-4xl font-bold mb-4 leading-tight">
                                {feature.title}
                            </h2>
                            <p className="text-lg text-zinc-400 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                        <MockupCard type={feature.mockup} />
                    </div>
                ))}
            </div>
        </section>
    );
}

function MockupCard({ type }: { type: string }) {
    const mockups = {
        chat: (
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600" />
                    <div>
                        <div className="text-sm font-semibold">Cliente VIP</div>
                        <div className="text-xs text-zinc-500">Online agora</div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="bg-white/5 rounded-xl p-4 max-w-[80%]">
                        <p className="text-sm text-zinc-300">Olá! Gostaria de renovar meu seguro.</p>
                        <span className="text-xs text-zinc-600 mt-2 block">14:23</span>
                    </div>
                    <div className="bg-gradient-to-r from-cyan-500/20 to-violet-600/20 rounded-xl p-4 max-w-[80%] ml-auto">
                        <p className="text-sm">Perfeito! Já estou vendo seu perfil no CRM...</p>
                        <span className="text-xs text-zinc-600 mt-2 block text-right">14:24</span>
                    </div>
                </div>
            </div>
        ),
        kanban: (
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                <div className="grid grid-cols-3 gap-4">
                    {['Novo', 'Negociando', 'Fechado'].map((stage) => (
                        <div key={stage} className="space-y-2">
                            <div className="text-xs font-semibold text-zinc-500 mb-3">{stage}</div>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
                                <div className="text-sm font-medium">Cliente {stage}</div>
                                <div className="text-xs text-zinc-500">R$ 2.500,00</div>
                                <div className="flex gap-2 mt-2">
                                    <div className="w-6 h-6 rounded-full bg-cyan-500/30 border border-cyan-500/50" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ),
        automation: (
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                <div className="space-y-3">
                    {[
                        { trigger: "Novo Lead", action: "Enviar mensagem de boas-vindas", status: "active" },
                        { trigger: "30 dias antes", action: "Lembrete de renovação", status: "active" },
                        { trigger: "Sem resposta 3 dias", action: "Follow-up automático", status: "active" }
                    ].map((workflow, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <div className="flex-1">
                                <div className="text-sm font-medium">{workflow.trigger}</div>
                                <div className="text-xs text-zinc-500">{workflow.action}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ),
        sync: (
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                    <div className="flex-1 text-center">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <MessageSquare size={28} className="text-white" />
                        </div>
                        <div className="text-sm font-semibold">Chat</div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                        <div className="w-8 border-t-2 border-dashed border-cyan-500/50" />
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                    </div>

                    <div className="flex-1 text-center">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <BarChart3 size={28} className="text-white" />
                        </div>
                        <div className="text-sm font-semibold">CRM</div>
                    </div>
                </div>
                <div className="mt-6 text-center">
                    <div className="text-xs text-zinc-500">Sincronização em tempo real ativa</div>
                </div>
            </div>
        )
    };

    return mockups[type as keyof typeof mockups] || mockups.chat;
}
