import React from "react";

interface SandboxFloatingCardProps {
  children: React.ReactNode;
}

/**
 * Floating card wrapper for the AI Sandbox.
 * Uses native CSS sticky positioning to stay in the viewport gracefully.
 */
export function SandboxFloatingCard({ children }: SandboxFloatingCardProps) {
  return (
    <div className="hidden lg:flex flex-col overflow-hidden sticky top-6 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl h-[calc(100vh-8rem)] max-h-[680px] lg:col-span-2">
      {children}
    </div>
  );
}
