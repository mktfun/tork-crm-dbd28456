
export function TrustLogos() {
    const companies = [
        { name: "Porto Tech", color: "from-blue-400 to-blue-600" },
        { name: "Allianz Digital", color: "from-cyan-400 to-cyan-600" },
        { name: "Bradesco Seguros", color: "from-violet-400 to-violet-600" },
        { name: "SulAmérica", color: "from-green-400 to-green-600" },
        { name: "Liberty Mutual", color: "from-orange-400 to-orange-600" },
    ];

    return (
        <div className="border-y border-white/5 bg-white/[0.02] backdrop-blur-sm py-12">
            <div className="max-w-7xl mx-auto px-6">
                <p className="text-center text-sm text-zinc-500 mb-8 uppercase tracking-wider">
                    A escolha das corretoras modernas
                </p>
                <div className="flex flex-wrap items-center justify-center gap-12 opacity-40 hover:opacity-60 transition-opacity">
                    {companies.map((company, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all"
                        >
                            {/* Abstract Logo Icon */}
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${company.color} opacity-60`} />
                            <span className="text-sm font-semibold text-zinc-400">
                                {company.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
