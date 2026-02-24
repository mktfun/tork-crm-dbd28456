"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface Tab {
    id: string;
    label: React.ReactNode;
    content: React.ReactNode;
}

export interface AnimatedTabsProps {
    tabs?: Tab[];
    defaultTab?: string;
    className?: string;
    onChange?: (id: string) => void;
}

const AnimatedTabs = ({
    tabs = [],
    defaultTab,
    className,
    onChange,
}: AnimatedTabsProps) => {
    const [activeTab, setActiveTab] = useState<string>(defaultTab || tabs[0]?.id);

    if (!tabs?.length) return null;

    const handleTabClick = (id: string) => {
        setActiveTab(id);
        if (onChange) onChange(id);
    };

    return (
        <div className={cn("w-full flex flex-col gap-y-4", className)}>
            <div className="flex gap-2 flex-wrap bg-[#11111198] bg-opacity-50 backdrop-blur-sm p-1.5 rounded-xl border border-white/10 self-start">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={cn(
                            "relative px-4 py-2 text-sm font-medium rounded-lg outline-none transition-colors",
                            activeTab === tab.id ? "text-white" : "text-white/60 hover:text-white/80"
                        )}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="active-tab"
                                className="absolute inset-0 bg-[#111111d1] bg-opacity-50 shadow-[0_0_20px_rgba(0,0,0,0.2)] backdrop-blur-sm border border-white/10 !rounded-lg"
                                transition={{ type: "spring", duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="w-full flex-1 min-h-[500px] relative">
                <AnimatePresence mode="popLayout">
                    {tabs.map(
                        (tab) =>
                            activeTab === tab.id && (
                                <motion.div
                                    key={tab.id}
                                    initial={{
                                        opacity: 0,
                                        scale: 0.98,
                                        x: -10,
                                        filter: "blur(8px)",
                                    }}
                                    animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, scale: 0.98, x: -10, filter: "blur(8px)" }}
                                    transition={{
                                        duration: 0.4,
                                        ease: "circInOut",
                                        type: "spring",
                                    }}
                                    className="w-full h-full"
                                >
                                    {tab.content}
                                </motion.div>
                            )
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export { AnimatedTabs };
