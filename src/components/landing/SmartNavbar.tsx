"use client";

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
                        // VOLTA PARA O VISUAL ROBUSTO E LEGÍVEL (Sem Liquid Glass experimental)
                        backgroundColor: scrolled ? "rgba(2, 6, 23, 0.90)" : "rgba(0,0,0,0)",
                        borderColor: scrolled ? "rgba(255, 255, 255, 0.08)" : "rgba(255,255,255,0)",
                        backdropFilter: scrolled ? "blur(20px)" : "blur(0px)",
                        boxShadow: scrolled ? "0 20px 40px -10px rgba(0, 0, 0, 0.5)" : "none",
                    }}
                    transition={{ duration: 0.6, ease: iosEase }}
                    style={{ maxWidth: "1400px" }}
                    className="pointer-events-auto relative border border-transparent overflow-hidden"
                >
                    {/* 
              LAYOUT HÍBRIDO: 
              - GRID no Desktop (Para alinhamento perfeito 1fr-auto-1fr)
              - FLEX no Mobile (Para simplicidade Logo-Menu)
          */}

                    {/* DESKTOP CONTENT (Grid) */}
                    <div className="hidden lg:grid grid-cols-[1fr_auto_1fr] w-full h-full items-center px-6">
                        {/* Esquerda */}
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

                        {/* Centro */}
                        <div className="flex items-center justify-center gap-8">
                            {navLinks.map((link) => (
                                <a key={link.name} href={link.href} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors whitespace-nowrap">
                                    {link.name}
                                </a>
                            ))}
                        </div>

                        {/* Direita */}
                        <div className="flex items-center justify-end gap-3">
                            <a
                                href="/auth"
                                className="text-sm font-semibold text-white/70 hover:text-white transition-colors mr-2"
                            >
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

                    {/* MOBILE CONTENT (Flex) */}
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
                            {/* <a href="/login" className="text-xl text-zinc-400 font-medium">Login</a> */}
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
