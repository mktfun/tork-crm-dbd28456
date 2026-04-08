import React, { useState } from "react";
import { Bot, GitBranch, Settings2, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiquidAutomationConfig } from "./LiquidAutomationConfig";
import { SDRBuilder } from "./builder/SDRBuilder";
import { AutomationConfigTab } from "./AutomationConfigTab";
import { motion } from "framer-motion";

export function AIAutomationDashboard() {
  const [activeTab, setActiveTab] = useState('configuracao');

  return (
    <div className="h-full flex flex-col min-h-0 bg-background/50">
      {/* Header Tabs */}
      <div className="px-6 flex-shrink-0 pt-4 pb-0">
        <TabsList className="gap-1 bg-card/40 backdrop-blur-xl border border-border/50 rounded-xl p-1 h-auto flex max-w-fit shadow-sm">
          <TabsTrigger
            value="configuracao"
            onClick={() => setActiveTab('configuracao')}
            className="relative px-4 py-2.5 text-sm font-medium rounded-lg
                       text-muted-foreground bg-transparent
                       data-[state=active]:text-primary data-[state=active]:bg-primary/10
                       hover:text-foreground transition-colors flex items-center gap-2"
          >
            <Bot className="w-4 h-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger
            value="sdr-builder"
            onClick={() => setActiveTab('sdr-builder')}
            className="relative px-4 py-2.5 text-sm font-medium rounded-lg
                       text-muted-foreground bg-transparent
                       data-[state=active]:text-emerald-500 data-[state=active]:bg-emerald-500/10
                       hover:text-foreground transition-colors flex items-center gap-2"
          >
            <GitBranch className="w-4 h-4" />
            SDR Builder
          </TabsTrigger>
          <TabsTrigger
            value="integracoes"
            onClick={() => setActiveTab('integracoes')}
            className="relative px-4 py-2.5 text-sm font-medium rounded-lg
                       text-muted-foreground bg-transparent
                       data-[state=active]:text-amber-500 data-[state=active]:bg-amber-500/10
                       hover:text-foreground transition-colors flex items-center gap-2"
          >
            <Settings2 className="w-4 h-4" />
            Avançado (API/Integrações)
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 min-h-0 relative">
        <Tabs value={activeTab} className="h-full flex flex-col">
          <TabsContent value="configuracao" className="flex-1 m-0 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
              <LiquidAutomationConfig />
            </motion.div>
          </TabsContent>
          
          <TabsContent value="sdr-builder" className="flex-1 m-0 h-full overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
              <SDRBuilder />
            </motion.div>
          </TabsContent>

          <TabsContent value="integracoes" className="flex-1 m-0 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
              <div className="max-w-5xl mx-auto p-6">
                <AutomationConfigTab />
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
