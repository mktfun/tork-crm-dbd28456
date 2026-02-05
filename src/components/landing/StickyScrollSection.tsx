
import { useRef, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { Check, Zap, Smartphone, MoreVertical, Phone, Video } from 'lucide-react';

const steps = [
    {
        id: "capture",
        badge: "Etapa 1 • Captura",
        title: "Captura Automática",
        description: "Cada mensagem é uma oportunidade. O Tork captura leads instantaneamente, garantindo que ninguém fique sem resposta, independente do horário ou demanda."
    },
    {
        id: "qualify",
        badge: "Etapa 2 • Qualificação",
        title: "Qualificação IA",
        description: "Não perca tempo com curiosos. Nossa IA analisa a intenção de compra e separa leads quentes para seu time focar no que importa: fechar negócio."
    },
    {
        id: "convert",
        badge: "Etapa 3 • Conversão",
        title: "Sync CRM em Tempo Real",
        description: "A mágica acontece aqui. Toda a conversa e dados do lead são enviados para o CRM instantaneamente. Visibilidade total, zero trabalho manual."
    }
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
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const [activeStep, setActiveStep] = useState(0);
    const [visibleCount, setVisibleCount] = useState(0);
    const [isTyping, setIsTyping] = useState(false);

    // Sync Scroll to Logic
    useEffect(() => {
        const unsubscribe = scrollYProgress.on("change", (latest) => {
            // Step Active
            if (latest < 0.3) setActiveStep(0);
            else if (latest < 0.7) setActiveStep(1);
            else setActiveStep(2);

            // Chat Timeline
            let count = 0;
            let typing = false;

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

    return (
        <section ref={containerRef} className="bg-zinc-50 relative w-full py-24 border-t border-zinc-200">
            <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row gap-8 lg:gap-20">

                {/* ESQUERDA: STACKING CARDS (CURTAIN EFFECT) */}
                <div className="w-full lg:w-1/2 flex flex-col gap-8 pb-32">
                    {steps.map((step, index) => (
                        <CardStep
                            key={step.id}
                            step={step}
                            index={index}
                            parentScroll={scrollYProgress}
                            range={[index * 0.33, (index + 1) * 0.33]}
                        />
                    ))}
                </div>

                {/* DIREITA: STICKY IPHONE (FIXO) */}
                <div className="w-full lg:w-1/2 sticky top-8 h-[calc(100vh-4rem)] hidden lg:flex items-center justify-center">
                    <IPhoneMockupLight
                        messages={fullConversation}
                        visibleCount={visibleCount}
                        isTyping={isTyping}
                    />
                </div>

                {/* MOBILE FALLBACK */}
                <div className="lg:hidden w-full flex justify-center">
                    <IPhoneMockupLight
                        messages={fullConversation}
                        visibleCount={5}
                        isTyping={false}
                        isMobile={true}
                    />
                </div>

            </div>
        </section>
    );
}

// ---- CARD COMPONENT ----
function CardStep({ step, index, parentScroll, range }: { step: any, index: number, parentScroll: any, range: number[] }) {
    // Efeito sutil de scale quando o card sobe
    const scale = useTransform(parentScroll, range, [1, 0.95]);
    const opacity = useTransform(parentScroll, range, [1, 0.6]);

    return (
        <motion.div
            className="sticky bg-white p-8 lg:p-12 rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-zinc-100 flex flex-col justify-center min-h-[50vh] transition-shadow duration-500 hover:shadow-xl"
            style={{
                top: `${120 + (index * 20)}px`, // Top progressivo: 120px, 140px, 160px
                zIndex: index
            }}
        >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6 w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 font-mono">
                    {step.badge}
                </span>
            </div>

            <h3 className="text-3xl lg:text-4xl font-bold mb-6 text-slate-900 tracking-tight leading-tight">
                {step.title}
            </h3>

            <p className="text-lg text-slate-500 leading-relaxed font-normal">
                {step.description}
            </p>
        </motion.div>
    );
}


// ---- TITANIUM IPHONE LIGHT ----
function IPhoneMockupLight({ messages, visibleCount, isTyping, isMobile = false }: { messages: any[], visibleCount: number, isTyping: boolean, isMobile?: boolean }) {
    const currentList = useMemo(() => messages.slice(0, visibleCount), [messages, visibleCount]);

    return (
        <div className={`relative w-full ${isMobile ? 'max-w-[280px]' : 'max-w-[340px]'} transition-all duration-700`}>
            {/* TITANIUM FRAME */}
            <div className="relative bg-[#f5f5f5] rounded-[3rem] p-1.5 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.2)] border-[4px] border-[#e2e2e4] ring-1 ring-black/5">

                {/* Lateral Buttons */}
                <div className="absolute top-24 -left-[6px] w-[6px] h-10 bg-[#d4d4d6] rounded-l-md" />
                <div className="absolute top-40 -left-[6px] w-[6px] h-16 bg-[#d4d4d6] rounded-l-md" />
                <div className="absolute top-28 -right-[6px] w-[6px] h-20 bg-[#d4d4d6] rounded-r-md" />

                {/* Inner Bezel Black */}
                <div className="bg-black rounded-[2.6rem] p-[3px] overflow-hidden">
                    {/* Screen Content */}
                    <div className="bg-[#EFE7DE] rounded-[2.4rem] overflow-hidden min-h-[620px] max-h-[620px] flex flex-col relative font-sans">

                        {/* Status Bar */}
                        <div className="h-12 w-full bg-[#f6f6f6]/80 backdrop-blur-md z-20 flex items-center justify-between px-6 text-xs font-semibold text-black">
                            <span>9:41</span>
                            <div className="flex gap-1.5 items-center">
                                <div className="text-[10px]">5G</div>
                                <div className="w-5 h-2.5 bg-black rounded-sm relative">
                                    <div className="absolute right-0.5 top-0.5 w-[30%] h-[calc(100%-4px)] bg-white rounded-[1px]" />
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Island */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black w-[100px] h-7 rounded-full z-30 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#1c1c1e]/50 ml-auto mr-2" />
                        </div>

                        {/* WhatsApp Header Light */}
                        <div className="h-16 bg-[#f6f6f6]/95 backdrop-blur-md border-b border-black/5 flex items-center px-4 gap-3 z-10 sticky top-0">
                            <div className="text-blue-500 -ml-1">
                                <span className="text-2xl">‹</span>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500 font-semibold text-sm border border-black/5">
                                JS
                            </div>
                            <div className="flex-1">
                                <div className="text-black font-semibold text-sm">João da Silva</div>
                                <div className="text-zinc-400 text-xs">Online</div>
                            </div>
                            <div className="flex gap-4 text-blue-500">
                                <Video size={20} />
                                <Phone size={20} />
                            </div>
                        </div>

                        {/* Chat Area - WhatsApp Light Wallpaper */}
                        <div className="flex-1 overflow-hidden p-4 flex flex-col justify-end space-y-3 relative z-0">
                            {/* Doodle Pattern Opacity */}
                            <div className="absolute inset-0 bg-[url('https://camo.githubusercontent.com/857a221f7c52b2f567389d4fb985d21217ec8229b00de739818804918e954546/68747470733a2f2f7765622e77686174736170702e636f6d2f696d672f62672d636861742d74696c652d6461726b5f61346265353132653731393562366237336439323936653864666632313139312e706e67')] opacity-[0.4] mix-blend-overlay pointer-events-none invert scale-110" />

                            <AnimatePresence mode="popLayout" initial={false}>
                                {currentList.map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        layout
                                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                        className={`flex w-full relative z-10 ${msg.from === 'client' ? 'justify-end' : // WhatsApp: Me (Client) is Right/Green
                                            msg.from === 'bot' ? 'justify-start' : // Other (Bot) is Left/White
                                                'justify-center'
                                            }`}
                                    >
                                        {/* Client (ME) -> Green, Right */}
                                        {msg.from === 'client' && (
                                            <div className="bg-[#D9FDD3] text-black text-[14px] px-3 py-1.5 rounded-lg rounded-tr-none max-w-[80%] shadow-sm leading-snug">
                                                {msg.text}
                                                <span className="text-[9px] text-zinc-400 block text-right mt-1">10:42</span>
                                            </div>
                                        )}

                                        {/* Bot (OTHER) -> White, Left */}
                                        {msg.from === 'bot' && (
                                            <div className="bg-white text-black text-[14px] px-3 py-1.5 rounded-lg rounded-tl-none max-w-[80%] shadow-sm leading-snug">
                                                {msg.text}
                                                <span className="text-[9px] text-zinc-400 block text-right mt-1">10:42</span>
                                            </div>
                                        )}

                                        {/* Success System Message */}
                                        {msg.from === 'success' && (
                                            <div className="bg-[#FFF5C4] text-amber-800 text-[10px] px-3 py-1 rounded-full shadow-sm font-medium uppercase tracking-wide flex items-center gap-1">
                                                <Zap size={10} fill="currentColor" />
                                                {msg.text}
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {/* Typing Indicator */}
                            <div className="h-6 flex flex-col justify-end">
                                <AnimatePresence>
                                    {isTyping && (
                                        <div className="flex w-full justify-start">
                                            <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 w-fit shadow-sm flex gap-1 items-center h-8">
                                                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                            </div>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>

                        </div>

                        {/* Input Area */}
                        <div className="bg-[#f0f2f5] px-3 py-2 flex items-center gap-2 pb-6">
                            <span className="text-blue-500 font-light text-2xl mb-1">+</span>
                            <div className="flex-1 bg-white rounded-full h-9 border border-zinc-200 px-4 flex items-center text-sm text-zinc-400">
                                Mensagem
                            </div>
                            <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5">
                                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                </svg>
                            </div>
                        </div>

                        {/* Home Indicator */}
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-black/20 rounded-full z-30" />
                    </div>
                </div>
            </div>
        </div>
    );
}

