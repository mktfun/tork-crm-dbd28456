
import { Building2, Briefcase, Shield, TrendingUp, Users2, Wallet } from 'lucide-react';

const logos = [
    { name: "Enterprise", icon: Building2 },
    { name: "Business", icon: Briefcase },
    { name: "Security", icon: Shield },
    { name: "Growth", icon: TrendingUp },
    { name: "Teams", icon: Users2 },
    { name: "Finance", icon: Wallet },
];

export function InfiniteLogoTicker() {
    // Duplicate logos for seamless infinite scroll
    const duplicatedLogos = [...logos, ...logos, ...logos];

    return (
        <section className="relative py-20 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 text-center mb-12">
                <p className="text-sm text-zinc-500 uppercase tracking-wider font-semibold">
                    Confiado por corretores modernos
                </p>
            </div>

            {/* Gradient Masks for Edge Fade */}
            <div className="relative">
                <div
                    className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to right, rgb(2 6 23) 0%, transparent 100%)'
                    }}
                />
                <div
                    className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to left, rgb(2 6 23) 0%, transparent 100%)'
                    }}
                />

                {/* Infinite Scroll Container */}
                <div className="flex gap-16 animate-scroll">
                    {duplicatedLogos.map((logo, index) => (
                        <div
                            key={`${logo.name}-${index}`}
                            className="flex items-center gap-3 opacity-40 hover:opacity-60 transition-opacity flex-shrink-0 group"
                        >
                            <logo.icon size={32} className="text-zinc-400 group-hover:text-zinc-300 transition-colors" strokeWidth={1.5} />
                            <span className="text-zinc-400 font-semibold text-lg group-hover:text-zinc-300 transition-colors whitespace-nowrap">
                                {logo.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scroll {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(calc(-100% / 3));
                    }
                }

                .animate-scroll {
                    animation: scroll 30s linear infinite;
                }

                .animate-scroll:hover {
                    animation-play-state: paused;
                }
            `}} />
        </section>
    );
}
