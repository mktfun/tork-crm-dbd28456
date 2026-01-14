
import { useCallback } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS, CallBackProps } from 'react-joyride';
import { OnboardingTourProps } from '@/types/onboarding';

export function OnboardingTour({ steps, isActive, onComplete }: OnboardingTourProps) {
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, action } = data;

    // Se o tour foi completado ou pulado
    if (
      ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) ||
      (type === EVENTS.TOUR_END) ||
      (action === ACTIONS.CLOSE)
    ) {
      onComplete();
    }
  }, [onComplete]);

  if (!isActive) return null;

  return (
    <Joyride
      steps={steps}
      run={isActive}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--background))',
          textColor: 'hsl(var(--foreground))',
          overlayColor: 'rgba(0, 0, 0, 0.7)',
          arrowColor: 'hsl(var(--background))',
          zIndex: 1000,
        },
        tooltip: {
          backgroundColor: 'hsl(var(--background))',
          borderRadius: '12px',
          border: '1px solid hsl(var(--border))',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          backdropFilter: 'blur(16px)',
          color: 'hsl(var(--foreground))',
          fontSize: '14px',
          padding: '16px',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          color: 'hsl(var(--foreground))',
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '8px',
        },
        tooltipContent: {
          color: 'hsl(var(--muted-foreground))',
          lineHeight: '1.5',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        },
        buttonBack: {
          backgroundColor: 'transparent',
          color: 'hsl(var(--muted-foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          marginRight: '8px',
          transition: 'all 0.2s ease',
        },
        buttonSkip: {
          backgroundColor: 'transparent',
          color: 'hsl(var(--muted-foreground))',
          border: 'none',
          fontSize: '14px',
          cursor: 'pointer',
          padding: '4px 8px',
          textDecoration: 'underline',
        },
        buttonClose: {
          backgroundColor: 'transparent',
          color: 'hsl(var(--muted-foreground))',
          border: 'none',
          fontSize: '18px',
          cursor: 'pointer',
          position: 'absolute',
          right: '8px',
          top: '8px',
        },
        beacon: {
          backgroundColor: 'hsl(var(--primary))',
        },
        spotlight: {
          backgroundColor: 'transparent',
          border: '2px solid hsl(var(--primary))',
          borderRadius: '8px',
        }
      }}
      locale={{
        back: 'Anterior',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular tutorial',
      }}
      disableOverlayClose={false}
      disableScrolling={false}
      hideCloseButton={false}
      spotlightClicks={false}
    />
  );
}
