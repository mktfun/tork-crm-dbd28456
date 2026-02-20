import React from 'react';
import { useGlobalAiConfig } from '@/hooks/useGlobalAiConfig';
import { AIOnboardingWizard } from '@/components/automation/AIOnboardingWizard';
import { AIAutomationDashboard } from '@/components/automation/AIAutomationDashboard';

export default function AIAutomation() {
  const { isLoading, hasCompletedOnboarding } = useGlobalAiConfig();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (!hasCompletedOnboarding) {
    return <AIOnboardingWizard />;
  }

  return (
    <div className="flex flex-col h-full">
      <AIAutomationDashboard />
    </div>
  );
}
