
import { motion } from "framer-motion";

export function HeroMockups() {
    return (
        <div className="relative w-full h-full bg-slate-900/50">
            {/* Dashboard Content Layout (Grid) */}
            <div className="flex h-[500px] md:h-[600px]">
                {/* Sidebar */}
                <div className="w-16 md:w-64 border-r border-white/5 p-4 flex flex-col gap-4 bg-slate-900/50">
                    {/* Logo Placeholder */}
                    <div className="h-8 w-8 md:w-32 bg-white/10 rounded mb-4" />

                    {/* Menu Items */}
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-8 w-full rounded bg-white/5 flex items-center px-3 gap-3">
                            <div className="w-4 h-4 rounded bg-white/10" />
                            <div className="hidden md:block w-24 h-2 rounded bg-white/10" />
                        </div>
                    ))}

                    <div className="mt-auto h-12 w-full rounded bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-white/5" />
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6 md:p-8 bg-black/20">
                    {/* Header Row */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <div className="h-6 w-48 bg-white/10 rounded mb-2" />
                            <div className="h-4 w-32 bg-white/5 rounded" />
                        </div>
                        <div className="flex gap-3">
                            <div className="h-10 w-10 rounded-full bg-white/10" />
                            <div className="h-10 w-24 rounded bg-cyan-600/80 shadow-lg shadow-cyan-500/20" />
                        </div>
                    </div>

                    {/* KPI Cards Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { color: "from-violet-500/20", val: "R$ 142k" },
                            { color: "from-cyan-500/20", val: "1.240" },
                            { color: "from-emerald-500/20", val: "85%" },
                            { color: "from-amber-500/20", val: "12" }
                        ].map((kpi, i) => (
                            <div key={i} className={`h-24 rounded-xl border border-white/5 bg-gradient-to-br ${kpi.color} to-transparent p-4 flex flex-col justify-between`}>
                                <div className="w-8 h-8 rounded bg-white/10 mb-2" />
                                <div className="text-lg font-bold text-white/90">{kpi.val}</div>
                            </div>
                        ))}
                    </div>

                    {/* Big Chart / Kanban Area */}
                    <div className="flex gap-6 h-64 md:h-80">
                        {/* Chart */}
                        <div className="flex-1 rounded-xl border border-white/5 bg-white/5 p-6 relative overflow-hidden">
                            {/* Fake Chart Lines */}
                            <div className="absolute bottom-0 left-0 right-0 h-32 flex items-end justify-between px-6 gap-2 opacity-50">
                                {[40, 60, 45, 80, 55, 70, 90, 65, 85, 100].map((h, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${h}%` }}
                                        transition={{ delay: 1 + i * 0.05, duration: 1 }}
                                        className="flex-1 bg-gradient-to-t from-cyan-500 to-violet-500 rounded-t-sm"
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Right Panel */}
                        <div className="hidden md:block w-1/3 rounded-xl border border-white/5 bg-white/5 p-4 space-y-3">
                            <div className="h-4 w-24 bg-white/10 rounded mb-4" />
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-12 w-full rounded bg-white/5 border border-white/5 flex items-center px-3 gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/10" />
                                    <div className="flex-1">
                                        <div className="h-2 w-20 bg-white/10 rounded mb-1" />
                                        <div className="h-1.5 w-12 bg-white/5 rounded" />
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Reflective Sheen Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none" />
        </div>
    );
}
